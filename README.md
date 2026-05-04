<div align="center">

<!-- Animated Header Banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=200&section=header&text=AI%20Chat%20Bot&fontSize=60&fontColor=fff&animation=twinkling&fontAlignY=35&desc=Advanced%20GPT-4o%20Powered%20Conversational%20AI&descAlignY=55&descSize=18" width="100%"/>



<!-- Badges Row 1 -->
<p>
  <img src="https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-5.3-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/OpenAI-GPT--4o-10A37F?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI"/>
  <img src="https://img.shields.io/badge/JavaScript-ES2024-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript"/>
</p>

<!-- Badges Row 2 -->
<p>
  <img src="https://img.shields.io/github/stars/Aranya2801/AI-Chat-Bot?style=for-the-badge&color=818cf8&labelColor=1a1a2e" alt="Stars"/>
  <img src="https://img.shields.io/github/forks/Aranya2801/AI-Chat-Bot?style=for-the-badge&color=818cf8&labelColor=1a1a2e" alt="Forks"/>
  <img src="https://img.shields.io/github/issues/Aranya2801/AI-Chat-Bot?style=for-the-badge&color=f59e0b&labelColor=1a1a2e" alt="Issues"/>
  <img src="https://img.shields.io/github/license/Aranya2801/AI-Chat-Bot?style=for-the-badge&color=10b981&labelColor=1a1a2e" alt="License"/>
  <img src="https://img.shields.io/badge/PRs-Welcome-6366f1?style=for-the-badge&labelColor=1a1a2e" alt="PRs Welcome"/>
</p>

<!-- Badges Row 3 -->
<p>
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node"/>
  <img src="https://img.shields.io/badge/Deployed_on-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel"/>
  <img src="https://img.shields.io/badge/CI/CD-GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white" alt="CI/CD"/>
  <img src="https://img.shields.io/badge/Streaming-Real--time-ec4899?style=for-the-badge" alt="Streaming"/>
</p>

<br/>

<!-- Demo GIF placeholder — replace with your actual screen recording -->
<img src="https://raw.githubusercontent.com/Aranya2801/AI-Chat-Bot/main/docs/demo.gif" alt="AI Chat Bot Demo" width="80%" style="border-radius:12px; border: 2px solid #6366f1"/>

</div>

---

## 🌟 What is AI Chat Bot?

**AI Chat Bot** is a production-grade, open-source conversational AI interface built with React and powered by OpenAI's GPT-4o. It delivers real-time streaming responses, supports multiple AI models, saves your full conversation history, and renders rich Markdown with syntax-highlighted code — all wrapped in a stunning dark/light adaptive UI.

> Designed for **daily use** — fast, beautiful, and fully yours.

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🧠 AI & Intelligence
- **GPT-4o / GPT-4 Turbo / GPT-3.5** support
- Real-time **streaming responses** (SSE)
- Configurable **system prompt** for custom personas
- Adjustable **temperature & max tokens**
- Smart **auto-title generation** for chats

</td>
<td width="50%">

### 🎨 Interface & UX
- Stunning **dark & light theme** with smooth transitions
- **Animated welcome screen** with feature cards
- **Typing indicator** with bouncing dots
- **Markdown rendering** with GFM support
- **Syntax highlighting** for 100+ languages

</td>
</tr>
<tr>
<td width="50%">

### 💬 Chat Management
- **Unlimited conversations** stored locally
- **Date-grouped** sidebar (Today / Yesterday / This Week)
- One-click **delete conversations**
- **Copy message** button on hover
- Keyboard shortcut: **Enter** to send, **Shift+Enter** for newline

</td>
<td width="50%">

### ⚡ Performance & DevX
- **Vite** — blazing fast HMR and build
- **CI/CD** via GitHub Actions → GitHub Pages
- Zero-config **one-click deploy** to Vercel
- Clean **component architecture** with Context API
- **ESLint + Prettier** for code quality

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | ≥ 20.x |
| npm | ≥ 9.x |
| OpenAI API Key | [Get one here →](https://platform.openai.com/api-keys) |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Aranya2801/AI-Chat-Bot.git
cd AI-Chat-Bot

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Open .env and add your OpenAI API key

# 4. Start the development server
npm run dev
```

Open **http://localhost:3000** and start chatting! 🎉

---

## 🔑 Configuration

Edit your `.env` file:

```env
# Required — your OpenAI API key
VITE_OPENAI_API_KEY=sk-your-api-key-here

# Optional — use any OpenAI-compatible API endpoint
VITE_API_BASE_URL=https://api.openai.com/v1
```

> ⚠️ **Security**: Never commit your `.env` file. It's already in `.gitignore`.

---

## 🏗️ Project Architecture

```
AI-Chat-Bot/
├── 📁 .github/
│   ├── 📁 workflows/
│   │   └── ci.yml              # CI/CD — build, lint, deploy
│   └── 📁 ISSUE_TEMPLATE/      # Bug & feature templates
│
├── 📁 src/
│   ├── 📁 api/
│   │   └── chatApi.js          # OpenAI streaming API layer
│   │
│   ├── 📁 components/
│   │   ├── Header.jsx          # Top navbar with model switcher
│   │   ├── Sidebar.jsx         # Conversation history panel
│   │   ├── ChatWindow.jsx      # Main chat view
│   │   ├── Message.jsx         # Individual message (Markdown + copy)
│   │   ├── InputBar.jsx        # Smart input with suggestions
│   │   └── WelcomeScreen.jsx   # Animated landing screen
│   │
│   ├── 📁 context/
│   │   ├── ChatContext.jsx     # Global chat state (useReducer)
│   │   └── ThemeContext.jsx    # Dark/light theme
│   │
│   ├── 📁 styles/
│   │   └── globals.css         # Full design system with CSS vars
│   │
│   ├── App.jsx                 # Root component
│   └── main.jsx                # React entry point
│
├── .env.example                # Environment template
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
├── CONTRIBUTING.md
└── LICENSE
```

---

## 🔄 How Streaming Works

```
User types message → InputBar
        ↓
ChatContext.submitMessage()
        ↓
chatApi.sendMessage() — POST /v1/chat/completions (stream: true)
        ↓
Server-Sent Events stream opens
        ↓
data: {"choices":[{"delta":{"content":"Hello"}}]}  ← token by token
        ↓
onChunk(accumulated) → UPDATE_LAST_MESSAGE action
        ↓
React re-renders Message component in real-time
        ↓
Stream ends with data: [DONE]
```

---

## 🎨 Tech Stack

<div align="center">

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 | UI framework with hooks |
| **Build Tool** | Vite 5 | Dev server & bundler |
| **State** | useReducer + Context | Global chat state |
| **Styling** | Pure CSS + Variables | Theming system |
| **Markdown** | marked.js | Parsing & rendering |
| **Syntax** | highlight.js | Code highlighting |
| **AI API** | OpenAI / Compatible | GPT-4o streaming |
| **Deploy** | GitHub Actions | CI/CD pipeline |
| **Hosting** | Vercel / GitHub Pages | Static hosting |

</div>

---

## 🌐 Deploy in 1 Click

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Aranya2801/AI-Chat-Bot&env=VITE_OPENAI_API_KEY&envDescription=Your%20OpenAI%20API%20key&project-name=ai-chat-bot)

> Add `VITE_OPENAI_API_KEY` in Vercel's environment variables.

### GitHub Pages

The CI/CD workflow auto-deploys to GitHub Pages on every push to `main`.

Enable it: **Settings → Pages → Source → GitHub Actions**

---

## 🛠️ Available Scripts

```bash
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
npm run lint       # Lint with ESLint
npm run format     # Format with Prettier
```

---

## 🤝 Contributing

Contributions are warmly welcomed! Here's how:

1. 🍴 **Fork** the repo
2. 🌿 **Create** a branch: `git checkout -b feat/amazing-feature`
3. 💾 **Commit**: `git commit -m "feat: add amazing feature"`
4. 📤 **Push**: `git push origin feat/amazing-feature`
5. 🔃 **Open a Pull Request**

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for full guidelines.

---

## 🗺️ Roadmap

- [x] Real-time streaming responses
- [x] Multi-model selector (GPT-4o, GPT-4, GPT-3.5)
- [x] Dark / light theme
- [x] Markdown + code syntax highlighting
- [x] Conversation history with sidebar
- [x] CI/CD with GitHub Actions
- [ ] 🔜 File & image upload (multimodal)
- [ ] 🔜 Voice input (Whisper API)
- [ ] 🔜 Chat export (PDF / Markdown)
- [ ] 🔜 Prompt library & templates
- [ ] 🔜 Plugin / MCP tool support
- [ ] 🔜 Local LLM support (Ollama)
- [ ] 🔜 Mobile app (React Native)

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgements

- [OpenAI](https://openai.com) for the GPT-4o API
- [Vercel AI SDK](https://sdk.vercel.ai) for streaming inspiration
- [marked.js](https://marked.js.org) for Markdown rendering
- [highlight.js](https://highlightjs.org) for syntax highlighting
- [Shields.io](https://shields.io) for beautiful badges
- [Capsule Render](https://github.com/kyechan99/capsule-render) for the animated header

---

<div align="center">

<!-- Profile Links -->
<a href="https://github.com/Aranya2801">
  <img src="https://img.shields.io/badge/Built_by-Aranya2801-6366f1?style=for-the-badge&logo=github&logoColor=white" alt="Built by Aranya2801"/>
</a>

<br/><br/>

<!-- Animated Footer -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=120&section=footer&animation=twinkling" width="100%"/>

</div>
