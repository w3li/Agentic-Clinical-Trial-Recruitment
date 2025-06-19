#!/bin/bash

echo "🚀 Setting up StudyScout AI for Masumi Hackathon..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Please add your API keys to .env file"
    echo "📝 Example .env file created - update with your keys"
else
    echo "✅ Environment configuration found"
fi

echo ""
echo "🎯 To start the application:"
echo "   npm start"
echo ""
echo "🌍 Then open: http://localhost:3000"
echo ""
echo "🤖 Masumi Integration Features:"
echo "   - Agent registration and orchestration"
echo "   - Multi-agent workflow coordination"
echo "   - AI-powered recruitment pipeline"
echo ""
echo "📊 Demo ready! Perfect for 90-minute hackathon."
