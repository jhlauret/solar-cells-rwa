#!/usr/bin/env bash
# Configure le serveur SMTP sortant dans Odoo via le JSON-RPC
# Usage : bash scripts/configure-smtp.sh
set -e

: "${ODOO_URL:=http://localhost:8069}"
: "${POSTGRES_DB:=solarcells}"
: "${SMTP_HOST:=smtp.mailgun.org}"
: "${SMTP_PORT:=587}"
: "${SMTP_USER:=}"
: "${SMTP_PASSWORD:=}"
: "${SMTP_FROM_EMAIL:=noreply@solarcells.com}"

echo "▶ Configuration SMTP dans Odoo..."

curl -s -X POST "${ODOO_URL}/web/dataset/call_kw" \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"method\": \"call\",
    \"id\": 1,
    \"params\": {
      \"model\": \"ir.mail_server\",
      \"method\": \"create\",
      \"args\": [{
        \"name\": \"SolarCells SMTP\",
        \"smtp_host\": \"${SMTP_HOST}\",
        \"smtp_port\": ${SMTP_PORT},
        \"smtp_user\": \"${SMTP_USER}\",
        \"smtp_pass\": \"${SMTP_PASSWORD}\",
        \"smtp_encryption\": \"starttls\",
        \"smtp_from\": \"${SMTP_FROM_EMAIL}\"
      }]
    }
  }" | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ SMTP configuré (id=%s)' % d.get('result','?'))"
