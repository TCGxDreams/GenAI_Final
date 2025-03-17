#!/bin/bash

# Script to get the ngrok URL without restarting services
# Run this if other scripts fail to retrieve the URL

echo "Checking current ngrok URL..."

# Try multiple methods to get the URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep -o 'http[^"]*')

if [ -z "$NGROK_URL" ]; then
  # Check Ngrok logs for URL
  echo "Searching in ngrok logs..."
  NGROK_URL=$(docker-compose logs --tail=100 ngrok | grep -o 'url=https://[^ ]*' | grep -o 'https://[^ ]*' | tail -1)
fi

if [ -z "$NGROK_URL" ]; then
  echo "❌ Không thể tìm thấy URL ngrok."
  echo ""
  echo "Vui lòng thử các bước sau:"
  echo "1. Kiểm tra logs: docker-compose logs ngrok"
  echo "2. Truy cập trực tiếp: http://localhost:4040"
  echo "3. Khởi động lại dịch vụ: docker-compose restart ngrok"
else
  echo "================================================"
  echo "🚀 URL công khai của API Bot:"
  echo "$NGROK_URL/generate"
  echo "================================================"
fi