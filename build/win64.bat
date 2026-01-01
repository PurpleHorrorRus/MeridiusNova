@echo off
setlocal
echo ===================================
echo Building Meridius Redux for Windows
echo ===================================

echo.
echo Step 1: Building Nuxt...
set ESBUILD_WORKER_THREADS=0
set ESBUILD_USE_INLINE_CACHE=1
if defined NUXT_SESSION_PASSWORD set NUXT_SESSION_PASSWORD=%NUXT_SESSION_PASSWORD%
if defined NUXT_COOKIE_KEY set NUXT_COOKIE_KEY=%NUXT_COOKIE_KEY%
if defined DISCORD_CLIENT_ID set DISCORD_CLIENT_ID=%DISCORD_CLIENT_ID%
if defined DISCORD_CLIENT_SECRET set DISCORD_CLIENT_SECRET=%DISCORD_CLIENT_SECRET%
call npx --no-install nuxt build
if %errorlevel% neq 0 (
    echo Error: Nuxt build failed
    exit /b %errorlevel%
)

echo.
echo Step 2: Building Node.js SEA...
echo Building Node.js SEA for Windows...

REM Generate SEA blob
node --experimental-sea-config build/sea-config.json
if %errorlevel% neq 0 exit /b %errorlevel%

REM Copy node.exe to server.exe
node -e "require('fs').copyFileSync(process.execPath, 'server.exe')"
if %errorlevel% neq 0 exit /b %errorlevel%

REM Remove signature from server.exe on Windows
signtool remove /s server.exe 2>nul

REM Inject blob into executable
call npx postject server.exe NODE_SEA_BLOB build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
if %errorlevel% neq 0 exit /b %errorlevel%

REM Create binaries directory if it doesn't exist
if not exist src-tauri\binaries mkdir src-tauri\binaries

REM Get target triple using rustc
for /f "tokens=2 delims=: " %%a in ('rustc -vV ^| findstr /c:"host:"') do set TARGET_TRIPLE=%%a

if not defined TARGET_TRIPLE (
  echo Failed to determine platform target triple
  exit /b 1
)

REM Create binaries directory if it doesn't exist
if not exist src-tauri\binaries mkdir src-tauri\binaries

REM Move and rename server.exe to include target triple
move /Y server.exe src-tauri\binaries\server-%TARGET_TRIPLE%.exe
if %errorlevel% neq 0 exit /b %errorlevel%

echo SEA build completed successfully!

echo.
echo Step 3: Ensuring resources directory exists...
if not exist src-tauri\resources\.output mkdir src-tauri\resources\.output

echo.
echo Step 4: Copying Nuxt output to resources...
xcopy /E /I /Y .output src-tauri\resources\.output
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo Step 5: Copying server wrapper to resources...
copy /Y server-wrapper.cjs src-tauri\resources\server-wrapper.cjs
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo ===================================
echo Build completed successfully!
echo ===================================