#!/bin/bash
set -e

echo "==================================="
echo "Building Meridius Nova for Linux"
echo "==================================="

# Check for required tools
echo ""
echo "Checking required tools..."

if ! command -v node &> /dev/null; then
	echo "Error: Node.js is not installed or not in PATH"
	exit 1
fi

if ! command -v rustc &> /dev/null; then
	echo "Error: Rust is not installed or not in PATH"
	exit 1
fi

if ! command -v npx &> /dev/null; then
	echo "Error: npx is not installed or not in PATH"
	exit 1
fi

echo "All required tools are available"

echo ""
echo "Step 1: Building Nuxt..."
export ESBUILD_WORKER_THREADS=0
export ESBUILD_USE_INLINE_CACHE=1
export NUXT_SESSION_PASSWORD="${NUXT_SESSION_PASSWORD:-}"
export NUXT_COOKIE_KEY="${NUXT_COOKIE_KEY:-}"
export DISCORD_CLIENT_ID="${DISCORD_CLIENT_ID:-}"
export DISCORD_CLIENT_SECRET="${DISCORD_CLIENT_SECRET:-}"
npx --no-install nuxt build

if [ $? -ne 0 ]; then
	echo "Error: Nuxt build failed"
	exit 1
fi

echo ""
echo "Step 2: Building Node.js SEA..."
echo "Building Node.js SEA for Linux..."

# Generate SEA blob
node --experimental-sea-config build/sea-config.json

if [ $? -ne 0 ]; then
	echo "Error: Failed to generate SEA blob"
	exit 1
fi

# Remove existing server file or directory if it exists
if [ -f "server" ] || [ -d "server" ]; then
	rm -rf server
fi

# Copy node binary to server
NODE_PATH=$(command -v node)

if [ -z "$NODE_PATH" ]; then
	echo "Error: Could not find Node.js executable"
	exit 1
fi

cp "$NODE_PATH" server

if [ $? -ne 0 ]; then
	echo "Error: Failed to copy Node.js binary"
	exit 1
fi

# Remove debug symbols from server binary on Linux (optional optimization)
if command -v strip &> /dev/null; then
	strip server 2>/dev/null || true
fi

# Check if postject is available
if ! command -v postject &> /dev/null; then
	echo "Installing postject..."
	npx --yes postject --version > /dev/null 2>&1 || {
		echo "Error: Failed to install postject"
		exit 1
	}
fi

# Inject blob into executable
npx postject server NODE_SEA_BLOB build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

if [ $? -ne 0 ]; then
	echo "Error: Failed to inject SEA blob into executable"
	exit 1
fi

# Get target triple using rustc
TARGET_TRIPLE=$(rustc -vV 2>/dev/null | grep "host:" | awk '{print $2}')

if [ -z "$TARGET_TRIPLE" ]; then
	echo "Warning: Failed to determine platform target triple, using default"
	TARGET_TRIPLE="x86_64-unknown-linux-gnu"
fi

echo "Target triple: $TARGET_TRIPLE"

# Create binaries directory if it doesn't exist
mkdir -p src-tauri/binaries

# Move and rename server to include target triple
mv server "src-tauri/binaries/server-$TARGET_TRIPLE"

if [ $? -ne 0 ]; then
	echo "Error: Failed to move server binary"
	exit 1
fi

# Make the binary executable
chmod +x "src-tauri/binaries/server-$TARGET_TRIPLE"

echo "SEA build completed successfully!"

echo ""
echo "Step 3: Ensuring resources directory exists..."
mkdir -p src-tauri/resources/.output

if [ ! -d ".output" ]; then
	echo "Error: .output directory not found. Nuxt build may have failed."
	exit 1
fi

echo ""
echo "Step 4: Copying Nuxt output to resources..."
cp -r .output/* src-tauri/resources/.output/

if [ $? -ne 0 ]; then
	echo "Error: Failed to copy Nuxt output to resources"
	exit 1
fi

echo ""
echo "Step 5: Copying server wrapper to resources..."
if [ ! -f "server-wrapper.cjs" ]; then
	echo "Error: server-wrapper.cjs not found"
	exit 1
fi

cp server-wrapper.cjs src-tauri/resources/server-wrapper.cjs

if [ $? -ne 0 ]; then
	echo "Error: Failed to copy server wrapper"
	exit 1
fi

echo ""
echo "==================================="
echo "Build completed successfully!"
echo "==================================="

