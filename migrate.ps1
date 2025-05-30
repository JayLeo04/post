# 博客数据迁移脚本 (PowerShell版本)
# 用于在不同服务器之间迁移博客数据

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Action,
    
    [Parameter(Position=1)]
    [string]$SourceUrl,
    
    [Parameter(Position=2)]
    [string]$TargetUrl,
    
    [Parameter(Position=3)]
    [string]$SourceToken,
    
    [Parameter(Position=4)]
    [string]$TargetToken,
    
    [Parameter(Position=5)]
    [string]$BackupFile
)

# 配置变量
$BackupDir = ".\backups"
$TempDir = ".\temp"

# 创建备份目录
function Create-BackupDir {
    if (!(Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    if (!(Test-Path $TempDir)) {
        New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
    }
}

# 显示帮助信息
function Show-Help {
    Write-Host "博客数据迁移脚本 (PowerShell版本)" -ForegroundColor Green
    Write-Host ""
    Write-Host "用法:"
    Write-Host "  .\migrate.ps1 export <source_url> <admin_token>     - 从源服务器导出数据"
    Write-Host "  .\migrate.ps1 import <target_url> <admin_token> <backup_file>  - 向目标服务器导入数据"
    Write-Host "  .\migrate.ps1 migrate <source_url> <target_url> <source_token> <target_token>  - 完整迁移"
    Write-Host "  .\migrate.ps1 info <url> <admin_token>  - 获取数据库信息"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\migrate.ps1 export http://localhost:8080 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    Write-Host "  .\migrate.ps1 import http://newserver:8080 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... backup.json"
    Write-Host "  .\migrate.ps1 migrate http://old:8080 http://new:8080 old_token new_token"
}

# 导出数据
function Export-Data {
    param(
        [string]$SourceUrl,
        [string]$Token
    )
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "$BackupDir\blog_export_$timestamp.json"
    
    Write-Host "正在从 $SourceUrl 导出数据..." -ForegroundColor Yellow
    
    try {
        $headers = @{
            "Authorization" = "Bearer $Token"
            "Accept" = "application/json"
        }
        
        Invoke-RestMethod -Uri "$SourceUrl/api/admin/export" -Headers $headers -OutFile $backupFile
        
        Write-Host "数据导出成功: $backupFile" -ForegroundColor Green
        return $backupFile
    }
    catch {
        Write-Host "数据导出失败: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# 导入数据
function Import-Data {
    param(
        [string]$TargetUrl,
        [string]$Token,
        [string]$BackupFile,
        [bool]$ClearExisting = $false
    )
    
    if (!(Test-Path $BackupFile)) {
        Write-Host "备份文件不存在: $BackupFile" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "正在向 $TargetUrl 导入数据..." -ForegroundColor Yellow
    
    try {
        $headers = @{
            "Authorization" = "Bearer $Token"
        }
        
        $multipartContent = [System.Net.Http.MultipartFormDataContent]::new()
        $fileContent = [System.Net.Http.StreamContent]::new([System.IO.File]::OpenRead($BackupFile))
        $fileContent.Headers.ContentDisposition = [System.Net.Http.Headers.ContentDispositionHeaderValue]::new("form-data")
        $fileContent.Headers.ContentDisposition.Name = "file"
        $fileContent.Headers.ContentDisposition.FileName = [System.IO.Path]::GetFileName($BackupFile)
        $multipartContent.Add($fileContent)
        
        $clearContent = [System.Net.Http.StringContent]::new($ClearExisting.ToString().ToLower())
        $clearContent.Headers.ContentDisposition = [System.Net.Http.Headers.ContentDispositionHeaderValue]::new("form-data")
        $clearContent.Headers.ContentDisposition.Name = "clear_existing"
        $multipartContent.Add($clearContent)
        
        $mergeContent = [System.Net.Http.StringContent]::new("true")
        $mergeContent.Headers.ContentDisposition = [System.Net.Http.Headers.ContentDispositionHeaderValue]::new("form-data")
        $mergeContent.Headers.ContentDisposition.Name = "merge_mode"
        $multipartContent.Add($mergeContent)
        
        $response = Invoke-RestMethod -Uri "$TargetUrl/api/admin/import" -Method Post -Headers $headers -Body $multipartContent
        
        Write-Host "数据导入成功" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10 | Write-Host
    }
    catch {
        Write-Host "数据导入失败: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# 获取数据库信息
function Get-DatabaseInfo {
    param(
        [string]$Url,
        [string]$Token
    )
    
    Write-Host "获取数据库信息..." -ForegroundColor Yellow
    
    try {
        $headers = @{
            "Authorization" = "Bearer $Token"
            "Accept" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "$Url/api/admin/database/info" -Headers $headers
        $response | ConvertTo-Json -Depth 10 | Write-Host
    }
    catch {
        Write-Host "获取数据库信息失败: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 完整迁移
function Start-FullMigration {
    param(
        [string]$SourceUrl,
        [string]$TargetUrl,
        [string]$SourceToken,
        [string]$TargetToken
    )
    
    Write-Host "开始完整数据迁移" -ForegroundColor Green
    Write-Host "源服务器: $SourceUrl"
    Write-Host "目标服务器: $TargetUrl"
    Write-Host ""
    
    # 获取源数据库信息
    Write-Host "=== 源数据库信息 ===" -ForegroundColor Yellow
    Get-DatabaseInfo $SourceUrl $SourceToken
    Write-Host ""
    
    # 导出数据
    $backupFile = Export-Data $SourceUrl $SourceToken
    Write-Host ""
    
    # 获取目标数据库信息
    Write-Host "=== 目标数据库信息 (导入前) ===" -ForegroundColor Yellow
    Get-DatabaseInfo $TargetUrl $TargetToken
    Write-Host ""
    
    # 询问是否清除目标数据库现有数据
    $clearChoice = Read-Host "是否清除目标数据库的现有数据? (y/N)"
    $clearExisting = $false
    if ($clearChoice -eq "y" -or $clearChoice -eq "Y") {
        $clearExisting = $true
        Write-Host "将清除目标数据库现有数据" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # 导入数据
    Import-Data $TargetUrl $TargetToken $backupFile $clearExisting
    Write-Host ""
    
    # 获取目标数据库信息 (导入后)
    Write-Host "=== 目标数据库信息 (导入后) ===" -ForegroundColor Yellow
    Get-DatabaseInfo $TargetUrl $TargetToken
    Write-Host ""
    
    Write-Host "迁移完成!" -ForegroundColor Green
}

# 主程序
Create-BackupDir

switch ($Action.ToLower()) {
    "export" {
        if (!$SourceUrl -or !$SourceToken) {
            Write-Host "错误: export 命令需要 source_url 和 admin_token 参数" -ForegroundColor Red
            Show-Help
            exit 1
        }
        Export-Data $SourceUrl $SourceToken
    }
    "import" {
        if (!$TargetUrl -or !$TargetToken -or !$BackupFile) {
            Write-Host "错误: import 命令需要 target_url、admin_token 和 backup_file 参数" -ForegroundColor Red
            Show-Help
            exit 1
        }
        Import-Data $TargetUrl $TargetToken $BackupFile
    }
    "migrate" {
        if (!$SourceUrl -or !$TargetUrl -or !$SourceToken -or !$TargetToken) {
            Write-Host "错误: migrate 命令需要所有 4 个参数" -ForegroundColor Red
            Show-Help
            exit 1
        }
        Start-FullMigration $SourceUrl $TargetUrl $SourceToken $TargetToken
    }
    "info" {
        if (!$SourceUrl -or !$SourceToken) {
            Write-Host "错误: info 命令需要 url 和 admin_token 参数" -ForegroundColor Red
            Show-Help
            exit 1
        }
        Get-DatabaseInfo $SourceUrl $SourceToken
    }
    default {
        Show-Help
        exit 1
    }
}
