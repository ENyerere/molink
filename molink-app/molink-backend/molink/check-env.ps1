# Molink 环境检查脚本 (PowerShell)
# 请在 PowerShell 中运行: .\check-env.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Molink 环境检查工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/6] 检查 Docker 安装状态..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "✅ Docker 已安装: $dockerVersion" -ForegroundColor Green
    } else {
        throw "Docker 未找到"
    }
} catch {
    Write-Host "❌ Docker 未安装或未启动" -ForegroundColor Red
    Write-Host "下载地址: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/6] 检查 Docker Compose 安装状态..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version 2>$null
    if ($composeVersion) {
        Write-Host "✅ Docker Compose 已安装: $composeVersion" -ForegroundColor Green
    } else {
        throw "Docker Compose 未找到"
    }
} catch {
    Write-Host "❌ Docker Compose 未安装" -ForegroundColor Red
}

Write-Host ""
Write-Host "[3/6] 检查项目目录结构..." -ForegroundColor Yellow

$files = @{
    "docker-compose.yml" = "Docker编排配置"
    "init-db.sql" = "数据库初始化脚本"
    "backend\Dockerfile" = "后端 Dockerfile"
    "frontend\Dockerfile" = "前端 Dockerfile"
    "start.bat" = "Windows 启动脚本"
    "start.ps1" = "PowerShell 启动脚本"
    "check-env.bat" = "Windows 环境检查脚本"
    "check-env.ps1" = "PowerShell 环境检查脚本"
}

foreach ($file in $files.Keys) {
    if (Test-Path $file) {
        Write-Host "✅ 找到 $($files[$file])" -ForegroundColor Green
    } else {
        Write-Host "❌ 未找到 $($files[$file])" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[4/6] 检查 Docker 状态..." -ForegroundColor Yellow
try {
    docker info >$null 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker 守护程序运行正常" -ForegroundColor Green
    } else {
        throw "Docker 守护程序无响应"
    }
} catch {
    Write-Host "❌ Docker 守护程序未启动或无权限" -ForegroundColor Red
    Write-Host "请确保 Docker Desktop 已启动并以管理员身份运行" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[5/6] 检查端口占用情况..." -ForegroundColor Yellow

$ports = @{
    80 = "前端服务端口"
    8000 = "API服务端口" 
    3306 = "MySQL数据库端口"
    6379 = "Redis缓存端口"
}

foreach ($port in $ports.Keys) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "⚠️  端口 $port ($($ports[$port])) 可能被占用" -ForegroundColor Yellow
    } else {
        Write-Host "✅ 端口 $port ($($ports[$port])) 可用" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "[6/6] 系统信息..." -ForegroundColor Yellow

# Windows 版本
$osInfo = Get-WmiObject Win32_OperatingSystem
Write-Host "操作系统: $($osInfo.Caption) $($osInfo.Version)" -ForegroundColor White

# PowerShell 版本  
$powershellVersion = $PSVersionTable.PSVersion
Write-Host "PowerShell: $($powershellVersion.Major).$($powershellVersion.Minor)" -ForegroundColor White

# .NET 版本
$dotnetVersion = [Environment]::Version
Write-Host ".NET Framework: $($dotnetVersion)" -ForegroundColor White

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 环境检查完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 提供启动建议
if (Test-Path "start.ps1") {
    Write-Host "🚀 推荐启动方式:" -ForegroundColor Green
    Write-Host "  PowerShell: .\start.ps1" -ForegroundColor White
    Write-Host "  CMD: start.bat" -ForegroundColor White
    Write-Host "  双击: start.bat 或 start.ps1" -ForegroundColor White
} else {
    Write-Host "⚠️  未找到启动脚本，请确保项目文件完整" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "如遇问题，请检查:" -ForegroundColor Yellow
Write-Host "  1. Docker Desktop 是否已启动" -ForegroundColor White
Write-Host "  2. 是否以管理员身份运行" -ForegroundColor White  
Write-Host "  3. 端口是否被其他程序占用" -ForegroundColor White
Write-Host "  4. 防火墙是否阻止 Docker" -ForegroundColor White

Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")