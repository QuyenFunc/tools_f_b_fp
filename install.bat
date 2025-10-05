@echo off
echo ========================================
echo Facebook Page Manager - Installation
echo ========================================
echo.

REM Check if Node.js is installed
echo [1/5] Checking Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

node --version
echo Node.js found!
echo.

REM Install npm dependencies
echo [2/5] Installing npm dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install npm dependencies!
    pause
    exit /b 1
)
echo Dependencies installed!
echo.

REM Install Playwright browsers
echo [3/5] Installing Playwright browsers...
call npx playwright install chromium
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Failed to install Playwright browsers!
    echo You may need to run: npx playwright install chromium
)
echo Playwright browsers installed!
echo.

REM Optional: Install app deps
echo [4/5] Installing app dependencies...
call npm run postinstall
echo.

REM Success message
echo [5/5] Installation complete!
echo.
echo ========================================
echo Installation completed successfully!
echo ========================================
echo.
echo To run the app:
echo   npm run dev       (Development mode)
echo   npm start         (Production mode)
echo   npm run build:win (Build .exe file)
echo.
echo Press any key to exit...
pause >nul

