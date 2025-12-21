---
trigger: always_on
---

trigger: always_on
---

# AGI Code Extension - Windsurf Rules
# Place this file in: C:\Users\user\Desktop\AGI\AGI-Enterprise-v1.0.0\agi-code\.windsurfrules

## PROJECT IDENTITY

You are working on AGI Code, a CMMC-compliant VS Code extension for air-gapped defense contractor environments. This is enterprise software for government clients, not a hobby project.

**Owner:** AirGapped Intelligence Corp
**Product:** AGI Enterprise Platform - VS Code Extension Component
**Compliance:** CMMC Level 2 (CUI handling)
**Network:** ZERO external network calls. Localhost only (Ollama at 127.0.0.1:11434)

---

## CRITICAL CONSTRAINTS

### ABSOLUTE RULES - NEVER VIOLATE

1. **NO EXTERNAL NETWORK CALLS**
   - Never use fetch(), axios, or http/https to external URLs
   - Only localhost:11434 (Ollama) is permitted
   - No CDNs, no external APIs, no telemetry
   - Grep test: `grep -r "https://" src/` must return ZERO results except comments

2. **NO CHINESE-ORIGIN MODELS**
   - Do not reference: Qwen, DeepSeek, Yi, Baichuan, ChatGLM, InternLM
   - Approved models only: GPT-OSS, Llama, Phi, Mistral, Nomic, CodeLlama

3. **AUDIT EVERYTHING**
   - Every user action must be logged via AuditLogger
   - Every AI inference must be logged
   - Every error must be logged
   - No silent failures

4. **CUI DETECTION BEFORE SEND**
   - All user prompts must pass through CUIDetector.scanAndWarn() before sending to Ollama
   - User must confirm if CUI patterns detected

---

## ARCHITECTURE PATTERNS

### File Organization
```
agi-code/
├── src/
│   ├── extension/          # VS Code extension entry point
│   │   └── extension.ts    # activate(), deactivate(), command registration
│   ├── providers/          # Service layer
│   │   ├── OllamaProvider.ts    # Ollama API client
│   │   ├── ModelManager.ts      # Model switching, metadata
│   │   └── RAGProvider.ts       # Document embeddings (if used)
│   ├── compliance/         # CMMC compliance layer
│   │   ├── AuditLogger.ts       # SHA-256 hash chain logging
│   │   └── CUIDetector.ts       # Sensitive data detection
│   ├── models/             # Data structures
│   │   └── ChatSession.ts       # Session management
│   └── webview/            # Webview provider
│       └── ChatViewProvider.ts  # WebviewViewProvider implementation
├── media/                  # Webview assets (HTML/CSS/JS)
│   ├── chat.html
│   ├── chat.css
│   └── chat.js
├── resources/              # Static assets
│   └── agi-icon.svg
├── package.json            # Extension manifest
└── tsconfig.json
```

### Dependency Injection Pattern
All providers receive dependencies through constructor:
```typescript
// CORRECT
constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly ollamaProvider: OllamaProvider,
    private readonly auditLogger: AuditLogger
) {}

// WRONG - No singletons, no global state
const logger = AuditLogger.getInstance(); // NEVER
```

### Initialization Order
```typescript
// In extension.ts activate():
1. AuditLogger (first - everything logs to it)
2. OllamaProvider
3. ModelManager (depends on OllamaProvider)
4. CUIDetector
5. ChatSessionManager
6. ChatViewProvider (depends on all above)
7. Command registrations
8. Status bar
```

---

## MESSAGE PASSING CONTRACT

### Webview → Extension Messages (chat.js → ChatViewProvider.ts)

Every message MUST follow this structure:
```typescript
interface WebviewMessage {
    type: string;      // Message identifier
    payload?: any;     // Optional data
    requestId?: string; // For request/response correlation
}
```

**Required Message Types:**
| Type | Payload | Handler Must |
|------|---------|--------------|
| 'sendMessage' | { text: string, model?: string } | Call OllamaProvider, stream response |
| 'switchModel' | { model: string } | Update ModelManager, confirm |
| 'newSession' | {} | Create session, clear UI |
| 'switchSession' | { sessionId: string } | Load session, update UI |
| 'deleteSession' | { sessionId: string } | Delete, switch to another |
| 'getModels' | {} | Return model list |
| 'getSessions' | {} | Return session list |
| 'copyChat' | {} | Copy to clipboard |
| 'exportChat' | { format: 'md' | 'json' } | Save to file |
| 'clearChat' | {} | Clear current session |
| 'addContextFile' | { path: string } | Add file to context |
| 'removeContextFile' | { path: string } | Remove from context |

### Extension → Webview Messages (ChatViewProvider.ts → chat.js)

| Type | Payload | Purpose |
|------|---------|---------|
| 'streamStart' | { model: string } | Response starting |
| 'streamToken' | { token: string } | Incremental token |
| 'streamEnd' | { } | Response complete |
| 'streamError' | { error: string } | Error occurred |
| 'modelsLoaded' | { models: Model[] } | Model list |
| 'sessionsLoaded' | { sessions: Session[], active: string } | Session list |
| 'sessionSwitched' | { session: Session } | Session changed |
| 'toast' | { message: string, type: 'info'|'error'|'success' } | User notification |

### Message Handler Template
```typescript
// In ChatViewProvider.ts
webviewView.webview.onDidReceiveMessage(async (message) => {
    this.auditLogger.log('COMMAND', `Webview message: ${message.type}`, message.payload);
    
    switch (message.type) {
        case 'sendMessage':
            await this.handleSendMessage(message.payload);
            break;
        // ... all other cases
        default:
            this.auditLogger.log('WARNING', `Unknown message type: ${message.type}`);
    }
});
```

```javascript
// In chat.js
window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.type) {
        case 'streamToken':
            appendToken(message.payload.token);
            break;
        // ... all other cases
        default:
            console.warn('Unknown message type:', message.type);
    }
});
```

---

## CODE STYLE REQUIREMENTS

### TypeScript Standards
```typescript
// CORRECT - Explicit types, readonly where possible
private readonly auditLogger: AuditLogger;
private currentModel: string = 'agi-reason';

// WRONG - Implicit any, missing modifiers
private logger;
currentModel = 'agi-reason';
```

### Error Handling Pattern
```typescript
// CORRECT - Every async function has try-catch
async sendMessage(prompt: string): Promise<void> {
    try {
        // CUI check first
        const safe = await this.cuiDetector.scanAndWarn(prompt);
        if (!safe) {
            this.auditLogger.log('SECURITY', 'User cancelled CUI warning');
            return;
        }
        
        // Main logic
        const response = await this.ollamaProvider.chat(prompt);
        this.auditLogger.log('INFERENCE', 'Chat completed', { model: this.currentModel });
        
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        this.auditLogger.log('ERROR', `sendMessage failed: ${msg}`);
        vscode.window.showErrorMessage(`AGI Error: ${msg}`);
        this.postMessage({ type: 'streamError', payload: { error: msg } });
    }
}

// WRONG - No error handling
async sendMessage(prompt: string): Promise<void> {
    const response = await this.ollamaProvider.chat(prompt);
}
```

### Null Safety
```typescript
// CORRECT - Null checks before use
const editor = vscode.window.activeTextEditor;
if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
}
const selection = editor.document.getText(editor.selection);

// WRONG - Assume existence
const selection = vscode.window.activeTextEditor.document.getText();
```

### Async/Await
```typescript
// CORRECT - Always await async operations
await this.ollamaProvider.initialize();
await this.sessionManager.loadSessions();

// WRONG - Fire and forget
this.ollamaProvider.initialize();
this.sessionManager.loadSessions();
```

---

## WEBVIEW REQUIREMENTS

### Security Headers (chat.html)
```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'none';
    style-src ${webview.cspSource} 'unsafe-inline';
    script-src ${webview.cspSource} 'unsafe-inline';
    font-src ${webview.cspSource};
    img-src ${webview.cspSource} data:;
">
```

### Resource Loading
```typescript
// CORRECT - Use webview.asWebviewUri()
const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(this.extensionUri, 'media', 'chat.js')
);

// WRONG - Hardcoded paths
const scriptUri = './media/chat.js';
```

### VsCodeApi Usage
```javascript
// CORRECT - Acquire once at top of file
const vscode = acquireVsCodeApi();

// Use for messaging
vscode.postMessage({ type: 'sendMessage', payload: { text: input } });

// Use for state
vscode.setState({ messages: messages });
const state = vscode.getState() || { messages: [] };

// WRONG - Acquire multiple times
function send() {
    const vscode = acquireVsCodeApi(); // BREAKS
    vscode.postMessage(...);
}
```

### DOM Binding Pattern
```javascript
// CORRECT - Verify element exists
const submitBtn = document.getElementById('submit-btn');
if (submitBtn) {
    submitBtn.addEventListener('click', handleSubmit);
}

// CORRECT - Use DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
});

// WRONG - Assume elements exist
document.getElementById('submit-btn').addEventListener('click', handleSubmit);
```

### Theme Compatibility
```css
/* CORRECT - Use VS Code CSS variables */
.chat-container {
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    border: 1px solid var(--vscode-panel-border);
}

/* WRONG - Hardcoded colors */
.chat-container {
    background-color: #1e1e1e;
    color: #ffffff;
}
```

---

## AUDIT LOGGING REQUIREMENTS

### Log Categories
```typescript
type AuditCategory = 
    | 'SYSTEM'      // Extension lifecycle
    | 'COMMAND'     // User commands and actions
    | 'INFERENCE'   // AI model interactions
    | 'SECURITY'    // CUI detection, access control
    | 'ERROR'       // Errors and exceptions
    | 'WARNING';    // Non-critical issues
```

### Log Entry Structure
```typescript
interface AuditEntry {
    timestamp: string;      // ISO 8601
    category: AuditCategory;
    action: string;         // What happened
    metadata?: object;      // Additional context
    previousHash: string;   // SHA-256 of previous entry
    hash: string;           // SHA-256 of this entry
}
```

### Logging Requirements by Action
| Action | Category | Required Metadata |
|--------|----------|-------------------|
| Extension activated | SYSTEM | version |
| Extension deactivated | SYSTEM | - |
| Model switched | COMMAND | fromModel, toModel |
| Chat sent | INFERENCE | model, promptLength |
| Chat received | INFERENCE | model, responseLength, duration |
| CUI detected | SECURITY | patternType, userAction |
| Session created | COMMAND | sessionId |
| Session deleted | COMMAND | sessionId |
| Error occurred | ERROR | errorMessage, stack |

---

## TESTING REQUIREMENTS

### Every Feature Must Have
1. Success path test
2. Error path test
3. Edge case tests

### Test Naming Convention
```typescript
describe('ChatViewProvider', () => {
    describe('handleSendMessage', () => {
        it('should stream response to webview on success', async () => {});
        it('should show error when Ollama not running', async () => {});
        it('should block send when CUI detected and user cancels', async () => {});
        it('should handle empty message gracefully', async () => {});
    });
});
```

---

## COMMON MISTAKES TO AVOID

### 1. Message Type Mismatch
```javascript
// chat.js sends:
vscode.postMessage({ type: 'send-message' }); // kebab-case

// ChatViewProvider.ts expects:
case 'sendMessage': // camelCase - MISMATCH!
```
**Rule:** Use camelCase for all message types.

### 2. Missing await
```typescript
// WRONG - Race condition
this.ollamaProvider.initialize();
const models = this.ollamaProvider.listModels(); // May fail!

// CORRECT
await this.ollamaProvider.initialize();
const models = await this.ollamaProvider.listModels();
```

### 3. Webview Not Ready
```typescript
// WRONG - Webview might not exist yet
this.webview.postMessage({ type: 'init' });

// CORRECT - Check first
if (this.webviewView?.webview) {
    this.webviewView.webview.postMessage({ type: 'init' });
}
```

### 4. Hardcoded Localhost
```typescript
// WRONG - Not configurable
const OLLAMA_URL = 'http://localhost:11434';

// CORRECT - Use configuration
const config = vscode.workspace.getConfiguration('agi');
const ollamaUrl = config.get<string>('ollamaEndpoint', 'http://127.0.0.1:11434');
```

### 5. Silent Failures
```typescript
// WRONG - User has no idea what happened
catch (error) {
    console.error(error);
}

// CORRECT - Inform user and log
catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    this.auditLogger.log('ERROR', msg);
    vscode.window.showErrorMessage(`AGI Error: ${msg}`);
}
```

---

## BEFORE EVERY COMMIT

Run this checklist:

```bash
# 1. TypeScript compiles clean
npm run compile

# 2. No external network calls
grep -r "https://" src/ --include="*.ts" | grep -v "// " | grep -v localhost

# 3. All message types matched
# (manual check - compare chat.js postMessage types to ChatViewProvider cases)

# 4. No console.log in production code
grep -r "console.log" src/ --include="*.ts"

# 5. All async functions have try-catch
# (manual check)

# 6. Package builds
npm run package
```

---

## PROMPT TEMPLATES FOR WINDSURF

When asking Windsurf to generate code, use these templates:

### New Feature
```
Add [FEATURE] to AGI Code extension.

Requirements:
- Follow message passing contract in .windsurfrules
- Add audit logging for all actions
- Include error handling with user feedback
- Use VS Code theme variables for any UI
- No external network calls

Files to modify:
- [list specific files]

Test by:
- [specific test steps]
```

### Bug Fix
```
Fix: [DESCRIPTION]

Current behavior: [what happens now]
Expected behavior: [what should happen]

Likely cause: [your hypothesis]

Rules:
- Do not change working functionality
- Add audit logging if missing
- Add error handling if missing
- Test fix does not break other features
```

### Refactor
```
Refactor [COMPONENT] for [REASON].

Keep:
- All existing functionality
- Message type contracts
- Audit logging

Improve:
- [specific improvements]

Do not:
- Change file locations without updating imports
- Remove error handling
- Break message passing contract
```

---

## REFERENCE: VS CODE API PATTERNS

### Command Registration
```typescript
context.subscriptions.push(
    vscode.commands.registerCommand('agi.commandName', async () => {
        auditLogger.log('COMMAND', 'agi.commandName executed');
        // handler logic
    })
);
```

### Configuration Access
```typescript
const config = vscode.workspace.getConfiguration('agi');
const value = config.get<string>('settingName', 'defaultValue');
```

### User Prompts
```typescript
// Information
vscode.window.showInformationMessage('Success!');

// Warning
vscode.window.showWarningMessage('Check this...');

// Error
vscode.window.showErrorMessage('Failed: ' + reason);

// With actions
const action = await vscode.window.showWarningMessage(
    'CUI detected. Send anyway?',
    'Send', 'Cancel'
);
if (action === 'Send') { /* proceed */ }
```

### Editor Access
```typescript
const editor = vscode.window.activeTextEditor;
if (!editor) return;

const document = editor.document;
const selection = editor.selection;
const selectedText = document.getText(selection);
const fullText = document.getText();
const language = document.languageId;
const fileName = document.fileName;
```

---

*This ruleset is the law. Follow it and the extension works. Deviate and it breaks.*
