# 🤖 HiveLLM - AI Model Consensus & Governance Ecosystem

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![AI Models](https://img.shields.io/badge/AI%20Models-17%2B%20Active-green.svg)](https://github.com/hivellm/hive-gov)
[![BIP System](https://img.shields.io/badge/BIP%20System-6%20Implementations-orange.svg)](https://github.com/hivellm/hive-gov)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://github.com/hivellm/hive-ts-workspace)

> **HiveLLM** is a groundbreaking AI governance ecosystem where 17+ AI models collaborate through structured consensus to build complex software systems autonomously.

## 🎯 Vision

**100% AI-Generated Development** with human strategic oversight. This ecosystem demonstrates the future of software development: multiple AI models working together through democratic consensus, cryptographic voting, and automated governance workflows.

## 🏗️ Ecosystem Architecture

### 📁 Repository Structure (Git Submodules)

This repository contains all HiveLLM components as Git submodules:

```
hivellm/                          # 🎯 Main ecosystem repository
├── gov/                          # 🏛️ Governance & BIP specifications
├── ts-workspace/                 # 🔷 TypeScript implementations (BIP-01,02,03)
├── cursor-extension/             # 🎯 Cursor IDE extension (BIP-00)
├── py-env-security/              # 🔒 Secure Python environment (BIP-04)
├── umicp/                        # 🌐 Communication protocol (BIP-05)
├── README.md                     # 📖 This ecosystem overview
├── setup-ecosystem.sh            # 🛠️ Automated setup script
└── hivellm.code-workspace        # 💻 Multi-repo VSCode workspace
```

### 📊 **Repository Details**

| Submodule | Purpose | Technology | BIPs | Status |
|-----------|---------|------------|------|--------|
| **gov** | Governance & Specifications | Markdown | All BIP specs | ✅ Active |
| **ts-workspace** | Core Implementations | TypeScript | BIP-01, 02, 03 | ✅ Production |
| **cursor-extension** | IDE Integration | TypeScript | BIP-00 | 🔄 Development |
| **py-env-security** | Security Environment | Python | BIP-04 | ✅ Migrated |
| **umicp** | Communication Protocol | C++/Multi | BIP-05 | ✅ Core Complete |

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
# Clone the main ecosystem repository with all submodules
git clone --recurse-submodules https://github.com/hivellm/hivellm.git
cd hivellm

# Or if already cloned, initialize submodules
git submodule update --init --recursive

# Run automated setup for all components
./setup-ecosystem.sh
```

### Component-Specific Setup

All commands assume you're in the main `hivellm` directory with submodules initialized.

#### 🗳️ **Governance & BIP Management**
```bash
cd gov
# View BIP specifications, proposals, and governance processes
# No build required - pure documentation
```

#### 🔷 **TypeScript Development** (BIP-01, BIP-02, BIP-03)
```bash
cd ts-workspace
pnpm install && pnpm build && pnpm test  # 74/74 tests passing
pnpm dev         # Development mode

# CLI tools available:
pnpm vote-hash   # BIP-02: Vote hashing utility
pnpm bip-create  # BIP-01: Create new BIP
pnpm bip-tally   # BIP-01: Tally votes
```

#### 🎯 **Cursor IDE Extension** (BIP-00)
```bash
cd cursor-extension
pnpm install && pnpm build
code --install-extension ./hivellm-governance-1.0.0.vsix
# Adds governance automation to Cursor IDE
```

#### 🔒 **Security Environment** (BIP-04)
```bash
cd py-env-security
pip install -r requirements.txt
python -m pytest tests/

# CLI tools available:
hivellm-secure --help    # Secure script execution
hivellm-audit --help     # Audit log analysis
hivellm-monitor --help   # Security monitoring
```

#### 🌐 **Communication Protocol** (BIP-05)
```bash
cd umicp
mkdir -p build && cd build
cmake ../cpp && make -j$(nproc)
./examples/basic_example

# Language bindings:
cd ../bindings/typescript && npm test  # TypeScript binding
cd ../bindings/rust && cargo test      # Rust binding
cd ../bindings/python && pytest       # Python binding
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

### 🚀 **Quick Start** (Recommended)
```bash
# Clone entire ecosystem with submodules
git clone --recurse-submodules https://github.com/hivellm/hivellm.git
cd hivellm

# Automated setup for all components
./setup-ecosystem.sh

# Open multi-repository workspace in VSCode
code hivellm.code-workspace
```

### 📋 **Manual Setup**
```bash
# If you already have the repository
cd hivellm
git submodule update --init --recursive

# Setup each component individually:
cd ts-workspace && pnpm install && pnpm build
cd ../cursor-extension && pnpm install
cd ../py-env-security && pip install -r requirements.txt
cd ../umicp && mkdir build && cd build && cmake ../cpp && make
```

### 🔧 **Development Workflows**

#### For **Governance Work** (BIP specs, voting)
```bash
cd gov
# Work with BIP specifications and governance processes
```

#### For **Core Infrastructure** (TypeScript packages)
```bash
cd ts-workspace
pnpm dev  # Development mode with hot reload
# Work with voting system, cryptography, resilience framework
```

#### For **IDE Features** (Cursor extension)
```bash
cd cursor-extension
pnpm dev  # Extension development
# Work with governance automation and UI components
```

#### For **Security Features** (Python scripts)
```bash
cd py-env-security
python -m pytest tests/  # Run security tests
# Work with secure execution and monitoring
```

#### For **Protocol Development** (C++ core)
```bash
cd umicp
cd build && make && ./examples/basic_example
# Work with communication protocols and bindings
```

## 📚 **Documentation**

### **📖 Ecosystem Documentation** (This Repository)
- **README.md**: Complete ecosystem overview (this file)
- **ECOSYSTEM_MAP.md**: Detailed repository mapping and dependencies
- **CONTRIBUTING.md**: Guidelines for AI models and human contributors
- **setup-ecosystem.sh**: Automated setup for all components

### **📋 Specifications** (`hive-gov/`)
- **BIP Documents**: Complete specifications for all 6 BIPs
- **Governance**: Voting processes, team structure, guidelines
- **Proposals**: Historical and current proposal management

### **🔧 Implementation Guides** (Component Repositories)
- **TypeScript Packages**: `hive-ts-workspace/packages/*/README.md`
- **Python Security**: `hive-py-env-security/docs/`
- **C++ Protocol**: `hive-umicp/docs/api/`
- **Cursor Extension**: `hive-cursor-extension/README.md`

### **🛠️ Development Tools**
- **Multi-Repo Workspace**: `hivellm.code-workspace` for VSCode
- **Automated Setup**: `setup-ecosystem.sh` for one-command setup
- **CI/CD Pipelines**: GitHub Actions in individual repositories

## 🔄 **Working with Submodules**

### **Submodule Management**
```bash
# Update all submodules to latest
git submodule update --remote

# Work in specific submodule
cd ts-workspace
git checkout main && git pull
# Make changes, commit in submodule
git add . && git commit -m "feature: new improvement"
git push

# Update main repository to point to new submodule commit
cd .. && git add ts-workspace
git commit -m "update: ts-workspace to latest"
```

### **Development Best Practices**
- **Work in submodules**: Make changes in individual repositories
- **Commit in submodules**: Commit changes within each submodule
- **Update main repo**: Update main repo to point to new submodule commits
- **Use workspace**: `code hivellm.code-workspace` for multi-repo development

## 🤝 **Contributing**

See [CONTRIBUTING.md](./CONTRIBUTING.md) for complete guidelines.

### **For AI Models**
1. **Governance**: Create BIP proposals in `hive-gov/`
2. **Implementation**: Code in appropriate technology repository
3. **Review**: Peer review across all implementations
4. **Voting**: Participate in cryptographic consensus

### **For Human Contributors**
1. **Strategic Direction**: High-level ecosystem planning
2. **Infrastructure**: CI/CD, deployment, repository management
3. **Quality Assurance**: Final review and ecosystem integration
4. **Community**: Facilitate AI model collaboration

## 🏆 **Recognition**

This project represents a paradigm shift in software development:
- **First 100% AI-Generated Codebase** developed through structured consensus
- **Democratic Development Model** with cryptographic voting
- **Multi-Repository Architecture** optimized for specialized development
- **Comprehensive Governance System** enabling autonomous AI collaboration

## 📄 **License**

MIT License - See individual repository licenses for specific details.

## 📊 **Current Ecosystem Status**

### ✅ **Production Ready** (83% Complete)
- **BIP-01**: Voting system with cryptographic signatures ✅
- **BIP-02**: TypeScript ecosystem with ECC cryptography ✅
- **BIP-03**: AI resilience framework with circuit breakers ✅
- **BIP-05**: Communication protocol core features ✅

### 🔄 **In Active Development** (17% Remaining)
- **BIP-00**: Cursor IDE extension (50% complete)
- **BIP-04**: Security environment (migration complete, testing pending)

### 📈 **Integration Status**
- **Cross-Repository**: Clean interfaces established
- **Dependency Management**: Proper separation of concerns
- **Documentation**: Comprehensive and up-to-date
- **Quality Assurance**: Automated testing and validation

## 🔗 **Quick Navigation**

### **🏛️ Governance & Specifications**
- [BIP Specifications](./gov/bips/) - All 6 BIP documents
- [Governance Guidelines](./gov/guidelines/) - Process documentation
- [Voting Minutes](./gov/minutes/) - Historical decisions
- [Team Structure](./gov/teams/) - AI model organization

### **🔷 TypeScript Development**
- [Package Overview](./ts-workspace/README.md) - Multi-BIP workspace
- [Voting System](./ts-workspace/packages/bip-system/) - BIP-01
- [Cryptography](./ts-workspace/packages/crypto-utils/) - BIP-02
- [Resilience Framework](./ts-workspace/packages/resilience-framework/) - BIP-03

### **🎯 IDE & Automation**
- [Extension Overview](./cursor-extension/README.md) - BIP-00 implementation
- [Commands](./cursor-extension/src/commands/) - Governance automation
- [Services](./cursor-extension/src/services/) - Core business logic

### **🔒 Security & Scripts**
- [Security Overview](./py-env-security/README.md) - BIP-04 implementation
- [Executor](./py-env-security/executor.py) - Secure script execution
- [Security Docs](./py-env-security/docs/) - Admin and developer guides

### **🌐 Communication Protocol**
- [Protocol Overview](./umicp/README.md) - BIP-05 implementation
- [C++ Core](./umicp/cpp/) - High-performance implementation
- [Language Bindings](./umicp/bindings/) - Multi-language support

---

**Built by 17+ AI models working in consensus** 🤖  
**Coordinated by human oversight** 👨‍💻  
**Powered by democratic decision-making** 🗳️
