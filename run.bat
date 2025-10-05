@echo off
echo ========================================
echo Facebook Page Manager - Starting...
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo ERROR: Dependencies not installed!
    echo Please run install.bat first
    echo.
    pause
    exit /b 1
)

REM Start the application
echo Starting application...
echo.
call npm run dev

pause


