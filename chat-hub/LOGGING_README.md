# 📋 Sistema de Logging do BIP-05 Monitor

## 🎯 **Visão Geral**

O servidor agora possui um sistema de logging robusto que captura **todos os eventos, erros e processos** em arquivos de log detalhados para facilitar a depuração.

## 📁 **Arquivos de Log**

### `server-debug.log`
- **Conteúdo**: Todos os eventos (INFO, DEBUG, WARN, ERROR, FATAL)
- **Uso**: Log principal para análise completa do servidor
- **Formato**: `[timestamp] [level] [category] message + data JSON`

### `server-errors.log`
- **Conteúdo**: Apenas erros críticos (ERROR, FATAL)
- **Uso**: Análise rápida de problemas críticos
- **Formato**: Mesmo formato do debug.log, mas filtrado

## 🔍 **Categorias de Log**

| Categoria | Descrição | Eventos Capturados |
|-----------|-----------|-------------------|
| `STARTUP` | Inicialização do servidor | Configurações, versões, caminhos |
| `WEBSOCKET` | Comunicação WebSocket | Mensagens recebidas, parsing, erros |
| `BROADCAST` | Distribuição de dados | Leitura de issues.json, envio para clientes |
| `AIDER` | Processos do aider CLI | Comandos, saídas, timeouts, erros |
| `CURSOR-AGENT` | Processos do cursor-agent | Comandos, saídas, timeouts, erros |
| `FILE_WRITE` | Escrita em issues.json | Adição de comentários, sanitização |
| `API` | Endpoints REST | Requisições, respostas, erros |

## 🛠️ **APIs de Log**

### **GET `/api/logs`**
Acessa os logs recentes:
```bash
# Últimos 100 logs de debug
curl "http://localhost:3000/api/logs?type=debug&lines=100"

# Últimos 50 logs de erro
curl "http://localhost:3000/api/logs?type=error&lines=50"
```

**Parâmetros:**
- `type`: `debug` (padrão) ou `error`
- `lines`: número de linhas recentes (padrão: 100)

### **POST `/api/logs/clear`**
Limpa os arquivos de log:
```bash
# Limpar log de debug
curl -X POST -H "Content-Type: application/json" \
  -d '{"type":"debug"}' \
  http://localhost:3000/api/logs/clear

# Limpar log de erros
curl -X POST -H "Content-Type: application/json" \
  -d '{"type":"error"}' \
  http://localhost:3000/api/logs/clear
```

## 🔧 **Comandos Úteis**

### **Monitorar logs em tempo real:**
```bash
# Debug completo
tail -f gov/bips/BIP-05/monitor/server-debug.log

# Apenas erros
tail -f gov/bips/BIP-05/monitor/server-errors.log
```

### **Filtrar por categoria:**
```bash
# Apenas eventos de WebSocket
grep "WEBSOCKET" gov/bips/BIP-05/monitor/server-debug.log

# Apenas eventos do aider
grep "AIDER" gov/bips/BIP-05/monitor/server-debug.log
```

### **Últimos erros:**
```bash
# Últimos 10 erros
tail -10 gov/bips/BIP-05/monitor/server-errors.log

# Buscar erro específico
grep "Formato de dados de chat inválido" gov/bips/BIP-05/monitor/server-debug.log
```

## 🎭 **Níveis de Log**

| Nível | Uso | Exemplo |
|-------|-----|---------|
| `DEBUG` | Informações detalhadas | Chunks de dados recebidos |
| `INFO` | Eventos normais | Processos iniciados/completados |
| `WARN` | Situações de atenção | Timeouts, clientes desconectados |
| `ERROR` | Erros recuperáveis | Falha de parsing, modelo não encontrado |
| `FATAL` | Erros críticos | Falha total de sistema |

## 🚨 **Solução de Problemas**

### **"Formato de dados de chat inválido"**
1. Verificar logs: `grep "WEBSOCKET.*Failed to parse" server-debug.log`
2. Analisar: dados malformados, encoding, tamanho
3. Verificar: `messagePreview` e `rawMessage` no log

### **Modelos aider falhando**
1. Verificar logs: `grep "AIDER.*ERROR" server-debug.log`
2. Analisar: chaves API, configuração de modelo, timeouts
3. Verificar: `stdout` e `stderr` do processo aider

### **Problemas de broadcast**
1. Verificar logs: `grep "BROADCAST.*ERROR" server-debug.log`
2. Analisar: parsing do issues.json, problemas de rede
3. Verificar: `successfulSends` vs `failedSends`

## 📊 **Monitoramento Recomendado**

Para monitoramento contínuo, execute:
```bash
# Terminal 1: Servidor
cd gov/bips/BIP-05/monitor && ./start-server.sh

# Terminal 2: Logs em tempo real
tail -f gov/bips/BIP-05/monitor/server-debug.log | grep -E "(ERROR|FATAL|WARN)"

# Terminal 3: Status das APIs
watch -n 30 'curl -s http://localhost:3000/api/status | jq ".working_apis | length"'
```

## 🎯 **Principais Benefícios**

✅ **Rastreamento completo** de todos os eventos
✅ **Diagnóstico rápido** de erros com contexto detalhado  
✅ **Análise histórica** de problemas passados
✅ **Monitoramento em tempo real** de processos
✅ **APIs de acesso** para integração com ferramentas externas
✅ **Categorização** para filtrage eficiente
✅ **Dados estruturados** em JSON para análise automatizada

---

**Agora você tem visibilidade completa sobre todos os processos do servidor! 🎉**
