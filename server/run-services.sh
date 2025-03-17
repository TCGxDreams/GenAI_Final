#!/bin/bash

# Start Docker services
echo "Starting API and ngrok services..."
docker-compose up -d

# Wait for ngrok to initialize
echo "Waiting for ngrok to initialize (15 seconds)..."
sleep 15

# Try to get ngrok URL
echo "Retrieving public URL..."

# First try using localhost (from host machine)
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep -o 'http[^"]*')

if [ -z "$NGROK_URL" ]; then
  # If that fails, try from within Docker network (useful if running this script in Docker)
  NGROK_URL=$(docker-compose exec -T ngrok curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*' | grep -o 'http[^"]*')
fi

if [ -z "$NGROK_URL" ]; then
  echo "Error: Không thể lấy URL ngrok. Vui lòng kiểm tra lại cấu hình."
  echo "Bạn có thể truy cập http://localhost:4040 để xem giao diện web của ngrok."
  echo "Hãy kiểm tra xem NGROK_AUTH_TOKEN trong file .env có chính xác không."
else
  echo "================================================"
  echo "🚀 API Bot của bạn đã sẵn sàng với URL công khai:"
  echo "$NGROK_URL/generate"
  echo "================================================"
fi

echo "Các lệnh hữu ích:"
echo "- Xem logs: docker-compose logs -f"
echo "- Dừng dịch vụ: docker-compose down"
echo "- Khởi động lại: docker-compose restart"