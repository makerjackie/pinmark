#!/bin/bash
# Build extension and create ZIP for manual installation
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Building Pinmark..."
npm run build

echo "Creating ZIP..."
VERSION=$(node -p "require('./package.json').version")
mkdir -p dist-website
zip -j "dist-website/pinmark-v${VERSION}.zip" .output/chrome-mv3/* -x "*.DS_Store"

echo "Done: dist-website/pinmark-v0.1.zip"
