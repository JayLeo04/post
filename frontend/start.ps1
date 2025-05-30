# PowerShell script to start frontend
Set-Location "c:\Users\leo\mysite\frontend"
Write-Host "Starting frontend development server..." -ForegroundColor Green
Write-Host "Navigate to http://localhost:3000 in your browser" -ForegroundColor Yellow

# Start npm in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start" -WorkingDirectory "c:\Users\leo\mysite\frontend"
