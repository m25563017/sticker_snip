---
name: web-security-scan
description: >
  網頁資安弱點掃描 Skill。當使用者想在專案上線前進行安全性檢查、弱點掃描、資安審查，
  或提到 XSS、SQL Injection、CSRF、安全標頭、CORS、套件漏洞、敏感資料外洩等資安議題時，
  務必使用此 Skill。即使使用者只說「幫我掃一下安全性」、「上線前要注意什麼」、
  「檢查我的網站有沒有漏洞」也應觸發。支援前端程式碼審查、URL 掃描、
  package.json 分析、HTTP Headers 檢查等多種模式。
---

# Web Security Scan Skill

針對網頁專案上線前的資安弱點掃描，涵蓋 OWASP Top 10 核心項目。

## 掃描模式判斷

根據使用者提供的資訊，選擇對應的掃描模式：

| 使用者提供 | 執行模式 |
|-----------|---------|
| 網站 URL | 遠端標頭掃描 + 路徑探測 |
| 前端程式碼 (HTML/JS) | 靜態程式碼審查 |
| package.json / 依賴清單 | 套件漏洞掃描 |
| 都有提供 | 全面掃描（優先執行） |

若使用者沒有提供任何資訊，詢問他們要掃描哪個目標（URL 或上傳程式碼）。

---

## 執行流程

### Step 1：確認掃描目標

詢問（若未提供）：
- 網站 URL（如果已上線或有測試環境）
- 前端程式碼（HTML / JavaScript 檔案）
- `package.json`（npm 依賴）

### Step 2：執行各項掃描

依照掃描模式，執行以下對應腳本或分析：

#### 2A：URL 遠端掃描（有提供 URL 時）

執行 `scripts/scan_url.sh <URL>`，此腳本會：
- 抓取 HTTP Response Headers 並分析安全設定
- 測試常見敏感路徑是否可存取
- 確認 HTTPS/SSL 是否正確配置
- 偵測 CORS 設定是否過於寬鬆

#### 2B：程式碼靜態分析（有提供程式碼時）

執行 `scripts/scan_code.sh <file_or_dir>`，此腳本會：
- 搜尋 API Key / 密碼等敏感字串
- 偵測危險的 innerHTML / eval / document.write 使用
- 找出未過濾的使用者輸入
- 檢查 console.log 是否輸出敏感資料

#### 2C：套件漏洞掃描（有提供 package.json 時）

```bash
npm audit --json 2>/dev/null || true
```

若無法執行 npm，改用靜態版本比對（見 `references/known-vulnerable-packages.md`）。

### Step 3：整合結果並輸出報告

呼叫報告產生流程（見下方「報告格式」），輸出完整 Markdown 掃描報告。

---

## 各項目檢查細節

詳細規則定義在 `references/check-rules.md`，包含：
- 每個檢查項目的通過/失敗判斷條件
- 嚴重程度分級（Critical / High / Medium / Low / Info）
- 修復建議範例

掃描時需同步參考該文件。

---

## 報告格式

輸出一份 Markdown 報告，結構如下：

```markdown
# 🔐 網頁資安掃描報告

**掃描目標**：[URL 或程式碼路徑]  
**掃描時間**：[timestamp]  
**整體風險等級**：🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low

---

## 📊 掃描摘要

| 嚴重程度 | 數量 |
|---------|------|
| 🔴 Critical | N |
| 🟠 High | N |
| 🟡 Medium | N |
| 🟢 Low | N |
| ℹ️ Info | N |

---

## 🔍 詳細發現

### [問題名稱] — [嚴重程度]

- **說明**：問題描述
- **位置**：檔案行號 or HTTP Header 名稱
- **風險**：可能造成的危害
- **修復建議**：具體的修復方式與程式碼範例

---

## ✅ 通過項目

[列出掃描通過的安全項目]

---

## 📋 建議優先處理順序

1. [Critical 項目]
2. [High 項目]
3. [Medium 項目]

---

## 📚 參考資源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Mozilla Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
```

---

## 重要原則

1. **不執行任何破壞性測試** — 此 Skill 為被動掃描，不發送惡意 payload、不嘗試入侵
2. **若 URL 無法連線**，說明原因並改為程式碼審查模式
3. **給出具體修復範例** — 不只說「有問題」，要說明怎麼改
4. **依嚴重程度排序** — Critical 優先，讓使用者知道最重要的事先做
5. **用繁體中文輸出** — 報告語言跟使用者語言一致
