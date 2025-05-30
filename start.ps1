# 启动整个博客项目的PowerShell脚本
Write-Host "=== 博客项目启动脚本 ===" -ForegroundColor Cyan
Write-Host ""

# 检查后端是否已经运行
$backendRunning = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($backendRunning) {
    Write-Host "✓ 后端服务器已在运行 (端口 8080)" -ForegroundColor Green
} else {
    Write-Host "启动后端服务器..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'c:\Users\leo\mysite\backend'; go run main.go" -WindowStyle Normal
    Write-Host "✓ 后端服务器启动中..." -ForegroundColor Green
    Start-Sleep -Seconds 3
}

# 检查前端是否已经运行
$frontendRunning = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($frontendRunning) {
    Write-Host "✓ 前端服务器已在运行 (端口 3000)" -ForegroundColor Green
} else {
    Write-Host "启动前端开发服务器..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'c:\Users\leo\mysite\frontend'; npm start" -WindowStyle Normal
    Write-Host "✓ 前端服务器启动中..." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== 服务器地址 ===" -ForegroundColor Cyan
Write-Host "前端地址: http://localhost:3000" -ForegroundColor White
Write-Host "后端API: http://localhost:8080" -ForegroundColor White
Write-Host "管理员登录: admin / admin123" -ForegroundColor White
Write-Host ""
Write-Host "=== 快速测试 ===" -ForegroundColor Cyan
Write-Host "测试页面: file:///c:/Users/leo/mysite/test.html" -ForegroundColor White
Write-Host ""

# 等待用户输入
Read-Host "按 Enter 键退出..."
