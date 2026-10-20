/* ============================================================
   Accounts, virtual points, and saved picks
   ------------------------------------------------------------
   Reads window.LOTTERYMIGO_CONFIG from assets/site-config.js.
   If the Firebase values still contain YOUR_, nothing calls
   Google. Signed-out visitors keep the full free site.
   Scores written from the browser are not tamper-proof.
   ============================================================ */

const DISCLAIMER = "18+ (21+ where required). These selections do not guarantee any win. Results are informational only. LotteryMigo is not responsible for any win or loss. Always verify numbers with official lottery sources.";
const LOCAL_POINTS_KEY = "lotterymigo_local_points";
const FIREBASE_VERSION = "11.6.0";
const MAX_PICKS = 30;

const config = window.LOTTERYMIGO_CONFIG || {};
const firebaseConfig = config.firebase || {};

function isPlaceholder(value) {
  return !value || String(value).indexOf("YOUR_") !== -1;
}

function firebaseReady() {
  return ["apiKey", "authDomain", "projectId", "appId"].every((key) => !isPlaceholder(firebaseConfig[key]));
}

function tipReady() {
  const url = String(config.paypalTipUrl || "").trim();
  if (!url || url.indexOf("YOUR_PAYPAL_NAME") !== -1) return false;
  return /^https:\/\/(www\.)?paypal\.me\/[A-Za-z0-9._-]+$/i.test(url);
}

function boardsConfigured() {
  return config.firestoreEnabled === true;
}

function easternDay(date) {
  const zone = config.leaderboardTimeZone || "America/New_York";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date || new Date());
}

function readLocalPoints() {
  const n = parseInt(localStorage.getItem(LOCAL_POINTS_KEY) || "0", 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function writeLocalPoints(n) {
  localStorage.setItem(LOCAL_POINTS_KEY, String(Math.max(0, n)));
}

function isNativeApp() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

/* A desktop browser can use a popup. Phones and the Capacitor shell cannot. */
function prefersRedirect() {
  if (isNativeApp()) return true;
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch (err) {
    return false;
  }
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let auth = null;
let db = null;
let currentUser = null;
let profile = { showOnBoard: false, publicName: "", publicPhoto: "", points: 0, lastAwardAt: 0 };
let authTools = null;
let fsTools = null;
let signInMessage = "";
let boardSetupMessage = "";
let appliedUid = "";
let boardsOpen = boardsConfigured();

function $(id) {
  return document.getElementById(id);
}

function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

function show(id, on) {
  const el = $(id);
  if (el) el.classList.toggle("hidden", !on);
}

function firestoreBlocked(err) {
  const code = String((err && err.code) || "").toLowerCase();
  const message = String((err && err.message) || err || "");
  if (code === "permission-denied" || code === "unauthenticated" || code === "not-found") return true;
  return /SERVICE_DISABLED|PERMISSION_DENIED|Cloud Firestore API has not been used|database \(default\) does not exist/i.test(message);
}

function applyBoardChrome() {
  document.documentElement.classList.toggle("lm-boards-off", !boardsOpen);
  show("section-board", boardsOpen);
  show("saved-picks-panel", boardsOpen);
}

function hideBoards(err) {
  console.error("Leaderboard storage is hidden.", err && err.code ? err.code : err, err);
  boardsOpen = false;
  boardSetupMessage = "";
  applyBoardChrome();
  renderAccount();
}

function renderTip() {
  const wrap = $("tip-wrap");
  if (!wrap) return;
  if (!tipReady()) {
    wrap.classList.add("hidden");
    wrap.innerHTML = "";
    return;
  }
  wrap.classList.remove("hidden");
  wrap.innerHTML =
    '<a class="btn btn-gold" href="' + escapeHtml(config.paypalTipUrl) + '" rel="noopener noreferrer">Tip us</a>' +
    '<p class="lm-help">Voluntary tip through PayPal. It does not buy virtual points, lottery tickets, or a better chance of winning. LotteryMigo is not responsible for any win or loss.</p>';
}

function renderAccount() {
  const configured = firebaseReady();
  const native = isNativeApp();
  const signedIn = !!(currentUser && configured);
  setText("account-points", "Virtual points on this device: " + readLocalPoints().toLocaleString() + ". These points have no cash value.");
  show("btn-sign-out", signedIn);
  show("btn-delete-account", signedIn);
  show("delete-confirm", false);
  show("account-opt-in-wrap", signedIn && boardsOpen);
  const opt = $("account-opt-in");
  if (opt) opt.checked = !!profile.showOnBoard;

  const signIn = $("btn-sign-in");
  if (signIn) {
    signIn.disabled = !configured || signedIn;
    signIn.classList.toggle("hidden", signedIn);
    signIn.textContent = configured ? "Sign in with Google" : "Sign in with Google is not set up yet";
  }

  const avatar = $("account-avatar");
  if (!signedIn) {
    show("account-identity", false);
    if (avatar) {
      avatar.removeAttribute("src");
      avatar.classList.add("hidden");
    }
    setText("account-name", "");
    if (!configured) {
      setText("account-status", "You can use every tool on this page without an account.");
      setText("account-note", "Sign in with Google is not set up yet. The owner still needs to paste Firebase keys into assets/site-config.js. Scratch cards, the generator, history, and favorites on this device keep working.");
      return;
    }
    setText("account-status", native ? "You can use every tool in the app without an account." : "You are not signed in. The games still work.");
    if (signInMessage) {
      setText("account-note", signInMessage);
    } else if (!boardsOpen) {
      setText("account-note", native
        ? "Sign in with Google opens a full-page sign-in, because this app cannot use a popup."
        : prefersRedirect()
          ? "On a phone, Sign in with Google opens a full-page sign-in."
          : "Sign in with Google if you want this browser to remember you. The games still work either way.");
    } else if (native) {
      setText("account-note", "Sign in with Google opens a full-page sign-in, because this app cannot use a popup. If Google does not come back to the app, use the website or the native plugin in docs/FIREBASE_SETUP.md. Your name and photo stay off the board unless you opt in.");
    } else if (prefersRedirect()) {
      setText("account-note", "On a phone, Sign in with Google opens a full-page sign-in. Your Google name and photo stay off the board unless you opt in.");
    } else {
      setText("account-note", "Sign in to put virtual points on the board and to save picks with a draw date. Your Google name and photo stay off the board unless you opt in.");
    }
    return;
  }
  signInMessage = "";
  const name = String(currentUser.displayName || "").trim() || "Google account";
  setText("account-status", "Signed in as " + name + ".");
  setText("account-name", name);
  show("account-identity", true);
  const photo = safePhoto(currentUser.photoURL);
  if (avatar) {
    if (photo) {
      avatar.src = photo;
      avatar.classList.remove("hidden");
    } else {
      avatar.removeAttribute("src");
      avatar.classList.add("hidden");
    }
  }
  if (boardsOpen && boardSetupMessage) {
    setText("account-note", boardSetupMessage);
  } else if (boardsOpen) {
    setText("account-note", "Virtual points on your account: " + (profile.points || 0).toLocaleString() + ". They cannot be cashed out. Your name and photo stay off the leaderboard unless you opt in.");
  } else {
    setText("account-note", "You are signed in. Virtual points on this device cannot be cashed out.");
  }
}

function boardRow(entry) {
  const name = entry.showOnBoard && entry.publicName ? entry.publicName : "Anonymous player";
  const photoUrl = entry.showOnBoard ? safePhoto(entry.publicPhoto) : "";
  const photo = photoUrl
    ? '<img class="avatar" src="' + escapeHtml(photoUrl) + '" alt="" width="40" height="40" referrerpolicy="no-referrer" />'
    : "";
  return '<li class="board-row">' + photo + '<span>' + escapeHtml(name) + '</span><strong>' + Number(entry.points || 0).toLocaleString() + ' pts</strong></li>';
}

function renderBoards(daily, allTime, error) {
  if (!boardsOpen) return;
  const zone = config.leaderboardTimeZoneLabel || "US Eastern Time (America/New_York)";
  const banner = $("winner-banner");
  const dailyList = $("board-daily");
  const allList = $("board-all");
  if (!firebaseReady()) {
    if (banner) banner.textContent = "The daily board and the all-time board turn on after Firebase is connected. You can still play. " + zone + " will be the daily cutoff. Virtual points only. No cash prize.";
    if (dailyList) dailyList.innerHTML = "";
    if (allList) allList.innerHTML = "";
    return;
  }
  if (error) {
    if (banner) banner.textContent = error;
    return;
  }
  const today = easternDay();
  const winner = daily[0];
  if (banner) {
    if (!winner) {
      banner.textContent = "No winner of the day yet for " + today + " (" + zone + "). The day starts over at midnight Eastern. Virtual points only. No cash prize.";
    } else {
      const name = winner.showOnBoard && winner.publicName ? winner.publicName : "Anonymous player";
      const photoUrl = winner.showOnBoard ? safePhoto(winner.publicPhoto) : "";
      const photo = photoUrl
        ? '<img class="avatar" src="' + escapeHtml(photoUrl) + '" alt="" width="40" height="40" referrerpolicy="no-referrer" />'
        : "";
      banner.innerHTML = photo + "<span>Winner of the day (" + escapeHtml(today) + ", " + escapeHtml(zone) + "): " + escapeHtml(name) + " with " + Number(winner.points || 0).toLocaleString() + " virtual points. This is not a cash prize.</span>";
    }
  }
  if (dailyList) dailyList.innerHTML = daily.length ? daily.map(boardRow).join("") : "<li>No scores yet today.</li>";
  if (allList) allList.innerHTML = allTime.length ? allTime.map(boardRow).join("") : "<li>No all-time scores yet.</li>";
}

async function loadBoards() {
  if (!boardsOpen) return;
  if (!firebaseReady() || !db || !fsTools) {
    renderBoards([], [], "");
    return;
  }
  try {
    const day = easternDay();
    const dailyQuery = fsTools.query(
      fsTools.collection(db, "dailyScores"),
      fsTools.where("day", "==", day),
      fsTools.orderBy("points", "desc"),
      fsTools.limit(10)
    );
    const allQuery = fsTools.query(
      fsTools.collection(db, "users"),
      fsTools.orderBy("points", "desc"),
      fsTools.limit(10)
    );
    const [dailySnap, allSnap] = await Promise.all([fsTools.getDocs(dailyQuery), fsTools.getDocs(allQuery)]);
    renderBoards(dailySnap.docs.map((item) => item.data()), allSnap.docs.map((item) => item.data()), "");
  } catch (err) {
    if (firestoreBlocked(err)) {
      hideBoards(err);
      return;
    }
    console.warn("Leaderboard read failed.", err);
    renderBoards([], [], "The board could not load. If Firebase asks for an index, open the link in the browser console and create it. The steps are in docs/FIREBASE_SETUP.md.");
  }
}

function describeMatch(pick) {
  const lookup = window.lmLookupDraw;
  const draw = typeof lookup === "function" ? lookup(pick.game, pick.drawDate) : null;
  if (!draw) {
    return "No drawing for " + pick.drawDate + " is in the loaded list yet. Check again after the official numbers are posted. This is not a prediction.";
  }
  const mine = (pick.whites || []).map(Number);
  const theirs = (draw.whites || []).map(Number);
  const matched = mine.filter((n) => theirs.includes(n));
  const bonus = Number(pick.special) === Number(draw.special);
  const gameName = pick.game === "MEGAMILLIONS" ? "Mega Millions" : "Powerball";
  return gameName + " line in this file for " + draw.date + ": " + theirs.join(", ") + " and bonus " + draw.special + ". White balls matched: " + matched.length + " of 5" + (matched.length ? " (" + matched.join(", ") + ")" : "") + ". Bonus ball: " + (bonus ? "matched" : "not matched") + ".";
}

function renderPicks(picks, message) {
  const list = $("saved-picks-list");
  const status = $("pick-status");
  if (status && message) status.textContent = message;
  if (!list) return;
  if (!picks || !picks.length) {
    list.innerHTML = "<p class=\"muted\">No account picks yet.</p>";
    return;
  }
  list.innerHTML = picks.map((pick) => {
    const bought = pick.bought ? "Marked: I bought this ticket." : "Not marked as a purchased ticket.";
    return '<article class="panel stack">' +
      '<p><strong>' + escapeHtml(pick.game === "MEGAMILLIONS" ? "Mega Millions" : "Powerball") + '</strong> for ' + escapeHtml(pick.drawDate) + '</p>' +
      '<p>Numbers: ' + escapeHtml((pick.whites || []).join(", ")) + ' · bonus ' + escapeHtml(pick.special) + '</p>' +
      '<p>' + escapeHtml(bought) + '</p>' +
      '<p>' + escapeHtml(describeMatch(pick)) + '</p>' +
      '<p class="disclaimer">' + escapeHtml(DISCLAIMER) + '</p>' +
      '<button type="button" class="btn btn-quiet" data-delete-pick="' + escapeHtml(pick.id) + '">Remove this pick</button>' +
      '</article>';
  }).join("");
}

async function loadPicks(message) {
  if (!boardsOpen) return;
  if (!currentUser || !db || !fsTools) {
    const note = !firebaseReady()
      ? "Saving picks to an account needs Firebase. Favorite numbers on this device still work, and they do not guarantee a win."
      : "Sign in to save a pick with a draw date. Favorites on this device still work without an account.";
    renderPicks([], message || note);
    return;
  }
  const snap = await fsTools.getDocs(fsTools.collection(db, "users", currentUser.uid, "picks"));
  const picks = snap.docs.map((item) => Object.assign({ id: item.id }, item.data()));
  picks.sort((a, b) => String(b.drawDate).localeCompare(String(a.drawDate)));
  renderPicks(picks, message || "");
}

function safePhoto(value) {
  const photo = String(value || "").slice(0, 500);
  return photo.indexOf("https://") === 0 ? photo : "";
}

function publicFields() {
  const show = !!profile.showOnBoard;
  const person = currentUser || {};
  return {
    uid: currentUser.uid,
    showOnBoard: show,
    publicName: show ? String(person.displayName || "").slice(0, 40) : "",
    publicPhoto: show ? safePhoto(person.photoURL) : "",
    lastAwardAt: profile.lastAwardAt || Date.now()
  };
}

async function saveProfile(nextShow) {
  if (!boardsOpen || !currentUser || !db || !fsTools) return;
  profile.showOnBoard = !!nextShow;
  profile.publicName = profile.showOnBoard ? String(currentUser.displayName || "").slice(0, 40) : "";
  profile.publicPhoto = profile.showOnBoard ? safePhoto(currentUser.photoURL) : "";
  const payload = Object.assign({ points: profile.points || 0 }, publicFields());
  await fsTools.setDoc(fsTools.doc(db, "users", currentUser.uid), payload, { merge: true });
  const day = easternDay();
  const dailyRef = fsTools.doc(db, "dailyScores", day + "_" + currentUser.uid);
  const dailySnap = await fsTools.getDoc(dailyRef);
  if (dailySnap.exists()) {
    await fsTools.setDoc(dailyRef, Object.assign({ points: dailySnap.data().points || 0, day: day }, publicFields()), { merge: true });
  }
  renderAccount();
  await loadBoards();
}

async function awardPoints(amount) {
  const add = Math.max(0, Math.min(800, parseInt(amount, 10) || 0));
  if (!add) return;
  writeLocalPoints(readLocalPoints() + add);
  renderAccount();
  if (!boardsOpen || !currentUser || !db || !fsTools) return;
  const day = easternDay();
  const userRef = fsTools.doc(db, "users", currentUser.uid);
  const dailyRef = fsTools.doc(db, "dailyScores", day + "_" + currentUser.uid);
  try {
    await fsTools.runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      const dailySnap = await tx.get(dailyRef);
      const now = Date.now();
      const nextAll = (userSnap.exists() ? userSnap.data().points || 0 : 0) + add;
      const nextDay = (dailySnap.exists() ? dailySnap.data().points || 0 : 0) + add;
      profile.points = nextAll;
      profile.lastAwardAt = now;
      const fields = publicFields();
      tx.set(userRef, Object.assign({ points: nextAll }, fields), { merge: true });
      tx.set(dailyRef, Object.assign({ points: nextDay, day: day }, fields), { merge: true });
    });
    renderAccount();
    await loadBoards();
  } catch (err) {
    if (firestoreBlocked(err)) {
      hideBoards(err);
      return;
    }
    console.warn("Could not store virtual points.", err);
    setText("account-note", "The points were counted on this device, but the account board did not accept them. Client scores are easy to edit and are not a prize.");
  }
}

async function savePick(pick) {
  if (!boardsOpen) return;
  if (!firebaseReady()) {
    await loadPicks("Saving picks to an account needs Firebase. The sign-in button explains that it is not configured yet.");
    return;
  }
  if (!currentUser || !db || !fsTools) {
    await loadPicks("Sign in with Google to save this pick. The line is not stored in an account yet.");
    return;
  }
  if (!pick || !/^\d{4}-\d{2}-\d{2}$/.test(pick.drawDate || "")) {
    setText("pick-status", "Choose the draw date you intend to play.");
    return;
  }
  const whites = String(pick.whites || "").split(",").map(Number).filter((n) => n > 0);
  const special = Number(pick.special);
  if (whites.length !== 5 || !special) return;
  try {
    const existing = await fsTools.getDocs(fsTools.collection(db, "users", currentUser.uid, "picks"));
    if (existing.size >= MAX_PICKS) {
      setText("pick-status", "This account already has " + MAX_PICKS + " picks. Remove one before saving another.");
      return;
    }
    await fsTools.addDoc(fsTools.collection(db, "users", currentUser.uid, "picks"), {
      game: pick.game === "MEGAMILLIONS" ? "MEGAMILLIONS" : "POWERBALL",
      whites: whites,
      special: special,
      drawDate: pick.drawDate,
      bought: !!pick.bought
    });
    await loadPicks("Saved. A match below is informational only and does not guarantee a win.");
  } catch (err) {
    if (firestoreBlocked(err)) {
      hideBoards(err);
      return;
    }
    console.error("Saved pick failed.", err);
    setText("pick-status", "This pick could not be saved.");
  }
}

async function deletePick(id) {
  if (!boardsOpen || !currentUser || !db || !fsTools || !id) return;
  try {
    await fsTools.deleteDoc(fsTools.doc(db, "users", currentUser.uid, "picks", id));
    await loadPicks("Removed from the account. This does not change an official drawing.");
  } catch (err) {
    if (firestoreBlocked(err)) hideBoards(err);
    else console.error("Could not remove that pick.", err);
  }
}

async function deleteAccount() {
  if (!currentUser || !authTools) return;
  const uid = currentUser.uid;
  if (boardsOpen && db && fsTools) {
    try {
      const picks = await fsTools.getDocs(fsTools.collection(db, "users", uid, "picks"));
      for (const item of picks.docs) await fsTools.deleteDoc(item.ref);
      const daily = await fsTools.getDocs(fsTools.query(fsTools.collection(db, "dailyScores"), fsTools.where("uid", "==", uid)));
      for (const item of daily.docs) await fsTools.deleteDoc(item.ref);
      await fsTools.deleteDoc(fsTools.doc(db, "users", uid));
    } catch (err) {
      if (firestoreBlocked(err)) hideBoards(err);
      else throw err;
    }
  }
  try {
    await authTools.deleteUser(currentUser);
  } catch (err) {
    console.warn("Auth delete needs a fresh sign-in.", err);
    setText("account-note", "LotteryMigo data was removed. Google asked you to sign in again before it will delete the sign-in itself. Sign in, then press delete once more. You can also email info@lotterymigo.com.");
    await authTools.signOut(auth);
  }
}

function explainSignInError(err) {
  const code = err && err.code ? String(err.code) : "";
  console.error("Google sign-in failed.", code || "(no code)", err);
  if (code === "auth/unauthorized-domain") {
    return "This website address isn't approved in Firebase yet. Add lotterymigo.com and www.lotterymigo.com under Authentication → Settings → Authorized domains.";
  }
  if (code === "auth/popup-closed-by-user") {
    return "The Google sign-in window closed before it finished. Try again.";
  }
  if (code === "auth/cancelled-popup-request") {
    return "A Google sign-in window is already open. Use that window, or close it and try again.";
  }
  if (code === "auth/popup-blocked") {
    return "The browser blocked the Google sign-in window. Allow popups for this site, or use the full-page sign-in.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Google sign-in is turned off in Firebase. Enable Google under Authentication → Sign-in method.";
  }
  if (code === "auth/network-request-failed") {
    return "The sign-in could not reach Google. Check the connection and try again.";
  }
  if (code === "auth/web-storage-unsupported") {
    return "This browser is blocking saved sign-in. Allow cookies and site data for this website, then try again.";
  }
  if (code === "auth/user-disabled") {
    return "This Google sign-in is disabled in Firebase. The owner can turn it back on under Authentication → Users.";
  }
  if (code === "auth/too-many-requests") {
    return "Google paused sign-in for a moment because there were too many tries. Wait a little, then try again.";
  }
  if (code === "auth/operation-not-supported-in-this-environment") {
    return "This browser cannot open a Google sign-in window. The page will use a full-page sign-in.";
  }
  return "Google sign-in did not finish (" + (code || "unknown error") + "). Add lotterymigo.com and www.lotterymigo.com under Authentication authorized domains, and make sure Google is enabled as a sign-in method.";
}

function showSignInError(err) {
  signInMessage = explainSignInError(err);
  if (!currentUser) setText("account-note", signInMessage);
}

/* Redirect cannot succeed on an unapproved domain, a disabled provider, or a dead network. */
function redirectWouldHideTheError(err) {
  const code = err && err.code;
  return code === "auth/unauthorized-domain" || code === "auth/operation-not-allowed" || code === "auth/network-request-failed";
}

/* Firebase reports auth/popup-closed-by-user a few seconds after the window is already gone.
   Watch the window itself. A close in the first 1.5s is the automatic close, not a person giving up. */
function watchPopupWindow() {
  const nativeOpen = window.open.bind(window);
  const openedAt = Date.now();
  let closedImmediately = false;
  window.open = function () {
    const popup = nativeOpen.apply(window, arguments);
    window.open = nativeOpen;
    if (!popup) return popup;
    const markIfClosed = () => {
      let closed = true;
      try {
        closed = !!popup.closed;
      } catch (err) {
        closed = true;
      }
      if (!closed) return false;
      closedImmediately = Date.now() - openedAt < 1500;
      return true;
    };
    if (!markIfClosed()) {
      const watch = window.setInterval(() => {
        if (markIfClosed()) window.clearInterval(watch);
      }, 40);
      window.setTimeout(() => window.clearInterval(watch), 5000);
    }
    return popup;
  };
  return {
    restore() {
      window.open = nativeOpen;
    },
    closedImmediately() {
      return closedImmediately;
    }
  };
}

function beginRedirect(provider) {
  signInMessage = "The sign-in window did not stay open. Opening the full-page Google sign-in.";
  setText("account-note", signInMessage);
  authTools.signInWithRedirect(auth, provider).catch((err) => showSignInError(err));
}

function onPopupFailure(err, provider, closedImmediately) {
  if (auth && auth.currentUser) {
    applyAuthUser(auth.currentUser);
    return;
  }
  const code = err && err.code;
  if (redirectWouldHideTheError(err)) {
    showSignInError(err);
    return;
  }
  if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment" || (code === "auth/popup-closed-by-user" && closedImmediately)) {
    console.error("Google popup did not stay open. Falling back to redirect.", code || err);
    beginRedirect(provider);
    return;
  }
  showSignInError(err);
}

function emptyProfile() {
  return { showOnBoard: false, publicName: "", publicPhoto: "", points: 0, lastAwardAt: 0 };
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(Object.assign(new Error("The leaderboard storage did not answer."), { code: "deadline-exceeded" }));
    }, ms);
    Promise.resolve(promise).then((value) => {
      clearTimeout(timer);
      resolve(value);
    }, (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/* Paint the Google session before any Firestore call. A missing database must not hide Sign out. */
function applyAuthUser(user) {
  const next = user || null;
  const uid = next ? next.uid : "";
  const firstSight = uid !== appliedUid;
  currentUser = next;
  appliedUid = uid;
  if (!next) {
    boardSetupMessage = "";
    profile = emptyProfile();
    renderAccount();
    if (boardsOpen) loadPicks().catch((err) => console.warn(err));
    return;
  }
  renderAccount();
  if (firstSight && boardsOpen) loadSignedInData(uid);
}

async function loadSignedInData(uid) {
  if (!boardsOpen || !db || !fsTools) return;
  try {
    const snap = await withTimeout(fsTools.getDoc(fsTools.doc(db, "users", uid)), 8000);
    if (appliedUid !== uid) return;
    profile = emptyProfile();
    if (snap.exists()) profile = Object.assign(profile, snap.data());
    else {
      profile.lastAwardAt = Date.now();
      await withTimeout(
        fsTools.setDoc(fsTools.doc(db, "users", uid), Object.assign({ points: 0 }, publicFields())),
        8000
      );
    }
    if (appliedUid !== uid) return;
    boardSetupMessage = "";
    renderAccount();
    try {
      await loadPicks();
    } catch (err) {
      if (firestoreBlocked(err)) {
        hideBoards(err);
        return;
      }
      console.error("Saved picks could not be loaded.", err);
    }
    await loadBoards();
  } catch (err) {
    if (appliedUid !== uid) return;
    if (firestoreBlocked(err)) {
      hideBoards(err);
      return;
    }
    console.error("Leaderboard storage is not ready.", err && err.code ? err.code : err, err);
    boardSetupMessage = "Scores and saved picks could not be loaded. You are still signed in.";
    renderAccount();
  }
}

async function connectFirebase() {
  if (!firebaseReady()) return;
  const base = "https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION;
  const appMod = await import(base + "/firebase-app.js");
  authTools = await import(base + "/firebase-auth.js");
  if (boardsOpen) fsTools = await import(base + "/firebase-firestore.js");
  const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(firebaseConfig);
  auth = authTools.getAuth(app);
  try {
    await authTools.setPersistence(auth, authTools.browserLocalPersistence);
  } catch (err) {
    console.error("Google sign-in could not use saved browser storage.", err && err.code ? err.code : err, err);
  }
  if (boardsOpen) db = fsTools.getFirestore(app);
  authTools.onAuthStateChanged(auth, (user) => {
    applyAuthUser(user);
  }, (err) => {
    showSignInError(err);
  });
  authTools.getRedirectResult(auth).then((result) => {
    if (result && result.user) applyAuthUser(result.user);
  }).catch((err) => {
    showSignInError(err);
  });
}

function bind() {
  const signIn = $("btn-sign-in");
  if (signIn) {
    signIn.addEventListener("click", (event) => {
      event.preventDefault();
      if (!firebaseReady() || !auth || !authTools) {
        signInMessage = "Sign-in is still loading. Try the button again in a moment.";
        setText("account-note", signInMessage);
        return;
      }
      const provider = new authTools.GoogleAuthProvider();
      if (prefersRedirect()) {
        beginRedirect(provider);
        return;
      }
      const popupWatch = watchPopupWindow();
      let popupPromise;
      try {
        /* Must run in this click turn. An await before signInWithPopup lets the browser block the window. */
        popupPromise = authTools.signInWithPopup(auth, provider);
      } catch (err) {
        popupWatch.restore();
        onPopupFailure(err, provider, popupWatch.closedImmediately());
        return;
      }
      popupPromise.then((result) => {
        popupWatch.restore();
        if (result && result.user) applyAuthUser(result.user);
      }, (err) => {
        popupWatch.restore();
        onPopupFailure(err, provider, popupWatch.closedImmediately());
      });
    });
  }
  const signOutBtn = $("btn-sign-out");
  if (signOutBtn) signOutBtn.addEventListener("click", () => auth && authTools && authTools.signOut(auth));
  const del = $("btn-delete-account");
  if (del) del.addEventListener("click", () => show("delete-confirm", true));
  const yes = $("btn-delete-confirm");
  if (yes) yes.addEventListener("click", () => deleteAccount().catch((err) => {
    console.warn(err);
    setText("account-note", "The account could not be deleted. Email info@lotterymigo.com and we will remove the stored data.");
  }));
  const opt = $("account-opt-in");
  if (opt) opt.addEventListener("change", () => saveProfile(opt.checked).catch((err) => {
    if (firestoreBlocked(err)) {
      hideBoards(err);
      return;
    }
    console.error("Leaderboard storage is not ready.", err && err.code ? err.code : err, err);
    boardSetupMessage = "The board did not save that choice. You are still signed in.";
    renderAccount();
  }));
  const picks = $("saved-picks-list");
  if (picks) {
    picks.addEventListener("click", (event) => {
      const button = event.target.closest("[data-delete-pick]");
      if (button) deletePick(button.getAttribute("data-delete-pick"));
    });
  }
}

window.lmAwardPoints = awardPoints;
window.lmSavePick = savePick;
window.lmRenderPicks = () => loadPicks();
document.addEventListener("lm-draws-ready", () => loadPicks());

applyBoardChrome();
renderTip();
renderAccount();
if (boardsOpen) {
  renderBoards([], [], "");
  loadPicks();
}
bind();
connectFirebase().catch((err) => {
  console.warn("Firebase did not start.", err);
  setText("account-note", "Firebase did not start. The rest of the site still works. Check assets/site-config.js.");
});
