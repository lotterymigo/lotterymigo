/* ============================================================
   Accounts and saved number picks
   ------------------------------------------------------------
   Reads window.LOTTERYMIGO_CONFIG from assets/site-config.js.
   If the Firebase values still contain YOUR_, nothing calls
   Google. Signed-out visitors keep the full stats site.
   The published Firestore rules still expect a points field.
   New profiles store 0 and do not write dailyScores.
   ============================================================ */

const DISCLAIMER = "18+ (21+ where required). These selections do not guarantee any win. Results are informational only. LotteryMigo is not responsible for any win or loss. Always verify numbers with official lottery sources.";
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

function boardsConfigured() {
  return config.firestoreEnabled === true;
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
  show("saved-picks-panel", boardsOpen);
}

function hideBoards(err) {
  console.error("Saved picks are hidden.", err && err.code ? err.code : err, err);
  boardsOpen = false;
  boardSetupMessage = "";
  applyBoardChrome();
  renderAccount();
}

function renderAccount() {
  const configured = firebaseReady();
  const native = isNativeApp();
  const signedIn = !!(currentUser && configured);
  show("btn-sign-out", signedIn);
  show("btn-delete-account", signedIn);
  show("delete-confirm", false);

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
      setText("account-status", "The statistics stay available without an account.");
      setText("account-note", "Sign in with Google is not set up yet. Frequencies, the draw list, and favorites on this device keep working.");
      return;
    }
    setText("account-status", native ? "The statistics stay available in the app without an account." : "You are not signed in.");
    if (signInMessage) {
      setText("account-note", signInMessage);
    } else if (!boardsOpen) {
      setText("account-note", native
        ? "Sign in with Google opens a full-page sign-in, because this app cannot use a popup."
        : prefersRedirect()
          ? "On a phone, Sign in with Google opens a full-page sign-in."
          : "Sign in with Google if you want to save number picks. The statistics stay available either way.");
    } else if (native) {
      setText("account-note", "Sign in with Google opens a full-page sign-in, because this app cannot use a popup. If Google does not come back to the app, use the website or the native plugin in docs/FIREBASE_SETUP.md. Saving a pick does not change the odds.");
    } else if (prefersRedirect()) {
      setText("account-note", "On a phone, Sign in with Google opens a full-page sign-in. Saving a pick does not change the odds.");
    } else {
      setText("account-note", "Sign in to save a number line with the draw date you intend to play. A saved pick does not guarantee a win.");
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
    setText("account-note", "Saved picks are listed with Number ideas. A match against the draw list is informational only and does not guarantee a win.");
  } else {
    setText("account-note", "You are signed in. Saved picks are not available until account storage is connected.");
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
  /* The live rules still require these keys. The site no longer shows a board. */
  return {
    uid: currentUser.uid,
    showOnBoard: false,
    publicName: "",
    publicPhoto: "",
    lastAwardAt: profile.lastAwardAt || Date.now()
  };
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
      reject(Object.assign(new Error("Saved picks did not answer."), { code: "deadline-exceeded" }));
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
  } catch (err) {
    if (appliedUid !== uid) return;
    if (firestoreBlocked(err)) {
      hideBoards(err);
      return;
    }
    console.error("Saved picks are not ready.", err && err.code ? err.code : err, err);
    boardSetupMessage = "Saved picks could not be loaded. You are still signed in.";
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
  const picks = $("saved-picks-list");
  if (picks) {
    picks.addEventListener("click", (event) => {
      const button = event.target.closest("[data-delete-pick]");
      if (button) deletePick(button.getAttribute("data-delete-pick"));
    });
  }
}

window.lmAwardPoints = function () {};
window.lmSavePick = savePick;
window.lmRenderPicks = () => loadPicks();
document.addEventListener("lm-draws-ready", () => loadPicks());

applyBoardChrome();
renderAccount();
if (boardsOpen) loadPicks();
bind();
connectFirebase().catch((err) => {
  console.warn("Firebase did not start.", err);
  setText("account-note", "Firebase did not start. The rest of the site still works. Check assets/site-config.js.");
});
