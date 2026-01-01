#!/bin/bash
set -e

echo "==================================="
echo "Building Meridius Nova for Linux"
echo "==================================="

echo ""
echo "Step 1: Building Nuxt..."
export ESBUILD_WORKER_THREADS=0
export ESBUILD_USE_INLINE_CACHE=1
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
	exit 1
fi

# Copy node binary to server
node -e "require('fs').copyFileSync(process.execPath, 'server')"

if [ $? -ne 0 ]; then
	exit 1
fi

# Remove signature from server binary on Linux
strip server 2>/dev/null || true

# Inject blob into executable
npx postject server NODE_SEA_BLOB build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2

if [ $? -ne 0 ]; then
	exit 1
fi

# Get target triple using rustc
TARGET_TRIPLE=$(rustc -vV | grep "host:" | awk '{print $2}')

if [ -z "$TARGET_TRIPLE" ]; then
	echo "Failed to determine platform target triple"
	exit 1
fi

# Create binaries directory if it doesn't exist
mkdir -p src-tauri/binaries

# Move and rename server to include target triple
mv server src-tauri/binaries/server-$TARGET_TRIPLE

if [ $? -ne 0 ]; then
	exit 1
fi

echo "SEA build completed successfully!"

echo ""
echo "Step 3: Ensuring resources directory exists..."
mkdir -p src-tauri/resources/.output

echo ""
echo "Step 4: Copying Nuxt output to resources..."
cp -r .output/* src-tauri/resources/.output/

if [ $? -ne 0 ]; then
	exit 1
fi

echo ""
echo "Step 5: Copying server wrapper to resources..."
cp server-wrapper.cjs src-tauri/resources/server-wrapper.cjs

if [ $? -ne 0 ]; then
	exit 1
fi

echo ""
echo "==================================="
echo "Build completed successfully!"
echo "==================================="

