#!/bin/bash

# Script para parar o servidor BIP-05 Monitor
echo "🛑 Stopping BIP-05 Monitor Server..."

# Tentar finalizar graciosamente primeiro
echo "📋 Searching for BIP-05 server processes..."
PIDS=$(pgrep -f "node.*server.js" | head -5)

if [ -z "$PIDS" ]; then
    echo "❌ No BIP-05 server processes found running"
    exit 0
fi

echo "🔍 Found processes: $PIDS"

# Enviar SIGTERM primeiro (graceful shutdown)
echo "📤 Sending SIGTERM for graceful shutdown..."
echo "$PIDS" | xargs -r kill -TERM

# Aguardar 5 segundos
echo "⏳ Waiting 5 seconds for graceful shutdown..."
sleep 5

# Verificar se ainda há processos rodando
REMAINING=$(pgrep -f "node.*server.js" | head -5)
if [ -z "$REMAINING" ]; then
    echo "✅ Server stopped gracefully"
    exit 0
fi

echo "⚠️  Some processes still running, sending SIGKILL..."
echo "$REMAINING" | xargs -r kill -KILL

# Verificação final
sleep 2
FINAL_CHECK=$(pgrep -f "node.*server.js" | head -5)
if [ -z "$FINAL_CHECK" ]; then
    echo "✅ All server processes stopped successfully"
else
    echo "❌ Some processes may still be running: $FINAL_CHECK"
    echo "💡 Try: sudo kill -9 $FINAL_CHECK"
fi
