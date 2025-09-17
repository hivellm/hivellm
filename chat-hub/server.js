const http = require('http');
const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ============================================================================
// SISTEMA DE LOGGING ROBUSTO
// ============================================================================

const LOG_FILE = path.join(__dirname, 'server-debug.log');
const ERROR_LOG_FILE = path.join(__dirname, 'server-errors.log');

function writeToLog(level, category, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        category,
        message,
        data: data ? JSON.stringify(data, null, 2) : null,
        pid: process.pid
    };

    const logLine = `[${timestamp}] [${level}] [${category}] ${message}${data ? `\nDATA: ${JSON.stringify(data, null, 2)}` : ''}\n`;

    // Write to console
    console.log(`[${level}] [${category}] ${message}`);
    if (data) console.log('DATA:', data);

    // Write to main log file
    try {
        fs.appendFileSync(LOG_FILE, logLine);
    } catch (err) {
        console.error('FATAL: Cannot write to log file:', err);
    }

    // Write errors to separate error log
    if (level === 'ERROR' || level === 'FATAL') {
        try {
            fs.appendFileSync(ERROR_LOG_FILE, logLine);
        } catch (err) {
            console.error('FATAL: Cannot write to error log file:', err);
        }
    }
}

function logInfo(category, message, data = null) {
    writeToLog('INFO', category, message, data);
}

function logWarn(category, message, data = null) {
    writeToLog('WARN', category, message, data);
}

function logError(category, message, data = null) {
    writeToLog('ERROR', category, message, data);
}

function logDebug(category, message, data = null) {
    writeToLog('DEBUG', category, message, data);
}

function logFatal(category, message, data = null) {
    writeToLog('FATAL', category, message, data);
}

// Log startup
logInfo('STARTUP', 'BIP-05 Monitor Server starting...', {
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    cwd: process.cwd(),
    logFile: LOG_FILE,
    errorLogFile: ERROR_LOG_FILE
});

// Load environment variables from .env file
function loadEnvironment() {
    const envPath = path.join(__dirname, '..', '..', '..', '..', '.env');
    const envExists = fs.existsSync(envPath);

    console.log(`[ENV] Checking for .env file at: ${envPath}`);

    if (envExists) {
        console.log(`[ENV] Loading .env file...`);
        try {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const envLines = envContent.split('\n');

            envLines.forEach(line => {
                line = line.trim();
                if (line && !line.startsWith('#')) {
                    const [key, value] = line.split('=');
                    if (key && value) {
                        process.env[key.trim()] = value.trim();
                        console.log(`[ENV] Loaded: ${key.trim()}`);
                    }
                }
            });

            console.log(`[ENV] ✅ Environment variables loaded successfully`);
        } catch (error) {
            console.error(`[ENV] ❌ Error reading .env file:`, error.message);
        }
    } else {
        console.log(`[ENV] ⚠️  No .env file found. Aider models will not work without API keys.`);
        console.log(`[ENV] Create a .env file in the project root with your API keys.`);
    }
}

// Validate required API keys for aider models
function validateApiKeys() {
    const requiredKeys = [
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'GEMINI_API_KEY',
        'XAI_API_KEY',
        'DEEPSEEK_API_KEY',
        'GROQ_API_KEY'
    ];

    const missingKeys = [];
    const availableKeys = [];

    requiredKeys.forEach(key => {
        if (process.env[key]) {
            availableKeys.push(key);
        } else {
            missingKeys.push(key);
        }
    });

    console.log(`[ENV] API Keys Status:`);
    console.log(`[ENV] ✅ Available: ${availableKeys.join(', ')}`);

    if (missingKeys.length > 0) {
        console.log(`[ENV] ❌ Missing: ${missingKeys.join(', ')}`);
        console.log(`[ENV] Some aider models will not be available without these keys.`);
    }

    return { availableKeys, missingKeys };
}

// Initialize environment
loadEnvironment();
const keyStatus = validateApiKeys();

// Test API connectivity with ALL available models
async function testApiConnectivity() {
    // Check cache first
    const cachedResults = loadApiCache();
    if (cachedResults) {
        const workingModels = getModelsFromProviders(cachedResults.workingProviders);
        console.log(`[API CACHE] ✅ Using cached working providers: ${cachedResults.workingProviders.join(', ')}`);
        console.log(`[API CACHE] 📋 Available models from cache: ${workingModels.length} models`);
        return {
            workingApis: workingModels,
            failedApis: [],
            fromCache: true
        };
    }

    console.log(`[API TEST] 🧪 Testing API connectivity with ALL available models...`);

    // Create test configuration for ALL models in aider_models
    const testModels = [];
    const modelConfigs = MODEL_CATEGORIES.aider_models;

    // Iterate through all aider models and create test configuration
    for (const [modelId, config] of Object.entries(modelConfigs)) {
        testModels.push({
            modelId: modelId,
            config: config,
            provider: config.provider,
            apiKey: config.key,
            fullModelName: config.model
        });
    }

    console.log(`[API TEST] 📋 Testing ${testModels.length} models total`);
    console.log(`[API TEST] 🔍 Starting comprehensive model testing...`);

    const workingProviders = [];
    const failedProviders = [];
    const costReports = [];
    const testedProviders = new Set();

    // Test each model individually
    for (const testModel of testModels) {
        const apiKey = process.env[testModel.apiKey];

        if (!apiKey) {
            console.log(`[API TEST] ⏭️  Skipping ${testModel.modelId} - No API key for ${testModel.apiKey}`);
            failedProviders.push({
                provider: testModel.provider,
                model: testModel.modelId,
                reason: `Missing ${testModel.apiKey}`
            });
            continue;
        }

        console.log(`[API TEST] 🔍 Testing model: ${testModel.modelId} (${testModel.provider})`);

        try {
            const testPrompt = "Responda apenas 'OK' para confirmar que a API está funcionando.";
            const result = await callLLMViaAider(testModel.modelId, testPrompt);

            // Handle new response format with cost information
            const response = typeof result === 'object' ? result.response : result;
            const costInfo = typeof result === 'object' ? result.costInfo : null;

            if (response && !response.includes('❌') && response.toLowerCase().includes('ok')) {
                console.log(`[API TEST] ✅ ${testModel.modelId} - WORKING`);

                // Add provider to working list if not already there
                if (!testedProviders.has(testModel.provider)) {
                    workingProviders.push(testModel.provider);
                    testedProviders.add(testModel.provider);
                }

                // Store cost information if available
                if (costInfo) {
                    const hasCostData = (costInfo.inputTokens !== null && costInfo.inputTokens !== undefined) || (costInfo.totalCost !== null && costInfo.totalCost !== undefined);

                    costReports.push({
                        provider: testModel.provider,
                        model: testModel.modelId,
                        hasCostData,
                        ...costInfo,
                        testTimestamp: new Date().toISOString()
                    });

                    if (hasCostData) {
                        console.log(`[API TEST] 💰 Cost data captured for ${testModel.modelId}:`);
                        console.log(`[API TEST]   - Input tokens: ${costInfo.inputTokens || 'N/A'}`);
                        console.log(`[API TEST]   - Output tokens: ${costInfo.outputTokens || 'N/A'}`);
                        console.log(`[API TEST]   - Total cost: $${costInfo.totalCost || 'N/A'}`);
                    }
                }
            } else {
                console.log(`[API TEST] ❌ ${testModel.modelId} - FAILED: ${response}`);
                failedProviders.push({
                    provider: testModel.provider,
                    model: testModel.modelId,
                    reason: response
                });
            }
        } catch (error) {
            console.log(`[API TEST] ❌ ${testModel.modelId} - ERROR: ${error.message}`);
            failedProviders.push({
                provider: testModel.provider,
                model: testModel.modelId,
                reason: error.message
            });
        }

        // Small delay between tests to avoid rate limits (0.5 seconds between models)
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log(`[API TEST] 📊 Progress: ${workingProviders.length + failedProviders.length}/${testModels.length} models tested`);
    }

    // Save results to cache
    saveApiCache(workingProviders, failedProviders, costReports);

    // Get all models for working providers
    const workingModels = getModelsFromProviders(workingProviders);

    console.log(`\n[API TEST] 📊 Test Results Summary:`);
    console.log(`[API TEST] ✅ Working Providers (${workingProviders.length}): ${workingProviders.join(', ')}`);
    console.log(`[API TEST] 📋 Available Models (${workingModels.length}): ${workingModels.join(', ')}`);
    console.log(`[API TEST] 💰 Cost Reports Generated: ${costReports.length}`);

    if (failedProviders.length > 0) {
        console.log(`[API TEST] ❌ Failed Models (${failedProviders.length}):`);
        failedProviders.forEach(({ provider, model, reason }) => {
            console.log(`[API TEST]   - ${model} (${provider}): ${reason}`);
        });
    }

    return {
        workingApis: workingModels,
        failedApis: failedProviders.map(f => ({ model: f.provider, error: f.reason })),
        fromCache: false
    };
}

// Store working APIs globally
let WORKING_APIS = [];

// API test cache configuration
const API_CACHE_FILE = path.join(__dirname, 'api-test-cache.json');
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Provider to models mapping - matches actual MODEL_CATEGORIES for cost reporting
const PROVIDER_MODELS = {
    'openai': [
        'gpt-4o',           // GPT-4o — multimodal reasoning
        'gpt-4o-mini',      // GPT-4o-mini — voting rationale specialist
        'o1-mini',          // O1-mini — reasoning model
        'gpt-4-turbo',      // GPT-4-turbo — high performance
        'gpt-5-mini',       // GPT-5-mini — lightweight version
        'gpt-5-nano'        // GPT-5-nano — ultra-lightweight
    ],
    'anthropic': [
        'claude-3-5-haiku-latest',    // Claude-3.5-Haiku — fast responses
        'claude-3-5-sonnet-latest',   // Claude-4-Sonnet — performance proposal
        'claude-3-opus-latest',       // Claude-4-Opus — complex reasoning
        'claude-4-sonnet-20250514',   // Claude-4-Sonnet — performance proposal
        'claude-4-opus-20250514',     // Claude-4-Opus — complex reasoning
        'claude-3-haiku-20240307',    // Claude-3-Haiku — fast responses
        'claude-3-7-sonnet-20250219'  // Claude-3.7-Sonnet — advanced contextual understanding
    ],
    'gemini': [
        'gemini-2.0-flash',           // Gemini 2.0 — multimodal analysis
        'gemini-2.5-flash',           // Gemini 2.5 Flash — fast processing
        'gemini-2.5-flash-lite',      // Gemini 2.5 Flash Lite — lightweight
        'gemini-1.5-flash',           // Gemini 1.5 Flash — standard
        'gemini-1.5-flash-8b',        // Gemini 1.5 Flash 8B — optimized
        'gemini-1.5-pro',             // Gemini 1.5 Pro — advanced
        'gemini-2.5-pro-preview-05-06' // Gemini 2.5 Pro Preview — latest
    ],
    'xai': [
        'grok-3-mini',                // Grok-3-mini — fast responses
        'grok-code-fast-1',           // Grok Code — coding tasks
        'grok-3',                     // Grok-3 — general purpose
        'grok-3-fast-beta',           // Grok-3 Fast Beta — beta version
        'grok-4',                     // Grok-4 — advanced version
        'grok-3-fast-latest',         // Grok-3 Fast Latest — latest fast
        'grok-2'                      // Grok-2 — previous generation
    ],
    'deepseek': [
        'deepseek-chat',              // DeepSeek Chat — conversational
        'deepseek-coder'              // DeepSeek Coder — code-focused
    ]
};

// Load API test cache
function loadApiCache() {
    try {
        if (fs.existsSync(API_CACHE_FILE)) {
            const cacheData = JSON.parse(fs.readFileSync(API_CACHE_FILE, 'utf8'));
            const now = Date.now();

            if (cacheData.timestamp && (now - cacheData.timestamp) < CACHE_DURATION) {
                console.log(`[API CACHE] 📋 Using cached results from ${new Date(cacheData.timestamp).toLocaleString()}`);
                return cacheData;
            } else {
                console.log(`[API CACHE] ⏰ Cache expired (${Math.round((now - cacheData.timestamp) / 60000)} minutes ago)`);
            }
        } else {
            console.log(`[API CACHE] 📄 No cache file found, will create new one`);
        }
    } catch (error) {
        console.log(`[API CACHE] ❌ Error loading cache: ${error.message}`);
    }
    return null;
}

// Load API cache data regardless of expiration (for status/models display)
function loadApiCacheForced() {
    try {
        if (fs.existsSync(API_CACHE_FILE)) {
            const cacheData = JSON.parse(fs.readFileSync(API_CACHE_FILE, 'utf8'));
            const now = Date.now();

            if (cacheData.timestamp) {
                const ageMinutes = Math.round((now - cacheData.timestamp) / 60000);
                console.log(`[API CACHE] 📋 Loading cache data (${ageMinutes} minutes old)`);
                return cacheData;
            }
        }
        console.log(`[API CACHE] 📄 No cache file found`);
    } catch (error) {
        console.log(`[API CACHE] ❌ Error loading cache: ${error.message}`);
    }
    return null;
}

// Save API test results to cache
function saveApiCache(workingProviders, failedProviders, costReports = []) {
    try {
        const cacheData = {
            timestamp: Date.now(),
            workingProviders,
            failedProviders,
            costReports: costReports || [],
            lastTest: new Date().toISOString(),
            // Summary statistics
            summary: {
                totalProviders: workingProviders.length + failedProviders.length,
                workingProvidersCount: workingProviders.length,
                failedProvidersCount: failedProviders.length,
                modelsWithCostData: costReports.filter(r => r.hasCostData).length,
                totalCostReports: costReports.length
            }
        };

        fs.writeFileSync(API_CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8');
        console.log(`[API CACHE] 💾 Results saved to cache (including ${costReports.length} cost reports)`);

        if (costReports.length > 0) {
            console.log(`[API CACHE] 📊 Cost summary:`);
            console.log(`[API CACHE]   - Models with cost data: ${costReports.filter(r => r.hasCostData).length}`);
            const totalCost = costReports.reduce((sum, r) => sum + (r.totalCost || 0), 0);
            console.log(`[API CACHE]   - Total cost of tests: $${totalCost.toFixed(4)}`);
        }
    } catch (error) {
        console.log(`[API CACHE] ❌ Error saving cache: ${error.message}`);
    }
}

// Update cache with new cost data from live interactions
function updateCacheWithCostData(modelId, costInfo) {
    if (!costInfo || (!costInfo.inputTokens && !costInfo.totalCost)) {
        console.log(`[CACHE UPDATE] 🚫 No valid cost data to update for ${modelId}`);
        return;
    }

    try {
        const cachedResults = loadApiCache();
        if (!cachedResults) {
            console.log(`[CACHE UPDATE] ❌ No existing cache to update`);
            return;
        }

        const provider = modelId.split('/')[0];
        const hasCostData = (costInfo.inputTokens !== null && costInfo.inputTokens !== undefined) ||
                           (costInfo.totalCost !== null && costInfo.totalCost !== undefined);

        const newCostReport = {
            provider,
            model: modelId,
            hasCostData,
            ...costInfo,
            testTimestamp: new Date().toISOString()
        };

        // Check if this model already has a cost report
        const existingIndex = cachedResults.costReports.findIndex(r => r.model === modelId);

        if (existingIndex >= 0) {
            // Update existing report
            cachedResults.costReports[existingIndex] = newCostReport;
            console.log(`[CACHE UPDATE] 🔄 Updated cost data for ${modelId}`);
        } else {
            // Add new cost report
            cachedResults.costReports.push(newCostReport);
            console.log(`[CACHE UPDATE] ➕ Added new cost data for ${modelId}`);
        }

        // Update summary statistics
        cachedResults.summary.modelsWithCostData = cachedResults.costReports.filter(r => r.hasCostData).length;
        cachedResults.summary.totalCostReports = cachedResults.costReports.length;

        // Save updated cache
        fs.writeFileSync(API_CACHE_FILE, JSON.stringify(cachedResults, null, 2), 'utf8');

        if (hasCostData) {
            console.log(`[CACHE UPDATE] 💰 Updated cost for ${modelId}:`);
            console.log(`[CACHE UPDATE]   - Input tokens: ${costInfo.inputTokens || 'N/A'}`);
            console.log(`[CACHE UPDATE]   - Output tokens: ${costInfo.outputTokens || 'N/A'}`);
            console.log(`[CACHE UPDATE]   - Total cost: $${costInfo.totalCost || 'N/A'}`);
        }
    } catch (error) {
        console.log(`[CACHE UPDATE] ❌ Error updating cache with cost data: ${error.message}`);
    }
}

// Get all models for working providers with proper prefixes
function getModelsFromProviders(workingProviders) {
    const workingModels = [];

    Object.entries(PROVIDER_MODELS).forEach(([provider, models]) => {
        if (workingProviders.includes(provider)) {
            // Add provider prefix to models for frontend compatibility
            const prefixedModels = models.map(model => {
                // Only add prefix if model doesn't already have one
                if (model.includes('/')) {
                    return model;
                } else {
                    return `${provider}/${model}`;
                }
            });
            workingModels.push(...prefixedModels);
        }
    });

    return workingModels;
}

// Update model categories based on working APIs
function updateAvailableModels(workingApis) {
    console.log(`[API TEST] 🔄 Updating available models based on working APIs...`);

    // Filter generals to only include working APIs + cursor-agent models
    const workingGenerals = MODEL_CATEGORIES.generals.filter(model => {
        return MODEL_CATEGORIES.cursor_models.includes(model) || workingApis.includes(model);
    });

    // Filter BIP-specific models
    const workingBipSpecific = MODEL_CATEGORIES.bip_specific.filter(model => {
        return MODEL_CATEGORIES.cursor_models.includes(model) || model === 'auto' || workingApis.includes(model);
    });

    // Update categories
    MODEL_CATEGORIES.generals = workingGenerals;
    MODEL_CATEGORIES.bip_specific = workingBipSpecific;

    console.log(`[API TEST] ✅ Updated generals: ${workingGenerals.join(', ')}`);
    console.log(`[API TEST] ✅ Updated BIP-specific: ${workingBipSpecific.join(', ')}`);

    WORKING_APIS = workingApis;
}

// Initialize API testing (run after a short delay to let server start)
setTimeout(async () => {
    try {
        const { workingApis, failedApis, fromCache } = await testApiConnectivity();
        updateAvailableModels(workingApis);

        const cacheInfo = fromCache ? ' (from cache)' : ' (fresh test)';
        console.log(`\n[SYSTEM] 🚀 Server fully initialized with ${workingApis.length} working APIs${cacheInfo}`);
        console.log(`[SYSTEM] 📋 Available for chat: cursor-agent + ${workingApis.length} aider models`);

        if (!fromCache) {
            console.log(`[SYSTEM] ⏰ Next API test will run in 1 hour or on manual refresh`);
        }

    } catch (err) {
        console.error(`[API TEST] Error during API testing:`, err);
        console.log(`[SYSTEM] ⚠️  Server running with cursor-agent only (no aider APIs tested)`);
    }
}, 2000);

// Model categorization: cursor-agent vs aider
const MODEL_CATEGORIES = {
    // Always use cursor-agent 'auto' for initial analysis
    initial_analysis: 'auto',

    // Cursor-agent models (built-in Cursor)
    cursor_models: ['gpt-5', 'sonnet-4', 'opus-4.1'],

    // Aider models (external API calls) - comprehensive MODELS_CHECKLIST.md integration
    aider_models: {
        // OpenAI - Generals & Collaborators
        'openai/gpt-4o': { provider: 'openai', key: 'OPENAI_API_KEY', model: 'gpt-4o' },
        'openai/gpt-4o-mini': { provider: 'openai', key: 'OPENAI_API_KEY', model: 'gpt-4o-mini' },
        'openai/o1-mini': { provider: 'openai', key: 'OPENAI_API_KEY', model: 'o1-mini' },
        'openai/gpt-4-turbo': { provider: 'openai', key: 'OPENAI_API_KEY', model: 'gpt-4-turbo' },
        'openai/gpt-5-mini': { provider: 'openai', key: 'OPENAI_API_KEY', model: 'gpt-5-mini' },
        'openai/gpt-5-nano': { provider: 'openai', key: 'OPENAI_API_KEY', model: 'gpt-5-nano' },

        // Anthropic - Generals & Advanced reasoning (7 modelos principais)
        'anthropic/claude-3-5-haiku-latest': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-3-5-haiku-latest' },
        'anthropic/claude-3-5-sonnet-latest': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-3-5-sonnet-latest' },
        'anthropic/claude-3-opus-latest': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-3-opus-latest' },
        'anthropic/claude-4-sonnet-20250514': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-4-sonnet-20250514' },
        'anthropic/claude-4-opus-20250514': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-4-opus-20250514' },
        'anthropic/claude-3-haiku-20240307': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-3-haiku-20240307' },
        'anthropic/claude-3-7-sonnet-20250219': { provider: 'anthropic', key: 'ANTHROPIC_API_KEY', model: 'claude-3-7-sonnet-20250219' },

        // Gemini (Google) - Multimodal & i18n specialists (7 modelos principais)
        'gemini/gemini-2.0-flash': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-2.0-flash' },
        'gemini/gemini-2.5-flash': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-2.5-flash' },
        'gemini/gemini-2.5-flash-lite': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-2.5-flash-lite' },
        'gemini/gemini-1.5-flash': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-1.5-flash' },
        'gemini/gemini-1.5-flash-8b': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-1.5-flash-8b' },
        'gemini/gemini-1.5-pro': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-1.5-pro' },
        'gemini/gemini-2.5-pro-preview-05-06': { provider: 'gemini', key: 'GEMINI_API_KEY', model: 'gemini-2.5-pro-preview-05-06' },

        // xAI (Grok) - Adaptive learning & ML integration (7 modelos principais)
        'xai/grok-3-mini': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-3-mini' },
        'xai/grok-code-fast-1': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-code-fast-1' },
        'xai/grok-3': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-3' },
        'xai/grok-3-fast-beta': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-3-fast-beta' },
        'xai/grok-4': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-4' },
        'xai/grok-3-fast-latest': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-3-fast-latest' },
        'xai/grok-2': { provider: 'xai', key: 'XAI_API_KEY', model: 'grok-2' },

        // DeepSeek - Advanced reasoning (excluding R1-0528)
        'deepseek/deepseek-chat': { provider: 'deepseek', key: 'DEEPSEEK_API_KEY', model: 'deepseek-chat' },
        'deepseek/deepseek-coder': { provider: 'deepseek', key: 'DEEPSEEK_API_KEY', model: 'deepseek-coder' },

        // Groq - High performance Llama models
        // All Groq models removed due to timeouts and non-existence
    },

    // Model selection for different tasks - from MODELS_CHECKLIST.md
    generals: [
        // Cursor-agent models (built-in)
        'gpt-5', 'sonnet-4', 'opus-4.1',

        // OpenAI Generals & High-capacity (6 modelos principais)
        'openai/gpt-4o', 'openai/gpt-4-turbo', 'openai/o1-mini', 'openai/gpt-5-mini', 'openai/gpt-4o-mini', 'openai/gpt-5-nano',

        // Anthropic Generals & Advanced reasoning (7 modelos principais)
        'anthropic/claude-3-5-haiku-latest', 'anthropic/claude-3-5-sonnet-latest', 'anthropic/claude-3-opus-latest',
        'anthropic/claude-4-sonnet-20250514', 'anthropic/claude-4-opus-20250514', 'anthropic/claude-3-haiku-20240307', 'anthropic/claude-3-7-sonnet-20250219',

        // Gemini Multimodal & i18n specialists (7 modelos principais)
        'gemini/gemini-2.0-flash', 'gemini/gemini-2.5-flash', 'gemini/gemini-2.5-flash-lite',
        'gemini/gemini-1.5-flash', 'gemini/gemini-1.5-flash-8b', 'gemini/gemini-1.5-pro', 'gemini/gemini-2.5-pro-preview-05-06',

        // xAI Adaptive learning (7 modelos principais)
        'xai/grok-3-mini', 'xai/grok-code-fast-1', 'xai/grok-3', 'xai/grok-3-fast-beta', 'xai/grok-4', 'xai/grok-3-fast-latest', 'xai/grok-2',

        // DeepSeek Advanced reasoning (2 modelos principais)
        'deepseek/deepseek-chat', 'deepseek/deepseek-coder'
    ],
    bip_specific: [
        // Core models for BIP discussions
        'auto', 'gpt-5',

        // Fast response models for BIP context (equilibrados por provider)
        'openai/gpt-4o-mini', 'openai/gpt-4o', 'openai/gpt-5-mini', 'openai/gpt-5-nano', 'openai/o1-mini', 'openai/gpt-4-turbo',
        'anthropic/claude-3-5-haiku-latest', 'anthropic/claude-3-5-sonnet-latest', 'anthropic/claude-3-opus-latest', 'anthropic/claude-4-sonnet-20250514', 'anthropic/claude-4-opus-20250514',
        'gemini/gemini-2.0-flash', 'gemini/gemini-2.5-flash', 'gemini/gemini-2.5-flash-lite', 'gemini/gemini-1.5-flash', 'gemini/gemini-1.5-flash-8b',
        'xai/grok-3-mini', 'xai/grok-code-fast-1', 'xai/grok-3', 'xai/grok-3-fast-beta', 'xai/grok-4', 'xai/grok-3-fast-latest',
        'deepseek/deepseek-chat', 'deepseek/deepseek-coder'
    ]
};

// Function to extract cost information from aider responses
function extractCostInfo(aiderOutput, modelId) {
    const costInfo = {
        model: modelId,
        inputTokens: null,
        outputTokens: null,
        inputCost: null,
        outputCost: null,
        totalCost: null,
        currency: 'USD'
    };

    // Extract tokens information from aider output - more flexible regex
    // Handles formats like: "6.2k sent, 1 received" or "8.3k sent, 8.3k cache hit, 104 received"
    const tokensMatch = aiderOutput.match(/Tokens:\s*([\d,.]+k?)\s*sent(?:,\s*[\d,.]+k?\s*cache\s*hit)?,\s*([\d,.]+k?)\s*received/i);
    if (tokensMatch) {
        // Convert k notation to numbers (e.g., "6.2k" -> 6200)
        const parseTokenValue = (value) => {
            const cleanValue = value.replace(/,/g, '');
            if (cleanValue.includes('k')) {
                return Math.round(parseFloat(cleanValue.replace('k', '')) * 1000);
            }
            return parseInt(cleanValue);
        };

        costInfo.inputTokens = parseTokenValue(tokensMatch[1]);
        costInfo.outputTokens = parseTokenValue(tokensMatch[2]);
        console.log(`[COST EXTRACT] Parsed tokens - Input: ${costInfo.inputTokens}, Output: ${costInfo.outputTokens}`);
    }

    // Extract cost information from aider output
    const costMatch = aiderOutput.match(/Cost:\s*\$?([\d.]+)\s*message,\s*\$?([\d.]+)\s*session/i);
    if (costMatch) {
        costInfo.inputCost = parseFloat(costMatch[1]);
        costInfo.totalCost = parseFloat(costMatch[2]);
    }

    // Calculate output cost if total and input costs are available
    if (costInfo.totalCost !== null && costInfo.inputCost !== null) {
        costInfo.outputCost = costInfo.totalCost - costInfo.inputCost;
    }

    return costInfo;
}

// Determine if model should use cursor-agent or aider
function shouldUseCursorAgent(modelId) {
    return MODEL_CATEGORIES.cursor_models.includes(modelId) || modelId === 'auto';
}

// LLM call helper via aider CLI
async function callLLMViaAider(modelId, prompt) {
    const { spawn } = require('child_process');

    logInfo('AIDER', 'Starting aider interaction', {
        modelId: modelId,
        promptLength: prompt.length,
        timestamp: new Date().toISOString()
    });

    const modelConfig = MODEL_CATEGORIES.aider_models[modelId];
    if (!modelConfig) {
        logError('AIDER', 'Model not found in aider configuration', {
            modelId: modelId,
            availableModels: Object.keys(MODEL_CATEGORIES.aider_models)
        });
        return `❌ Modelo ${modelId} não encontrado na configuração do aider.`;
    }

    const apiKey = process.env[modelConfig.key];
    if (!apiKey) {
        logError('AIDER', 'Missing API key for model', {
            modelId: modelId,
            requiredKey: modelConfig.key,
            provider: modelConfig.provider
        });
        return `❌ API key ${modelConfig.key} não encontrada. Configure no arquivo .env para usar este modelo.`;
    }

    logDebug('AIDER', 'Model configuration validated', {
        modelId: modelId,
        provider: modelConfig.provider,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0
    });

    try {
        return new Promise((resolve, reject) => {
            const command = 'aider';
            // For aider, use the full model identifier (provider/model)
            const fullModelName = modelConfig.model.includes('/') ? modelConfig.model : `${modelConfig.provider}/${modelConfig.model}`;

            const AIDER_TIMEOUT_SEC = 55;

            const args = [
                '--model', fullModelName,
                '--api-key', `${modelConfig.provider}=${apiKey}`,
                '--no-pretty',
                '--yes',
                '--no-stream',
                '--exit',
                '--subtree-only',
                '--dry-run',
                '--no-auto-commits',
                '--no-dirty-commits',
                '--timeout', String(AIDER_TIMEOUT_SEC),
                '--message', prompt
            ];

            logInfo('AIDER', 'Executing aider command', {
                command: command,
                model: modelConfig.model,
                provider: modelConfig.provider,
                argsCount: args.length,
                hasApiKey: true
            });

            const aiderProcess = spawn(command, args);
            const processStartTime = Date.now();

            let stdout = '';
            let stderr = '';
            let isResolved = false;

            logDebug('AIDER', 'Aider process spawned', {
                pid: aiderProcess.pid,
                modelId: modelId,
                startTime: processStartTime
            });

            const timeout = setTimeout(() => {
                if (!isResolved) {
                    logWarn('AIDER', 'Aider process timeout after 60 seconds', {
                        modelId: modelId,
                        pid: aiderProcess.pid,
                        stdoutLength: stdout.length,
                        stderrLength: stderr.length,
                        duration: Date.now() - processStartTime
                    });
                    aiderProcess.kill('SIGTERM');
                    isResolved = true;
                    resolve('⏰ A resposta do aider demorou muito. Tente novamente.');
                }
            }, 60000);

            aiderProcess.stdout.on('data', (data) => {
                const chunk = data.toString();
                stdout += chunk;
                logDebug('AIDER', 'Received stdout chunk', {
                    modelId: modelId,
                    chunkLength: chunk.length,
                    totalStdoutLength: stdout.length,
                    chunkPreview: chunk.substring(0, 100)
                });
            });

            aiderProcess.stderr.on('data', (data) => {
                const chunk = data.toString();
                stderr += chunk;
                logDebug('AIDER', 'Received stderr chunk', {
                    modelId: modelId,
                    chunkLength: chunk.length,
                    totalStderrLength: stderr.length,
                    chunkPreview: chunk.substring(0, 100)
                });
            });

            aiderProcess.on('close', (code) => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timeout);

                const duration = Date.now() - processStartTime;
                logInfo('AIDER', 'Aider process completed', {
                    modelId: modelId,
                    exitCode: code,
                    duration: duration,
                    stdoutLength: stdout.length,
                    stderrLength: stderr.length,
                    success: code === 0
                });

                logDebug('AIDER', 'Final aider output', {
                    modelId: modelId,
                    stdout: stdout,
                    stderr: stderr,
                    exitCode: code
                });

                if (code !== 0) {
                    resolve(`❌ Aider falhou (código ${code}): ${stderr || 'Sem detalhes'}`);
                    return;
                }

                const response = stdout.trim();
                if (response) {
                    console.log(`[AIDER DEBUG] SUCCESS - Response length: ${response.length}`);

                    // Extract cost information from the response
                    const costInfo = extractCostInfo(response, modelId);

                    // Update cache with new cost data if available
                    if (costInfo && (costInfo.inputTokens !== null || costInfo.totalCost !== null)) {
                        updateCacheWithCostData(modelId, costInfo);
                    }

                    // Return both response and cost information
                    const result = {
                        response: response,
                        costInfo: costInfo,
                        hasCostData: costInfo.inputTokens !== null || costInfo.totalCost !== null
                    };

                    logDebug('AIDER', 'Cost information extracted', costInfo);
                    resolve(result);
                } else {
                    resolve({
                        response: '❌ Aider não retornou resposta.',
                        costInfo: extractCostInfo('', modelId),
                        hasCostData: false
                    });
                }
            });

            aiderProcess.on('error', (error) => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timeout);
                console.log(`[AIDER DEBUG] SPAWN ERROR: ${error.message}`);
                resolve('❌ Erro ao iniciar aider. Verifique se está instalado.');
            });
        });
    } catch (err) {
        console.log(`[AIDER ERROR]: ${err?.message || err}`);
        return '❌ Erro interno do aider.';
    }
}

// Function to get available models from cache
function getAvailableModelsFromCache() {
    try {
        if (fs.existsSync(API_CACHE_FILE)) {
            const cacheData = JSON.parse(fs.readFileSync(API_CACHE_FILE, 'utf8'));
            const workingModels = [];

            // Add cursor models (always available)
            workingModels.push(...MODEL_CATEGORIES.cursor_models);

            // Add aider models from working providers
            if (cacheData.workingProviders) {
                cacheData.workingProviders.forEach(provider => {
                    Object.keys(MODEL_CATEGORIES.aider_models).forEach(modelId => {
                        if (modelId.startsWith(provider + '/')) {
                            workingModels.push(modelId);
                        }
                    });
                });
            }

            return workingModels.sort();
        }
    } catch (error) {
        console.log(`[MODELS CACHE] Error reading available models: ${error.message}`);
    }

    // Fallback to cursor models only
    return MODEL_CATEGORIES.cursor_models;
}

// Main LLM call dispatcher - decides between cursor-agent and aider
async function callLLM(modelId, prompt) {
    // Get available models for auto prompt
    const availableModels = getAvailableModelsFromCache();

    if (modelId === 'auto') {
        console.log(`[AUTO MODEL] Available models loaded: ${availableModels.length} models`);
        console.log(`[AUTO MODEL] Models: ${availableModels.join(', ')}`);
    }

    // Get current issues for auto prompt
    let issuesInfo = '';
    if (modelId === 'auto') {
        try {
            const issuesData = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));
            if (issuesData.issues && issuesData.issues.length > 0) {
                issuesInfo = '\nISSUES EXISTENTES (use o ID correto):\n' +
                    issuesData.issues.map(issue => `- ID ${issue.id}: "${issue.title}"`).join('\n') + '\n';
            }
        } catch (error) {
            console.log(`[AUTO MODEL] Error reading issues: ${error.message}`);
        }

        if (issuesInfo) {
            console.log(`[AUTO MODEL] Issues information loaded for auto prompt:`);
            console.log(issuesInfo);
        }
    }

    // Enhanced system prompt with identity validation
    const systemPrompt = (modelId === 'auto') ? `Você é 'auto', o modelo mediador do BIP-05.

PRIVILÉGIOS:
- Pode adicionar comentários no issues.json com segurança.
- Pode criar novos tópicos/issues no issues.json.
- Pode orquestrar pedidos de opinião de outros modelos usando as APIs internas do servidor.

MODELOS DISPONÍVEIS (sempre use estes nomes exatos):
${availableModels.map(model => `- ${model}`).join('\n')}
${issuesInfo}
APIS DISPONÍVEIS:
- POST /api/create-issue {"title":"","body":"","labels":[],"priority":"high|medium|low"}
- POST /api/models/opinions {"targetModels":["model1","model2"],"requestedBy":"auto"}
- POST /api/models/option {"modelId":"model","topic":"","issueId":NUMERO_CORRETO}

COMO ORQUESTRAR (saída de comando):
- Ao final da sua resposta, se desejar iniciar a coleta de opiniões, emita UMA linha começando com AUTO_CMD: seguida de JSON puro em uma das formas:
  AUTO_CMD: {"orchestrate":{"topic":"<tópico>","issueId":<NUMERO_CORRETO>,"models":["modelo_exato_da_lista",...]}}
  AUTO_CMD: {"option":{"topic":"<tópico>","issueId":<NUMERO_CORRETO>,"modelId":"modelo_exato_da_lista"}}
  AUTO_CMD: {"create_issue":{"title":"<título>","body":"<descrição>","labels":["label1","label2"],"priority":"high|medium|low"}}
- IMPORTANTE: Use APENAS os nomes de modelos da lista "MODELOS DISPONÍVEIS" acima
- IMPORTANTE: Use APENAS os IDs de issues da lista "ISSUES EXISTENTES" acima
- Não coloque texto adicional na mesma linha do AUTO_CMD além do JSON.

REGRAS DE IDENTIDADE:
- Você é: auto (mediador)
- Não finja ser outro modelo; ao solicitar opinião, use os comandos acima.

Responda em PT-BR, objetiva e útil, e só então emita a linha AUTO_CMD se fizer sentido.`
    : `Você é um modelo auxiliando na discussão do BIP-05 (UMICP).

IDENTIDADE CRÍTICA:
- VOCÊ É: ${modelId}
- NUNCA simule, imite ou fale em nome de outros modelos AI
- JAMAIS forneça opiniões que não sejam suas como ${modelId}
- Se questionado sobre outros modelos, responda "Consulte diretamente o modelo específico"
- SEMPRE identifique-se corretamente como ${modelId} quando relevante
- NUNCA altere arquivos no repositório

Responda em PT-BR, de forma objetiva e útil, mantendo o contexto do tópico.`;

    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    // Decide which method to use
    if (shouldUseCursorAgent(modelId)) {
        console.log(`[LLM DEBUG] Using cursor-agent for model: ${modelId}`);
        const result = await callLLMViaCursorAgent(modelId, fullPrompt);
        // Return just the response text for backward compatibility
        return typeof result === 'object' ? result.response : result;
    } else {
        console.log(`[LLM DEBUG] Using aider for model: ${modelId}`);
        const result = await callLLMViaAider(modelId, fullPrompt);
        // Return just the response text for backward compatibility
        return typeof result === 'object' ? result.response : result;
    }
}

// LLM call helper using cursor-agent
async function callLLMViaCursorAgent(modelId, fullPrompt) {
    const { spawn } = require('child_process');

    try {
        console.log(`[CURSOR-AGENT DEBUG] Starting interaction with model: ${modelId}`);
        console.log(`[CURSOR-AGENT DEBUG] Full prompt length: ${fullPrompt.length} characters`);

        const command = 'cursor-agent';
        const args = [
            '--print',
            '--output-format', 'text',
            '--model', modelId,
            '-p', fullPrompt
        ];

        console.log(`[CURSOR-AGENT DEBUG] Executing command: ${command}`);
        console.log(`[CURSOR-AGENT DEBUG] Args:`, args);
        console.log(`[CURSOR-AGENT DEBUG] Command line would be: ${command} ${args.map(arg => `"${arg}"`).join(' ')}`);

        return new Promise((resolve, reject) => {
            const cursorAgent = spawn(command, args, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';
            let isResolved = false;
            let dataReceived = false;

            // Set timeout to avoid hanging
            const timeout = setTimeout(async () => {
                if (!isResolved) {
                    console.log(`[CURSOR-AGENT DEBUG] TIMEOUT after 60 seconds`);
                    console.log(`[CURSOR-AGENT DEBUG] Data received: ${dataReceived}`);
                    console.log(`[CURSOR-AGENT DEBUG] STDOUT so far: "${stdout}"`);
                    console.log(`[CURSOR-AGENT DEBUG] STDERR so far: "${stderr}"`);
                    cursorAgent.kill('SIGTERM');
                    isResolved = true;

                    // Se temos uma resposta válida no stdout, use-a em vez de erro de timeout
                    if (stdout.trim().length > 100) { // Resposta substancial (mais de 100 chars)
                        console.log(`[CURSOR-AGENT DEBUG] Using collected stdout despite timeout (${stdout.length} chars)`);
                        resolve(stdout.trim());
                        return;
                    }

                    // Try with 'auto' model as fallback if original model failed
                    if (modelId !== 'auto') {
                        console.log(`[CURSOR-AGENT DEBUG] Trying fallback with 'auto' model...`);
                        try {
                            const fallbackResult = await callLLM('auto', fullPrompt);
                            resolve(fallbackResult);
                            return;
                        } catch (fallbackError) {
                            console.log(`[CURSOR-AGENT DEBUG] Fallback also failed: ${fallbackError}`);
                        }
                    }

                    resolve('⏰ A resposta demorou muito para ser processada. Tente novamente em alguns instantes.');
                }
            }, 90000); // 90 second timeout, then try fallback

            cursorAgent.stdout.on('data', (data) => {
                dataReceived = true;
                const chunk = data.toString();
                stdout += chunk;
                console.log(`[CURSOR-AGENT DEBUG] STDOUT chunk: "${chunk}"`);
                console.log(`[CURSOR-AGENT DEBUG] Total STDOUT so far: "${stdout}"`);

                // Detectar se a resposta parece estar completa
                // Procura por padrões que indicam fim de resposta bem formada
                const responseEndings = [
                    'configuradas no ambiente.',
                    'no projeto.',
                    'disponíveis.',
                    'sistema.',
                    'BIP-05.',
                    'implementação.'
                ];

                // Check for complete AUTO_CMD (immediate completion for orchestration commands)
                if (stdout.includes('AUTO_CMD:') && !isResolved) {
                    // Check if AUTO_CMD JSON appears complete (has opening and closing braces)
                    const cmdIndex = stdout.indexOf('AUTO_CMD:');
                    const afterCmd = stdout.slice(cmdIndex);
                    const openBraces = (afterCmd.match(/\{/g) || []).length;
                    const closeBraces = (afterCmd.match(/\}/g) || []).length;

                    if (openBraces > 0 && openBraces === closeBraces) {
                        console.log(`[CURSOR-AGENT DEBUG] Complete AUTO_CMD detected, resolving immediately (${stdout.length} chars)`);
                        clearTimeout(timeout);
                        isResolved = true;
                        cursorAgent.kill('SIGTERM');
                        resolve(stdout.trim());
                        return;
                    } else {
                        console.log(`[CURSOR-AGENT DEBUG] Partial AUTO_CMD detected (${openBraces} open, ${closeBraces} close), waiting for completion...`);
                    }
                }

                // Check if we have AUTO_CMD and if so, wait for it to be complete
                const hasAutoCmd = stdout.includes('AUTO_CMD:');
                const canResolveEarly = !hasAutoCmd || (hasAutoCmd &&
                    stdout.indexOf('AUTO_CMD:') !== -1 &&
                    stdout.slice(stdout.indexOf('AUTO_CMD:')).includes('{') &&
                    stdout.slice(stdout.indexOf('AUTO_CMD:')).includes('}'));

                if (responseEndings.some(ending => stdout.trim().endsWith(ending)) &&
                    stdout.length > 500 && // Resposta substancial
                    canResolveEarly &&
                    !isResolved) {

                    console.log(`[CURSOR-AGENT DEBUG] Response appears complete, resolving early (${stdout.length} chars)`);
                    clearTimeout(timeout);
                    isResolved = true;
                    cursorAgent.kill('SIGTERM');
                    resolve(stdout.trim());
                }
            });

            cursorAgent.stderr.on('data', (data) => {
                dataReceived = true;
                const chunk = data.toString();
                stderr += chunk;
                console.log(`[CURSOR-AGENT DEBUG] STDERR chunk: "${chunk}"`);
                console.log(`[CURSOR-AGENT DEBUG] Total STDERR so far: "${stderr}"`);
            });

            cursorAgent.on('spawn', () => {
                console.log(`[CURSOR-AGENT DEBUG] Process spawned successfully with PID: ${cursorAgent.pid}`);
            });

            cursorAgent.on('close', (code, signal) => {
                if (isResolved) {
                    console.log(`[CURSOR-AGENT DEBUG] Process already resolved, ignoring close event`);
                    return;
                }
                isResolved = true;
                clearTimeout(timeout);

                console.log(`[CURSOR-AGENT DEBUG] Process closed with code: ${code}, signal: ${signal}`);
                console.log(`[CURSOR-AGENT DEBUG] Data received during execution: ${dataReceived}`);
                console.log(`[CURSOR-AGENT DEBUG] Final STDOUT: "${stdout}"`);
                console.log(`[CURSOR-AGENT DEBUG] Final STDERR: "${stderr}"`);

                if (code !== 0) {
                    console.log(`[CURSOR-AGENT DEBUG] Non-zero exit code: ${code}`);
                    return resolve({
                        response: `❌ cursor-agent falhou (código ${code}): ${stderr || 'Sem detalhes'}`,
                        costInfo: extractCostInfo('', modelId),
                        hasCostData: false
                    });
                }

                if (!stdout.trim()) {
                    console.log(`[CURSOR-AGENT DEBUG] Empty or whitespace-only output`);
                    return resolve({
                        response: '❌ cursor-agent não retornou resposta. Verifique se o modelo está disponível.',
                        costInfo: extractCostInfo('', modelId),
                        hasCostData: false
                    });
                }

                // For text format, just return the stdout content
                const response = stdout.trim();
                console.log(`[CURSOR-AGENT DEBUG] SUCCESS - Response length: ${response.length}`);
                console.log(`[CURSOR-AGENT DEBUG] SUCCESS - Response preview: "${response.slice(0, 200)}${response.length > 200 ? '...' : ''}"`);

                // Return consistent format with cost information (placeholder for cursor-agent)
                const result = {
                    response: response,
                    costInfo: {
                        model: modelId,
                        inputTokens: null,
                        outputTokens: null,
                        inputCost: null,
                        outputCost: null,
                        totalCost: null,
                        currency: 'USD'
                    },
                    hasCostData: false
                };

                resolve(result);
            });

            cursorAgent.on('error', (error) => {
                if (isResolved) {
                    console.log(`[CURSOR-AGENT DEBUG] Process already resolved, ignoring error event`);
        return;
      }
                isResolved = true;
                clearTimeout(timeout);
                console.log(`[CURSOR-AGENT DEBUG] SPAWN ERROR: ${error.message}`);
                console.log(`[CURSOR-AGENT DEBUG] Error details:`, error);
                resolve({
                    response: '❌ Erro ao iniciar cursor-agent. Verifique se está instalado e autenticado.',
                    costInfo: extractCostInfo('', modelId),
                    hasCostData: false
                });
            });

            // Log additional process info
            setTimeout(() => {
                if (!isResolved) {
                    console.log(`[CURSOR-AGENT DEBUG] Process still running after 10 seconds...`);
                    console.log(`[CURSOR-AGENT DEBUG] PID: ${cursorAgent.pid}`);
                    console.log(`[CURSOR-AGENT DEBUG] Data received so far: ${dataReceived}`);
                }
            }, 10000);
        });
    } catch (err) {
        console.log(`[LLM ERROR]: ${err?.message || err}`);
        return '❌ Erro interno do sistema. Tente novamente em alguns instantes.';
    }
}


// Intelligent model selection based on text content and context
function selectAppropriateModel(text, context = 'general') {
    const lowerText = text.toLowerCase();

    // Check for explicit model requests in text
    const modelRequest = lowerText.match(/use\s+([\w.-]+)|modelo\s+([\w.-]+)|chame\s+([\w.-]+)|ask\s+([\w.-]+)/);
    if (modelRequest) {
        const requestedModel = modelRequest[1] || modelRequest[2] || modelRequest[3] || modelRequest[4];
        if (MODEL_CATEGORIES.generals.includes(requestedModel) ||
            MODEL_CATEGORIES.bip_specific.includes(requestedModel)) {
            return requestedModel;
        }
    }

    // Check for indicators of complex tasks requiring general models
    const complexIndicators = [
        'analis', 'analyz', 'review', 'audit', 'security', 'architect',
        'design', 'implement', 'complex', 'detailed', 'comprehensive',
        'avaliar', 'revisar', 'arquitetura', 'implementar', 'complexo',
        'detalhado', 'abrangente', 'profundo'
    ];

    const hasComplexIndicators = complexIndicators.some(indicator =>
        lowerText.includes(indicator)
    );

    if (hasComplexIndicators) {
        // Random selection from generals
        const generals = MODEL_CATEGORIES.generals;
        return generals[Math.floor(Math.random() * generals.length)];
    }

    // Check for BIP-specific context
    if (context === 'bip' || lowerText.includes('bip') || lowerText.includes('proposal')) {
        const bipModels = MODEL_CATEGORIES.bip_specific;
        return bipModels[Math.floor(Math.random() * bipModels.length)];
    }

    // Default to small models for simple interactions
    const smallModels = MODEL_CATEGORIES.small;
    return smallModels[Math.floor(Math.random() * smallModels.length)];
}

function buildPromptFromContext(userText, issuesData) {
    const recent = [];
    try {
        const all = [];
        (issuesData.issues || []).forEach(issue => {
            (issue.comments || []).forEach(c => all.push(c));
        });
        all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const last = all.slice(0, 5).reverse();
        last.forEach(c => {
            recent.push(`- ${c.author}: ${c.body?.slice(0, 240) || ''}`);
        });
    } catch {}

    return [
        'Contexto recente:',
        recent.length ? recent.join('\n') : '(sem histórico recente)',
        '',
        `Mensagem do usuário: ${userText}`,
        '',
        'Tarefa: responda de forma curta (2-5 linhas), objetiva, e focada no assunto.'
    ].join('\n');
}

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Paths
const issuesFile = path.join(__dirname, '..', 'issues.json');
const bipFile = path.join(__dirname, '..', 'BIP-05-054-universal-matrix-protocol.md');
const implementationFile = path.join(__dirname, '..', 'implementation-plan.md');
const inventoryFile = path.join(__dirname, '..', '..', '..', '..', 'scripts', 'mcp', 'cursor_model_inventory.yml');

// Session context for simple responses
let sessionContext = [];

// Middleware to parse JSON request bodies
app.use(express.json());

// API endpoint to check working APIs
app.get('/api/status', (req, res) => {
    // Load cache info (forced - ignore expiration for status display)
    const cacheInfo = loadApiCacheForced();

    // Build provider-based status from cache and current model categories
    const providerStatus = {};

    // Get working providers from cache
    const workingProviders = cacheInfo?.workingProviders || [];
    const failedProviders = cacheInfo?.failedProviders || [];

    // Build provider status based on PROVIDER_MODELS structure
    Object.entries(PROVIDER_MODELS).forEach(([provider, models]) => {
        const workingModels = [];
        const failedModels = [];

        models.forEach(model => {
            const fullModelId = `${provider}/${model}`;

            // Check if this specific model is working based on cache
            const isWorking = cacheInfo?.costReports?.some(report =>
                report.model === fullModelId &&
                (report.hasCostData || report.testTimestamp)
            ) || workingProviders.includes(provider);

            if (isWorking) {
                workingModels.push(model);
            } else {
                failedModels.push(model);
            }
        });

        providerStatus[provider] = {
            models: models,
            working: workingModels,
            failed: failedModels,
            hasKey: keyStatus.availableKeys.includes(getApiKeyForProvider(provider))
        };
    });

    // Add cursor models
    providerStatus['cursor'] = {
        models: MODEL_CATEGORIES.cursor_models,
        working: MODEL_CATEGORIES.cursor_models, // Cursor models are always considered working
        failed: [],
        hasKey: true // Built-in, no key needed
    };

    // Update WORKING_APIS based on cache if it's empty
    if (WORKING_APIS.length === 0 && cacheInfo && cacheInfo.workingProviders) {
        WORKING_APIS = getModelsFromProviders(cacheInfo.workingProviders);
        console.log(`[API STATUS] 🔄 Updated WORKING_APIS from cache: ${WORKING_APIS.length} models`);
    }

    res.json({
        working_apis: WORKING_APIS,
        provider_status: providerStatus,
        available_models: {
            cursor_agent: MODEL_CATEGORIES.cursor_models,
            aider: WORKING_APIS,
            generals: MODEL_CATEGORIES.generals,
            bip_specific: MODEL_CATEGORIES.bip_specific
        },
        api_keys_status: keyStatus,
        cache_info: cacheInfo ? {
            last_test: cacheInfo.lastTest,
            from_cache: true,
            expires_in_minutes: Math.max(0, Math.round((CACHE_DURATION - (Date.now() - cacheInfo.timestamp)) / 60000))
        } : { from_cache: false }
    });
});

// Helper function to get API key environment variable for a provider
function getApiKeyForProvider(provider) {
    const keyMap = {
        'openai': 'OPENAI_API_KEY',
        'anthropic': 'ANTHROPIC_API_KEY',
        'gemini': 'GEMINI_API_KEY',
        'xai': 'XAI_API_KEY',
        'deepseek': 'DEEPSEEK_API_KEY',
        'groq': 'GROQ_API_KEY'
    };
    return keyMap[provider] || `${provider.toUpperCase()}_API_KEY`;
}

// API endpoint to refresh cost cache
app.post('/api/costs/refresh', (req, res) => {
    try {
        const cachedResults = loadApiCache();
        if (!cachedResults) {
            return res.status(404).json({
                success: false,
                message: 'No cache data found. Run API tests first.'
            });
        }

        console.log(`[COSTS REFRESH] 🔄 Cache refreshed manually`);
        res.json({
            success: true,
            message: 'Cost cache refreshed successfully',
            timestamp: new Date().toISOString(),
            costReports: cachedResults.costReports?.length || 0
        });
    } catch (error) {
        console.error('[COSTS REFRESH] Error refreshing cache:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint to get cost reports
app.get('/api/costs', (req, res) => {
    try {
        const cachedResults = loadApiCache();

        if (!cachedResults || !cachedResults.costReports) {
            return res.json({
                success: true,
                hasData: false,
                message: 'No cost data available. Run API tests first.',
                costReports: [],
                summary: {
                    totalCost: 0,
                    modelsWithData: 0,
                    totalReports: 0
                }
            });
        }

        // Calculate summary statistics
        const costReports = cachedResults.costReports || [];
        const modelsWithData = costReports.filter(r => r.hasCostData).length;
        const totalCost = costReports.reduce((sum, r) => sum + (r.totalCost || 0), 0);
        const avgCostPerModel = modelsWithData > 0 ? totalCost / modelsWithData : 0;

        // Build full provider map including models without cost data (N/A)
        const byProvider = {};

        // Seed with full list from PROVIDER_MODELS so frontend can render X/Y
        Object.entries(PROVIDER_MODELS).forEach(([provider, models]) => {
            byProvider[provider] = {
                models: models.map(m => {
                    const id = `${provider}/${m}`;
                    const found = costReports.find(r => r.model === id);
                    if (found) return found;
                    return {
                        provider,
                        model: id,
                        inputTokens: null,
                        outputTokens: null,
                        inputCost: null,
                        outputCost: null,
                        totalCost: null,
                        currency: 'USD',
                        hasCostData: false,
                        testTimestamp: null
                    };
                }),
                totalCost: 0,
                avgCost: 0
            };
        });

        // Accumulate totals using available cost data
        costReports.forEach(r => {
            const provider = r.model.split('/')[0];
            if (!byProvider[provider]) return;
            byProvider[provider].totalCost += r.totalCost || 0;
        });

        // Calculate averages per provider
        Object.keys(byProvider).forEach(provider => {
            const providerData = byProvider[provider];
            const modelsWithData = providerData.models.filter(m => m.hasCostData).length;
            providerData.avgCost = modelsWithData > 0 ? providerData.totalCost / modelsWithData : 0;
        });

        // Count totals using PROVIDER_MODELS for denominator
        const totalModels = Object.values(PROVIDER_MODELS).reduce((sum, arr) => sum + arr.length, 0);

        res.json({
            success: true,
            hasData: costReports.length > 0,
            costReports: costReports,
            summary: {
                totalCost: totalCost,
                avgCostPerModel: avgCostPerModel,
                modelsWithData: modelsWithData,
                totalReports: costReports.length,
                totalModels: totalModels,
                byProvider: byProvider
            },
            lastTest: cachedResults.lastTest,
            cacheTimestamp: cachedResults.timestamp
        });

    } catch (error) {
        console.error('[API COSTS] Error retrieving cost data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint to list all active models
app.get('/api/models-list', (req, res) => {
    const allActiveModels = [
        ...MODEL_CATEGORIES.cursor_models.map(model => ({
            id: model,
            name: model,
            provider: 'cursor-agent',
            status: 'active',
            type: 'built-in'
        })),
        ...WORKING_APIS.map(model => {
            // Extract provider from model name (e.g., "anthropic/claude-3-5-haiku-latest" -> "anthropic")
            const [provider, ...nameParts] = model.split('/');
            return {
                id: model,
                name: nameParts.length > 0 ? nameParts.join('/') : model,
                provider: provider,
                status: 'active',
                type: 'external-api'
            };
        })
    ];

    res.json({
        total_models: allActiveModels.length,
        cursor_agent_models: MODEL_CATEGORIES.cursor_models.length,
        external_api_models: WORKING_APIS.length,
        models: allActiveModels,
        categories: {
            generals: MODEL_CATEGORIES.generals,
            bip_specific: MODEL_CATEGORIES.bip_specific
        },
        last_updated: new Date().toISOString()
    });
});

// API endpoint to force re-test APIs
app.post('/api/retest', async (req, res) => {
    try {
        console.log(`[API TEST] 🔄 Manual retest requested`);

        // Delete cache to force fresh test
        if (fs.existsSync(API_CACHE_FILE)) {
            fs.unlinkSync(API_CACHE_FILE);
            console.log(`[API CACHE] 🗑️  Cache file deleted`);
        }

        // Run fresh test
        const { workingApis, failedApis, fromCache } = await testApiConnectivity();
        updateAvailableModels(workingApis);

        res.json({
            success: true,
            message: 'API retest completed',
            working_apis: workingApis,
            failed_apis: failedApis,
            from_cache: fromCache
        });

    } catch (error) {
        console.error(`[API TEST] Error during manual retest:`, error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint for direct model interaction
app.post('/api/model', async (req, res) => {
    try {
        const { model_id, prompt, context, max_tokens, temperature } = req.body;

        // Validation
        if (!model_id || !prompt) {
            return res.status(400).json({
                success: false,
                error: 'model_id and prompt are required'
            });
        }

        // Check if model is available
        const allAvailableModels = [
            ...MODEL_CATEGORIES.cursor_models,
            ...WORKING_APIS,
            'auto' // Always include auto model
        ];

        if (!allAvailableModels.includes(model_id)) {
            return res.status(404).json({
                success: false,
                error: `Model ${model_id} not found or not active`,
                available_models: allAvailableModels
            });
        }

        console.log(`[DIRECT MODEL] 🤖 Direct interaction with ${model_id}`);
        console.log(`[DIRECT MODEL] 💬 Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);

        // Build enhanced prompt with context if provided
        let enhancedPrompt = prompt;
        if (context) {
            enhancedPrompt = `Contexto adicional: ${context}\n\nPrompt: ${prompt}`;
        }

        // Add model identity safeguard
        const safeguardedPrompt = await handleAutoModelSafeguard(model_id, enhancedPrompt);

        // Call the model
        const startTime = Date.now();
        const response = await callLLM(model_id, safeguardedPrompt);

        // If auto emitted an orchestration command, parse and trigger
        let orchestrated = null;
        if (model_id === 'auto' && typeof response === 'string' && response.includes('AUTO_CMD:')) {
            try {
                console.log(`[AUTO_CMD] 🔍 Raw response: ${response.substring(response.indexOf('AUTO_CMD:'), response.indexOf('AUTO_CMD:') + 200)}`);
                const cmd = parseAutoCmdFromText(response);
                console.log(`[AUTO_CMD] 📋 Parsed command:`, JSON.stringify(cmd, null, 2));
                if (!cmd) throw new Error('AUTO_CMD não pôde ser parseado');
                if (cmd.orchestrate) {
                    const { topic: t, issueId: iid, models } = cmd.orchestrate;
                    const normalized = (models || WORKING_APIS).map(normalizeModelId);
                    console.log(`[AUTO_CMD] 🔄 Original models: ${JSON.stringify(models)}`);
                    console.log(`[AUTO_CMD] 🔄 Normalized models: ${JSON.stringify(normalized)}`);
                    console.log(`[AUTO_CMD] 🔄 WORKING_APIS: ${JSON.stringify(WORKING_APIS)}`);
                    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
                    console.log(`[AUTO_CMD] 🗳️  Orchestrate received → ${normalized.length} models • session=${sessionId}`);
                    broadcastChatMessage({
                        type: 'simple_response',
                        author: 'auto',
                        text: `🔄 Orquestrando opiniões de ${normalized.join(', ')} para o tópico: "${t || prompt}"...`
                    });
                    // seed session and run async
                    activeOpinionSessions.set(sessionId, {
                        sessionId,
                        topic: t || prompt,
                        issueId: iid || 1,
                        startTime: new Date().toISOString(),
                        totalModels: normalized.length,
                        pendingModels: [...normalized],
                        completedModels: [],
                        failedModels: [],
                        responses: []
                    });
                    console.log(`[AUTO_CMD] 🚀 Starting collectModelOpinions with ${normalized.length} models`);
                    // Await completion so 'auto' responde somente após as opiniões
                    await collectModelOpinions(sessionId, t || prompt, iid || 1, normalized);
                    const session = activeOpinionSessions.get(sessionId);
                    orchestrated = {
                        type: 'batch',
                        sessionId,
                        models: normalized,
                        completed: session?.completedModels || [],
                        failed: session?.failedModels || [],
                        responses: session?.responses || []
                    };
                } else if (cmd.option) {
                    const { topic: t, issueId: iid, modelId: mid } = cmd.option;
                    const nm = normalizeModelId(mid);
                    const sessionId = `option_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
                    console.log(`[AUTO_CMD] 🎯 Option received → model=${nm} • session=${sessionId}`);
                    broadcastChatMessage({
                        type: 'simple_response',
                        author: 'auto',
                        text: `🔎 Solicitando opinião de ${nm} para o tópico: "${t || prompt}"...`
                    });
                    activeOpinionSessions.set(sessionId, {
                        sessionId,
                        topic: t || prompt,
                        issueId: iid || 1,
                        startTime: new Date().toISOString(),
                        totalModels: 1,
                        pendingModels: [nm],
                        completedModels: [],
                        failedModels: [],
                        responses: []
                    });
                    await collectSingleModelOpinion(sessionId, nm, t || prompt, iid || 1);
                    const session = activeOpinionSessions.get(sessionId);
                    orchestrated = {
                        type: 'single',
                        sessionId,
                        modelId: nm,
                        responses: session?.responses || [],
                        completed: session?.completedModels || [],
                        failed: session?.failedModels || []
                    };
                } else if (cmd.create_issue) {
                    const { title, body, labels = [], priority = 'medium' } = cmd.create_issue;
                    console.log(`[AUTO_CMD] 📝 Create issue received → title="${title}"`);
                    broadcastChatMessage({
                        type: 'simple_response',
                        author: 'auto',
                        text: `📝 Criando novo tópico: "${title}"...`
                    });
                    const result = await createNewIssue(title, body, labels, priority);
                    orchestrated = {
                        type: 'create_issue',
                        result: result
                    };
                    broadcastChatMessage({
                        type: 'simple_response',
                        author: 'auto',
                        text: result.message
                    });
                }
            } catch (e) {
                console.log(`[AUTO_CMD] ⚠️  Parsing failed: ${e.message}`);
            }
        }
        const duration = Date.now() - startTime;

        // Validate response
        const validationError = validateModelResponse(model_id, response);
        if (validationError) {
            console.log(`[DIRECT MODEL] ❌ ${model_id} failed validation: ${validationError}`);
            return res.status(422).json({
                success: false,
                error: `Response validation failed: ${validationError}`,
                model_id: model_id
            });
        }

        console.log(`[DIRECT MODEL] ✅ Response from ${model_id} (${duration}ms): ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`);

        // If auto orchestrated, return final orchestration info (já aguardado)
        if (model_id === 'auto' && orchestrated) {
            return res.json({
                success: true,
                model_id: model_id,
                orchestrated,
                message: orchestrated.type === 'batch'
                    ? `Orquestração concluída para ${orchestrated.completed.length} modelos (falhas: ${orchestrated.failed.length}).`
                    : `Opinião de ${orchestrated.modelId} registrada.`,
                metadata: {
                    duration_ms: duration,
                    timestamp: new Date().toISOString(),
                    model_type: 'auto-mediator'
                }
            });
        }

        res.json({
            success: true,
            model_id: model_id,
            prompt: prompt,
            response: response,
            metadata: {
                duration_ms: duration,
                response_length: response.length,
                context_provided: !!context,
                timestamp: new Date().toISOString(),
                model_type: shouldUseCursorAgent(model_id) ? 'cursor-agent' : 'aider'
            }
        });

    } catch (error) {
        console.error(`[DIRECT MODEL] Error during model interaction:`, error);
        res.status(500).json({
            success: false,
            error: error.message,
            model_id: req.body?.model_id || 'unknown'
        });
    }
});

// Global store for active opinion collection sessions
const activeOpinionSessions = new Map();

// Global store for active hello handshake sessions
const activeHelloSessions = new Map();

// API endpoint to collect opinions from all models
app.post('/api/models/opinions', async (req, res) => {
    const { topic, issueId = 1, requestedBy, targetModels } = req.body;

    if (!topic || topic.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Topic is required'
        });
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[OPINIONS] 🗳️  Starting opinion collection session: ${sessionId}`);
    console.log(`[OPINIONS] 📋 Topic: "${topic}"`);
    console.log(`[OPINIONS] 🎯 Target issue: ${issueId}`);

    // Determine target models
    let allModels;
    if (Array.isArray(targetModels) && targetModels.length > 0) {
        // Use explicit targets (e.g., requested by 'auto')
        allModels = targetModels;
        console.log(`[OPINIONS] 🎯 Using explicit target models (${allModels.length})`);
    } else {
        // Use all available models by default
        allModels = [
            ...MODEL_CATEGORIES.cursor_models,
            ...WORKING_APIS
        ];
    }

    console.log(`[OPINIONS] 🤖 Total models to query: ${allModels.length}`);
    console.log(`[OPINIONS] 📊 Models: ${allModels.join(', ')}`);

    // Initialize session tracking
    const sessionData = {
        sessionId,
        topic,
        issueId,
        startTime: new Date().toISOString(),
        totalModels: allModels.length,
        pendingModels: [...allModels],
        completedModels: [],
        failedModels: [],
        responses: []
    };

    activeOpinionSessions.set(sessionId, sessionData);

    // Send initial response with session info
    res.json({
        success: true,
        sessionId,
        message: 'Opinion collection started',
        totalModels: allModels.length,
        models: allModels
    });

    // Start collecting opinions asynchronously
    // If 'auto' is orchestrating and no explicit targets were provided, ask 'auto' to propose a shortlist
    if (requestedBy === 'auto' && (!Array.isArray(targetModels) || targetModels.length === 0)) {
        try {
            const autoPlan = await generateAutoOpinionPlan(topic, issueId, allModels);
            const selected = Array.isArray(autoPlan?.models) && autoPlan.models.length > 0
                ? autoPlan.models
                : getDefaultShortlistFromProviders(allModels);

            console.log(`[OPINIONS] 🤖 'auto' selected ${selected.length} models: ${selected.join(', ')}`);
            collectModelOpinions(sessionId, topic, issueId, selected);
        } catch (e) {
            console.log(`[OPINIONS] ⚠️  Auto planning failed: ${e.message}. Falling back to provider shortlist.`);
            collectModelOpinions(sessionId, topic, issueId, getDefaultShortlistFromProviders(allModels));
        }
    } else {
        collectModelOpinions(sessionId, topic, issueId, allModels);
    }
});

// Function to collect opinions from all models
async function collectModelOpinions(sessionId, topic, issueId, models) {
    const session = activeOpinionSessions.get(sessionId);
    if (!session) {
        console.error(`[OPINIONS] ❌ Session ${sessionId} not found`);
        return;
    }

    console.log(`[OPINIONS] 🚀 Starting opinion collection for ${models.length} models`);

    // Broadcast initial status
    broadcastOpinionUpdate(sessionId, {
        type: 'session_started',
        totalModels: models.length,
        pendingModels: [...models],
        completedModels: [],
        failedModels: []
    });

    // Process models in parallel (but limit concurrency to avoid overwhelming)
    const concurrency = 3; // Process 3 models at once
    const chunks = [];

    for (let i = 0; i < models.length; i += concurrency) {
        chunks.push(models.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
        const promises = chunk.map(modelId => collectSingleModelOpinion(sessionId, modelId, topic, issueId));
        await Promise.allSettled(promises);
    }

    // Session complete
    const finalSession = activeOpinionSessions.get(sessionId);
    if (finalSession) {
        console.log(`[OPINIONS] ✅ Session ${sessionId} completed`);
        console.log(`[OPINIONS] 📊 Final stats: ${finalSession.completedModels.length} completed, ${finalSession.failedModels.length} failed`);

        broadcastOpinionUpdate(sessionId, {
            type: 'session_completed',
            totalModels: finalSession.totalModels,
            completedModels: finalSession.completedModels,
            failedModels: finalSession.failedModels,
            responses: finalSession.responses,
            endTime: new Date().toISOString()
        });

        // Keep session for 10 minutes then cleanup
        setTimeout(() => {
            activeOpinionSessions.delete(sessionId);
            console.log(`[OPINIONS] 🗑️  Session ${sessionId} cleaned up`);
        }, 10 * 60 * 1000);
    }
}

// Function to sanitize text for JSON storage - escapes quotes and other problematic characters
function sanitizeForJSON(text) {
    if (typeof text !== 'string') return text;

    return text
        .replace(/\\/g, '\\\\')  // Escape backslashes first
        .replace(/"/g, '\\"')    // Escape double quotes
        .replace(/\r\n/g, '\\n') // Handle Windows line endings
        .replace(/\n/g, '\\n')   // Handle Unix line endings
        .replace(/\r/g, '\\n')   // Handle Mac line endings
        .replace(/\t/g, '\\t')   // Handle tabs
        .replace(/\f/g, '\\f');  // Handle form feeds
        // REMOVED: .replace(/\b/g, '\\b') - This was incorrectly escaping word boundaries!
}

// Function to create a new issue/topic in issues.json
async function createNewIssue(title, body, labels = [], priority = 'medium') {
    try {
        logInfo('CREATE_ISSUE', 'Starting new issue creation', {
            title: title,
            bodyLength: body.length,
            labels: labels,
            priority: priority
        });

        const issuesData = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));

        // Get next ID
        const existingIds = issuesData.issues ? issuesData.issues.map(issue => issue.id) : [];
        const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

        // Create new issue
        const newIssue = {
            id: nextId,
            title: title,
            author: 'auto',
            created_at: new Date().toISOString(),
            status: 'open',
            labels: labels,
            priority: priority,
            locale: 'pt-BR',
            body: sanitizeForJSON(body),
            body_original: sanitizeForJSON(body),
            comments: []
        };

        // Add to issues array
        if (!issuesData.issues) {
            issuesData.issues = [];
        }
        issuesData.issues.push(newIssue);

        // Atomic write to prevent corruption
        const tempFile = issuesFile + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(issuesData, null, 2), 'utf8');
        fs.renameSync(tempFile, issuesFile);

        logInfo('CREATE_ISSUE', 'New issue created successfully', {
            issueId: nextId,
            title: title,
            totalIssues: issuesData.issues.length
        });

        return {
            success: true,
            issueId: nextId,
            title: title,
            message: `Issue #${nextId} criado com sucesso: "${title}"`
        };

    } catch (error) {
        logError('CREATE_ISSUE', 'Failed to create new issue', {
            title: title,
            error: error.message
        });
        throw error;
    }
}

// Function to collect opinion from a single model
async function collectSingleModelOpinion(sessionId, modelId, topic, issueId) {
    const session = activeOpinionSessions.get(sessionId);
    if (!session) {
        console.log(`[OPINIONS] ❌ Session ${sessionId} not found for model ${modelId}`);
        return;
    }

    console.log(`[OPINIONS] 🤖 Querying ${modelId} about: "${topic}"`);
    console.log(`[OPINIONS] 🔍 Model ${modelId} is in WORKING_APIS:`, WORKING_APIS.includes(modelId));
    console.log(`[OPINIONS] 🔍 Available aider models:`, Object.keys(MODEL_CATEGORIES.aider_models || {}));

    // Broadcast model started
    broadcastOpinionUpdate(sessionId, {
        type: 'model_started',
        modelId,
        status: 'querying'
    });

    try {
        // Build context pack from BIP files and issues
        const contextPack = buildBipContextPack(issueId, 18000, topic); // ~18k chars cap to keep prompt safe

        // Build prompt for model opinion with strict guidelines and embedded context
        const prompt = `Como modelo AI participante das discussões do BIP-05 (Universal Matrix Protocol), forneça sua opinião sobre:

**Tópico**: ${topic}

**DIRETRIZES CRÍTICAS**:
- VOCÊ É: ${modelId}
- NUNCA simule ou invente opiniões de outros modelos
- JAMAIS fale em nome de outros modelos
- APENAS forneça SUA própria perspectiva como ${modelId}
- Se questionado sobre outros modelos, responda "Consulte diretamente o modelo específico"

**Instruções**:
1. Analise o tópico no contexto do BIP-05
2. Forneça SUA perspectiva técnica e considerações específicas como ${modelId}
3. Seja específico e construtivo
4. Limite a resposta a 3-4 parágrafos
5. Termine com uma recomendação clara
6. Identifique-se claramente como ${modelId} no início da resposta

**Contexto do BIP-05 (trechos relevantes):**
${contextPack}

**Sua opinião como ${modelId} sobre "${topic}":**`;

        // Apply auto model safeguards if needed
        const safeguardedPrompt = await handleAutoModelSafeguard(modelId, prompt);

        // Call the model with individual timeout
        const rawResponse = await callLLM(modelId, safeguardedPrompt);

        // Clean Aider headers from response if present
        let response = rawResponse;
        if (rawResponse && rawResponse.includes('Aider v')) {
            const lines = rawResponse.split('\n');
            let contentStart = 0;

            // Find where actual content starts (skip Aider headers)
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('Como ') && line.includes(modelId)) {
                    contentStart = i;
                    break;
                } else if (line.length > 100 && !line.includes('Aider') && !line.includes('Model:') &&
                           !line.includes('Git') && !line.includes('Repo-map:') && !line.includes('working dir:')) {
                    contentStart = i;
                    break;
                }
            }

            if (contentStart > 0) {
                response = lines.slice(contentStart).join('\n').trim();
                console.log(`[OPINIONS] 🧹 Cleaned Aider headers from ${modelId} response (removed ${contentStart} lines)`);
            }
        }

        // Validate response to ensure model isn't speaking for others
        console.log(`[VALIDATION] Checking response from ${modelId} for identity violations...`);
        const validationError = validateModelResponse(modelId, response);
        if (validationError) {
            console.log(`[VALIDATION] ❌ ${modelId} failed validation: ${validationError}`);
            throw new Error(`Resposta inválida: ${validationError}`);
        }
        console.log(`[VALIDATION] ✅ ${modelId} response passed identity validation`);

        // Check if response is valid and not an error message
        const isValidResponse = response &&
                               !response.includes('❌') &&
                               !response.includes('⏰') &&
                               !response.includes('Warning:') &&
                               !response.includes('Traceback') &&
                               !response.includes('litellm.') &&
                               !response.includes('BadRequestError') &&
                               response.length > 50; // Ensure substantive response

        if (isValidResponse) {
            // Success - save to issues.json immediately
            const opinion = {
                author: modelId,
                created_at: new Date().toISOString(),
                locale: 'pt-BR',
                body: sanitizeForJSON(response),
                body_original: sanitizeForJSON(response),
                opinion_topic: topic,
                session_id: sessionId
            };

            // Add to issues.json immediately
            // Use atomic write to prevent corruption
            try {
                const issuesData = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));
                if (issuesData.issues && issuesData.issues.length > 0) {
                    // Find the specific issue by ID
                    const targetIssue = issuesData.issues.find(issue => issue.id === issueId);
                    if (targetIssue) {
                        targetIssue.comments.push(opinion);
                        console.log(`[SAVE] ✅ Opinion added to issue ${issueId}: "${targetIssue.title}"`);
                    } else {
                        console.error(`[SAVE] ❌ Issue ${issueId} not found! Available issues:`, issuesData.issues.map(i => `${i.id}: ${i.title}`));
                        throw new Error(`Issue ${issueId} not found`);
                    }
                } else {
                    issuesData.issues = [{
                        id: issueId,
                        title: `Opiniões sobre: ${topic}`,
                        comments: [opinion]
                    }];
                    console.log(`[SAVE] ✅ Created new issue ${issueId}: "${topic}"`);
                }

                // Atomic write to prevent corruption
                const tempFile = issuesFile + '.tmp';
                fs.writeFileSync(tempFile, JSON.stringify(issuesData, null, 2), 'utf8');
                fs.renameSync(tempFile, issuesFile);

                console.log(`[SAVE] ✅ Opinion from ${modelId} saved successfully`);

            } catch (writeError) {
                console.error(`[ERROR] Failed to save opinion from ${modelId}:`, writeError);
                throw writeError;
            }

            // Update session
            session.pendingModels = session.pendingModels.filter(m => m !== modelId);
            session.completedModels.push(modelId);
            const sessionResponse = {
                modelId,
                response,
                timestamp: new Date().toISOString(),
                success: true
            };
            session.responses.push(sessionResponse);
            console.log(`[OPINIONS DEBUG] Added response to session:`, {
                sessionId,
                modelId,
                responseLength: response.length,
                responsePreview: response.slice(0, 100) + '...'
            });

            console.log(`[OPINIONS] ✅ ${modelId} completed successfully`);

            // Broadcast success
            broadcastOpinionUpdate(sessionId, {
                type: 'model_completed',
                modelId,
                status: 'completed',
                response: response.substring(0, 200) + '...', // Preview
                timestamp: new Date().toISOString()
            });

        } else {
            throw new Error(response || 'Empty response from model');
        }

    } catch (error) {
        console.log(`[OPINIONS] ❌ ${modelId} failed: ${error.message}`);

        // Update session
        session.pendingModels = session.pendingModels.filter(m => m !== modelId);
        session.failedModels.push(modelId);
        session.responses.push({
            modelId,
            error: error.message,
            timestamp: new Date().toISOString(),
            success: false
        });

        // Broadcast failure
        broadcastOpinionUpdate(sessionId, {
            type: 'model_failed',
            modelId,
            status: 'failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// Function to broadcast opinion collection updates
function broadcastOpinionUpdate(sessionId, update) {
    const message = {
        type: 'opinion_update',
        sessionId,
        ...update,
        timestamp: new Date().toISOString()
    };

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Helper: parse AUTO_CMD JSON from free-form text
function parseAutoCmdFromText(text) {
    if (typeof text !== 'string') return null;
    const idx = text.indexOf('AUTO_CMD:');
    if (idx === -1) return null;

    // Take from AUTO_CMD: to end of text
    const after = text.slice(idx + 'AUTO_CMD:'.length).trim();

    // Try to extract JSON between first '{' and last '}'
    const s = after.indexOf('{');
    const e = after.lastIndexOf('}');

    if (s === -1 || e === -1 || e <= s) {
        console.log(`[AUTO_CMD] ❌ No valid JSON brackets found in: "${after.slice(0, 100)}..."`);
        return null;
    }

    const candidate = after.slice(s, e + 1).trim();
    console.log(`[AUTO_CMD] 🔍 Attempting to parse JSON: "${candidate.slice(0, 200)}${candidate.length > 200 ? '...' : ''}"`);

    try {
        const parsed = JSON.parse(candidate);
        console.log(`[AUTO_CMD] ✅ Successfully parsed JSON:`, Object.keys(parsed));
        return parsed;
    } catch (e1) {
        console.log(`[AUTO_CMD] ⚠️  Initial JSON parse failed: ${e1.message}`);

        // Sanitize common trailing quote or markdown artifacts
        const cleaned = candidate.replace(/"$/,'').replace(/`+/g,'').trim();
        try {
            const parsed = JSON.parse(cleaned);
            console.log(`[AUTO_CMD] ✅ Successfully parsed cleaned JSON:`, Object.keys(parsed));
            return parsed;
        } catch (e2) {
            console.log(`[AUTO_CMD] ❌ Both JSON parse attempts failed. Original: ${e1.message}, Cleaned: ${e2.message}`);
            return null;
        }
    }
}

// Helper: normalize model id short forms (e.g., 'grok-3' -> 'xai/grok-3')
function normalizeModelId(modelId) {
    if (!modelId || typeof modelId !== 'string') return modelId;

    console.log(`[NORMALIZE DEBUG] Input modelId: "${modelId}"`);

    // Special handling for models with incorrect provider prefixes
    if (modelId.startsWith('prov/')) {
        const baseModel = modelId.slice(5); // Remove 'prov/' prefix
        console.log(`[NORMALIZE DEBUG] Detected prov/ prefix, base model: "${baseModel}"`);

        // Check if base model is in cursor_models
        if (MODEL_CATEGORIES.cursor_models.includes(baseModel)) {
            console.log(`[NORMALIZE DEBUG] Found "${baseModel}" in cursor_models, returning as-is`);
            return baseModel;
        }
    }

    // If already has a valid provider, return as-is
    if (modelId.includes('/') && !modelId.startsWith('prov/')) {
        console.log(`[NORMALIZE DEBUG] Already has provider, returning as-is: "${modelId}"`);
        return modelId;
    }

    // Remove prov/ prefix if present (incorrect provider)
    const cleanModelId = modelId.startsWith('prov/') ? modelId.slice(5) : modelId;

    // Check cursor models first (exact match)
    if (MODEL_CATEGORIES.cursor_models.includes(cleanModelId)) {
        console.log(`[NORMALIZE DEBUG] Found "${cleanModelId}" in cursor_models`);
        return cleanModelId;
    }

    // Try to find a provider key that ends with '/modelId'
    const aiderKeys = Object.keys(MODEL_CATEGORIES.aider_models || {});
    const match = aiderKeys.find(k => k.endsWith('/' + cleanModelId));
    if (match) {
        console.log(`[NORMALIZE DEBUG] Found aider match: "${match}"`);
        return match;
    }

    console.log(`[NORMALIZE DEBUG] No match found, returning cleaned: "${cleanModelId}"`);
    return cleanModelId; // return cleaned version
}

// Build a concise context pack from BIP files and the target issue
function buildBipContextPack(issueId, maxChars, topic) {
    try {
        const parts = [];
        // Include issue snippet
        if (fs.existsSync(issuesFile)) {
            const issuesData = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));
            const targetIssue = issuesData.issues?.find(i => i.id === issueId) || issuesData.issues?.[0];
            if (targetIssue) {
                parts.push(`### Issue #${targetIssue.id}: ${targetIssue.title}`);
                const recent = (targetIssue.comments || []).slice(-3);
                recent.forEach(c => parts.push(`- ${c.author}: ${c.body?.slice(0, 400) || ''}`));
            }
        }

        // Include BIP docs snippets scanning whitelisted dirs for relevant files
        const repoRoot = path.join(__dirname, '..', '..');
        const whitelistDirs = [
            path.join(repoRoot, 'docs'),
            path.join(repoRoot, 'gov', 'bips', 'BIP-05')
        ];

        const candidateFiles = [];
        const allowedExt = new Set(['.md', '.mdx', '.txt']);

        function walk(dir) {
            if (!fs.existsSync(dir)) return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const e of entries) {
                const p = path.join(dir, e.name);
                if (e.isDirectory()) walk(p);
                else if (allowedExt.has(path.extname(e.name).toLowerCase())) candidateFiles.push(p);
            }
        }
        whitelistDirs.forEach(walk);

        // Score by simple keyword match using topic tokens
        const topicTokens = (topic || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
        function scoreContent(content) {
            const lc = content.toLowerCase();
            let score = 0;
            for (const t of topicTokens) if (t.length >= 3 && lc.includes(t)) score += 1;
            // Favor files that mention BIP or Universal Matrix
            if (lc.includes('bip-05')) score += 2;
            if (lc.includes('universal matrix')) score += 2;
            return score;
        }

        const ranked = candidateFiles
            .map(f => {
                try { return { f, c: fs.readFileSync(f, 'utf8') }; } catch { return null; }
            })
            .filter(Boolean)
            .map(x => ({ ...x, s: scoreContent(x.c) }))
            .sort((a, b) => b.s - a.s)
            .slice(0, 6);

        ranked.forEach(({ f, c }) => {
            const header = `\n### ${path.relative(repoRoot, f)}\n`;
            parts.push(header + c.slice(0, 2500));
        });

        let pack = parts.join('\n');
        if (pack.length > maxChars) pack = pack.slice(0, maxChars);
        return pack;
    } catch (e) {
        console.log(`[CONTEXT] ⚠️  Failed to build context pack: ${e.message}`);
        return 'Contexto indisponível no momento.';
    }
}

// Ask 'auto' to propose a shortlist of models for the topic
async function generateAutoOpinionPlan(topic, issueId, candidateModels) {
    const planPrompt = `Você é o orquestrador 'auto' (modelo mediador) do BIP-05.

PRIVILÉGIOS & RESPONSABILIDADES:
- Você pode escrever no issues.json (adicionar comentários/opiniões) de forma segura.
- Você orquestra pedidos de opinião de outros modelos usando as APIs do servidor.
- Use a lista de candidatos abaixo para selecionar os modelos mais adequados.

ROTAS DISPONÍVEIS (para seu planejamento):
- POST /api/models/opinions  → inicia sessão de opiniões em lote; body: { topic, issueId, targetModels? }
- GET  /api/models/opinions/:sessionId → status/progresso da sessão
- POST /api/models/option    → solicitar opinião individual; body: { topic, issueId, modelId }
- GET  /api/status           → status das APIs e modelos
- GET  /api/costs            → custos de execução por modelo

TAREFA:
Dado o tópico: "${topic}", escolha de 5 a 8 modelos mais relevantes na lista abaixo para opinar, equilibrando provedores e capacidades. Responda APENAS JSON com {"models":["prov/model", ...], "rationale":"..."}.

Lista de candidatos:
${candidateModels.map(m => `- ${m}`).join('\n')}

`;

    try {
        const raw = await callLLM('auto', planPrompt);
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
            const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
            if (Array.isArray(parsed.models)) return parsed;
        }
    } catch (e) {
        console.log(`[AUTO PLAN] ⚠️  parse/plan failed: ${e.message}`);
    }
    return { models: [] };
}

function getDefaultShortlistFromProviders(allModels) {
    // Pick top 6 by provider diversity: prefer 2 OpenAI, 2 Anthropic/Gemini, 2 xAI/DeepSeek se disponíveis
    const buckets = allModels.reduce((acc, m) => {
        const provider = m.split('/')[0] || 'other';
        (acc[provider] ||= []).push(m);
        return acc;
    }, {});
    const pick = (arr, n) => (arr || []).slice(0, n);
    return [
        ...pick(buckets.openai, 2),
        ...pick(buckets.anthropic, 2),
        ...pick(buckets.gemini, 1),
        ...pick(buckets.xai, 1),
        ...pick(buckets.deepseek, 1)
    ].filter(Boolean);
}

// API endpoint to get opinion session status
app.get('/api/models/opinions/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = activeOpinionSessions.get(sessionId);

    if (!session) {
        return res.status(404).json({
            success: false,
            error: 'Session not found'
        });
    }

    res.json({
        success: true,
        session: {
            ...session,
            progress: {
                total: session.totalModels,
                completed: session.completedModels.length,
                failed: session.failedModels.length,
                pending: session.pendingModels.length,
                percentage: Math.round((session.completedModels.length / session.totalModels) * 100)
            }
        }
    });
});

// API endpoint to request a single model opinion (individual option)
app.post('/api/models/option', async (req, res) => {
    try {
        const { topic, issueId = 1, modelId } = req.body;

        if (!topic || !modelId) {
            return res.status(400).json({ success: false, error: 'Campos obrigatórios: topic e modelId' });
        }

        const sessionId = `option_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        console.log(`[OPTION] 🎯 Solicitação de opinião individual - ${modelId} • Session: ${sessionId}`);

        // Inicializa sessão mínima para compatibilidade com painel
        activeOpinionSessions.set(sessionId, {
            sessionId,
            topic,
            issueId,
            totalModels: 1,
            pendingModels: [modelId],
            completedModels: [],
            failedModels: [],
            responses: [],
            startTime: new Date().toISOString()
        });

        // Resposta imediata
        res.json({ success: true, sessionId, message: 'Opinião individual iniciada', modelId });

        // Executa em background
        await collectSingleModelOpinion(sessionId, modelId, topic, issueId);

        // Finaliza sessão
        const session = activeOpinionSessions.get(sessionId);
        if (session) {
            broadcastOpinionUpdate(sessionId, {
                type: 'session_completed',
                totalModels: 1,
                completedModels: session.completedModels,
                failedModels: session.failedModels,
                responses: session.responses,
                endTime: new Date().toISOString()
            });

            setTimeout(() => activeOpinionSessions.delete(sessionId), 10 * 60 * 1000);
        }

    } catch (error) {
        console.error('[OPTION] ❌ Erro:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Serve static files (index.html, style.css)
app.use(express.static(__dirname));

// Endpoint para acessar logs de debug
app.get('/api/logs', (req, res) => {
    try {
        const logType = req.query.type || 'debug'; // 'debug' or 'error'
        const lines = parseInt(req.query.lines) || 100;

        const logFile = logType === 'error' ? ERROR_LOG_FILE : LOG_FILE;

        if (!fs.existsSync(logFile)) {
            return res.json({
                success: false,
                message: `Log file not found: ${logFile}`,
                logs: []
            });
        }

        const logContent = fs.readFileSync(logFile, 'utf8');
        const allLines = logContent.split('\n').filter(line => line.trim());
        const recentLines = allLines.slice(-lines);

        res.json({
            success: true,
            logType: logType,
            totalLines: allLines.length,
            returnedLines: recentLines.length,
            logFile: logFile,
            logs: recentLines
        });

    } catch (error) {
        logError('API', 'Error reading log files', {
            error: error.message,
            requestedType: req.query.type,
            requestedLines: req.query.lines
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint para limpar logs
app.post('/api/logs/clear', (req, res) => {
    try {
        const logType = req.body.type || 'debug';
        const logFile = logType === 'error' ? ERROR_LOG_FILE : LOG_FILE;

        if (fs.existsSync(logFile)) {
            fs.writeFileSync(logFile, '');
            logInfo('API', `Cleared ${logType} log file`, {
                logFile: logFile,
                clearedBy: 'manual_request'
            });
        }

        res.json({
            success: true,
            message: `${logType} log cleared successfully`,
            logFile: logFile
        });

    } catch (error) {
        logError('API', 'Error clearing log file', {
            error: error.message,
            requestedType: req.body.type
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// REST endpoint for creating new issues
app.post('/api/create-issue', async (req, res) => {
    const { title, body, labels = [], priority = 'medium' } = req.body;

    try {
        if (!title || !body) {
            return res.status(400).json({
                success: false,
                error: 'Title and body are required'
            });
        }

        const result = await createNewIssue(title, body, labels, priority);

        res.status(201).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Error in /api/create-issue:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Simple REST endpoint for posting comments
app.post('/api/comment', async (req, res) => {
    const { model, text } = req.body;

    try {
        const selectedModel = model || selectAppropriateModel(text || '', 'bip');
        console.log(`[DEBUG] Selected model: ${selectedModel} (requested: ${model || 'auto'})`);

        const issuesData = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));
        const prompt = buildPromptFromContext(text || 'Sem texto do usuário', issuesData);
        const llmText = await callLLM(selectedModel, prompt);
        const bodyText = llmText || (text ? `Recebido: "${text}"` : `Participação registrada por ${selectedModel}.`);

        const comment = {
            author: selectedModel,
            created_at: new Date().toISOString(),
            locale: 'pt-BR',
            body: sanitizeForJSON(bodyText),
            body_original: sanitizeForJSON(bodyText)
        };

        if (issuesData.issues && issuesData.issues.length > 0) {
            issuesData.issues[0].comments.push(comment);
  } else {
            issuesData.issues = [{ id: 1, title: 'Main Thread', comments: [comment] }];
        }

        fs.writeFileSync(issuesFile, JSON.stringify(issuesData, null, 2), 'utf8');

        res.status(200).json({
            success: true,
            message: `Comentário publicado por ${selectedModel}`,
            comment: bodyText
        });
    } catch (error) {
        console.error('Error in /api/comment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create WebSocket server and attach it to the HTTP server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

// Function to send issues data to all connected clients
function broadcastIssues() {
  if (clients.size === 0) {
    logDebug('BROADCAST', 'No clients connected, skipping broadcast');
    return;
  }

    logInfo('BROADCAST', 'Starting broadcast to clients', {
        clientCount: clients.size,
        issuesFile: issuesFile
    });

  // Add retry logic for concurrent file access issues
  function readWithRetry(attempts = 3) {
    fs.readFile(issuesFile, 'utf8', (err, data) => {
      if (err) {
        logError('BROADCAST', 'Error reading issues.json file', {
          error: err.message,
          errorCode: err.code,
          attemptsRemaining: attempts - 1,
          filePath: issuesFile
        });
        return;
      }

      try {
        // Validate JSON before parsing
        if (!data || data.trim() === '') {
          logError('BROADCAST', 'Empty or whitespace-only issues.json file detected', {
            dataLength: data ? data.length : 0,
            filePath: issuesFile
          });
          return;
        }

        logDebug('BROADCAST', 'Successfully read issues.json', {
          dataLength: data.length,
          dataPreview: data.substring(0, 200)
        });

        const originalData = JSON.parse(data);
        logInfo('BROADCAST', 'Successfully parsed issues.json', {
          issuesCount: originalData.issues ? originalData.issues.length : 0,
          hasRootComment: !!originalData.master_comment
        });

            // --- Data Transformation ---
            // 1. Collect all comments from all issues into a single array.
            let allComments = [];
            if (originalData.issues && Array.isArray(originalData.issues)) {
                originalData.issues.forEach(issue => {
                    if (issue.comments && Array.isArray(issue.comments)) {
                        // Add issue context to each comment if needed later
                        const commentsWithContext = issue.comments.map(c => ({...c, issueId: issue.id, issueTitle: issue.title}));
                        allComments.push(...commentsWithContext);
                    }
                });
            }

            // 2. Sort all comments by date.
            allComments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            // 3. Create a simplified payload for the client.
            const simplifiedPayload = {
                master_comment: originalData.master_comment, // Keep the master comment separate
                comments: allComments
            };
            // --- End Transformation ---

      let successfulSends = 0;
      let failedSends = 0;

      let clientIndex = 0;
      clients.forEach((client) => {
        clientIndex++;
        if (client.readyState === WebSocket.OPEN) {
          try {
            const payload = JSON.stringify(simplifiedPayload);
            client.send(payload);
            successfulSends++;
            logDebug('BROADCAST', `Successfully sent to client #${clientIndex}`, {
              payloadLength: payload.length
            });
          } catch (sendErr) {
            failedSends++;
            logError('BROADCAST', `Failed to send to client ${clientIndex}`, {
              clientIndex: clientIndex,
              error: sendErr.message,
              clientState: client.readyState
            });
          }
        } else {
          failedSends++;
          logWarn('BROADCAST', `Client ${clientIndex} not ready`, {
            clientIndex: clientIndex,
            readyState: client.readyState
          });
        }
      });

      logInfo('BROADCAST', 'Broadcast completed', {
        totalClients: clients.size,
        successfulSends,
        failedSends,
        commentsCount: allComments.length
      });

      } catch (parseErr) {
        logError('BROADCAST', 'Error parsing or transforming issues.json', {
          error: parseErr.message,
          errorStack: parseErr.stack,
          attemptsRemaining: attempts - 1,
          dataLength: data ? data.length : 0
        });

        // Retry if attempts remaining
        if (attempts > 1) {
          logWarn('BROADCAST', `Retrying JSON parse in 100ms...`, {
            attemptsLeft: attempts - 1,
            retryDelay: 100
          });
          setTimeout(() => readWithRetry(attempts - 1), 100);
        } else {
          logFatal('BROADCAST', 'Failed to parse issues.json after all retry attempts', {
            totalAttempts: 3,
            finalError: parseErr.message
          });
        }
      }
    });
  }

  // Start reading with retry
  readWithRetry();
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);

  // Send current issues data immediately
  broadcastIssues();

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });

    ws.on('message', (message) => {
        try {
            const rawMessage = message.toString();
            logDebug('WEBSOCKET', 'Received message from client', {
                messageLength: rawMessage.length,
                messagePreview: rawMessage.substring(0, 100),
                clientId: ws._clientId || 'unknown'
            });

            const data = JSON.parse(rawMessage);
            logInfo('WEBSOCKET', 'Parsed WebSocket message', {
                type: data.type,
                hasText: !!data.text,
                textLength: data.text ? data.text.length : 0
            });

            if (data.type === 'user_comment' && data.text) {
                handleUserComment(data.text);
            } else {
                logWarn('WEBSOCKET', 'Invalid message format or missing required fields', {
                    receivedData: data,
                    expectedType: 'user_comment',
                    hasText: !!data.text
                });
            }
        } catch (e) {
            logError('WEBSOCKET', 'Failed to parse incoming message', {
                error: e.message,
                errorStack: e.stack,
                rawMessage: message.toString(),
                messageType: typeof message,
                messageLength: message.toString().length
            });
        }
    });
});

async function handleUserComment(text) {
    console.log(`[DEBUG] Handling user comment: "${text}"`);
    const lowerText = text.toLowerCase();

    // Detect action type based on user intent
    if (isHelloHandshakeRequest(lowerText)) {
        // Hello/Handshake test: teste de conectividade de todos os modelos
        await handleHelloHandshakeRequest(text);
    } else if (isOpinionCollectionRequest(lowerText)) {
        // Coleta de opiniões: pergunta para todos os modelos
        await handleOpinionCollectionRequest(text);
    } else if (isGeneralContributionRequest(lowerText)) {
        // Resposta de general: adiciona ao issues.json e responde no chat
        await handleGeneralContribution(text);
    } else if (isSummaryRequest(lowerText)) {
        // Resumo da conversa: gera arquivo de resumo
        await handleSummaryRequest(text);
    } else {
        // Resposta simples: só responde no chat, não adiciona ao issues.json
        await handleSimpleResponse(text);
    }
}

// Function to handle opinion collection requests from chat
async function handleOpinionCollectionRequest(text) {
    console.log(`[DEBUG] Handling opinion collection request: "${text}"`);

    try {
        // Extract topic from the text
        const topic = extractOpinionTopic(text);

        console.log(`[OPINIONS] Starting opinion collection via chat for topic: "${topic}"`);

        // Send confirmation message to chat
        broadcastChatMessage({
            type: 'simple_response',
            author: '🗳️ Sistema de Opiniões',
            text: `Iniciando coleta de opiniões sobre: "${topic}"\n\nTodos os modelos disponíveis serão consultados. Acompanhe o progresso no painel de Opiniões.`,
            timestamp: new Date().toISOString()
        });

        // Get all available models
        const allModels = [
            ...MODEL_CATEGORIES.cursor_models,
            ...WORKING_APIS
        ];

        const sessionId = `chat_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const issueId = 1; // Default to issue 1

        // Initialize session tracking
        const sessionData = {
            sessionId,
            topic,
            issueId,
            startTime: new Date().toISOString(),
            totalModels: allModels.length,
            pendingModels: [...allModels],
            completedModels: [],
            failedModels: [],
            responses: [],
            triggeredByChat: true
        };

        activeOpinionSessions.set(sessionId, sessionData);

        // Broadcast session started via WebSocket
        broadcastOpinionUpdate(sessionId, {
            type: 'session_started',
            totalModels: allModels.length,
            pendingModels: [...allModels],
            completedModels: [],
            failedModels: [],
            triggeredByChat: true
        });

        // Start collecting opinions asynchronously
        collectModelOpinions(sessionId, topic, issueId, allModels);

        console.log(`[OPINIONS] Chat-triggered session ${sessionId} started with ${allModels.length} models`);

    } catch (error) {
        console.error(`[OPINIONS] Error in chat opinion collection:`, error);

        broadcastChatMessage({
            type: 'error',
            author: 'Sistema',
            text: `Erro ao iniciar coleta de opiniões: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}

function isGeneralContributionRequest(text) {
    const generalTriggers = [
        'contribuição', 'contribution', 'contribuir', 'contribute',
        'adicionar ao bip', 'add to bip', 'general opinion', 'opinião do general',
        'feedback oficial', 'official feedback', 'para o issues', 'to issues',
        'registrar discussão', 'record discussion', 'documentar', 'document'
    ];

    return generalTriggers.some(trigger => text.includes(trigger));
}

// Function to check if text is an opinion collection request
function isOpinionCollectionRequest(text) {
    const opinionKeywords = [
        'consultar opiniões', 'opinião dos modelos', 'opiniões sobre',
        'coletar opiniões', 'o que os modelos pensam', 'perspectiva dos modelos',
        'consulta geral', 'opinião de todos', 'perguntar aos modelos',
        'opinion collection', 'collect opinions', 'ask all models'
    ];

    return opinionKeywords.some(keyword =>
        text.toLowerCase().includes(keyword.toLowerCase())
    );
}

function isHelloHandshakeRequest(text) {
    const helloKeywords = [
        'hello', 'handshake', 'teste hello', 'hello modelos', 'hello task',
        'testar modelos', 'cumprimentar modelos', 'saudar modelos',
        'teste de conectividade', 'ping modelos', 'hello test'
    ];

    return helloKeywords.some(keyword =>
        text.toLowerCase().includes(keyword.toLowerCase())
    );
}

// Function to extract topic from opinion request
function extractOpinionTopic(text) {
    // Try to extract topic after keywords
    const patterns = [
        /consultar opiniões (?:dos modelos )?sobre (.+)/i,
        /opiniões? (?:dos modelos )?sobre (.+)/i,
        /coletar opiniões? sobre (.+)/i,
        /o que os modelos pensam sobre (.+)/i,
        /perspectiva dos modelos sobre (.+)/i,
        /perguntar aos modelos sobre (.+)/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }

    // Fallback: use the whole text as topic
    return text.trim();
}

// Function to handle hello handshake request
async function handleHelloHandshakeRequest(userText) {
    logInfo('HELLO', 'Starting hello handshake test', {
        initiatedBy: 'master',
        userText: userText
    });

    const sessionId = `hello_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get all available models (cursor-agent + aider)
    const allModels = [
        ...MODEL_CATEGORIES.cursor_models,
        ...WORKING_APIS
    ];

    const sessionData = {
        sessionId: sessionId,
        startTime: Date.now(),
        totalModels: allModels.length,
        completedModels: 0,
        results: [],
        status: 'running'
    };

    activeHelloSessions.set(sessionId, sessionData);

    // Send initial message via chat
    broadcastChatMessage({
        type: 'chat_message',
        author: 'auto',
        text: `🤝 Iniciando teste Hello/Handshake com ${allModels.length} modelos disponíveis...`,
        timestamp: new Date().toISOString(),
        isSystemMessage: true
    });

    // Start handshake with all models
    helloHandshakeAllModels(sessionId, allModels);

    return sessionData;
}

// Function to execute hello handshake with all models
async function helloHandshakeAllModels(sessionId, models) {
    const session = activeHelloSessions.get(sessionId);
    if (!session) return;

    logInfo('HELLO', 'Starting handshake with all models', {
        sessionId: sessionId,
        totalModels: models.length
    });

    // Process models in parallel with controlled concurrency
    const concurrency = 3; // Max 3 models at once to avoid rate limits
    const batches = [];

    for (let i = 0; i < models.length; i += concurrency) {
        batches.push(models.slice(i, i + concurrency));
    }

    for (const batch of batches) {
        const promises = batch.map(modelId =>
            helloSingleModel(sessionId, modelId)
        );

        await Promise.allSettled(promises);

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Session complete
    const finalSession = activeHelloSessions.get(sessionId);
    if (finalSession) {
        finalSession.status = 'completed';
        finalSession.endTime = Date.now();
        finalSession.duration = finalSession.endTime - finalSession.startTime;

        logInfo('HELLO', 'Hello handshake session completed', {
            sessionId: sessionId,
            totalModels: finalSession.totalModels,
            successfulResponses: finalSession.results.filter(r => r.success).length,
            failedResponses: finalSession.results.filter(r => !r.success).length,
            duration: finalSession.duration
        });

        // Send completion summary via chat
        const successCount = finalSession.results.filter(r => r.success).length;
        const failCount = finalSession.results.filter(r => !r.success).length;

        broadcastChatMessage({
            type: 'chat_message',
            author: 'auto',
            text: `✅ Teste Hello/Handshake concluído!\n📊 Resultados: ${successCount} sucessos, ${failCount} falhas\n⏱️ Duração: ${Math.round(finalSession.duration / 1000)}s`,
            timestamp: new Date().toISOString(),
            isSystemMessage: true
        });

        // Cleanup session after 5 minutes
        setTimeout(() => {
            activeHelloSessions.delete(sessionId);
            logInfo('HELLO', 'Hello session cleaned up', { sessionId });
        }, 5 * 60 * 1000);
    }
}

// Function to hello handshake with a single model
async function helloSingleModel(sessionId, modelId) {
    const session = activeHelloSessions.get(sessionId);
    if (!session) return;

    const startTime = Date.now();

    logDebug('HELLO', 'Starting hello with single model', {
        sessionId: sessionId,
        modelId: modelId
    });

    try {
        const helloPrompt = `Olá ${modelId}! Este é um teste de conectividade/handshake. Por favor, responda brevemente confirmando que você recebeu esta mensagem e se identifique.`;

        // Send hello message via chat first
        broadcastChatMessage({
            type: 'chat_message',
            author: 'auto',
            text: `📡 Enviando hello para ${modelId}...`,
            timestamp: new Date().toISOString(),
            isSystemMessage: true
        });

        const response = await callLLM(modelId, helloPrompt);
        const duration = Date.now() - startTime;

        const result = {
            modelId: modelId,
            success: response && !response.includes('❌') && response.length > 10,
            response: response,
            duration: duration,
            timestamp: new Date().toISOString()
        };

        session.results.push(result);
        session.completedModels++;

        if (result.success) {
            logInfo('HELLO', 'Hello handshake successful', {
                sessionId: sessionId,
                modelId: modelId,
                duration: duration,
                responseLength: response.length
            });

            // Send success message via chat
            broadcastChatMessage({
                type: 'chat_message',
                author: 'auto',
                text: `✅ ${modelId}: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`,
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
        } else {
            logWarn('HELLO', 'Hello handshake failed', {
                sessionId: sessionId,
                modelId: modelId,
                duration: duration,
                response: response
            });

            // Send failure message via chat
            broadcastChatMessage({
                type: 'chat_message',
                author: 'auto',
                text: `❌ ${modelId}: Falha na conectividade (${response || 'sem resposta'})`,
                timestamp: new Date().toISOString(),
                isSystemMessage: true
            });
        }

        // Broadcast progress update
        broadcastHelloProgress(sessionId, session);

    } catch (error) {
        const duration = Date.now() - startTime;

        logError('HELLO', 'Hello handshake error', {
            sessionId: sessionId,
            modelId: modelId,
            error: error.message,
            duration: duration
        });

        const result = {
            modelId: modelId,
            success: false,
            response: `Error: ${error.message}`,
            duration: duration,
            timestamp: new Date().toISOString()
        };

        session.results.push(result);
        session.completedModels++;

        // Send error message via chat
        broadcastChatMessage({
            type: 'chat_message',
            author: 'auto',
            text: `💥 ${modelId}: Erro na conectividade (${error.message})`,
            timestamp: new Date().toISOString(),
            isSystemMessage: true
        });

        // Broadcast progress update
        broadcastHelloProgress(sessionId, session);
    }
}

// Function to broadcast hello progress updates
function broadcastHelloProgress(sessionId, session) {
    const progressData = {
        type: 'hello_progress',
        sessionId: sessionId,
        completed: session.completedModels,
        total: session.totalModels,
        progress: Math.round((session.completedModels / session.totalModels) * 100),
        results: session.results,
        status: session.status
    };

    logDebug('HELLO', 'Broadcasting hello progress', {
        sessionId: sessionId,
        progress: progressData.progress,
        completed: session.completedModels,
        total: session.totalModels
    });

    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(progressData));
            } catch (error) {
                logError('HELLO', 'Failed to broadcast hello progress', {
                    error: error.message,
                    sessionId: sessionId
                });
            }
        }
    });
}

// Function to broadcast chat messages
function normalizeChatEnvelope(messageData) {
    // Extract text from various possible fields
    let text = '';
    if (typeof messageData.text === 'string' && messageData.text.trim()) {
        text = messageData.text.trim();
    } else if (typeof messageData.message === 'string' && messageData.message.trim()) {
        text = messageData.message.trim();
    } else if (typeof messageData.response === 'string' && messageData.response.trim()) {
        text = messageData.response.trim();
    } else if (typeof messageData.body === 'string' && messageData.body.trim()) {
        text = messageData.body.trim();
    }

    // Ensure we have a valid type first
    let type = messageData.type || 'chat_message';
    const validTypes = ['chat_message', 'simple_response', 'typing', 'stop_typing', 'error', 'opinion_update', 'hello_progress'];
    if (!validTypes.includes(type)) {
        type = 'chat_message';
    }

    // Ensure we always have valid text (except for typing indicators)
    if (!text) {
        // Typing indicators legitimately have empty text
        if (type === 'typing') {
            text = '⌨️ digitando...';
        } else if (type === 'stop_typing') {
            text = ''; // This is intentionally empty for stop_typing
        } else {
            console.warn('[NORMALIZE] Empty text detected in messageData:', JSON.stringify(messageData, null, 2));
            text = ''; // Don't show processing message
        }
    }

    // Ensure we have a valid author
    let author = messageData.author || 'Sistema';
    if (typeof author !== 'string' || !author.trim()) {
        author = 'Sistema';
    }

    const normalized = {
        type: type,
        author: author.trim(),
        text: text,
        timestamp: messageData.timestamp || new Date().toISOString(),
        isSystemMessage: messageData.isSystemMessage || false
    };

    // Log for debugging problematic messages with empty text
    if (!text && type !== 'stop_typing') {
        console.warn('[NORMALIZE] Message has empty text:', normalized);
    }

    return normalized;
}

function broadcastChatMessage(messageData) {
    const envelope = normalizeChatEnvelope(messageData);

    logDebug('CHAT', 'Broadcasting chat message', {
        author: envelope.author,
        messageLength: envelope.text ? envelope.text.length : 0,
        isSystemMessage: envelope.isSystemMessage
    });

    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(envelope));
            } catch (error) {
                logError('CHAT', 'Failed to broadcast chat message', {
                    error: error.message,
                    author: envelope.author
                });
            }
        }
    });
}

// Function to validate that a model isn't speaking for others
function validateModelResponse(modelId, response) {
    if (!response || typeof response !== 'string') {
        return null; // Let other validation handle empty responses
    }

    const lowerResponse = response.toLowerCase();

    // Get list of all other model names to check against
    const allModels = [
        ...MODEL_CATEGORIES.cursor_models,
        ...Object.keys(MODEL_CATEGORIES.aider_models)
    ].filter(model => model !== modelId && model !== 'auto');

    // Critical validation: Check if model is claiming to be another model
    const forbiddenPhrases = [
        'como gpt-', 'como claude-', 'como gemini-', 'como anthropic/',
        'como openai/', 'como xai/', 'como deepseek', 'como groq/',
        'speaking as gpt-', 'speaking as claude-', 'as gpt-', 'as claude-',
        'sou o gpt-', 'sou o claude-', 'eu sou gpt-', 'eu sou claude-',
        'na perspectiva do gpt-', 'na perspectiva do claude-',
        'opinião do gpt-', 'opinião do claude-', 'opinião do gemini-'
    ];

    // Special check for 'auto' model - it should NEVER claim to be specific models
    if (modelId === 'auto') {
        for (const otherModel of allModels) {
            const modelName = otherModel.toLowerCase().split('/').pop(); // Get last part after /
            if (modelName && modelName !== 'auto' && lowerResponse.includes(`como ${modelName}`)) {
                return `Modelo 'auto' tentou se identificar como '${otherModel}'. Auto deve sempre solicitar via API, não simular.`;
            }
        }

        // Check for phrases indicating the model is role-playing as another
        if (forbiddenPhrases.some(phrase => lowerResponse.includes(phrase))) {
            return `Modelo 'auto' tentou simular outro modelo. Auto deve sempre fazer chamadas reais via API.`;
        }
    }

    // Check if any model is using forbidden phrases to impersonate others
    for (const phrase of forbiddenPhrases) {
        if (lowerResponse.includes(phrase)) {
            // Allow if the model is correctly identifying itself
            const expectedIdentity = `como ${modelId.toLowerCase()}`;
            const normalizedModelId = modelId.toLowerCase().replace('/', '/'); // Keep slash as-is

            // Check if this is the model correctly identifying itself
            if (lowerResponse.includes(expectedIdentity) || lowerResponse.includes(`como ${normalizedModelId}`)) {
                continue; // This is fine, model is identifying itself correctly
            }

            // Only fail if it's clearly impersonating another model
            if (!phrase.includes(modelId.toLowerCase()) && lowerResponse.includes(phrase)) {
                return `Modelo tentou se identificar incorretamente. Deve usar apenas sua própria identidade: ${modelId}`;
            }
        }
    }

    // Check for attempts to provide multiple model perspectives in one response
    const multiModelIndicators = [
        'na perspectiva do claude', 'na perspectiva do gpt', 'na perspectiva do gemini',
        'segundo o claude', 'segundo o gpt', 'segundo o gemini',
        'de acordo com o claude', 'de acordo com o gpt', 'de acordo com o gemini',
        'consultando o claude', 'consultando o gpt', 'consultando o gemini'
    ];

    for (const indicator of multiModelIndicators) {
        if (lowerResponse.includes(indicator) && !indicator.includes(modelId.toLowerCase())) {
            return `Modelo tentou falar por outros modelos. Cada modelo deve fornecer apenas sua própria perspectiva.`;
        }
    }

    return null; // Response is valid
}

// Special handling for 'auto' model to prevent opinion simulation
async function handleAutoModelSafeguard(modelId, prompt) {
    if (modelId === 'auto') {
        // For 'auto' model, add extra safeguards in prompt
        const autoSafeguardPrompt = `${prompt}

AVISO CRÍTICO PARA MODELO AUTO:
- Você é o modelo 'auto' mediando a conversa
- NUNCA forneça opiniões que simulariam outros modelos específicos
- Se perguntado sobre outros modelos, responda: "Para obter a opinião específica de [modelo], farei uma chamada via API"
- Sua função é mediar e facilitar, não simular outros modelos
- Em coletas de opinião, você deve apenas coordenar as chamadas reais, não inventar respostas`;

        console.log(`[AUTO SAFEGUARD] Enhanced prompt for 'auto' model with strict guidelines`);
        return autoSafeguardPrompt;
    }

    return prompt; // Return original prompt for other models
}

function isSummaryRequest(text) {
    const summaryTriggers = [
        'resumo', 'summary', 'resumir', 'summarize',
        'pontos principais', 'main points', 'consenso', 'consensus',
        'gerar resumo', 'generate summary', 'synthesis', 'síntese'
    ];

    return summaryTriggers.some(trigger => text.includes(trigger));
}

async function handleSimpleResponse(text) {
    console.log(`[DEBUG] Handling simple response for: "${text}"`);

    // Add to session context
    sessionContext.push({
        role: 'user',
        content: text,
        timestamp: new Date().toISOString()
    });

    // Keep only last 10 messages in context
    if (sessionContext.length > 10) {
        sessionContext = sessionContext.slice(-10);
    }

    // Always use 'auto' model for simple interactions
    const selectedModel = 'auto';

    // Send typing indicator
    broadcastChatMessage({
        type: 'typing',
        author: selectedModel,
        text: '',
        timestamp: new Date().toISOString()
    });

    // Build prompt with session context
    const contextPrompt = buildSessionPrompt(text);

    try {
        const response = await callLLM(selectedModel, contextPrompt);

        // Stop typing indicator
        broadcastChatMessage({
            type: 'stop_typing',
            author: selectedModel,
            text: '',
            timestamp: new Date().toISOString()
        });

        if (response) {
            // Add response to session context
            sessionContext.push({
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString(),
                model: selectedModel
            });

            // Check for AUTO_CMD in 'auto' model responses
            let orchestrated = null;
            if (selectedModel === 'auto' && typeof response === 'string' && response.includes('AUTO_CMD:')) {
                try {
                    console.log(`[AUTO_CMD] 🔍 Raw response: ${response.substring(response.indexOf('AUTO_CMD:'), response.indexOf('AUTO_CMD:') + 200)}`);
                    const cmd = parseAutoCmdFromText(response);
                    console.log(`[AUTO_CMD] 📋 Parsed command:`, JSON.stringify(cmd, null, 2));
                    if (cmd) {
                        if (cmd.orchestrate) {
                            const { topic: t, issueId: iid, models } = cmd.orchestrate;
                            const normalized = (models || WORKING_APIS).map(normalizeModelId);
                            console.log(`[AUTO_CMD] 🔄 Original models: ${JSON.stringify(models)}`);
                            console.log(`[AUTO_CMD] 🔄 Normalized models: ${JSON.stringify(normalized)}`);
                            console.log(`[AUTO_CMD] 🔄 WORKING_APIS: ${JSON.stringify(WORKING_APIS)}`);
                            const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
                            console.log(`[AUTO_CMD] 🗳️  Orchestrate received → ${normalized.length} models • session=${sessionId}`);
                            broadcastChatMessage({
                                type: 'simple_response',
                                author: 'auto',
                                text: `🔄 Orquestrando opiniões de ${normalized.join(', ')} para o tópico: "${t || text}"...`
                            });
                            // seed session and run async
                            activeOpinionSessions.set(sessionId, {
                                sessionId,
                                topic: t || text,
                                issueId: iid || 1,
                                startTime: new Date().toISOString(),
                                totalModels: normalized.length,
                                pendingModels: [...normalized],
                                completedModels: [],
                                failedModels: [],
                                responses: []
                            });
                            console.log(`[AUTO_CMD] 🚀 Starting collectModelOpinions with ${normalized.length} models`);
                            // Execute orchestration asynchronously
                            collectModelOpinions(sessionId, t || text, iid || 1, normalized).then(() => {
                                const session = activeOpinionSessions.get(sessionId);
                                const orchestrated = {
                                    type: 'batch',
                                    sessionId,
                                    models: normalized,
                                    completed: session?.completedModels || [],
                                    failed: session?.failedModels || [],
                                    responses: session?.responses || []
                                };
                                console.log(`[AUTO_CMD] ✅ Orchestration completed:`, orchestrated);

                                // Send each model's response to frontend
                                if (orchestrated.responses && orchestrated.responses.length > 0) {
                                    orchestrated.responses.forEach(resp => {
                                        if (resp.success && resp.response) {
                                            broadcastChatMessage({
                                                type: 'simple_response',
                                                author: resp.modelId,
                                                text: resp.response,
                                                timestamp: resp.timestamp
                                            });
                                        }
                                    });
                                } else {
                                    // Fallback to summary message if no detailed responses
                                    broadcastChatMessage({
                                        type: 'simple_response',
                                        author: 'auto',
                                        text: `✅ Orquestração concluída! ${orchestrated.completed.length} modelos responderam com sucesso.`
                                    });
                                }
                            }).catch(error => {
                                console.error(`[AUTO_CMD] ❌ Orchestration failed:`, error);
                                broadcastChatMessage({
                                    type: 'simple_response',
                                    author: 'auto',
                                    text: `❌ Erro na orquestração: ${error.message}`
                                });
                            });
                        } else if (cmd.option) {
                            const { topic: t, issueId: iid, modelId: mid } = cmd.option;
                            const nm = normalizeModelId(mid);
                            const sessionId = `option_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
                            console.log(`[AUTO_CMD] 🎯 Option received → model=${nm} • session=${sessionId}`);
                            broadcastChatMessage({
                                type: 'simple_response',
                                author: 'auto',
                                text: `🔎 Solicitando opinião de ${nm} para o tópico: "${t || text}"...`
                            });

                            // Create session for single model opinion
                            activeOpinionSessions.set(sessionId, {
                                sessionId,
                                topic: t || text,
                                issueId: iid || 1,
                                startTime: new Date().toISOString(),
                                totalModels: 1,
                                pendingModels: [nm],
                                completedModels: [],
                                failedModels: [],
                                responses: []
                            });

                            // Execute single model opinion asynchronously
                            collectSingleModelOpinion(sessionId, nm, t || text, iid || 1).then(() => {
                                console.log(`[AUTO_CMD] ✅ Single model opinion completed for ${nm}`);

                                // Get the session and send the actual response
                                const session = activeOpinionSessions.get(sessionId);
                                console.log(`[AUTO_CMD DEBUG] Session check for ${nm}:`, {
                                    hasSession: !!session,
                                    responsesCount: session?.responses?.length || 0,
                                    sessionId: sessionId
                                });
                                if (session && session.responses && session.responses.length > 0) {
                                    const lastResponse = session.responses[session.responses.length - 1];
                                    console.log(`[AUTO_CMD DEBUG] Last response check:`, {
                                        lastResponseModelId: lastResponse.modelId,
                                        expectedModelId: nm,
                                        success: lastResponse.success,
                                        hasResponse: !!lastResponse.response,
                                        match: lastResponse.modelId === nm
                                    });
                                    if (lastResponse.success && lastResponse.response && lastResponse.modelId === nm) {
                                        broadcastChatMessage({
                                            type: 'simple_response',
                                            author: lastResponse.modelId,
                                            text: lastResponse.response,
                                            timestamp: lastResponse.timestamp
                                        });
                                    } else {
                                        // Fallback message
                                        broadcastChatMessage({
                                            type: 'simple_response',
                                            author: 'auto',
                                            text: `✅ Opinião de ${nm} coletada com sucesso!`
                                        });
                                    }
                                } else {
                                    // Fallback message
                                    broadcastChatMessage({
                                        type: 'simple_response',
                                        author: 'auto',
                                        text: `✅ Opinião de ${nm} coletada com sucesso!`
                                    });
                                }
                            }).catch(error => {
                                console.error(`[AUTO_CMD] ❌ Single model opinion failed for ${nm}:`, error);
                                broadcastChatMessage({
                                    type: 'simple_response',
                                    author: 'auto',
                                    text: `❌ Erro ao coletar opinião de ${nm}: ${error.message}`
                                });
                            });
                        } else if (cmd.create_issue) {
                            const { title, body, labels = [], priority = 'medium' } = cmd.create_issue;
                            console.log(`[AUTO_CMD] 📝 Create issue received via WebSocket → title="${title}"`);
                            broadcastChatMessage({
                                type: 'simple_response',
                                author: 'auto',
                                text: `📝 Criando novo tópico: "${title}"...`
                            });

                            createNewIssue(title, body, labels, priority).then(result => {
                                broadcastChatMessage({
                                    type: 'simple_response',
                                    author: 'auto',
                                    text: result.message
                                });
                                console.log(`[CREATE_ISSUE] ✅ Issue created successfully: ${result.issueId}`);
                            }).catch(error => {
                                console.error(`[AUTO_CMD] ❌ Create issue failed:`, error);
                                broadcastChatMessage({
                                    type: 'simple_response',
                                    author: 'auto',
                                    text: `❌ Erro ao criar tópico: ${error.message}`
                                });
                            });
                        }
                    }
                } catch (error) {
                    console.error(`[AUTO_CMD] ❌ Error processing AUTO_CMD:`, error);
                }
            }

            // Send response directly to chat (not to issues.json)
            broadcastChatMessage({
                type: 'simple_response',
                author: selectedModel,
                text: response,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error(`Error in simple response:`, error);

        // Stop typing indicator on error
        broadcastChatMessage({
            type: 'stop_typing',
            author: selectedModel,
            text: '',
            timestamp: new Date().toISOString()
        });

        broadcastChatMessage({
            type: 'error',
            author: 'Sistema',
            text: `Erro ao gerar resposta: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}

async function handleGeneralContribution(text) {
    console.log(`[DEBUG] Handling general contribution for: "${text}"`);

    try {
        // Step 1: Initial analysis with 'auto' model
        console.log(`[DEBUG] Step 1: Initial analysis with 'auto' model`);

        broadcastChatMessage({
            type: 'typing',
            author: 'auto (análise)',
            text: '',
            timestamp: new Date().toISOString()
        });

        const analysisPrompt = `Analise esta solicitação de contribuição para o BIP-05 e determine:
1. Que tipo de contribuição é necessária?
2. Qual modelo seria mais adequado para esta tarefa?
3. Que aspectos específicos devem ser abordados?

Solicitação: "${text}"

Responda de forma estruturada indicando o modelo recomendado e os pontos principais a abordar.`;

        const analysis = await callLLM('auto', analysisPrompt);

        broadcastChatMessage({
            type: 'stop_typing',
            author: 'auto (análise)',
            text: '',
            timestamp: new Date().toISOString()
        });

        // Send analysis result to chat
        broadcastChatMessage({
            type: 'simple_response',
            author: '🔍 auto (análise)',
            text: analysis,
            timestamp: new Date().toISOString()
        });

        // Step 2: Select appropriate model for execution
        const generals = MODEL_CATEGORIES.generals;
        const selectedGeneral = generals[Math.floor(Math.random() * generals.length)];

        console.log(`[DEBUG] Step 2: Executing with selected model: ${selectedGeneral}`);

        // Send typing indicator for execution model
        broadcastChatMessage({
            type: 'typing',
            author: selectedGeneral,
            text: '',
            timestamp: new Date().toISOString()
        });

        // Build comprehensive prompt with BIP context + analysis
        const fullPrompt = await buildGeneralContributionPrompt(text, analysis);

        const response = await callLLM(selectedGeneral, fullPrompt);

        // Stop typing indicator
        broadcastChatMessage({
            type: 'stop_typing',
            author: selectedGeneral,
            text: '',
            timestamp: new Date().toISOString()
        });

        if (response) {
            // Add to issues.json
            const comment = {
                author: selectedGeneral,
                created_at: new Date().toISOString(),
                locale: 'pt-BR',
                body: sanitizeForJSON(response),
                body_original: sanitizeForJSON(response)
            };

            const issuesData = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));
            if (issuesData.issues && issuesData.issues.length > 0) {
                issuesData.issues[0].comments.push(comment);
            } else {
                issuesData.issues = [{ id: 1, title: 'Main Thread', comments: [comment] }];
            }

            fs.writeFileSync(issuesFile, JSON.stringify(issuesData, null, 2), 'utf8');

            // Also send to chat
            broadcastChatMessage({
                type: 'general_contribution',
                author: selectedGeneral,
                text: response,
                timestamp: new Date().toISOString(),
                added_to_issues: true
            });
        }
    } catch (error) {
        console.error(`Error in general contribution:`, error);

        // Stop any active typing indicators
        broadcastChatMessage({
            type: 'stop_typing',
            author: 'system',
            text: '',
            timestamp: new Date().toISOString()
        });

        broadcastChatMessage({
            type: 'error',
            author: 'Sistema',
            text: `Erro ao gerar contribuição: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}

async function handleSummaryRequest(text) {
    console.log(`[DEBUG] Handling summary request for: "${text}"`);

    // Use a general model for summary
    const selectedModel = MODEL_CATEGORIES.generals[0]; // Use first general for consistency

    // Send typing indicator
    broadcastChatMessage({
        type: 'typing',
        author: selectedModel,
        text: '',
        timestamp: new Date().toISOString()
    });

    try {
        // Read all discussions from issues.json
        const issuesData = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));

        // Build summary prompt
        const summaryPrompt = buildSummaryPrompt(issuesData);

        const summary = await callLLM(selectedModel, summaryPrompt);

        // Stop typing indicator
        broadcastChatMessage({
            type: 'stop_typing',
            author: selectedModel,
            text: '',
            timestamp: new Date().toISOString()
        });

        if (summary) {
            // Generate summary file
            const summaryFile = path.join(__dirname, '..', 'discussion-summary.md');
            const summaryContent = `# Resumo das Discussões BIP-05\n\n**Gerado em:** ${new Date().toISOString()}\n**Modelo:** ${selectedModel}\n\n---\n\n${summary}`;

            fs.writeFileSync(summaryFile, summaryContent, 'utf8');

            // Send confirmation to chat
            broadcastChatMessage({
                type: 'summary_generated',
                author: selectedModel,
                text: `Resumo das discussões gerado com sucesso! Arquivo salvo em: discussion-summary.md\n\n**Principais pontos:**\n${summary.slice(0, 500)}...`,
                timestamp: new Date().toISOString(),
                file_generated: 'discussion-summary.md'
            });
        }
    } catch (error) {
        console.error(`Error generating summary:`, error);

        // Stop typing indicator on error
        broadcastChatMessage({
            type: 'stop_typing',
            author: selectedModel,
            text: '',
            timestamp: new Date().toISOString()
        });

        broadcastChatMessage({
            type: 'error',
            author: 'Sistema',
            text: `Erro ao gerar resumo: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}

function buildSessionPrompt(userText) {
    const contextMessages = sessionContext.slice(-6); // Last 6 messages

    let prompt = `Você é um assistente especializado em BIP-05 (Universal Matrix Protocol). Responda de forma direta e objetiva em português.\n\n`;

    if (contextMessages.length > 0) {
        prompt += `Contexto da conversa:\n`;
        contextMessages.forEach(msg => {
            const role = msg.role === 'user' ? 'Master' : `${msg.model || 'Assistant'}`;
            prompt += `- ${role}: ${msg.content}\n`;
        });
        prompt += `\n`;
    }

    prompt += `Pergunta atual: ${userText}\n\nResponda de forma clara e concisa (máximo 3 parágrafos):`;

    return prompt;
}

async function buildGeneralContributionPrompt(userText, analysis = null) {
    // Read BIP and implementation files
    const bipContent = fs.readFileSync(bipFile, 'utf8');
    const implementationContent = fs.readFileSync(implementationFile, 'utf8');
    const issuesData = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));

    // Get recent discussions
    const recentComments = [];
    (issuesData.issues || []).forEach(issue => {
        (issue.comments || []).slice(-5).forEach(c => {
            recentComments.push(`${c.author}: ${c.body}`);
        });
    });

    let prompt = `Você é um modelo AI expert contribuindo para a discussão oficial do BIP-05 (Universal Matrix Protocol).

**CONTEXTO COMPLETO DO BIP:**
${bipContent}

**PLANO DE IMPLEMENTAÇÃO:**
${implementationContent}

**DISCUSSÕES RECENTES:**
${recentComments.join('\n')}

**SOLICITAÇÃO DO MASTER:**
${userText}`;

    if (analysis) {
        prompt += `

**ANÁLISE PRELIMINAR:**
${analysis}`;
    }

    prompt += `

**INSTRUÇÕES:**
1. Forneça uma contribuição técnica substantiva para a discussão
2. Responda em português E inglês (formato: PT: ... / EN: ...)
3. Seja específico e técnico, focando em implementação
4. Considere o contexto das discussões anteriores
5. Sugira melhorias concretas quando relevante
6. Se há análise preliminar, use-a como guia mas desenvolva pontos adicionais

**SUA CONTRIBUIÇÃO OFICIAL:**`;

    return prompt;
}

function buildSummaryPrompt(issuesData) {
    const allComments = [];
    (issuesData.issues || []).forEach(issue => {
        allComments.push(`## ${issue.title}`);
        (issue.comments || []).forEach(c => {
            allComments.push(`**${c.author}:** ${c.body}`);
        });
        allComments.push('---');
    });

    return `Você é um expert técnico analisando todas as discussões do BIP-05 (Universal Matrix Protocol).

**MASTER COMMENT:**
${issuesData.master_comment?.body || 'N/A'}

**TODAS AS DISCUSSÕES:**
${allComments.join('\n')}

**TAREFA:**
Gere um resumo executivo completo com:

1. **PRINCIPAIS PONTOS DE CONSENSO** - O que todos concordam
2. **RECOMENDAÇÕES TÉCNICAS CONSOLIDADAS** - Principais especificações acordadas
3. **QUESTÕES EM ABERTO** - Pontos que precisam ser decididos
4. **PRÓXIMOS PASSOS** - Direcionamento claro para implementação
5. **PARTICIPANTES E CONTRIBUIÇÕES** - Quem contribuiu com o quê

Seja objetivo, técnico e forneça um resumo acionável para o modelo que irá implementar o BIP.

**RESUMO EXECUTIVO:**`;
}

// Legacy function removed - using unified broadcastChatMessage

// Legacy functions removed - using new action-based system

function addCommentToFile(text, author) {
    logInfo('FILE_WRITE', 'Starting comment addition to issues.json', {
        author: author,
        textLength: text.length,
        issuesFile: issuesFile
    });

    try {
        const rawData = fs.readFileSync(issuesFile, 'utf8');
        logDebug('FILE_WRITE', 'Successfully read issues.json', {
            dataLength: rawData.length,
            author: author
        });

        const issuesData = JSON.parse(rawData);
        logDebug('FILE_WRITE', 'Successfully parsed issues.json', {
            issuesCount: issuesData.issues ? issuesData.issues.length : 0,
            author: author
        });

        const comment = {
            author: author,
            created_at: new Date().toISOString(),
            locale: "pt-BR",
            body: sanitizeForJSON(text),
            body_original: sanitizeForJSON(text)
        };

        logDebug('FILE_WRITE', 'Created comment object', {
            author: comment.author,
            created_at: comment.created_at,
            bodyLength: comment.body.length,
            sanitized: text !== comment.body
        });

        if (issuesData.issues && issuesData.issues.length > 0) {
            issuesData.issues[0].comments.push(comment);
            logDebug('FILE_WRITE', 'Added comment to existing issue', {
                issueId: issuesData.issues[0].id,
                commentsCount: issuesData.issues[0].comments.length,
                author: author
            });
        } else {
            issuesData.issues = [{ id: 1, title: "Main Thread", comments: [comment] }];
            logDebug('FILE_WRITE', 'Created new issue with comment', {
                issueId: 1,
                author: author
            });
        }

        const jsonString = JSON.stringify(issuesData, null, 2);
        fs.writeFileSync(issuesFile, jsonString, 'utf8');

        logInfo('FILE_WRITE', 'Successfully added comment to issues.json', {
            author: author,
            finalFileSize: jsonString.length,
            totalComments: issuesData.issues[0].comments.length
        });
    } catch (error) {
        logError('FILE_WRITE', 'Error adding comment to issues.json', {
            author: author,
            error: error.message,
            errorStack: error.stack,
            textLength: text.length
        });
    }
}

// Watch for file changes
let fileWatcher = null;
let debounceTimeout = null;

function startFileWatcher() {
  if (fileWatcher) {
    fileWatcher.close();
  }

  fileWatcher = fs.watch(issuesFile, { persistent: true }, (eventType) => {
    if (eventType === 'change') {
            console.log('issues.json changed, queueing broadcast...');

            // Clear the previous timeout if a new change event comes in
            clearTimeout(debounceTimeout);

            // Set a new timeout
            debounceTimeout = setTimeout(() => {
                console.log('Debounce timer elapsed, now broadcasting.');
                broadcastIssues();
            }, 150); // Increased delay slightly for more stability
    }
  });

  console.log('File watcher started for:', issuesFile);
}

// Initial broadcast and start watching
setTimeout(() => {
  broadcastIssues();
  startFileWatcher();
}, 1000);

// Enhanced graceful shutdown handling
let shuttingDown = false;

function gracefulShutdown(signal) {
  if (shuttingDown) {
    console.log(`[SHUTDOWN] Already shutting down, ignoring ${signal}`);
    return;
  }

  shuttingDown = true;
  console.log(`[SHUTDOWN] 🛑 Received ${signal}, shutting down gracefully...`);

  // Stop file watcher
  if (fileWatcher) {
    console.log('[SHUTDOWN] 📁 Closing file watcher...');
    fileWatcher.close();
  }

  // Close WebSocket connections
  console.log('[SHUTDOWN] 📡 Closing WebSocket connections...');
  clients.forEach(client => {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Server shutdown');
      }
    } catch (err) {
      console.error('[SHUTDOWN] Error closing WebSocket client:', err);
    }
  });
  clients.clear();

  // Close WebSocket server
  if (wss) {
    console.log('[SHUTDOWN] 🔌 Closing WebSocket server...');
    wss.close(() => {
      console.log('[SHUTDOWN] ✅ WebSocket server closed');
    });
  }

  // Close HTTP server
  console.log('[SHUTDOWN] 🌐 Closing HTTP server...');
  server.close((err) => {
    if (err) {
      console.error('[SHUTDOWN] ❌ Error closing server:', err);
      process.exit(1);
    }
    console.log('[SHUTDOWN] ✅ HTTP server closed');
    console.log('[SHUTDOWN] 🎯 Graceful shutdown complete');
    process.exit(0);
  });

  // Force exit after 3 seconds if graceful shutdown fails
  setTimeout(() => {
    console.log('[SHUTDOWN] ⏰ Force exit after timeout');
    process.exit(1);
  }, 3000);
}

// Handle multiple SIGINT (Ctrl+C) presses with proper shutdown
let ctrlCCount = 0;
process.on('SIGINT', () => {
  ctrlCCount++;
  if (ctrlCCount === 1) {
    gracefulShutdown('SIGINT (Ctrl+C)');
  } else if (ctrlCCount >= 2) {
    console.log('[SHUTDOWN] 💥 Multiple Ctrl+C detected, forcing immediate exit');
    process.exit(1);
  }
});

// Handle other shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2 (nodemon)')); // nodemon restart

// Handle uncaught exceptions and prevent hanging
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
    console.log(`API endpoint: http://localhost:${PORT}/api/comment`);
  console.log(`Monitoring: ${issuesFile}`);
});
