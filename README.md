# 🎰 LotteryMigo

> **Official Live Domain:** [lotterymigo.com](https://lotterymigo.com)  
> Interactive statistical probability engine, 10-year historical draw archive, and smart number generator for **Powerball** and **Mega Millions**.

---

## 📌 Features

- **Dual-Game Architecture:** Instant switching between Powerball (1–69 + PB 1–26) and Mega Millions (1–70 + MB 1–25).
- **Physics Ball Hopper:** Canvas-driven blower chamber simulating bouncing ping-pong balls with real-time audio pops and picks.
- **Interactive Scratch-Off Card:** Real tactile silver foil scratching mini-game with instant match checks and prize feedback.
- **Smart Combinatorial Ticket Generator:** Generates lines based on mathematical models (Harmonic 3/2 balance, Hot Momentum, Overdue Due-Streaks, and Quick Pick).
- **10-Year Historical Archive:** Instant searching, sorting, and CSV export for draws from 2016 through 2026.
- **Decennial Heatmap & Charting:** Visualizes high-frequency vs. dormant numbers using Chart.js.

---

## 🛠️ Tech Stack

- **Frontend:** Semantic HTML5, Tailwind CSS (via CDN)
- **Visuals & Charts:** Chart.js, HTML5 Canvas 2D Physics, Canvas-Confetti
- **Icons:** Lucide Icons
- **Deployment & Hosting:** Vercel / GitHub Continuous Deployment
- **DNS / Domain:** GoDaddy (`lotterymigo.com`)

---

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
