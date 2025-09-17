#!/bin/bash
set -euo pipefail

# HiveLLM Ecosystem Setup Script
# Automatically clones and sets up all repositories

echo "🤖 HiveLLM Ecosystem Setup"
echo "=========================="
echo ""

# Check dependencies
echo "🔍 Checking dependencies..."

# Check for required tools
MISSING_TOOLS=()

if ! command -v git &> /dev/null; then
    MISSING_TOOLS+=("git")
fi

if ! command -v node &> /dev/null; then
    MISSING_TOOLS+=("node")
fi

if ! command -v pnpm &> /dev/null; then
    MISSING_TOOLS+=("pnpm")
fi

if ! command -v python3 &> /dev/null; then
    MISSING_TOOLS+=("python3")
fi

if ! command -v cmake &> /dev/null; then
    MISSING_TOOLS+=("cmake")
fi

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
    echo "❌ Missing required tools: ${MISSING_TOOLS[*]}"
    echo "Please install the missing tools and run this script again."
    exit 1
fi

echo "✅ All required tools found"
echo ""

# Create directory structure
echo "📁 Setting up directory structure..."
mkdir -p workspace
cd workspace

# Clone repositories
echo "📥 Cloning repositories..."

repos=(
    "gov:Governance & BIP Specifications"
    "ts-workspace:TypeScript Implementation Hub (BIP-01,02,03)"
    "cursor-extension:Cursor IDE Extension (BIP-00)"
    "py-env-security:Secure Script Execution (BIP-04)"
    "umicp:Communication Protocol (BIP-05)"
    "chat-hub:AI Communication & Monitoring Hub"
)

for repo_info in "${repos[@]}"; do
    IFS=':' read -r repo_name description <<< "$repo_info"
    echo "  📦 Cloning $repo_name - $description"
    
    if [ -d "$repo_name" ]; then
        echo "    ⚠️  Directory already exists, skipping..."
    else
        git clone "https://github.com/hivellm/$repo_name.git" || {
            echo "    ⚠️  Repository not available yet, creating placeholder..."
            mkdir "$repo_name"
            echo "# $description" > "$repo_name/README.md"
            echo "Repository will be available at: https://github.com/hivellm/$repo_name" >> "$repo_name/README.md"
        }
    fi
done

echo ""
echo "🛠️  Setting up development environments..."

# Setup TypeScript workspace
if [ -d "ts-workspace" ]; then
    echo "  📦 Setting up TypeScript workspace..."
    cd ts-workspace
    if [ -f "package.json" ]; then
        pnpm install || echo "    ⚠️  pnpm install failed, continuing..."
        pnpm build || echo "    ⚠️  pnpm build failed, continuing..."
    fi
    cd ..
fi

# Setup Cursor extension
if [ -d "cursor-extension" ]; then
    echo "  🎯 Setting up Cursor extension..."
    cd cursor-extension
    if [ -f "package.json" ]; then
        pnpm install || echo "    ⚠️  pnpm install failed, continuing..."
    fi
    cd ..
fi

# Setup Python security environment
if [ -d "py-env-security" ]; then
    echo "  🔒 Setting up Python security environment..."
    cd py-env-security
    if [ -f "requirements.txt" ]; then
        python3 -m venv .venv || echo "    ⚠️  Virtual environment creation failed, continuing..."
        source .venv/bin/activate 2>/dev/null || echo "    ⚠️  Virtual environment activation failed, continuing..."
        pip install -r requirements.txt || echo "    ⚠️  pip install failed, continuing..."
    fi
    cd ..
fi

# Setup UMICP protocol
if [ -d "umicp" ]; then
    echo "  🌐 Setting up UMICP protocol..."
    cd umicp
    if [ -f "cpp/CMakeLists.txt" ]; then
        mkdir -p build
        cd build
        cmake ../cpp || echo "    ⚠️  cmake configuration failed, continuing..."
        make -j$(nproc) || echo "    ⚠️  make build failed, continuing..."
        cd ..
    fi
    cd ..
fi

# Setup Chat Hub
if [ -d "chat-hub" ]; then
    echo "  💬 Setting up Chat Hub..."
    cd chat-hub
    if [ -f "package.json" ]; then
        npm install || echo "    ⚠️  npm install failed, continuing..."
    fi
    cd ..
fi

echo ""
echo "🎉 HiveLLM Ecosystem Setup Complete!"
echo ""
echo "📁 Directory structure:"
echo "  workspace/"
echo "  ├── gov/                 # Governance & BIP specifications"
echo "  ├── ts-workspace/        # TypeScript implementations (BIP-01,02,03)"
echo "  ├── cursor-extension/    # Cursor IDE extension (BIP-00)"
echo "  ├── py-env-security/     # Secure execution environment (BIP-04)"
echo "  ├── umicp/               # Communication protocol (BIP-05)"
echo "  └── chat-hub/            # AI communication & monitoring hub"
echo ""
echo "🚀 Next steps:"
echo "  1. cd workspace/gov && explore BIP specifications"
echo "  2. cd workspace/ts-workspace && pnpm dev"
echo "  3. cd workspace/cursor-extension && code ."
echo "  4. cd workspace/chat-hub && npm start  # AI monitoring interface"
echo "  5. Open hivellm.code-workspace in VSCode for multi-repo development"
echo ""
echo "📚 Documentation: See README.md in each repository"
echo "🔗 Ecosystem Overview: ../README.md"
echo ""
echo "✅ Ready for HiveLLM development!"
