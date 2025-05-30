#!/bin/bash

echo "开始测试博客功能..."

# 启动后端服务
echo "启动后端服务..."
cd backend
go run main.go &
BACKEND_PID=$!

# 等待后端启动
sleep 5

# 启动前端服务
echo "启动前端服务..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo "服务已启动："
echo "后端: http://localhost:8080"
echo "前端: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
