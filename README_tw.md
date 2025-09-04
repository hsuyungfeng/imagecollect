# 緻妍外科診所 - 影像搜尋管理系統

## 📋 專案概述

本系統為緻妍外科診所開發的專業影像管理平台，透過網頁介面連接 FTP 伺服器，提供高效能的病患比對圖搜尋、預覽與管理功能。系統支援智能快取、多條件查詢與響應式圖片瀏覽，專為醫療機構內部使用設計。

### 🏗️ 技術架構
- **後端**: Node.js + Express + TypeScript
- **前端**: EJS 模板引擎 + 原生 JavaScript
- **傳輸協定**: FTP 客戶端整合
- **圖片處理**: EXIF 元數據提取
- **套件管理**: UV (現代化 Python 套件管理器)

---

## ⚙️ 環境需求

### 必要環境
- **Node.js**: 18.x 或以上版本 (建議 LTS)
- **UV**: 最新版本 (Python 套件管理器)
- **作業系統**: Linux/Windows/macOS

### 網路需求
- 可連線至 FTP 伺服器 (192.168.68.105:21)
- 支援中文編碼環境

---

## 🚀 快速開始

### 1. 安裝 UV 套件管理器
```bash
# 安裝 UV (如果尚未安裝)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 驗證安裝
uv --version
```

### 2. 專案設定與依賴安裝
```bash
# 複製專案 (如果從版本控制取得)
git clone <專案倉庫網址>
cd imagecollect

# 使用 UV 安裝 Node.js 依賴
uv pip install -r requirements.txt

# 或使用傳統 npm 安裝
npm install
```

### 3. 環境變數設定
複製並編輯環境設定檔：
```bash
cp .env.example .env
```

編輯 `.env` 檔案內容：
```env
FTP_HOST=192.168.68.105
FTP_PORT=21
FTP_USER=nas123
FTP_PASSWORD=Abc123abc
FTP_BASE_PATH=緻妍外科診所/顧客比對圖
PORT=3001
NODE_ENV=production
```

### 4. 啟動服務

#### 開發模式 (熱重載)
```bash
npm run dev
```

#### 生產模式
```bash
# 編譯 TypeScript
npm run build

# 啟動服務
npm start

# 或直接執行
node dist/app.js
```

### 5. 存取系統
開啟瀏覽器並訪問：
```
http://localhost:3001
```

---

## 🎯 功能特色

### 🔍 智能搜尋功能
- **多條件查詢**: 月份、日期、姓名組合搜尋
- **自動月份映射**: 01-02 → "生日1-2月" 智能轉換
- **即時預覽**: 輸入時即時顯示匹配結果

### 🖼️ 圖片管理功能
- **響應式網格**: 自適應 5 列圖片布局
- **高清預覽**: 點擊圖片放大檢視
- **縮放控制**: 滾輪縮放 (1-4倍) + 拖曳移動
- **多圖比對**: 支援 2-4 張圖片同時比對

### ⌨️ 鍵盤快捷鍵
| 按鍵 | 功能 |
|------|------|
| `ESC` | 關閉預覽/清除選取 |
| `Tab` | 清除所有選取圖片 |
| `← →` | 上一張/下一張圖片 |
| `↑ ↓` | 放大/縮小圖片 |
| `雙擊` | 關閉圖片預覽 |

### 💾 智能快取系統
- **自動快取**: 下載圖片至本地儲存
- **重複檢查**: MD5 驗證避免重複下載
- **效能優化**: 並行下載 + 連線池管理

### 🌐 編碼支援
- 多編碼自動偵測 (UTF-8, GBK, Big5, Binary)
- 中文路徑完整支援
- 檔案名稱繁簡自動轉換

---

## 🛠️ 進階部署

### Systemd 服務設定 (Linux)

#### 1. 建立服務檔案
```bash
sudo nano /etc/systemd/system/imagecollect.service
```

#### 2. 服務內容
```ini
[Unit]
Description=緻妍外科影像搜尋系統
After=network.target

[Service]
Type=simple
User=您的使用者名稱
WorkingDirectory=/path/to/imagecollect
ExecStart=/usr/bin/node /path/to/imagecollect/dist/app.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/path/to/imagecollect/.env

[Install]
WantedBy=multi-user.target
```

#### 3. 啟用服務
```bash
# 重新載入設定
sudo systemctl daemon-reload

# 啟用開機啟動
sudo systemctl enable imagecollect

# 啟動服務
sudo systemctl start imagecollect

# 檢查狀態
sudo systemctl status imagecollect
```

### Ubuntu 桌面捷徑

#### 1. 建立桌面啟動器
```bash
nano ~/桌面/緻妍影像搜尋.desktop
```

#### 2. 啟動器內容
```ini
[Desktop Entry]
Version=1.0
Name=緻妍外科影像搜尋
Comment=啟動影像搜尋管理系統
Exec=firefox http://localhost:3001/
Icon=web-browser
Terminal=false
Type=Application
Categories=Utility;
StartupNotify=true
```

#### 3. 設定執行權限
```bash
chmod +x ~/桌面/緻妍影像搜尋.desktop
```

---

## 📊 API 端點

### RESTful API 接口

#### GET `/api/files`
- **查詢參數**: 
  - `month`, `day`, `name`: FTP 搜尋下載
  - `searchId`: 本地快取讀取
- **回應**: JSON 格式檔案列表

#### GET `/api/sync`  
- **功能**: FTP 同步到本地快取
- **參數**: `month`, `day`, `name` (必填)
- **回傳**: 下載統計資訊

#### GET `/results`
- **功能**: 顯示搜尋結果頁面
- **參數**: `searchId` (必填)
- **內容**: 圖片網格與預覽功能

---

## 🔧 故障排除

### 常見問題解決

#### ❌ FTP 連線失敗
```bash
# 檢查網路連線
ping 192.168.68.105

# 檢查防火牆設定
sudo ufw status
```

#### ❌ 編碼問題
- 確認 FTP 伺服器支援中文編碼
- 檢查 `.env` 檔案編碼為 UTF-8

#### ❌ 權限問題
```bash
# 確保快取目錄可寫入
chmod 755 cache/

# 檢查檔案擁有者
ls -la cache/
```

#### ❌ 記憶體不足
```bash
# 監控記憶體使用
free -h

# 重啟服務釋放記憶體
sudo systemctl restart imagecollect
```

### 日誌檢查
```bash
# 查看即時日誌
journalctl -u imagecollect -f

# 查看錯誤日誌
journalctl -u imagecollect -p err
```

---

## 📈 效能優化

### 傳輸速度提升技巧
1. **並行下載限制**: 同時最多 5 個連線
2. **連線復用**: 保持 FTP 連線存活
3. **本地快取**: 減少重複下載
4. **智慧重試**: 指數退避重試機制

### 記憶體優化
- 定期清理快取目錄
- 監控記憶體使用情況
- 設定適當的垃圾回收

---

## 📝 版本資訊

### 當前版本: v1.0.0
- ✅ FTP 連線與檔案管理
- ✅ 智能搜尋與快取系統  
- ✅ 響應式圖片預覽介面
- ✅ 多編碼語言支援
- ✅ 系統服務整合

### 依賴版本
```json
{
  "express": "^5.1.0",
  "basic-ftp": "^5.0.5", 
  "ejs": "^3.1.10",
  "typescript": "^5.8.3"
}
```

---

## 📞 技術支援

### 問題回報
如遇技術問題，請提供以下資訊：
1. 錯誤訊息與日誌
2. 操作步驟重現
3. 系統環境資訊

### 聯絡方式
- **系統管理員**: 診所資訊部門
- **開發團隊**: 技術支援小組
- **緊急聯絡**: 專線電話

---

## 📄 授權資訊

本系統為緻妍外科診所內部使用，僅限授權人員存取。所有病患資料應遵循醫療隱私保護規範。

---

*最後更新: 2024年12月*  
*版本: 1.0.0*  
*緻妍外科診所 資訊部*