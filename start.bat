@echo off
chcp 65001 >nul
title 酒吧点单系统

echo ================================
echo   酒吧点单系统 - 启动中...
echo ================================
echo.

cd /d "%~dp0"

REM 检查前端是否已构建
if not exist "frontend\dist\index.html" (
    echo [1/2] 正在构建前端...
    cd frontend
    call npm install --silent 2>nul
    call npm run build 2>&1
    cd ..
    if not exist "frontend\dist\index.html" (
        echo [错误] 前端构建失败，请检查 Node.js 是否正确安装
        pause
        exit /b 1
    )
) else (
    echo [1/2] 前端已构建，跳过
)

REM 启动后端
echo [2/2] 启动服务...
cd backend
start "" /B "C:\Users\Ze_Zhang\AppData\Local\Programs\Python\Python312\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 > nul 2>&1

REM 等待服务就绪
echo.
echo 等待服务启动...
:wait
timeout /t 1 >nul
curl -s http://localhost:8000/api/health >nul 2>&1
if errorlevel 1 goto wait

echo.
echo ================================
echo   服务已启动！
echo   地址: http://localhost:8000
echo   按任意键打开浏览器...
echo ================================
pause >nul
start http://localhost:8000
echo.
echo 关闭此窗口不会停止服务，请运行 stop.bat 来停止
pause
