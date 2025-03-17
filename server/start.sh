#!/bin/bash

# Khởi động API server
node server.js &

# Lưu PID của node process
NODE_PID=$!

# Theo dõi logs
tail -f /dev/null

# Đảm bảo xử lý signal đúng cách
trap "kill $NODE_PID" SIGINT SIGTERM
wait $NODE_PID
