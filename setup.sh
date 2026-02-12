#!/bin/bash

# EV Routing System - Complete Setup Script
# This script sets up both backend and frontend

set -e

echo "🚗 EV Routing System - Installation Setup"
echo "=========================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8+"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm"
    exit 1
fi

echo "✅ Python 3: $(python3 --version)"
echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"
echo ""

# Backend setup
echo "🔧 Setting up Backend..."
echo "Installing Python dependencies from requirements-api.txt..."
pip install -r requirements-api.txt
echo "✅ Backend dependencies installed"
echo ""

# Frontend setup
echo "🎨 Setting up Frontend..."
cd frontend
echo "Installing npm dependencies..."
npm install
echo "✅ Frontend dependencies installed"
echo ""

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "✅ Created .env.local (using defaults)"
fi

cd ..
echo ""

# Summary
echo "=========================================="
echo "✅ Installation Complete!"
echo "=========================================="
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Start the Backend (in Terminal 1):"
echo "   python backend_api.py"
echo ""
echo "2. Start the Frontend (in Terminal 2):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "3. Open your browser:"
echo "   http://localhost:5173"
echo ""
echo "🎯 Happy routing!"
