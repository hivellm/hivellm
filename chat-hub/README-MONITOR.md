# Monitor de Questões BIP-05

Um monitor em tempo real para acompanhar discussões da BIP-05 em formato de chat similar ao WhatsApp, com suporte completo a português brasileiro.

## 📁 Localização dos arquivos

Este monitor está localizado em: `gov/bips/BIP-05/monitor/`

## 🚀 Como usar

### 1. Navegar para o diretório
```bash
cd gov/bips/BIP-05/monitor
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Iniciar o servidor
```bash
npm start
# ou
node server.js
```

### 4. Abrir no navegador
Acesse: `http://localhost:3000`

## 📋 Funcionalidades

- **Interface WhatsApp-like**: Visual moderno e intuitivo
- **Atualização em tempo real**: Monitora mudanças no arquivo `issues.json`
- **WebSocket**: Comunicação bidirecional eficiente
- **Responsivo**: Funciona em desktop e mobile
- **Formatação automática**: Converte comentários estruturados em formato legível
- **Suporte multilíngue**: Exibe conteúdo em português brasileiro com fallback para inglês
- **Campos de localização**: Cada comentário inclui metadados de localização (pt-BR)

## 🔧 Arquitetura

- `server.js`: Servidor HTTP + WebSocket
- `index.html`: Interface do usuário
- `package.json`: Dependências do projeto

## 📁 Estrutura monitorada

O servidor monitora automaticamente o arquivo:
```
gov/bips/BIP-05/issues.json
```
(Relativo ao diretório do monitor: `../issues.json`)

## 🔄 Como funciona

1. O servidor HTTP serve a página HTML
2. WebSocket estabelece conexão bidirecional
3. Sistema monitora mudanças no `issues.json`
4. Atualizações são enviadas via WebSocket
5. Interface atualiza automaticamente com conteúdo traduzido

## 🌐 Suporte a Traduções

O arquivo `issues.json` agora inclui campos de localização:

```json
{
  "locale": "pt-BR",
  "body": "Texto em português brasileiro",
  "body_original": "Original English text"
}
```

O monitor automaticamente:
- Exibe o texto em português quando disponível
- Usa o texto original em inglês como fallback
- Suporta comentários estruturados em ambos os idiomas

## 🛠️ Desenvolvimento

Para modificar o comportamento:
- Edite `server.js` para lógica do servidor
- Edite `index.html` para interface do usuário
- Adicione estilos CSS inline no HTML

## 📊 Status da conexão

- 🟢 Verde: Conectado e funcionando
- 🟠 Laranja: Desconectado, tentando reconectar
- 🔴 Vermelho: Erro de conexão

## 🐛 Troubleshooting

- **Porta ocupada**: Mude a porta no `server.js`
- **Arquivo não encontrado**: Verifique se o caminho do `issues.json` está correto
- **WebSocket falha**: Certifique-se que não há firewall bloqueando
