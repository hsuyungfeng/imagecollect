import express, { Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import fs from 'node:fs';
import { getFtpClient, listFiles, downloadFile } from './ftpClient.js';
import exifParser from 'exif-parser';

// 配置环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// 设置视图引擎
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// 设置静态文件目录
app.use(express.static(path.join(__dirname, '../public')));
// 新增：開放 cache 目錄靜態存取
app.use('/cache', express.static(path.join(__dirname, '../cache')));

// 月份映射表
const monthFolderMap: {[key: string]: string} = {
  '01': '生日1-2月',
  '02': '生日1-2月',
  '03': '生日3-4月',
  '04': '生日3-4月',
  '05': '生日5-6月',
  '06': '生日5-6月',
  '07': '生日7-8月',
  '08': '生日7-8月',
  '09': '生日9-10月',
  '10': '生日9-10月',
  '11': '生日11-12月',
  '12': '生日11-12月'
};

// 增强的下载函数，支持连接重试
async function downloadWithRetry(ftpFilePath: string, localFilePath: string, maxRetries = 3) {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let client = null;
    try {
      console.log(`[downloadWithRetry] 尝试 ${attempt}/${maxRetries}: ${ftpFilePath}`);
      
      // 每次尝试都创建新的客户端连接
      client = await getFtpClient();
      
      // 使用现有的downloadFile函数，但传入新的客户端
      const result = await downloadFile(client, ftpFilePath, localFilePath);
      
      await client.close();
      return result;
      
    } catch (err: any) {
      lastError = err;
      console.error(`[downloadWithRetry] 尝试 ${attempt} 失败:`, err.message);
      
      // 确保客户端被关闭
      if (client) {
        try {
          await client.close();
        } catch (closeErr) {
          console.error('关闭客户端失败:', closeErr);
        }
      }
      
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        throw new Error(`下载失败，已重试 ${maxRetries} 次: ${lastError?.message || '未知错误'}`);
      }
      
      // 等待后重试（指数退避）
      const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
      console.log(`等待 ${delay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('未知下载错误');
}

// 同步路由
app.get('/api/sync', async (req, res) => {
  try {
    // 参数验证
    if (!req.query.month || !req.query.day || !req.query.name) {
      throw new Error('缺少必要参数: month, day 或 name');
    }
    
    const month = req.query.month.toString().padStart(2, '0');
    const day = req.query.day.toString().padStart(2, '0');
    const name = req.query.name.toString();
    
    // 验证日期有效性
    if (month < '01' || month > '12') throw new Error('月份无效');
    if (day < '01' || day > '31') throw new Error('日期无效');

    // 构建缓存目录路径
    const cacheDir = path.join(__dirname, '../cache', `${month}.${day}${name}`);
    console.log('缓存目录:', cacheDir);
    
    const client = await getFtpClient();
    // 构建FTP路径并验证月份映射
    if (!monthFolderMap[month]) {
      throw new Error(`无法映射月份: ${month}`);
    }
    // 直接使用原始姓名（FTP服务器需要未编码的中文路径）
    const targetPath = path.posix.join('緻妍外科診所/顧客比對圖', monthFolderMap[month], `${month}.${day}${name}`);
    console.log('目标FTP路径:', targetPath);
    console.log('完整FTP路径:', {
      monthFolder: monthFolderMap[month],
      targetPath,
      combined: path.posix.join('/', targetPath),
      isAbsolute: path.posix.isAbsolute(path.posix.join('/', targetPath))
    });
    console.log('FTP服务器配置:', {
      host: process.env.FTP_HOST,
      rootPath: process.env.FTP_ROOT_PATH
    });
    const files = await listFiles(client, `${targetPath}`);

    interface SyncResult {
      total: number;
      downloaded: number;
      skipped: number;
      errors: number;
    }

    let results: SyncResult = {
      total: files.length,
      downloaded: 0,
      skipped: 0,
      errors: 0
    };

    // 并行下载文件（限制并发数，避免服务器过载）
    const MAX_CONCURRENT_DOWNLOADS = 5;
    const downloadQueue = [...files];
    
    async function processDownloadQueue() {
      while (downloadQueue.length > 0) {
        const file = downloadQueue.shift();
        if (!file) continue;
        
        const localPath = path.join(cacheDir, file.name);
        try {
          const result = await downloadWithRetry(file.path, localPath);
          if (result.downloaded) {
            results.downloaded++;
          } else {
            results.skipped++;
          }
        } catch (err) {
          console.error(`下载失败: ${file.path}`, err);
          results.errors++;
        }
      }
    }
    
    // 创建多个并发下载任务
    const downloadWorkers = Array(MAX_CONCURRENT_DOWNLOADS)
      .fill(null)
      .map(() => processDownloadQueue());
    
    await Promise.all(downloadWorkers);

    await client.close();
    res.json({
      success: true,
      message: `同步完成: ${results.downloaded}新增, ${results.skipped}跳过, ${results.errors}错误`,
      results
    });
    } catch (err: unknown) {
      console.error('同步失败:', err);
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      res.status(500).json({
        success: false,
        message: `同步失败: ${errorMessage}`
    });
  }
});

// 基本路由
app.get('/', (req, res) => {
  res.render('index');
});

// 结果页面路由
app.get('/results', (req, res) => {
  const { searchId } = req.query;
  const cacheDir = path.join(__dirname, '../cache', searchId as string);
  const imageExts = ['.jpg', '.jpeg', '.png', '.bmp', '.gif'];

  function getImageCreateTime(absPath: string): number {
    try {
      const buffer = fs.readFileSync(absPath);
      const parser = exifParser.create(buffer);
      const exif = parser.parse();
      // 優先取 DateTimeOriginal，其次 CreateDate，否則 fallback mtime
      if (exif.tags && exif.tags.DateTimeOriginal) {
        return exif.tags.DateTimeOriginal * 1000;
      }
      if (exif.tags && exif.tags.CreateDate) {
        return exif.tags.CreateDate * 1000;
      }
    } catch (e) {}
    // fallback: 檔案系統 mtime
    return fs.statSync(absPath).mtime.getTime();
  }

  function walkDir(dir: string, base = ''): Array<{name: string, metaTime: number}> {
    let results: Array<{name: string, metaTime: number}> = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const relPath = path.join(base, entry.name);
      const absPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(walkDir(absPath, relPath));
      } else if (entry.isFile() && imageExts.includes(path.extname(entry.name).toLowerCase())) {
        results.push({
          name: relPath.replace(/\\/g, '/'),
          metaTime: getImageCreateTime(absPath)
        });
      }
    }
    return results;
  }

  try {
    let files: Array<{name: string, metaTime: number}> = walkDir(cacheDir);
    // 以 metadata 時間排序
    files.sort((a, b) => a.metaTime - b.metaTime);
    res.render('results', { 
      searchId,
      files,
      message: files.length ? '' : '未找到匹配的文件'
    });
  } catch (error) {
    console.error('加载结果错误:', error);
    res.render('results', {
      searchId,
      files: [],
      message: '加载结果时出错'
    });
  }
});

// 新增FTP文件接口
app.get('/api/files', (req: Request, res: Response) => {
  (async () => {
    console.log('收到API请求:', req.query);
    const { month, day, name, searchId } = req.query;
    const imageExts = ['.jpg', '.jpeg', '.png', '.bmp', '.gif'];

    // 1. 支援 searchId 查詢（只回傳本地 cache 內容，不需 month/day/name）
    if (searchId) {
      const cacheDir = path.join(__dirname, '../cache', searchId as string);
      function getImageCreateTime(absPath: string): number {
        try {
          const buffer = fs.readFileSync(absPath);
          const parser = exifParser.create(buffer);
          const exif = parser.parse();
          if (exif.tags && exif.tags.DateTimeOriginal) {
            return exif.tags.DateTimeOriginal * 1000;
          }
          if (exif.tags && exif.tags.CreateDate) {
            return exif.tags.CreateDate * 1000;
          }
        } catch (e) {}
        return fs.statSync(absPath).mtime.getTime();
      }
      function walkDir(dir: string, base = ''): Array<{name: string, metaTime: number}> {
        let results: Array<{name: string, metaTime: number}> = [];
        if (!fs.existsSync(dir)) return results;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const relPath = path.join(base, entry.name);
          const absPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            results = results.concat(walkDir(absPath, relPath));
          } else if (entry.isFile() && imageExts.includes(path.extname(entry.name).toLowerCase())) {
            results.push({
              name: relPath.replace(/\\/g, '/'),
              metaTime: getImageCreateTime(absPath)
            });
          }
        }
        return results;
      }
      let files = walkDir(cacheDir);
      files.sort((a, b) => a.metaTime - b.metaTime);
      return res.json({ success: true, files });
    }

    // 2. 下載流程（需 month/day/name）
    if (!month || !day || !name) {
      return res.status(400).json({ success: false, message: '缺少必要参数: month, day 或 name' });
    }

    try {
      const monthStr = month.toString().padStart(2, '0');
      const dayStr = day.toString().padStart(2, '0');
      const folderMonth = monthStr;
      const searchId = `${monthStr}.${dayStr}${name}`;
      const cacheDir = path.join(__dirname, '../cache', searchId);

      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
        console.log(`[api/files] 自動建立本地目錄: ${cacheDir}`);
      }

      const client = await getFtpClient();
      // 修正：比對 targetPath 是否正確（姓氏有誤時自動嘗試「周淑華」與「周叔華」）
      let targetPath = path.posix.join('緻妍外科診所/顧客比對圖', monthFolderMap[folderMonth], `${folderMonth}.${dayStr}${name}`);
      let files: any[] = [];
      try {
        files = await listFiles(client, `/${targetPath}`);
      } catch (error: any) {
        // 嘗試自動修正常見姓氏錯字
        if (
          error.message &&
          error.message.includes('550') &&
          error.message.includes('No such file or directory') &&
          name.includes('叔華')
        ) {
          const altName = name.replace('叔華', '淑華');
          const altTargetPath = path.posix.join('緻妍外科診所/顧客比對圖', monthFolderMap[folderMonth], `${folderMonth}.${dayStr}${altName}`);
          try {
            files = await listFiles(client, `/${altTargetPath}`);
            targetPath = altTargetPath;
            console.log(`[api/files] 自動嘗試替換姓氏後成功: ${altTargetPath}`);
          } catch (altErr) {
            throw error; // 若還是失敗則拋出原始錯誤
          }
        } else {
          throw error;
        }
      }
      // 只下載影像檔
      files = files.filter(file => imageExts.includes(path.extname(file.name).toLowerCase()));
      // 以修改時間排序
      files.sort((a, b) => {
        const aTime = typeof a.modifiedAt === 'number' ? a.modifiedAt : new Date(a.modifiedAt).getTime();
        const bTime = typeof b.modifiedAt === 'number' ? b.modifiedAt : new Date(b.modifiedAt).getTime();
        return aTime - bTime;
      });

      let downloaded = 0, skipped = 0, errors = 0;
      for (const file of files) {
        const localPath = path.join(cacheDir, file.name);
        try {
          // 使用增强的下载函数，支持连接重试
          const result = await downloadWithRetry(file.path, localPath);
          if (result && result.downloaded) downloaded++;
          else if (result && result.downloaded === false) skipped++;
        } catch (err) {
          console.error(`下载失败: ${file.path}`, err);
          errors++;
          continue;
        }
      }

      await client.close();

      res.json({ 
        success: true,
        searchId,
        files: files.map(file => ({
          name: file.name,
          path: file.path,
          size: file.size,
          modifiedAt: file.modifiedAt
        })),
        downloaded,
        skipped,
        errors
      });
      
    } catch (error: unknown) {
      // 修正: 捕捉 FTP 550 錯誤，回傳更友善訊息
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        // 檢查 FTP 550 無此目錄
        if (errorMessage.includes('550') && errorMessage.includes('No such file or directory')) {
          return res.status(404).json({
            success: false,
            error: 'FTP 目錄不存在，請確認資料夾名稱或該用戶資料夾是否存在。',
            requestParams: req.query
          });
        }
      }
      console.error('API处理错误:', error);
      res.status(500).json({ 
        success: false,
        error: errorMessage,
        requestParams: req.query
      });
    }
  })().catch(err => {
    console.error('API处理错误:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: errorMessage,
      requestParams: req.query
    });
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
