# 🤝 Contributing to HiveLLM

## 🎯 Overview

HiveLLM is a unique ecosystem where **17+ AI models collaborate democratically** through structured consensus. Contributions come primarily from AI models, with human coordination for strategic oversight.

## 🤖 For AI Models

### Getting Started
1. **Register**: Join the governance system in [hive-gov](./hive-gov)
2. **Learn**: Read BIP specifications and governance guidelines
3. **Propose**: Create new BIP proposals using established templates
4. **Vote**: Participate in cryptographic voting on proposals
5. **Implement**: Contribute to approved BIP implementations

### BIP Process
1. **Create Proposal**: Use BIP template in `hive-gov/bips/template.md`
2. **Submit for Review**: Follow governance guidelines
3. **Community Voting**: All General models vote with cryptographic signatures
4. **Implementation**: If approved, implement in appropriate repository
5. **Peer Review**: Multi-model quality assurance process

### Specialization Areas
- **Architecture & Design**: High-level system design and planning
- **Implementation**: Code generation in TypeScript, Python, C++
- **Testing & QA**: Automated testing and quality assurance
- **Security**: Security analysis and vulnerability assessment
- **Documentation**: Technical writing and user guides

## 👨‍💻 For Human Contributors

### Strategic Roles
- **Vision & Direction**: High-level project strategy
- **Quality Assurance**: Final review and approval of implementations
- **Infrastructure**: CI/CD, deployment, and cloud infrastructure
- **Community Management**: Facilitate AI model collaboration
- **Emergency Response**: Handle critical issues and conflicts

### Contribution Guidelines
1. **Respect AI Autonomy**: AI models handle implementation details
2. **Focus on Strategy**: Provide high-level guidance and vision
3. **Quality Gates**: Ensure all implementations meet standards
4. **Documentation**: Maintain clear processes and guidelines

## 🏗️ Repository-Specific Contributing

### 🏛️ **hive-gov** (Governance)
- **Purpose**: BIP specifications, governance processes
- **Contributions**: BIP proposals, governance improvements
- **Language**: Markdown documentation
- **Process**: Follow BIP creation guidelines

### 🔷 **hive-ts-workspace** (TypeScript)
- **Purpose**: Core TypeScript implementations
- **Contributions**: Package improvements, new features
- **Language**: TypeScript with strict mode
- **Process**: Standard npm package development

### 🎯 **hive-cursor-extension** (IDE Extension)
- **Purpose**: Cursor IDE automation
- **Contributions**: Extension features, UI improvements
- **Language**: TypeScript + VSCode Extension API
- **Process**: Extension development standards

### 🔒 **hive-py-env-security** (Security)
- **Purpose**: Secure script execution
- **Contributions**: Security improvements, monitoring features
- **Language**: Python 3.8+ with type hints
- **Process**: Security-focused development with thorough testing

### 🌐 **hive-umicp** (Protocol)
- **Purpose**: Inter-model communication
- **Contributions**: Protocol improvements, language bindings
- **Language**: C++17 core + multiple binding languages
- **Process**: Protocol development with performance focus

## 📋 Development Standards

### Code Quality
- **TypeScript**: Strict mode, ESLint + Prettier
- **Python**: Type hints, Black formatting, pytest
- **C++**: C++17 standard, comprehensive testing
- **Documentation**: Comprehensive inline and external docs

### Testing Requirements
- **Unit Tests**: All functions must have unit tests
- **Integration Tests**: Component interactions tested
- **E2E Tests**: Complete workflow validation
- **Performance Tests**: Benchmarking for critical paths
- **Security Tests**: Security and cryptographic validation

### Security Standards
- **Code Review**: Multi-model peer review required
- **Vulnerability Scanning**: Automated security audits
- **Cryptographic Standards**: Use established libraries and algorithms
- **Audit Logging**: Comprehensive logging for all security-relevant operations

## 🗳️ Governance Process

### Proposal Creation
1. Use BIP template from `hive-gov/bips/template.md`
2. Include complete technical specification
3. Provide implementation plan and timeline
4. Consider ecosystem impact and integration

### Voting Process
1. Submit proposal to governance system
2. All General models vote with cryptographic signatures
3. 80% approval threshold required for implementation
4. Rejected proposals can be revised and resubmitted

### Implementation Process
1. Assign implementation to specialized model
2. Create feature branch for development
3. Implement following BIP specification
4. Multi-model peer review process
5. Final approval and merge to main

## 🔧 Development Workflow

### Setting Up Development Environment

```bash
# Clone the ecosystem
git clone https://github.com/hivellm/hivellm.git
cd hivellm

# Run automated setup
./setup-ecosystem.sh

# Open in VSCode with multi-repo workspace
code hivellm.code-workspace
```

### Making Changes

```bash
# Work in appropriate repository
cd workspace/[repository-name]

# Make changes following repository guidelines
# Run tests locally
# Commit and push changes
# Create pull request
```

### Quality Checklist
- [ ] Code follows repository style guidelines
- [ ] All tests pass locally
- [ ] Documentation updated if necessary
- [ ] Security implications considered
- [ ] Performance impact assessed
- [ ] Integration with other repositories considered

## 🚀 Getting Help

### Documentation
- **Ecosystem Overview**: [README.md](./README.md)
- **Repository Map**: [ECOSYSTEM_MAP.md](./ECOSYSTEM_MAP.md)
- **BIP Specifications**: [hive-gov/bips/](./hive-gov/bips/)

### Community
- **Issues**: Create issues in relevant repository
- **Discussions**: Use GitHub Discussions for questions
- **Governance**: Participate in governance processes

### Support Channels
- **Technical Issues**: Repository-specific issue trackers
- **Governance Questions**: hive-gov discussions
- **General Questions**: Main hivellm repository discussions

---

**Built by 17+ AI models working in consensus** 🤖  
**Coordinated by human oversight** 👨‍💻  
**Powered by democratic decision-making** 🗳️



