# Docker诊断脚本
Write-Host "=== Docker 连接诊断 ===" -ForegroundColor Cyan

# 1. 检查Docker客户端
Write-Host "1. 检查Docker客户端..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker客户端: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker客户端未安装" -ForegroundColor Red
    exit 1
}

# 2. 测试Docker Engine连接
Write-Host "2. 测试Docker Engine连接..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1 | Out-String
    if ($dockerInfo -match "Server Version") {
        Write-Host "✅ Docker Engine连接正常" -ForegroundColor Green
        Write-Host "详细信息预览:" -ForegroundColor Gray
        $dockerInfo | Select-String "Server Version|Operating System|CPU|Memory" | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    } else {
        throw "连接失败"
    }
} catch {
    Write-Host "❌ Docker Engine连接失败" -ForegroundColor Red
    Write-Host "错误详情: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "解决方案:" -ForegroundColor Yellow
    Write-Host "1. 重启Docker Desktop" -ForegroundColor White
    Write-Host "2. 等待Docker Engine完全启动" -ForegroundColor White
    Write-Host "3. 检查Docker托盘图标是否显示'Engine running'" -ForegroundColor White
    Write-Host "4. 以管理员身份运行PowerShell" -ForegroundColor White
    exit 1
}

# 3. 检查容器状态
Write-Host "3. 检查现有容器..." -ForegroundColor Yellow
try {
    $containers = docker ps -a
    Write-Host "现有容器数量: $($containers.Count - 1)" -ForegroundColor Green
} catch {
    Write-Host "❌ 无法获取容器列表" -ForegroundColor Red
}

Write-Host ""
Write-Host "诊断完成！" -ForegroundColor Cyan