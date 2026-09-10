# Web Security Check Rules

每個檢查項目的判斷條件、嚴重程度與修復建議。

---

## HTTP Security Headers

### 1. Content-Security-Policy (CSP)
- **嚴重程度**：High
- **失敗條件**：Response Headers 中缺少 `Content-Security-Policy`
- **風險**：允許 XSS 攻擊注入並執行惡意腳本
- **修復範例**：
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';
  ```

### 2. X-Frame-Options
- **嚴重程度**：Medium
- **失敗條件**：缺少 `X-Frame-Options` 且無 CSP frame-ancestors
- **風險**：頁面可被嵌入 iframe，造成點擊劫持（Clickjacking）
- **修復範例**：
  ```
  X-Frame-Options: DENY
  ```

### 3. X-Content-Type-Options
- **嚴重程度**：Low
- **失敗條件**：缺少 `X-Content-Type-Options: nosniff`
- **風險**：瀏覽器可能錯誤解析 MIME 類型，執行非預期腳本
- **修復範例**：
  ```
  X-Content-Type-Options: nosniff
  ```

### 4. Strict-Transport-Security (HSTS)
- **嚴重程度**：High（HTTPS 網站）
- **失敗條件**：HTTPS 網站缺少 `Strict-Transport-Security`
- **風險**：允許降級攻擊，用戶可能被導向 HTTP 版本
- **修復範例**：
  ```
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  ```

### 5. Referrer-Policy
- **嚴重程度**：Low
- **失敗條件**：缺少 `Referrer-Policy`
- **風險**：Referrer Header 可能洩漏敏感的 URL 資訊給第三方
- **修復範例**：
  ```
  Referrer-Policy: strict-origin-when-cross-origin
  ```

### 6. Permissions-Policy
- **嚴重程度**：Info
- **失敗條件**：缺少 `Permissions-Policy`
- **風險**：第三方腳本可能存取攝影機、麥克風、地理位置等
- **修復範例**：
  ```
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  ```

---

## CORS 設定

### 7. Access-Control-Allow-Origin 過於寬鬆
- **嚴重程度**：High
- **失敗條件**：回傳 `Access-Control-Allow-Origin: *` 且同時允許攜帶 Credentials
- **風險**：任何網域的前端都可以呼叫你的 API
- **修復範例**：
  ```
  Access-Control-Allow-Origin: https://yourdomain.com
  ```

---

## 敏感資料外洩（程式碼審查）

### 8. API Key / 密碼寫在前端
- **嚴重程度**：Critical
- **失敗條件**：JS 程式碼中出現以下 pattern：
  ```
  /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{16,}/i
  /secret\s*[:=]\s*['"][^'"]{8,}/i
  /password\s*[:=]\s*['"][^'"]{4,}/i
  /token\s*[:=]\s*['"][a-zA-Z0-9\-_]{20,}/i
  /sk-[a-zA-Z0-9]{32,}/   // OpenAI key
  /AIza[a-zA-Z0-9]{35}/   // Google API key
  ```
- **修復建議**：所有機密資訊移至後端環境變數，前端不得存放任何 secret

### 9. console.log 洩漏敏感資料
- **嚴重程度**：Medium
- **失敗條件**：`console.log` 包含 user、token、password、response data 等關鍵字
- **修復建議**：上線前移除所有 console.log，或使用條件判斷僅在開發環境輸出

### 10. innerHTML / eval 使用
- **嚴重程度**：High
- **失敗條件**：程式碼中出現 `innerHTML =`、`eval(`、`document.write(`
- **風險**：若內容來自使用者輸入，可能被用於 XSS 攻擊
- **修復建議**：
  - 改用 `textContent` 而非 `innerHTML`
  - 絕不使用 `eval()`
  - 若必須插入 HTML，使用 DOMPurify 先做清理

### 11. 未過濾的 URL 參數直接塞入 DOM
- **嚴重程度**：High
- **失敗條件**：`location.search`、`URLSearchParams` 的值直接寫入 innerHTML
- **修復建議**：對所有外部輸入做 HTML encode 或使用 textContent

---

## 敏感路徑暴露

### 12. .env 檔案可存取
- **嚴重程度**：Critical
- **失敗條件**：`/.env` 回傳 200 且有內容
- **修復建議**：設定 web server 禁止存取 `.env` 檔案

### 13. 常見敏感路徑
- **嚴重程度**：High（若回傳 200）
- **檢查路徑列表**：
  ```
  /.env
  /.env.local
  /.env.production
  /config.json
  /config.js
  /.git/config
  /backup.zip
  /admin
  /phpinfo.php
  /wp-login.php
  /.DS_Store
  /package.json
  /composer.json
  ```
- **修復建議**：確保 web server 設定拒絕存取這些路徑

---

## SSL / HTTPS

### 14. 未使用 HTTPS
- **嚴重程度**：Critical
- **失敗條件**：網站在 HTTP 上運行，沒有重導到 HTTPS
- **修復建議**：申請 Let's Encrypt 免費憑證，設定 301 重導

### 15. HTTP 未自動跳轉 HTTPS
- **嚴重程度**：High
- **失敗條件**：訪問 `http://` 版本沒有 301/302 重導到 `https://`
- **修復建議**：在 web server 設定中加入重導規則

---

## npm 套件漏洞

### 16. 已知漏洞套件
- **嚴重程度**：依 npm audit 的嚴重程度分級
- **失敗條件**：`npm audit` 回傳 vulnerabilities > 0
- **分級對應**：
  - npm `critical` → 🔴 Critical
  - npm `high` → 🟠 High
  - npm `moderate` → 🟡 Medium
  - npm `low` → 🟢 Low
- **修復建議**：執行 `npm audit fix`，或手動升級到安全版本

---

## CSRF 防護

### 17. 表單缺少 CSRF Token
- **嚴重程度**：High
- **失敗條件**：HTML 表單中有 POST method 但沒有 hidden input 的 csrf token
- **修復建議**：後端框架通常有內建 CSRF middleware，確認有啟用

---

## 嚴重程度定義

| 等級 | 說明 | 建議處理時間 |
|------|------|------------|
| 🔴 Critical | 可直接導致資料外洩或系統被控制 | 上線前必須修復 |
| 🟠 High | 容易被利用，風險高 | 上線前強烈建議修復 |
| 🟡 Medium | 需要特定條件才能利用 | 上線後一個月內修復 |
| 🟢 Low | 風險低，屬於最佳實踐 | 排入技術債處理 |
| ℹ️ Info | 提供資訊，不影響安全 | 參考即可 |
