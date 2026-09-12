<div align="center">
  <img src="./public/favicon.svg" width="120" alt="JSONLens Logo" />
  <h1>{ JSONLens }</h1>
  <p><strong>A God-Tier JSON Explorer, Debugger, and Visualizer.</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=for-the-badge&logo=vue.js" alt="Vue.js" />
    <img src="https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/Vanilla_CSS-UI-ff6d00?style=for-the-badge&logo=css3" alt="Vanilla CSS" />
  </p>
</div>

---

JSONLens is a premium, high-performance web tool engineered for developers who work with complex, deeply nested JSON payloads. It goes far beyond `JSON.parse()`, offering a custom-built parsing engine that pinpoints syntax errors perfectly, auto-sanitizes garbage characters from rich-text editors, and visually maps out your data architectures.

## ✨ God-Tier Features

### 🛡️ Bulletproof JSON Parser
Stop dealing with V8's cryptic `SyntaxError: Unexpected token u in JSON at position 1024`. 
Our from-scratch recursive-descent engine offers:
- **Structural Error Pinpointing**: Gives exact Line, Column, and JSON Path (e.g. `$.payload.users[3].id`) for the syntax failure.
- **Auto-Sanitizer**: Silently fixes common copy-paste errors before parsing:
  - Non-breaking spaces (NBSP) & Zero-width characters
  - Smart Quotes (curly quotes `“”`)
  - Trailing commas `[1, 2, 3,]`
  - JavaScript comments (`//` and `/* */`)

### 🎨 State-of-the-Art Visualizers
Explore your data across three dedicated views:
- **Tree View**: A classic, highly-optimized collapsable explorer. Click any node to instantly view its exact JavaScript accessor path.
- **Flowchart View**: A node-based dependency graph visualizing the hierarchy of your data. Supports trackpad pinch-to-zoom (just like Figma) and infinite panning.
- **Console**: Write raw JavaScript to evaluate and manipulate the parsed data in real-time.

### 📐 Adaptive Layout Engine
Built for both ultra-wide monitors and cramped laptop screens:
- **Split Mode**: Classic IDE feel with an adjustable drag gutter. Hide the input panel completely to focus on visualizing.
- **Tab Mode**: Maximizes vertical screen real-estate by switching to a modern tabbed interface.
- *Zero state-loss*: Switching layouts preserves all your zoomed views, scroll positions, and expanded nodes seamlessly.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/jsonlens.git
cd jsonlens
```

2. Install dependencies
```bash
npm install
```

3. Spin up the development server
```bash
npm run dev
```

4. Build for production
```bash
npm run build
```
*Outputs a heavily optimized, lightweight bundle to the `/dist` directory.*

## 🛠 Tech Stack
- **Framework**: Vue 3 (Composition API, `<script setup>`)
- **Build Tool**: Vite
- **Styling**: Vanilla CSS (CSS Variables, Flexbox/Grid, Glassmorphism)
- **Icons**: Custom SVGs & Lucide

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! 
Feel free to check [issues page](https://github.com/your-username/jsonlens/issues) if you want to contribute.

## 📝 License
This project is [MIT](https://opensource.org/licenses/MIT) licensed.
