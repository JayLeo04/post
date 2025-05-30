# 博客测试脚本 - Windows版本

Write-Host "开始测试博客功能..." -ForegroundColor Green

# 启动后端服务
Write-Host "启动后端服务..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; go run main.go"

# 等待后端启动
Start-Sleep -Seconds 5

# 启动前端服务
Write-Host "启动前端服务..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm start"

Write-Host ""
Write-Host "服务已启动：" -ForegroundColor Green
Write-Host "后端: http://localhost:8080" -ForegroundColor Cyan
Write-Host "前端: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "功能测试指南：" -ForegroundColor Yellow
Write-Host "1. 访问 http://localhost:3000 查看博客首页"
Write-Host "2. 访问 /posts 查看文章列表"
Write-Host "3. 访问 /tags 查看标签页面"
Write-Host "4. 访问 /admin/login 进入管理后台 (用户名: admin, 密码: admin)"
Write-Host "5. 在管理后台测试："
Write-Host "   - 创建和编辑文章"
Write-Host "   - 管理标签"
Write-Host "   - 测试标签过滤功能"
Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Red
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
