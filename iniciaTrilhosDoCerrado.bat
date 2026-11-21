@echo off
setlocal
if /I not "%OS%"=="Windows_NT" exit /b 1
cd /d "%~dp0"
set "TRILHOS_NODE=%~dp0runtime\node.exe"
if not exist "%TRILHOS_NODE%" (
  where node.exe >nul 2>&1
  if errorlevel 1 (
    echo Node.js necessario. Coloque node.exe na pasta runtime ou adicione-o ao PATH.
    pause
    exit /b 1
  )
  set "TRILHOS_NODE=node.exe"
)
set "TRILHOS_FALLBACK=1"
set "TRILHOS_OPEN_BROWSER=1"
"%TRILHOS_NODE%" "%~dp0server.js" %*
if errorlevel 1 pause
