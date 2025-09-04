import basicFtp from "basic-ftp";
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();

const ftpHost = process.env.FTP_HOST || '192.168.68.105';
const ftpPort = process.env.FTP_PORT || 21;
const ftpUser = process.env.FTP_USER || 'nas123';
const ftpPassword = process.env.FTP_PASSWORD || 'Abc123abc';
const ftpRootPath = process.env.FTP_ROOT_PATH || '緻妍外科診所/顧客比對圖';

async function getFtpClient() {
  const client = new basicFtp.Client();
  client.ftp.verbose = true;
  
  // 设置超时配置
  client.ftp.timeout = 60000; // 60秒超时
  client.ftp.keepAlive = 30000; // 30秒keepalive
  
  const encodings = ['utf8', 'binary', 'gbk', 'big5'];
  let lastError = null;
  for (const encoding of encodings) {
    try {
      console.log(`尝试使用编码: ${encoding}`);
      await client.access({
        host: ftpHost,
        port: ftpPort,
        user: ftpUser,
        password: ftpPassword,
        secure: false,
        forcePasv: true,
        encoding: encoding,
        connTimeout: 30000, // 连接超时30秒
        pasvTimeout: 30000, // 被动模式超时30秒
        ipFamily: 4 // 强制使用IPv4，避免IPv6被动模式问题
      });
      console.log(`FTP 连接成功 (编码: ${encoding})`);
      return client;
    } catch (err) {
      console.error(`编码 ${encoding} 失败:`, err.message);
      lastError = err;
      try { await client.close(); } catch {}
    }
  }
  console.error("所有编码方式均失败");
  throw new Error(`无法建立FTP连接。最后错误: ${lastError?.message}`);
}

async function listFiles(client, dirPath, maxDepth = 3, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  try {
    const encodedPath = dirPath;
    const fullPath = encodedPath.startsWith('/') ? encodedPath : 
      path.posix.join('/', ftpRootPath, encodedPath);
    console.log('完整FTP路径:', {
      ftpRootPath,
      dirPath,
      combined: fullPath,
      isAbsolute: path.posix.isAbsolute(fullPath)
    });
    const list = await client.list(fullPath);
    let files = [];
    for (const item of list) {
      if (item.type === 1 && (item.name.endsWith('.jpg') || item.name.endsWith('.png'))) {
        files.push({
          name: item.name,
          path: path.posix.join(fullPath, item.name),
          size: item.size,
          modifiedAt: item.modifiedAt,
          depth: currentDepth
        });
      } else if (item.type === 2) {
        const subFiles = await listFiles(
          client,
          path.posix.join(dirPath, item.name),
          maxDepth,
          currentDepth + 1
        );
        files = files.concat(subFiles);
      }
    }
    return files;
  } catch (err) {
    console.error(`Error listing ${dirPath}:`, err);
    throw err;
  }
}

async function downloadFile(client, ftpFilePath, localFilePath, maxRetries = 3) {
  console.log(`[downloadFile] 準備下載: ${ftpFilePath} -> ${localFilePath}`);
  
  // 檢查現有檔案是否已存在且完整（快速檢查）
  if (fs.existsSync(localFilePath)) {
    try {
      // 快速檢查檔案大小是否合理（大於1KB）
      const stats = fs.statSync(localFilePath);
      if (stats.size > 1024) {
        console.log(`[downloadFile] 檔案已存在，跳過下載: ${localFilePath} (${stats.size} bytes)`);
        return { downloaded: false, hash: 'existing' };
      } else {
        console.log(`[downloadFile] 現有檔案太小，重新下載: ${localFilePath}`);
      }
    } catch (e) {
      console.log(`[downloadFile] 現有檔案損壞，重新下載: ${localFilePath}`);
    }
  }
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const dirPath = path.dirname(localFilePath);
      if (!fs.existsSync(dirPath)) {
        await fs.promises.mkdir(dirPath, { recursive: true });
      }
      
      const tempPath = `${localFilePath}.tmp`;
      
      console.log(`[downloadFile] 嘗試 ${attempt}/${maxRetries}: ${ftpFilePath}`);
      
      // 清理可能存在的临时文件
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
      
      // 使用更快的下載方法，禁用冗餘日誌
      const originalVerbose = client.ftp.verbose;
      client.ftp.verbose = false; // 禁用詳細日誌提高速度
      
      await client.downloadTo(tempPath, ftpFilePath);
      
      client.ftp.verbose = originalVerbose; // 恢復原始設置
      
      // 快速驗證下載的文件
      if (!fs.existsSync(tempPath)) {
        throw new Error('下載的檔案不存在');
      }
      
      const stats = fs.statSync(tempPath);
      if (stats.size === 0) {
        throw new Error('下載的檔案為空');
      }
      
      // 只有在需要時才計算哈希（提高速度）
      let hash = 'skipped';
      if (attempt === 1) { // 只在第一次嘗試時計算哈希
        const fileBuffer = await fs.promises.readFile(tempPath);
        hash = crypto.createHash('md5').update(fileBuffer).digest('hex');
      }
      
      await fs.promises.rename(tempPath, localFilePath);
      console.log(`[downloadFile] 下載成功: ${localFilePath} (${stats.size} bytes)`);
      return { downloaded: true, hash };
      
    } catch (err) {
      console.error(`[downloadFile] 嘗試 ${attempt}/${maxRetries} 失敗: ${ftpFilePath}`, err.message);
      
      // 清理临时文件
      const tempPath = `${localFilePath}.tmp`;
      if (fs.existsSync(tempPath)) {
        try {
          await fs.promises.unlink(tempPath);
        } catch (e) {}
      }
      
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        throw new Error(`下載失敗，已重試 ${maxRetries} 次: ${err.message}`);
      }
      
      // 检查是否需要重新连接
      if (err.message.includes('closed') || err.message.includes('timeout') || err.message.includes('connection')) {
        console.log(`[downloadFile] 連接問題，嘗試重新連接...`);
        try {
          await client.close();
        } catch (e) {}
        // 这里需要重新获取客户端，但由于架构限制，只能等待上层重试
      }
      
      // 等待后重试（更短的等待時間）
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.min(attempt, 3)));
    }
  }
}

export { getFtpClient, listFiles, downloadFile };
