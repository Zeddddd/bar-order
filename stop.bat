@echo off
chcp 65001 >nul
title 停止酒吧点单系统

echo ================================
echo   停止酒吧点单系统
echo ================================
echo.

cd /d "%~dp0"

REM 1) 读取 PID 文件并终止进程树
if exist "backend\server.pid" (
    set /p PID=<backend\server.pid
    echo [1] PID 文件: !PID! - 终止进程树
    taskkill /F /T /PID !PID! >nul 2>&1
    del "backend\server.pid" >nul 2>&1
)

REM 2) 扫描 8000 端口所有 LISTENING 进程
echo [2] 扫描 8000 端口占用...
set FOUND=0
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo   终止 PID: %%a
    taskkill /F /T /PID %%a >nul 2>&1
    set FOUND=1
)
if %FOUND%==0 echo   无占用

REM 3) 额外：杀掉可能的 uvicorn/python 残留
echo [3] 清理 uvicorn 残留进程...
taskkill /F /IM uvicorn.exe >nul 2>&1
taskkill /F /FI "IMAGENAME eq python.exe" /FI "WINDOWTITLE eq *uvicorn*" >nul 2>&1

echo.
echo ================================
echo   服务已停止，可安全压缩/移动
echo ================================
timeout /t 2 >nul
