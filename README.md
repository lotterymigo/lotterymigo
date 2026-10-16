# 🎰 LotteryMigo

> **Official Live Domain:** [lotterymigo.com](https://lotterymigo.com)  
> Interactive statistical probability engine, 10-year historical draw archive, and smart number generator for **Powerball** and **Mega Millions**.

---

## 📌 Features

- **Dual-Game Architecture:** Instant switching between Powerball (1–69 + PB 1–26) and Mega Millions (1–70 + MB 1–25).
- **Physics Ball Hopper:** Canvas-driven blower chamber. Ball motion follows the system reduced-motion setting and can be paused. The site does not play sound or confetti.
- **Interactive Scratch-Off Cards:** Several free themes. About 1 in 4 cards wins virtual points only; losses show a try-again message. No cash value.
- **Smart Combinatorial Ticket Generator:** Generates lines based on mathematical models (Harmonic 3/2 balance, Recent Frequency, Longest Gap Bias, and Quick Pick).
- **10-Year Historical Archive:** Instant searching, sorting, and CSV export for draws from 2016 through 2026.
- **Decennial Heatmap & Charting:** Visualizes high-frequency vs. dormant numbers using Chart.js.

---

## 🛠️ Tech Stack

- **Frontend:** Semantic HTML5, Tailwind CSS (via CDN)
- **Visuals & Charts:** Chart.js and HTML5 Canvas 2D physics. Text size, high contrast, and motion choices are stored in the browser.
- **Icons:** Lucide Icons
- **Deployment & Hosting:** Vercel / GitHub Continuous Deployment
- **DNS / Domain:** GoDaddy (`lotterymigo.com`)

---

## Native app shell

`package.json` and `capacitor.config.json` wrap this site with Capacitor (`com.lotterymigo.app`). The app is **not store-ready**. See [docs/APP_STORE_GUIDE.md](docs/APP_STORE_GUIDE.md) for the manual account, signing, policy, and submission steps that are still required.

`npm run build:web` copies the pages, `assets/`, and `data/draws.json` into `www/` so the app can open the draw list without a network. On a phone it still tries the hosted file and keeps the newer copy.

## 💻 Running Locally on Windows

You do not need a complex build pipeline or Node.js environment to test this on Windows.

### Method 1: Double-Click (Fastest)
1. Download or clone this repository to your Windows machine (e.g., `C:\Users\YourName\lotterymigo`).
2. Double-click **`index.html`**.
3. It will open immediately in Microsoft Edge, Google Chrome, or your default browser.

### Method 2: Local Static Server (PowerShell / Command Prompt)

If you have Python installed on Windows:
```powershell
# Open PowerShell in the project folder and run:
python -m http.server 3000
```

Opening `index.html` as a file still loads the page. Some browsers block `data/draws.json` from a `file://` address, and the page then uses its built-in sample archive. Use the local server, or the hosted site, when you want the NY Open Data draws.

## Official draw archive

Winning numbers live in `data/draws.json`. `scripts/fetch-draws.mjs` downloads them from the NY Open Data Socrata API:

- Powerball: dataset [`d6yy-54nr`](https://data.ny.gov/d/d6yy-54nr)
- Mega Millions: dataset [`5xaw-6ayf`](https://data.ny.gov/d/5xaw-6ayf)

`.github/workflows/update-draws.yml` runs Tuesday, Thursday, and Sunday at 12:00 UTC, after draw nights, and can also be started by hand. It commits `data/draws.json` only when the draws changed so the host can redeploy.
