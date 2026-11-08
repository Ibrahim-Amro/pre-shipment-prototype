@echo off
setlocal
cd /d "%~dp0"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 20 or later, then open this launcher again.
  pause
  exit /b 1
)
node serve.mjs --open
if errorlevel 1 pause
