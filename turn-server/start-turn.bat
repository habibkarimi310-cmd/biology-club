@echo off
chcp 65001 >nul
title TURN Server - Biology Club
color 0A

echo.
echo ╔════════════════════════════════════════════╗
echo ║  🧬 TURN Server - انجمن زیست‌شناسی        ║
echo ╚════════════════════════════════════════════╝
echo.

cd /d "%~dp0..\..\coturn\bin"

if not exist turnserver.exe (
    echo ❌ فایل turnserver.exe پیدا نشد!
    pause
    exit /b 1
)

echo ✅ شروع TURN Server...
echo 📡 پورت: 3478 (UDP/TCP)
echo 🔒 پورت: 5349 (TLS)
echo 👤 کاربر: bio_user
echo.

turnserver.exe -c "%~dp0..\..\coturn\turnserver.conf" -v

pause