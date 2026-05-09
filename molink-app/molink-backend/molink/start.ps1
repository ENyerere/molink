# Molink PowerShell 启动脚本
# 请在 PowerShell 中运行: .\start.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Molink - 现代化内容编辑与协作平台" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查执行策略
$executionPolicy = Get-ExecutionPolicy
if ($executionPolicy -eq "Restricted") {
    Write-Host "⚠️  PowerShell 执行策略受限，尝试绕过..." -ForegroundColor Yellow
    Write-Host "请以管理员身份运行 PowerShell 或使用 cmd 命令提示符" -ForegroundColor Red
    Write-Host "或手动执行: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow
    exit 1
}

Write-Host "正在检查环境..." -ForegroundColor Green

# 检查 Docker
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "✅ Docker 已安装: $dockerVersion" -ForegroundColor Green
    } else {
        throw "Docker 未找到"
    }
} catch {
    Write-Host "❌ Docker 未安装或未启动" -ForegroundColor Red
    Write-Host "请先安装 Docker Desktop" -ForegroundColor Yellow
    exit 1
}

# 检查 Docker Compose
try {
    $composeVersion = docker-compose --version 2>$null
    if ($composeVersion) {
        Write-Host "✅ Docker Compose 已安装: $composeVersion" -ForegroundColor Green
    } else {
        throw "Docker Compose 未找到"
    }
} catch {
    Write-Host "❌ Docker Compose 未安装" -ForegroundColor Red
    exit 1
}

# 检查项目文件
if (Test-Path "docker-compose.yml") {
    Write-Host "✅ 找到 docker-compose.yml" -ForegroundColor Green
} else {
    Write-Host "❌ 未找到 docker-compose.yml" -ForegroundColor Red
    Write-Host "请确保在项目根目录运行此脚本" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "正在构建和启动服务..." -ForegroundColor Green

# 启动服务
try {
    & docker-compose up -d --build
    Write-Host ""
    Write-Host "服务启动中，请稍候..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # 检查服务状态
    Write-Host ""
    Write-Host "服务状态:" -ForegroundColor Cyan
    & docker-compose ps
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Molink 已成功启动!" -ForegroundColor Green
    Write-Host ""
    Write-Host "访问地址:" -ForegroundColor Yellow
    Write-Host "  - 前端界面: http://localhost" -ForegroundColor White
    Write-Host "  - API文档:  http://localhost:8000/api/docs" -ForegroundColor White
    Write-Host ""
    Write-Host "默认管理员账户:" -ForegroundColor Yellow  
    Write-Host "  - 邮箱: admin@molink.local" -ForegroundColor White
    Write-Host "  - 密码: admin123" -ForegroundColor White
    Write-Host ""
    Write-Host "请在首次登录后立即修改密码!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "❌ 服务启动失败" -ForegroundColor Red
    Write-Host "错误信息: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "尝试解决方案:" -ForegroundColor Yellow
    Write-Host "1. 确保 Docker Desktop 已启动" -ForegroundColor White
    Write-Host "2. 检查端口 80, 8000, 3306, 6379 是否被占用" -ForegroundColor White
    Write-Host "3. 以管理员身份运行 PowerShell" -ForegroundColor White
    Write-Host "4. 使用 cmd 命令提示符替代 PowerShell" -ForegroundColor White
}

Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")