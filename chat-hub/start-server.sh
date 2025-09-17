#!/bin/bash

# Script para iniciar o servidor BIP-05 Monitor
echo "🚀 Starting BIP-05 Monitor Server..."

# Verificar se o servidor já está rodando
EXISTING=$(pgrep -f "node.*server.js" | head -5)
if [ ! -z "$EXISTING" ]; then
    echo "⚠️  Server already running with PID(s): $EXISTING"
    echo "💡 Use './stop-server.sh' to stop it first"
    exit 1
fi

# Verificar se o arquivo server.js existe
if [ ! -f "server.js" ]; then
    echo "❌ server.js not found in current directory"
    echo "💡 Run this script from: gov/bips/BIP-05/monitor/"
    exit 1
fi

# Verificar se o Node.js está disponível
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    exit 1
fi

echo "📋 Starting server..."
echo "💡 Press Ctrl+C to stop (graceful shutdown)"
echo "💡 Press Ctrl+C twice for immediate exit"
echo "📍 Server will be available at: http://localhost:3000"
echo "────────────────────────────────────────────────────"

# Iniciar o servidor
node server.js
