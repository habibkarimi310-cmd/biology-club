@echo off
chcp 65001 >nul
title نصب TURN Service
color 0E

echo ╔════════════════════════════════════════════╗
echo ║  نصب TURN Server به‌عنوان سرویس ویندوز    ║
echo ╚════════════════════════════════════════════╝

if not exist "C:\coturn\nssm.exe" (
    echo ⬇️ دانلود NSSM...
    powershell -Command "Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile 'C:\coturn\nssm.zip'"
    powershell -Command "Expand-Archive -Path 'C:\coturn\nssm.zip' -DestinationPath 'C:\coturn\nssm-temp' -Force"
    copy "C:\coturn\nssm-temp\nssm-2.24\win64\nssm.exe" "C:\coturn\nssm.exe"
)

C:\coturn\nssm.exe install CoturnTurnServer "C:\coturn\bin\turnserver.exe"
C:\coturn\nssm.exe set CoturnTurnServer AppParameters "-c C:\coturn\turnserver.conf -v"
C:\coturn\nssm.exe set CoturnTurnServer AppDirectory "C:\coturn"
C:\coturn\nssm.exe set CoturnTurnServer DisplayName "Coturn TURN Server"
C:\coturn\nssm.exe set CoturnTurnServer Start SERVICE_AUTO_START

net start CoturnTurnServer

echo ✅ سرویس نصب شد!
pause