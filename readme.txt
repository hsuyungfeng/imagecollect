# 緻妍外科診所 影像搜尋系
## 專案簡
本系統可通過網頁搜尋 FTP 影像資料，支援多條件查詢、自動快取、圖片預覽與放大，適用於診所內部影像管理。

---

## 依賴環境

- Node.js 版本：18.x 以上（建議 LTS 版本）
- npm 版本：8.x 以上
- 主要依賴：
  - express
  - ejs
  - basic-ftp
  - dotenv
  - uuid

---

## 安裝與部屬步驟

1. **下載專案**
   ```bash
   git clone <你的repo網址>
   cd imagecollect
   ```

2. **安裝依賴**
   ```bash
   npm install
   ```

3. **設定環境變數**
   - 複製 `.env.example` 為 `.env`，並填入 FTP 連線資訊：
     ```
     FTP_HOST=192.168.68.105
     FTP_PORT=21
     FTP_USER=nas123
     FTP_PASSWORD=Abc123abc
     ```

4. **啟動服務**
   - 開發模式（自動編譯 TypeScript 並啟動）：
     ```bash
     npm run dev
     ```
   - 生產/正式模式（先編譯再啟動）：
     ```bash
     npm run build
     npm start
     ```
   - 或直接執行已編譯的 JS：
     ```bash
     node dist/app.js
     ```

5. **瀏覽器開啟首頁**
   ```
   http://localhost:3000/
   ```

---

## 功能說明

- 多條件搜尋（月份、日期、姓名）
- 圖片自動快取與分組
- 響應式圖片網格，支援：
  - 左鍵點擊開啟圖片
  - 滑鼠滾輪縮放（1-4倍）
  - 雙擊圖片關閉預覽
  - 圖片按拍攝時間排序（由左至右，由上至下）
- 支援多用戶同時查詢

---

## 常見問題

- **FTP 連線失敗？**  
  請確認 FTP 服務器可連線、帳密正確，且本機網路可達。

- **快取目錄過大？**  
  系統自動清理超過 100MB 的快取。

---

## 依賴版本（package.json 主要內容）

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "ejs": "^3.1.9",
    "basic-ftp": "^5.0.5",
    "dotenv": "^16.0.3",
    "uuid": "^9.0.1"
  }
}
```

---

## 在 Ubuntu 桌面建立一鍵啟動捷徑

1. **建立桌面啟動器檔案**

   在桌面建立 `imagecollect.desktop`，內容如下（請根據實際路徑調整）：

   ```ini
   [Desktop Entry]
   Name=緻妍外科影像搜尋
   Comment=啟動緻妍外科影像搜尋系統
   Exec=xdg-open http://localhost:3000/
   Icon=web-browser
   Terminal=false
   Type=Application
   Categories=Utility;
   ```

2. **給予執行權限**
   ```bash
   chmod +x ~/桌面/imagecollect.desktop
   ```

3. **啟動服務**
   - 請先在終端機啟動 `npm start` 或 `node src/app.js`
   - 然後雙擊桌面捷徑即可自動開啟瀏覽器進入搜尋頁面

---

## 開機自動啟動服務與自動開啟瀏覽器（Ubuntu）

### 1. 設定 Node.js 服務開機自動啟動

1. 建立 systemd 服務檔案  
   在終端機輸入（請將 `你的使用者名稱` 替換為實際帳號）：
   ```bash
   sudo nano /etc/systemd/system/imagecollect.service
   ```
2. 內容如下（請根據你的專案路徑調整）：
   ```
   [Unit]
   Description=緻妍外科影像搜尋 Node.js 服務
   After=network.target

   [Service]
   Type=simple
   User=你的使用者名稱
   WorkingDirectory=/home/你的使用者名稱/imagecollect
   ExecStart=/usr/bin/node /home/你的使用者名稱/imagecollect/src/app.js
   Restart=always
   Environment=NODE_ENV=production

   [Install]
   WantedBy=multi-user.target
   ```
3. 重新載入 systemd 並啟用服務
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable imagecollect
   sudo systemctl start imagecollect
   ```

### 2. 開機自動開啟瀏覽器

1. 開啟「啟動應用程式」（Startup Applications），點選「新增」(Add)。
2. 名稱自訂，指令填：
   ```
   xdg-open http://localhost:3000/
   ```
   或指定瀏覽器：
   ```
   firefox http://localhost:3000/
   ```
3. 儲存即可。

---

完成以上設定後，每次開機會自動啟動 Node.js 服務，並自動開啟瀏覽器進入搜尋首頁。

---

## 聯絡方式

如有問題請聯絡系統管理員或開發者。
