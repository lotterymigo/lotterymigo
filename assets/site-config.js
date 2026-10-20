/* ============================================================
   LotteryMigo site config — the only place for these keys
   ------------------------------------------------------------
   The Firebase block is the public web config for project
   lotterymigo. measurementId is listed so it matches the
   Firebase console. This site does not load Firebase Analytics.
   The PayPal link stays a placeholder until you replace it.
   Setup that is still manual: docs/FIREBASE_SETUP.md
   ============================================================ */
window.LOTTERYMIGO_CONFIG = {
  firebase: {
    apiKey: "AIzaSyCDN-fah5nGUr-GDoOMzrcVuoUst4-W_A0",
    authDomain: "lotterymigo.firebaseapp.com",
    projectId: "lotterymigo",
    storageBucket: "lotterymigo.firebasestorage.app",
    messagingSenderId: "349957688958",
    appId: "1:349957688958:web:0b4e7d2c93691f9cac922f",
    measurementId: "G-YN21YZ62BC"
  },
  /* Voluntary tip. Not a payment for points, tickets, or wins.
     An empty value, or YOUR_PAYPAL_NAME, hides the whole tip area. */
  paypalTipUrl: "https://paypal.me/nabinpkl",
  /* Firestore is created and firestore.rules is published, so the board is on.
     Set this back to false only to hide the board, winner banner, and saved picks. */
  firestoreEnabled: true,
  /* Daily board day boundary. Shown on the page in plain words. */
  leaderboardTimeZone: "America/New_York",
  leaderboardTimeZoneLabel: "US Eastern Time (America/New_York)"
};
