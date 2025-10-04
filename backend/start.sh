#!/bin/bash

# Rescue CPR Backend Startup Script

echo "🚑 Starting Rescue CPR Backend..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pip3 install -r requirements.txt

# Start the server
echo "🚀 Starting FastAPI server on http://localhost:8000"
echo "📖 API docs available at http://localhost:8000/docs"
echo ""
python3 main.py
