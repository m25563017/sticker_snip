#!/bin/bash
# scan_url.sh — 對目標 URL 執行被動安全掃描
# 用法：bash scan_url.sh https://example.com

set -euo pipefail
TARGET="${1:-}"

if [ -z "$TARGET" ]; then
  echo "用法：bash scan_url.sh <URL>"
  exit 1
fi

echo "========================================"
echo "  Web Security URL Scanner"
echo "  目標：$TARGET"
echo "  時間：$(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"
echo ""

# ──────────────────────────────────────────
# 1. 取得 HTTP Response Headers
# ──────────────────────────────────────────
echo "[1/4] 抓取 HTTP Response Headers..."
HEADERS=$(curl -s -I -L --max-time 15 \
  -H "User-Agent: SecurityScanner/1.0 (pre-launch audit)" \
  "$TARGET" 2>&1) || {
  echo "❌ 無法連接到 $TARGET，請確認 URL 是否正確且可存取"
  exit 1
}

echo "$HEADERS"
echo ""

# ──────────────────────────────────────────
# 2. 分析安全 Headers
# ──────────────────────────────────────────
echo "[2/4] 分析安全 Headers..."
echo "--- HEADER_ANALYSIS_START ---"

check_header() {
  local header_name="$1"
  local severity="$2"
  if echo "$HEADERS" | grep -qi "^$header_name:"; then
    echo "PASS|$header_name|$(echo "$HEADERS" | grep -i "^$header_name:" | head -1 | tr -d '\r')"
  else
    echo "FAIL|$header_name|$severity|缺少 $header_name Header"
  fi
}

check_header "Content-Security-Policy" "High"
check_header "X-Frame-Options" "Medium"
check_header "X-Content-Type-Options" "Low"
check_header "Strict-Transport-Security" "High"
check_header "Referrer-Policy" "Low"
check_header "Permissions-Policy" "Info"

# CORS 檢查
CORS=$(echo "$HEADERS" | grep -i "Access-Control-Allow-Origin" | head -1 | tr -d '\r' || true)
if [ -n "$CORS" ]; then
  if echo "$CORS" | grep -q "\*"; then
    echo "WARN|CORS|High|$CORS — 允許所有來源，請確認是否有 Credentials"
  else
    echo "PASS|CORS|$CORS"
  fi
fi

echo "--- HEADER_ANALYSIS_END ---"
echo ""

# ──────────────────────────────────────────
# 3. HTTPS 檢查
# ──────────────────────────────────────────
echo "[3/4] 檢查 HTTPS / SSL..."
echo "--- HTTPS_ANALYSIS_START ---"

if echo "$TARGET" | grep -q "^https://"; then
  echo "PASS|HTTPS|網站使用 HTTPS"
  # 檢查 HTTP 是否重導
  HTTP_URL=$(echo "$TARGET" | sed 's/^https:/http:/')
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HTTP_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo "PASS|HTTP_REDIRECT|HTTP 正確重導到 HTTPS（狀態碼 $HTTP_STATUS）"
  else
    echo "WARN|HTTP_REDIRECT|Medium|HTTP 版本回傳 $HTTP_STATUS，建議設定 301 重導到 HTTPS"
  fi
else
  echo "FAIL|HTTPS|Critical|網站未使用 HTTPS！"
fi

echo "--- HTTPS_ANALYSIS_END ---"
echo ""

# ──────────────────────────────────────────
# 4. 常見敏感路徑探測
# ──────────────────────────────────────────
echo "[4/4] 探測常見敏感路徑..."
echo "--- PATH_ANALYSIS_START ---"

BASE_URL=$(echo "$TARGET" | sed 's:/$::')

SENSITIVE_PATHS=(
  "/.env"
  "/.env.local"
  "/.env.production"
  "/.git/config"
  "/config.json"
  "/backup.zip"
  "/admin"
  "/phpinfo.php"
  "/.DS_Store"
  "/package.json"
  "/wp-login.php"
  "/composer.json"
  "/database.sql"
  "/db_backup.sql"
  "/dump.sql"
  "/api/users"
  "/swagger/v1/swagger.json"
)

for path in "${SENSITIVE_PATHS[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "$BASE_URL$path" 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    echo "FAIL|SENSITIVE_PATH|High|路徑可存取：$path（HTTP $STATUS）"
  elif [ "$STATUS" = "403" ]; then
    echo "INFO|SENSITIVE_PATH|路徑被禁止：$path（HTTP $STATUS）— 良好"
  else
    echo "PASS|SENSITIVE_PATH|$path（HTTP $STATUS）"
  fi
done

echo "--- PATH_ANALYSIS_END ---"
echo ""
echo "========================================"
echo "  掃描完成"
echo "========================================"
