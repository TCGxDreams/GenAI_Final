#!/bin/bash

echo "Waiting for ngrok to start..."
sleep 10

echo "Getting ngrok public URL..."
# Try with container hostname (works inside Docker)
NGROK_URL=$(curl -s http://ngrok:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep -o 'http[^"]*')

# If that fails, try with localhost (works on host)
if [ -z "$NGROK_URL" ]; then
  NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep -o 'http[^"]*')
fi

if [ -z "$NGROK_URL" ]; then
  echo "Error: Không thể lấy URL ngrok. Vui lòng kiểm tra lại cấu hình."
  echo "Bạn có thể truy cập http://localhost:4040 để xem giao diện web của ngrok."
else
  echo "================================================"
  echo "🚀 API Bot của bạn đã sẵn sàng với URL công khai:"
  echo "$NGROK_URL/generate"
  echo "================================================"
fi