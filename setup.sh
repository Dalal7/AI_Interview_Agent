#!/bin/bash
set -e

echo "=== 1. Setting up Python Virtual Environment ==="
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "Virtual environment created."
else
    echo "Virtual environment already exists."
fi

echo "=== 2. Installing Python Dependencies ==="
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r backend/requirements.txt
echo "Python dependencies installed."

echo "=== 3. Downloading Portable Node.js (ARM64) ==="
if [ ! -d ".node" ]; then
    mkdir -p .node
    echo "Downloading Node.js..."
    curl -sS https://nodejs.org/dist/v20.12.2/node-v20.12.2-darwin-arm64.tar.gz | tar -xz -C .node --strip-components=1
    echo "Node.js installed locally in .node"
else
    echo "Node.js is already installed locally in .node"
fi

# Add local Node to path for setup
export PATH="$(pwd)/.node/bin:$PATH"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

echo "=== 4. Bootstrapping Next.js Frontend ==="
if [ ! -d "frontend" ]; then
    npx -y create-next-app@latest frontend --typescript --tailwind --eslint --no-app --src-dir=false --import-alias="@/*" --use-npm
    echo "Next.js frontend bootstrapped."
else
    echo "Frontend directory already exists."
fi

echo "=== 5. Installing Lucide icons and other UI dependencies in frontend ==="
cd frontend
npm install lucide-react clsx tailwind-merge canvas-confetti @types/canvas-confetti
cd ..

echo "=== Setup Completed Successfully ==="
