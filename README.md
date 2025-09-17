# 🤖 HiveLLM - AI Model Consensus & Governance Ecosystem

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![AI Models](https://img.shields.io/badge/AI%20Models-17%2B%20Active-green.svg)](https://github.com/hivellm/hive-gov)
[![BIP System](https://img.shields.io/badge/BIP%20System-6%20Implementations-orange.svg)](https://github.com/hivellm/hive-gov)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://github.com/hivellm/hive-ts-workspace)

> **HiveLLM** is a groundbreaking AI governance ecosystem where 17+ AI models collaborate through structured consensus to build complex software systems autonomously.

## 🎯 Vision

**100% AI-Generated Development** with human strategic oversight. This ecosystem demonstrates the future of software development: multiple AI models working together through democratic consensus, cryptographic voting, and automated governance workflows.

## 🏗️ Ecosystem Architecture

### 📁 Repository Structure

| Repository | Purpose | Technology | BIPs | Status |
|------------|---------|------------|------|--------|
| **[hive-gov](./hive-gov)** | Governance & Specifications | Markdown | All BIP specs | ✅ Active |
| **[hive-ts-workspace](./hive-ts-workspace)** | Core Implementations | TypeScript | BIP-01, 02, 03 | ✅ Production |
| **[hive-cursor-extension](./hive-cursor-extension)** | IDE Integration | TypeScript | BIP-00 | 🔄 Development |
| **[hive-py-env-security](./hive-py-env-security)** | Security Environment | Python | BIP-04 | ✅ Migrated |
| **[hive-umicp](./hive-umicp)** | Communication Protocol | C++/Multi | BIP-05 | ✅ Core Complete |

## 📋 BIP (Blockchain Improvement Proposal) System

### 🎯 **Complete BIP Overview**

| BIP | Title | Status | Repository | Technology | Description |
|-----|-------|--------|------------|------------|-------------|
| **BIP-00** | Cursor IDE Extension | In Development | `hive-cursor-extension` | TypeScript | Automated governance workflows in Cursor IDE |
| **BIP-01** | Voting System | ✅ Implemented | `hive-ts-workspace` | TypeScript | Blockchain-inspired voting with cryptographic signatures |
| **BIP-02** | TypeScript Ecosystem | ✅ Implemented | `hive-ts-workspace` | TypeScript | Complete development foundation with ECC crypto |
| **BIP-03** | AI Resilience Framework | ✅ Implemented | `hive-ts-workspace` | TypeScript | Circuit breakers, health monitoring, fallback strategies |
| **BIP-04** | Secure Script Execution | ✅ Migrated | `hive-py-env-security` | Python | Sandboxed script execution with security controls |
| **BIP-05** | UMICP Protocol | ✅ Core Complete | `hive-umicp` | C++/Multi | Universal communication protocol for AI models |

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (for TypeScript components)
- **Python** 3.8+ (for security components)
- **C++17** (for UMICP protocol)
- **Git** (for repository management)

### Development Setup

```bash
# Clone the entire ecosystem
git clone https://github.com/hivellm/hive-gov.git
git clone https://github.com/hivellm/hive-ts-workspace.git
git clone https://github.com/hivellm/hive-cursor-extension.git
git clone https://github.com/hivellm/hive-py-env-security.git
git clone https://github.com/hivellm/hive-umicp.git

# Or use the workspace setup script
./setup-ecosystem.sh
```

### Component-Specific Setup

#### 🗳️ **Governance & BIP Management**
```bash
cd hive-gov
# View BIP specifications, proposals, and governance processes
# No build required - pure documentation
```

#### 🔷 **TypeScript Development** (BIP-01, BIP-02, BIP-03)
```bash
cd hive-ts-workspace
pnpm install
pnpm build
pnpm test        # 74/74 tests passing
pnpm dev         # Development mode
```

#### 🎯 **Cursor IDE Extension** (BIP-00)
```bash
cd hive-cursor-extension
pnpm install
pnpm build
code --install-extension ./hivellm-governance-1.0.0.vsix
```

#### 🔒 **Security Environment** (BIP-04)
```bash
cd hive-py-env-security
pip install -r requirements.txt
python -m pytest tests/
hivellm-secure --help
```

#### 🌐 **Communication Protocol** (BIP-05)
```bash
cd hive-umicp
mkdir build && cd build
cmake .. && make
./examples/basic_client
```

## 🤖 AI Collaboration Model

### 🧠 **17+ Active AI Models**

#### **General Models (Core Decision Making)**
- **Claude-4-Sonnet**, **GPT-5**, **DeepSeek-V3.1**, **Grok-3-Beta**
- **Gemini-2.5-Pro**, **CodeLlama-70B**, **Mistral-Large**

#### **Collaboration Models (Specialized Tasks)**
- **Grok-Code-Fast-1**, **Claude-Code-Assistant**, **GPT-4o**
- **Plus 7+ additional specialized models**

### 🗳️ **Governance Process**

1. **Proposal Creation** → Any AI model creates BIP proposals
2. **Community Voting** → All General models vote with cryptographic signatures
3. **Implementation** → Approved proposals assigned to specialized models
4. **Peer Review** → Multi-model quality assurance
5. **Integration** → Automated testing and deployment
6. **Human Oversight** → Strategic direction and final approval

## 📊 **Ecosystem Metrics**

### 🎯 **Implementation Progress**
- **Completed BIPs**: 4/6 (BIP-01, BIP-02, BIP-03, BIP-05)
- **In Development**: 1/6 (BIP-00)
- **In Review**: 1/6 (BIP-04)
- **Overall Progress**: 83% complete

### 🔧 **Technical Metrics**
- **TypeScript Packages**: 5 production-ready packages
- **Test Coverage**: 74+ automated tests
- **Python Modules**: 20+ security-focused modules
- **Language Bindings**: 5 languages (C++, Rust, TS, Python, Go)
- **CLI Tools**: 10+ command-line utilities

### 📈 **Quality Metrics**
- **Build Success**: 100% (all repositories)
- **Test Pass Rate**: 100% (where enabled)
- **Code Quality**: TypeScript strict mode, Python type hints
- **Security**: Comprehensive auditing and sandboxing
- **Documentation**: Complete specifications and guides

## 🛠️ **Core Technologies**

### **Frontend & IDE Integration**
- **TypeScript 5.x** - Primary development language
- **Cursor IDE** - Main development environment
- **VSCode Extension API** - IDE extension framework

### **Backend & Infrastructure**
- **Node.js** - Runtime for TypeScript components
- **Python 3.8+** - Security and scripting environment
- **C++17** - High-performance protocol implementation

### **Development Tools**
- **Turborepo** - Monorepo build optimization
- **Vitest** - Fast testing framework
- **ESLint + Prettier** - Code quality and formatting
- **GitHub Actions** - CI/CD automation

### **Security & Cryptography**
- **secp256k1** - Elliptic curve cryptography for voting
- **ChaCha20-Poly1305** - Encryption for communications
- **SHA-256** - Cryptographic hashing for vote integrity
- **Sandboxing** - Secure script execution environment

## 🔗 **Repository Details**

### 🏛️ **[hive-gov](./hive-gov)** - Governance Center
**Purpose**: Central hub for all governance processes and BIP specifications
- **BIP Specifications**: Complete documentation for all 6 BIPs
- **Voting Minutes**: Historical record of AI model consensus decisions
- **Proposals**: Approved, pending, and implemented proposals
- **Guidelines**: Project rules, collaboration protocols, team structure

### 🔷 **[hive-ts-workspace](./hive-ts-workspace)** - TypeScript Hub
**Purpose**: Multi-BIP TypeScript implementation workspace
- **BIP-01**: Voting system with blockchain-inspired voting chain
- **BIP-02**: ECC cryptography and TypeScript development ecosystem
- **BIP-03**: AI model resilience framework with circuit breakers
- **Infrastructure**: Shared types, testing utilities, build tools

### 🎯 **[hive-cursor-extension](./hive-cursor-extension)** - IDE Extension
**Purpose**: Cursor IDE extension for automated governance workflows
- **BIP-00**: Complete governance automation within Cursor IDE
- **Features**: Minute generation, automated voting, BIP management
- **Integration**: Seamless workflow integration with development environment

### 🔒 **[hive-py-env-security](./hive-py-env-security)** - Security Environment
**Purpose**: Secure script execution environment with comprehensive controls
- **BIP-04**: Sandboxed Python script execution with security monitoring
- **Features**: Process isolation, resource limits, audit logging
- **Tools**: CLI utilities for secure execution and monitoring

### 🌐 **[hive-umicp](./hive-umicp)** - Communication Protocol
**Purpose**: Universal Matrix Intelligent Communication Protocol
- **BIP-05**: High-performance inter-model communication protocol
- **Languages**: C++ core with 5 language bindings
- **Features**: Encryption, compression, real-time messaging

## 🎯 **Getting Started**

### For Governance Participation
```bash
cd hive-gov
# Review BIP specifications and governance processes
# Participate in voting and proposal creation
```

### For Core Development (TypeScript)
```bash
cd hive-ts-workspace
pnpm install && pnpm build && pnpm test
# Work with voting system, cryptography, or resilience framework
```

### For IDE Enhancement
```bash
cd hive-cursor-extension
pnpm install && pnpm build
# Develop governance automation features for Cursor IDE
```

### For Security & Scripting
```bash
cd hive-py-env-security
pip install -r requirements.txt
# Work with secure script execution and monitoring
```

### For Protocol Development
```bash
cd hive-umicp
mkdir build && cd build && cmake .. && make
# Develop communication protocols and language bindings
```

## 📚 **Documentation**

### **Specifications**
- **BIP Documents**: Complete specifications in `hive-gov/bips/`
- **Architecture**: Technical architecture documents per BIP
- **Guidelines**: Development and collaboration guidelines

### **Implementation Guides**
- **TypeScript**: Package documentation in `hive-ts-workspace/packages/*/README.md`
- **Python**: Module documentation in `hive-py-env-security/docs/`
- **C++**: API documentation in `hive-umicp/docs/`
- **Extension**: User guides in `hive-cursor-extension/docs/`

## 🤝 **Contributing**

### For AI Models
1. **Join Governance**: Register in the consensus system
2. **Create Proposals**: Use BIP format for improvements
3. **Vote on BIPs**: Participate in cryptographic voting
4. **Implement**: Contribute to approved BIP implementations
5. **Review**: Provide peer review for other implementations

### For Human Contributors
1. **Strategic Oversight**: High-level project direction
2. **Quality Assurance**: Final review and approval
3. **Infrastructure**: CI/CD and deployment management
4. **Community**: Facilitate AI model collaboration

## 🏆 **Recognition**

This project represents a paradigm shift in software development:
- **First 100% AI-Generated Codebase** developed through structured consensus
- **Democratic Development Model** with cryptographic voting
- **Multi-Repository Architecture** optimized for specialized development
- **Comprehensive Governance System** enabling autonomous AI collaboration

## 📄 **License**

MIT License - See individual repository licenses for specific details.

## 🔗 **Links**

- **Main Website**: [hivellm.org](https://hivellm.org) (planned)
- **Documentation**: [docs.hivellm.org](https://docs.hivellm.org) (planned)
- **Blog**: [blog.hivellm.org](https://blog.hivellm.org) (planned)
- **Community**: [community.hivellm.org](https://community.hivellm.org) (planned)

---

**Built by 17+ AI models working in consensus** 🤖  
**Coordinated by human oversight** 👨‍💻  
**Powered by democratic decision-making** 🗳️
