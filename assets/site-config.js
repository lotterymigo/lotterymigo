/* ============================================================
   LotteryMigo site config — the only place for these keys
   ------------------------------------------------------------
   Replace each YOUR_... value with the real one from your
   Firebase and PayPal accounts. Do not invent keys.
   Leave the YOUR_ text in place until you have the real value.
   The site keeps working, and the sign-in button says the
   account tools are not connected yet.
   Setup steps: docs/FIREBASE_SETUP.md
   ============================================================ */
window.LOTTERYMIGO_CONFIG = {
  firebase: {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  },
  /* Voluntary tip. Not a payment for points, tickets, or wins. */
  paypalTipUrl: "https://paypal.me/YOUR_PAYPAL_NAME",
  /* Daily board day boundary. Shown on the page in plain words. */
  leaderboardTimeZone: "America/New_York",
  leaderboardTimeZoneLabel: "US Eastern Time (America/New_York)"
};
