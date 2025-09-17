#!/bin/bash

# BIP-05 Issues Monitor - Quick Start Script
# Este script instala dependências e inicia o servidor de monitoramento

echo "🚀 Iniciando BIP-05 Issues Monitor..."
echo "====================================="

# Verificar se estamos no diretório correto
if [ ! -f "server.js" ]; then
    echo "❌ Erro: Execute este script dentro do diretório 'monitor'"
    echo "   Uso correto: cd gov/bips/BIP-05/monitor && ./start-monitor.sh"
    exit 1
fi

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Erro ao instalar dependências"
        exit 1
    fi
fi

echo "✅ Dependências instaladas"
echo "🌐 Iniciando servidor..."
echo ""
echo "📱 Acesse: http://localhost:3000"
echo "🛑 Para parar: Ctrl+C"
echo ""

# Iniciar o servidor
npm start
