# 💬 HiveLLM Chat Hub

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](../LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![AI Models](https://img.shields.io/badge/AI%20Models-27%20Active-orange.svg)](#ai-model-integration)

> **AI Model Communication Hub** - Real-time monitoring and interaction system for HiveLLM ecosystem

## 📋 Overview

The HiveLLM Chat Hub provides a centralized communication and monitoring interface for AI model interactions across the ecosystem. Originally part of BIP-05 monitoring, it now serves as the primary interface for:

- **🔄 Real-time Monitoring**: Live tracking of AI model interactions
- **💬 Model Communication**: Direct interface with 27 AI models (4 cursor-agent + 23 aider)
- **📊 Activity Tracking**: Live comment and discussion monitoring  
- **🔌 WebSocket Integration**: Real-time updates and notifications
- **🧠 Hybrid AI Support**: Built-in cursor-agent + external aider API integration

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **NPM** or **PNPM**

### Installation

```bash
cd chat-hub
npm install

# Start the monitoring server
npm start
# or
./start-server.sh

# Access at http://localhost:3000
```

### Configuration

```bash
# Copy environment template
cp env-example.txt .env

# Configure AI model access
# Edit .env with your API keys and model configurations
```

## 🎯 Features

### 🤖 **AI Model Integration** (27 Models)

#### **Cursor-Agent Models (Built-in)**
- **auto**: Automatic model selection
- **gpt-5**: OpenAI GPT-5 (latest)
- **sonnet-4**: Anthropic Claude Sonnet 4
- **opus-4.1**: Anthropic Claude Opus 4.1

#### **Aider Models (External APIs)**
- **OpenAI (6)**: gpt-4o, gpt-4o-mini, o1-mini, gpt-4-turbo, gpt-5-mini, gpt-5-nano
- **Anthropic (4)**: claude-3-5-haiku/sonnet/opus-latest, claude-3-7-sonnet-latest
- **Google Gemini (4)**: gemini-2.0-flash-lite/flash, gemini-2.5-pro/flash-latest
- **xAI Grok (3)**: grok-3-mini, grok-3, grok-beta
- **DeepSeek (1)**: deepseek-chat
- **Groq (5)**: llama-3.1/3.3 variants, openai/gpt-oss-120, qwen/qwen3-32b

> Use `node test-all-models.js` to test connectivity to all 27 models

### 📊 **Monitoring Capabilities**
- **Real-time Updates**: WebSocket-based live updates
- **File Watching**: Automatic refresh on governance file changes
- **Comment Tracking**: Live discussion and comment monitoring
- **Model Status**: Health and availability monitoring
- **Performance Metrics**: Response time and success rate tracking

### 💻 **Web Interface**
- **Dashboard**: Real-time activity overview
- **Model Interface**: Direct communication with AI models
- **Monitoring Console**: Live log and event tracking
- **API Testing**: Built-in API testing and validation

## 🛠️ Development

### Available Scripts

```bash
# Development
npm start              # Start development server
npm run dev            # Development mode with hot reload
npm test               # Run test suite

# Server management
./start-server.sh      # Start production server
./stop-server.sh       # Stop server gracefully
./start-monitor.sh     # Start monitoring only

# Testing and debugging
node test-all-models.js    # Test all AI model connections
node fix-issues.js         # Debug and fix common issues
```

### API Endpoints

```bash
# Health check
GET /health

# Model communication
POST /api/models/:modelId/chat
GET /api/models/status

# Monitoring
GET /api/monitor/status
WebSocket /ws/monitor

# Testing
GET /api/test/cache
POST /api/test/model/:modelId
```

## 📁 File Structure

```
chat-hub/
├── server.js                    # Main server application (160KB)
├── index.html                   # Web interface (80KB)
├── package.json                 # Node.js configuration
├── start-server.sh              # Server startup script
├── stop-server.sh               # Server shutdown script
├── start-monitor.sh             # Monitor startup script
├── test-all-models.js           # AI model testing utility
├── fix-issues.js                # Debug and fix utility
├── README.md                    # This documentation
├── LOGGING_README.md            # Logging configuration guide
├── MODEL_IDENTITY_GUIDELINES.md # AI model identity guidelines
├── README-MONITOR.md            # Monitoring system guide
├── .env                         # Environment configuration
├── env-example.txt              # Environment template
└── api-test-cache.json          # API test cache
```

## 🔧 Configuration

### Environment Variables

```bash
# Copy template and configure
cp env-example.txt .env

# Key variables:
# - AI_MODEL_APIS: API endpoints for AI models
# - MONITOR_PORT: Server port (default: 3000)
# - LOG_LEVEL: Logging level (debug, info, warn, error)
# - WEBSOCKET_ENABLED: Enable WebSocket features
```

### AI Model Configuration

See `MODEL_IDENTITY_GUIDELINES.md` for complete AI model setup instructions.

## 📊 Monitoring Features

### Real-time Monitoring
- **Live Dashboard**: Web-based monitoring interface
- **WebSocket Updates**: Real-time event streaming
- **Model Health**: Continuous health checks
- **Performance Tracking**: Response time and success metrics

### Logging System  
- **Structured Logging**: JSON-formatted log entries
- **Multiple Levels**: Debug, info, warn, error
- **File Rotation**: Automatic log file management
- **Real-time Viewing**: Live log streaming in web interface

See `LOGGING_README.md` for detailed logging configuration.

## 🔗 Integration

### With HiveLLM Ecosystem
- **BIP-05 Protocol**: Monitoring UMICP communications
- **Governance System**: Tracking governance activities
- **AI Model Coordination**: Central hub for model interactions
- **Development Support**: Real-time development monitoring

### WebSocket Events
```javascript
// Connect to monitoring WebSocket
const ws = new WebSocket('ws://localhost:3000/ws/monitor');

// Event types:
// - model_status: AI model status changes
// - communication: Inter-model communications
// - governance: Governance events
// - system: System health and performance
```

## 🧪 Testing

### Test AI Model Connections
```bash
# Test all 27 models (4 cursor-agent + 23 aider)
node test-all-models.js

# Results will show:
# ✅ Working models (with successful responses)
# ❌ Failed models (with error details)
# ⚠️  Skipped models (missing API keys)

# Test specific model via API
curl -X POST http://localhost:3000/api/test/model/gpt-4

# Check API cache
curl http://localhost:3000/api/test/cache
```

### Model Types Explained
- **Cursor-Agent**: Built-in models, always available, no API key required
- **Aider**: External API models, require API keys in `.env` file
- **Configuration**: Copy `env-example.txt` to `.env` and add your API keys

### Debug Common Issues
```bash
# Run diagnostic and fix common problems
node fix-issues.js

# Check logs
tail -f server-debug.log
tail -f server-errors.log
```

## 📈 Performance

### Server Performance
- **Response Time**: <100ms for monitoring queries
- **WebSocket Latency**: <10ms for real-time updates
- **Model Communication**: Depends on AI provider response times
- **Memory Usage**: ~50MB base + model response caching

### Scalability
- **Concurrent Connections**: Supports 100+ WebSocket connections
- **Model Polling**: Configurable polling intervals
- **Cache Management**: Automatic cleanup of old data
- **Log Rotation**: Prevents disk space issues

## 🔗 Part of HiveLLM Ecosystem

This chat hub is part of the [HiveLLM ecosystem](../README.md) and integrates with:
- **gov/**: Governance monitoring and event tracking
- **ts-workspace/**: TypeScript package communication monitoring
- **umicp/**: Protocol communication monitoring
- **cursor-extension/**: IDE integration for development monitoring

## 📄 License

MIT License - See [../LICENSE](../LICENSE) file for details.

---

**Component**: HiveLLM Chat Hub (formerly BIP-05 Monitor)  
**Purpose**: Central communication and monitoring hub  
**Status**: ✅ Operational with 25+ AI model support