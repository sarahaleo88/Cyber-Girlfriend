#!/bin/bash

# Cyber Girlfriend Development Start Script
# This script sets up and starts the development environment

set -e

echo "🚀 Starting Cyber Girlfriend Development Environment"
echo "=================================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please update it with your configuration."
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "⚠️  Bun is not installed. Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    echo "✅ Bun installed successfully."
fi

# Install dependencies if node_modules don't exist
if [ ! -d "node_modules" ] || [ ! -d "frontend/node_modules" ] || [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install:all
fi

# Create data directory for database
mkdir -p backend/data

# Run database migrations
echo "🗄️  Setting up database..."
cd backend && bun run db:migrate && cd ..

echo ""
echo "🎯 Environment ready! Starting development servers..."
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000"
echo "WebSocket: ws://localhost:8001"
echo ""

# Start development servers
npm run dev