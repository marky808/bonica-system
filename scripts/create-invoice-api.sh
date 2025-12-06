#!/bin/bash
source .env.vercel.production

TOKEN=$(curl -s -X POST "https://bonica-system.vercel.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$INITIAL_ADMIN_EMAIL\",\"password\":\"$INITIAL_ADMIN_PASSWORD\"}" | jq -r '.token')

echo "Token: ${TOKEN:0:20}..."

curl -s -X POST "https://bonica-system.vercel.app/api/google-sheets/create-invoice-v2" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customerId": "cmisgxhyp0002ljuisjbh4246", "startDate": "2025-11-01", "endDate": "2025-11-30"}' | jq .
