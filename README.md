# MW3 - Meta Web 3.0 Ecosystem

A comprehensive Web3 business consultation platform featuring interactive mind maps for DAO, DeFi, Trading, and NFT business verticals, plus a **Profit** calendar (CoinGecko quotes, trade journal with local backup) and an **ART** media wall (YouTube / TikTok / X embeds).

## 🌐 Live Demo

[View Live Website](https://mwtre.github.io/BLmw3/)

## 🚀 Features

- **Interactive Mind Maps**: Explore DAO, DeFi, Trading, and NFT ecosystems
- **Profit calendar**: Day/week/month views, CoinGecko search, trades stored in the browser; export/import JSON backups
- **ART wall**: Paste video or post links; embeds load when scrolled into view; export/import feed JSON
- **Business-Focused Content**: Detailed use cases and pricing tiers
- **Responsive Design**: Optimized for desktop and mobile
- **Modern Tech Stack**: React + TypeScript + Vite + Tailwind CSS
- **Custom Animations**: Smooth transitions and hover effects
- **Custom Typography**: TechFont for futuristic aesthetic

## 🏗️ Tech Stack

- **Frontend**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.2
- **Styling**: Tailwind CSS 3.4.1
- **Icons**: Lucide React
- **Font**: Custom TechFont

## 📱 Sections

### 1. DAO (Decentralized Autonomous Organization)
- Governance systems and voting mechanisms
- Treasury management and token economics
- Community engagement and delegation
- Pricing: $0 - $20,000 packages

### 2. DeFi (Decentralized Finance)
- Lending protocols and yield farming
- DEX trading and liquidity provision
- Staking pools and risk management
- Pricing: $0 - $20,000 packages

### 3. Trading
- Business trading accounts with tax benefits
- Spot, futures, and options trading
- Portfolio management and analytics
- Pricing: $0 - $20,000 packages

### 4. NFT (Non-Fungible Tokens)
- Digital art creation and marketplace
- Digital products and utility NFTs
- Product certification and supply chain
- Pricing: $0 - $20,000 packages

### 5. Profit (calendar & journal)
- Calendar navigation with day / week / month lenses
- CoinGecko simple price lookup (cached requests)
- Open/closed trades with optional notes; P/L math for closed legs
- Data stays in `localStorage`; use **Export JSON** / **Import JSON** for backups
- **Chart screenshot**: optional OCR on a chart image to guess prices and tickers — confirm fields before saving (not true computer vision on drawings)

### 6. ART (media wall)
- Add YouTube, TikTok, or X (Twitter) links
- Embeds load lazily when near the viewport
- Feed persisted locally with JSON export/import

## 🛠️ Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
git clone https://github.com/mwtre/BLmw3.git
cd BLmw3
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Tests
```bash
npm test
```

### Preview Production Build
```bash
npm run preview
```

## 📦 Project Structure

```
src/
├── App.tsx                 # Main application component
├── components/
│   ├── DAOMindMap.tsx     # DAO interactive mind map
│   ├── DeFiMindMap.tsx    # DeFi interactive mind map
│   ├── TradeMindMap.tsx   # Trading interactive mind map
│   └── NFTMindMap.tsx     # NFT interactive mind map
├── index.css              # Global styles and custom font
└── main.tsx               # Application entry point
```

## 🎨 Design System

- **Color Scheme**: Black and white with subtle gray accents
- **Typography**: Custom TechFont for technical aesthetic
- **Layout**: Clean, minimalist design with bold geometric elements
- **Animations**: Smooth transitions, scale effects, and loading sequences

## 🚀 Deployment

This project is automatically deployed to GitHub Pages using GitHub Actions. Any push to the `main` branch will trigger a new deployment.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/mwtre/BLmw3/issues).

## 📞 Contact

- GitHub: [@mwtre](https://github.com/mwtre)
- Project Link: [https://github.com/mwtre/BLmw3](https://github.com/mwtre/BLmw3)

---

Built with ❤️ for the Web3 ecosystem
