#!/bin/bash
# scan_code.sh — 對前端程式碼進行靜態安全分析
# 用法：bash scan_code.sh <file_or_directory>

set -euo pipefail
TARGET="${1:-}"

if [ -z "$TARGET" ] || [ ! -e "$TARGET" ]; then
  echo "用法：bash scan_code.sh <file_or_directory>"
  exit 1
fi

echo "========================================"
echo "  Web Security Code Scanner"
echo "  目標：$TARGET"
echo "  時間：$(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# 如果是目錄，掃描所有 JS/HTML/TS 檔案
if [ -d "$TARGET" ]; then
  FILES=$(find "$TARGET" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.html" -o -name "*.vue" -o -name "*.php" -o -name "*.py" -o -name "*.go" -o -name "*.java" \) \
    ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" ! -path "*/build/*" 2>/dev/null)
else
  FILES="$TARGET"
fi

if [ -z "$FILES" ]; then
  echo "⚠️  找不到可分析的程式碼檔案"
  exit 0
fi

FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
echo "找到 $FILE_COUNT 個檔案進行分析"
echo ""

echo "--- CODE_ANALYSIS_START ---"

# ──────────────────────────────────────────
# 1. API Key / 密碼硬編碼檢查
# ──────────────────────────────────────────
echo ""
echo "## 敏感資料外洩檢查"

PATTERNS=(
  "api[_-]?key\s*[:=]\s*['\"][a-zA-Z0-9]{16,}:Critical:API Key 硬編碼在前端"
  "secret\s*[:=]\s*['\"][^'\"]{8,}:Critical:Secret 硬編碼在前端"
  "password\s*[:=]\s*['\"][^'\"]{4,}:Critical:密碼硬編碼在前端"
  "sk-[a-zA-Z0-9]{32,}:Critical:OpenAI API Key 疑似外洩"
  "AIza[a-zA-Z0-9]{35}:High:Google API Key 疑似外洩"
  "AKIA[0-9A-Z]{16}:Critical:AWS Access Key 疑似外洩"
  "token\s*[:=]\s*['\"][a-zA-Z0-9\-_]{20,}:High:Token 硬編碼（請確認是否為測試用）"
)

for pattern_entry in "${PATTERNS[@]}"; do
  IFS=':' read -r pattern severity description <<< "$pattern_entry"
  while IFS= read -r file; do
    MATCHES=$(grep -niE "$pattern" "$file" 2>/dev/null || true)
    if [ -n "$MATCHES" ]; then
      while IFS= read -r match; do
        LINE=$(echo "$match" | cut -d: -f1)
        echo "FAIL|SECRET|$severity|$file:$LINE — $description"
      done <<< "$MATCHES"
    fi
  done <<< "$FILES"
done

# ──────────────────────────────────────────
# 2. 危險 JS 函式
# ──────────────────────────────────────────
echo ""
echo "## 危險函式使用檢查"

while IFS= read -r file; do
  # innerHTML
  INNER=$(grep -n "innerHTML\s*=" "$file" 2>/dev/null || true)
  if [ -n "$INNER" ]; then
    while IFS= read -r match; do
      LINE=$(echo "$match" | cut -d: -f1)
      echo "WARN|DANGEROUS_FUNC|High|$file:$LINE — 使用 innerHTML，若有使用者輸入請確認已過濾"
    done <<< "$INNER"
  fi

  # eval
  EVAL=$(grep -nE "\beval\s*\(" "$file" 2>/dev/null || true)
  if [ -n "$EVAL" ]; then
    while IFS= read -r match; do
      LINE=$(echo "$match" | cut -d: -f1)
      echo "FAIL|DANGEROUS_FUNC|High|$file:$LINE — 使用 eval()，這是非常危險的行為"
    done <<< "$EVAL"
  fi

  # document.write
  DOCWRITE=$(grep -n "document\.write(" "$file" 2>/dev/null || true)
  if [ -n "$DOCWRITE" ]; then
    while IFS= read -r match; do
      LINE=$(echo "$match" | cut -d: -f1)
      echo "WARN|DANGEROUS_FUNC|Medium|$file:$LINE — 使用 document.write()，可能造成 XSS"
    done <<< "$DOCWRITE"
  fi

  # setTimeout/setInterval with string
  TIMEOUT=$(grep -nE "setTimeout\s*\(\s*['\"]|setInterval\s*\(\s*['\"]" "$file" 2>/dev/null || true)
  if [ -n "$TIMEOUT" ]; then
    while IFS= read -r match; do
      LINE=$(echo "$match" | cut -d: -f1)
      echo "WARN|DANGEROUS_FUNC|Medium|$file:$LINE — setTimeout/setInterval 傳入字串等同 eval"
    done <<< "$TIMEOUT"
  fi
done <<< "$FILES"

# ──────────────────────────────────────────
# 2.5. 後端 SQL 注入風險初步檢查 (SQLi)
# ──────────────────────────────────────────
echo ""
echo "## 資料庫 SQL 注入風險檢查"

SQL_PATTERNS=(
  "(SELECT|INSERT|UPDATE|DELETE).*WHERE.*\s*\+\s*[a-zA-Z0-9_]+:High:SQL 語法疑似使用字串拼接，有 SQLi 風險"
  "mysql_query\(.*\$:High:使用已被棄用且危險的 mysql_query"
  "exec\(\s*['\"].*\$.*:High:系統指令執行 (Command Injection) 風險"
)

for pattern_entry in "${SQL_PATTERNS[@]}"; do
  IFS=':' read -r pattern severity description <<< "$pattern_entry"
  while IFS= read -r file; do
    MATCHES=$(grep -niE "$pattern" "$file" 2>/dev/null || true)
    if [ -n "$MATCHES" ]; then
      while IFS= read -r match; do
        LINE=$(echo "$match" | cut -d: -f1)
        echo "FAIL|SQL_INJECTION|$severity|$file:$LINE — $description"
      done <<< "$MATCHES"
    fi
  done <<< "$FILES"
done

# ──────────────────────────────────────────
# 3. console.log 洩漏
# ──────────────────────────────────────────
echo ""
echo "## console.log 敏感資料洩漏"

SENSITIVE_LOG_PATTERNS=("password" "token" "secret" "user" "response\.data" "apikey")

while IFS= read -r file; do
  for keyword in "${SENSITIVE_LOG_PATTERNS[@]}"; do
    LOGS=$(grep -niE "console\.log.*$keyword" "$file" 2>/dev/null || true)
    if [ -n "$LOGS" ]; then
      while IFS= read -r match; do
        LINE=$(echo "$match" | cut -d: -f1)
        echo "WARN|CONSOLE_LOG|Medium|$file:$LINE — console.log 可能洩漏敏感資料（包含關鍵字：$keyword）"
      done <<< "$LOGS"
    fi
  done
done <<< "$FILES"

# ──────────────────────────────────────────
# 4. URL 參數直接使用
# ──────────────────────────────────────────
echo ""
echo "## URL 參數/使用者輸入處理"

while IFS= read -r file; do
  URL_PARAMS=$(grep -nE "(location\.search|URLSearchParams|location\.hash).*innerHTML|innerHTML.*(location\.search|URLSearchParams)" "$file" 2>/dev/null || true)
  if [ -n "$URL_PARAMS" ]; then
    while IFS= read -r match; do
      LINE=$(echo "$match" | cut -d: -f1)
      echo "FAIL|XSS|High|$file:$LINE — URL 參數直接寫入 innerHTML，存在 XSS 風險"
    done <<< "$URL_PARAMS"
  fi
done <<< "$FILES"

# ──────────────────────────────────────────
# 5. CSRF Token 檢查（HTML 表單）
# ──────────────────────────────────────────
echo ""
echo "## CSRF 防護檢查"

while IFS= read -r file; do
  if [[ "$file" == *.html ]]; then
    POST_FORMS=$(grep -n 'method=["\']post["\']' "$file" 2>/dev/null || true)
    if [ -n "$POST_FORMS" ]; then
      CSRF_TOKEN=$(grep -i "csrf\|_token\|csrftoken" "$file" 2>/dev/null || true)
      if [ -z "$CSRF_TOKEN" ]; then
        echo "WARN|CSRF|High|$file — 找到 POST 表單但未發現 CSRF token 欄位"
      else
        echo "PASS|CSRF|$file — POST 表單有 CSRF token"
      fi
    fi
  fi
done <<< "$FILES"

echo ""
echo "--- CODE_ANALYSIS_END ---"
echo ""
echo "========================================"
echo "  程式碼掃描完成"
echo "========================================"
