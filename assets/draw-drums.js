/* Decorative Powerball and Mega Millions blowers. Not a draw and not a pick.
   Motion follows html.lm-motion-off / lm-motion-on and prefers-reduced-motion,
   the same switch as the bouncing balls (lotterymigo_motion). */
const DRUMS = {
  powerball: {
    whites: [7, 12, 21, 28, 36, 44, 61],
    special: 14,
    rim: "#e11d3a",
    rim2: "#7a0c1e"
  },
  megamillions: {
    whites: [3, 10, 19, 22, 33, 48, 64],
    special: 12,
    rim: "#ffc107",
    rim2: "#1d4ed8"
  }
};

function motionOn() {
  const root = document.documentElement;
  if (root.classList.contains("lm-motion-off")) return false;
  if (root.classList.contains("lm-motion-on")) return true;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function contrastOn() {
  return document.documentElement.classList.contains("lm-contrast");
}

function makeBalls(spec) {
  const balls = spec.whites.map((n, i) => ({
    n,
    special: false,
    base: (i / (spec.whites.length + 1)) * Math.PI * 2,
    rx: 0.34 + (i % 3) * 0.2,
    ry: 0.26 + ((i + 1) % 3) * 0.16,
    dir: i % 2 === 0 ? 1 : -1,
    speed: 0.22 + (i % 4) * 0.05
  }));
  balls.push({
    n: spec.special,
    special: true,
    base: 0.4,
    rx: 0.18,
    ry: 0.22,
    dir: 1,
    speed: 0.28
  });
  return balls;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function paint(canvas, spec, balls, time, moving) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (cssW < 2 || cssH < 2) return;
  const pxW = Math.round(cssW * dpr);
  const pxH = Math.round(cssH * dpr);
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }
  const ctx = canvas.getContext("2d");
  const hi = contrastOn();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = hi ? "#000000" : "#070908";
  ctx.fillRect(0, 0, cssW, cssH);

  const cx = cssW * 0.5;
  const cy = cssH * 0.46;
  const chamber = Math.min(cssW, cssH) * 0.34;

  ctx.fillStyle = hi ? "#000000" : "#10161c";
  roundRect(ctx, cx - chamber * 0.55, cy + chamber * 0.82, chamber * 1.1, chamber * 0.42, 10);
  ctx.fill();
  ctx.strokeStyle = hi ? "#ffffff" : spec.rim2;
  ctx.lineWidth = 3;
  ctx.stroke();

  const bowl = ctx.createRadialGradient(cx - chamber * 0.25, cy - chamber * 0.3, chamber * 0.1, cx, cy, chamber);
  bowl.addColorStop(0, hi ? "#1a1a1a" : "#243044");
  bowl.addColorStop(1, hi ? "#000000" : "#070908");
  ctx.beginPath();
  ctx.arc(cx, cy, chamber, 0, Math.PI * 2);
  ctx.fillStyle = bowl;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = hi ? "#ffffff" : spec.rim;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, chamber - 5, Math.PI * 1.15, Math.PI * 1.85);
  ctx.strokeStyle = hi ? "#ffe566" : "rgba(255,255,255,0.55)";
  ctx.lineWidth = 3;
  ctx.stroke();

  const placed = balls.map((ball) => {
    const spin = moving ? time * 0.00035 * ball.speed * ball.dir : 0;
    const ang = ball.base + spin;
    return {
      ball,
      x: cx + Math.cos(ang) * chamber * ball.rx,
      y: cy + Math.sin(ang) * chamber * ball.ry + chamber * 0.06
    };
  }).sort((a, b) => (a.ball.special ? 1 : 0) - (b.ball.special ? 1 : 0) || a.y - b.y);

  const radius = Math.max(11, chamber * 0.22);
  placed.forEach((item) => {
    const { ball, x, y } = item;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (ball.special && spec === DRUMS.powerball) ctx.fillStyle = hi ? "#ffd000" : "#9f1239";
    else if (ball.special) ctx.fillStyle = hi ? "#ffd000" : "#ffc107";
    else ctx.fillStyle = hi ? "#ffffff" : "#f4efe4";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = hi ? "#000000" : "rgba(0,0,0,0.35)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - radius * 0.28, y - radius * 0.32, radius * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fill();
    const ink = ball.special && !hi && spec === DRUMS.powerball ? "#ffffff" : "#1a1404";
    ctx.fillStyle = hi && ball.special ? "#000000" : ink;
    ctx.font = "700 " + Math.round(radius * 0.85) + "px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(ball.n), x, y + 1);
  });
}

function boot() {
  const figures = [...document.querySelectorAll(".lm-drum[data-drum]")];
  if (!figures.length) return;
  const units = figures.map((figure) => {
    const key = figure.getAttribute("data-drum");
    const spec = DRUMS[key];
    const canvas = figure.querySelector("canvas");
    if (!spec || !canvas) return null;
    return { spec, canvas, balls: makeBalls(spec) };
  }).filter(Boolean);
  const state = document.querySelector(".lm-drums-state");
  let raf = 0;
  let running = false;

  function frame(now) {
    raf = 0;
    const moving = motionOn() && document.visibilityState !== "hidden";
    units.forEach((unit) => paint(unit.canvas, unit.spec, unit.balls, moving ? now : 0, moving));
    if (state) state.textContent = moving ? "Moving slowly." : "Paused.";
    if (moving) raf = requestAnimationFrame(frame);
    else running = false;
  }

  function sync() {
    const moving = motionOn() && document.visibilityState !== "hidden";
    if (moving && !running) {
      running = true;
      raf = requestAnimationFrame(frame);
      return;
    }
    if (!moving) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      running = false;
      units.forEach((unit) => paint(unit.canvas, unit.spec, unit.balls, 0, false));
      if (state) state.textContent = "Paused.";
    }
  }

  const prior = window.lmSyncMotion;
  window.lmSyncMotion = function () {
    if (typeof prior === "function") prior();
    sync();
  };
  const watch = new MutationObserver(sync);
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (media.addEventListener) media.addEventListener("change", sync);
  else if (media.addListener) media.addListener(sync);
  document.addEventListener("visibilitychange", sync);
  if ("ResizeObserver" in window) {
    const resize = new ResizeObserver(sync);
    units.forEach((unit) => resize.observe(unit.canvas));
  }
  sync();
}

boot();
