# Firebase, leaderboard, and tips

The Firebase project **lotterymigo** already exists. Its public web config is filled in at `assets/site-config.js`. The page does not load Firebase Analytics, even though `measurementId` is in that file. Virtual points are not cash, and a score saved from the browser is not tamper-proof.

The web API key is not a secret server password. It still must be restricted by the authorized domains and the Firestore rules in this repo. Do not put a service-account private key in this file. Leave `paypalTipUrl` as the PayPal placeholder until the tip section below. Leave the timezone as `America/New_York` unless you intentionally change the daily cutoff and the words on the page.

## Remaining manual steps

Do these three things in the [Firebase console](https://console.firebase.google.com/) for project `lotterymigo` before sign-in and the boards work on the live site:

1. Open **Build → Authentication → Settings → Authorized domains**. Add `lotterymigo.com` and `www.lotterymigo.com`. `localhost` is already there for local tests. Add any Vercel preview hostname you actually use.
2. Open **Build → Firestore Database** and create a database. Start in **production mode**.
3. Open the **Rules** tab and replace the editor contents with the full text of `firestore.rules` from this repository. Publish.

Also confirm **Authentication → Sign-in method** has **Google** enabled. A desktop browser uses a popup. A phone, and the Capacitor app, use a full-page redirect because a popup is not reliable there. If the popup is blocked, or the window itself closes in the first moment, the desktop page falls back to that same redirect. Firebase may report that close a few seconds later, so the page watches the window rather than the clock on the error. A domain that is not on the authorized list does not redirect: the page says “This website address isn't approved in Firebase yet.” The same sentence appears when a full-page sign-in returns with `auth/unauthorized-domain`.

`vercel.json` sends `Cross-Origin-Opener-Policy: same-origin-allow-popups`. A stricter `same-origin` policy makes the browser report the Google window as closed immediately, which is the popup that vanishes as soon as you click. There is no Content-Security-Policy header: a strict policy would block the Firebase, Chart.js, font, and AdSense scripts this page loads. `authDomain` stays `lotterymigo.firebaseapp.com`.

## 1. Web config already in the repo

`assets/site-config.js` already has:

- `apiKey`
- `authDomain` `lotterymigo.firebaseapp.com`
- `projectId` `lotterymigo`
- `storageBucket` `lotterymigo.firebasestorage.app`
- `messagingSenderId`
- `appId`
- `measurementId` (not used; Analytics stays off)

## 2. Google sign-in

1. In the Firebase project, open **Build → Authentication → Sign-in method**.
2. Enable **Google** if it is not already on. Choose a support email.
3. Authorized domains are the first remaining step above.

## 3. Create Firestore and publish the rules

1. Open **Build → Firestore Database** and create a database. Start in **production mode**.
2. Open the **Rules** tab and replace the editor contents with the full text of `firestore.rules` from this repository. Publish.
3. What those rules allow:
   - Anyone can read the public point totals and, only when that player opted in, the display name and photo URL stored for the board.
   - Saved picks sit under `users/{uid}/picks` and only that signed-in user can read or write them.
   - A player can only write their own user row and their own daily row (`dailyScores/{YYYY-MM-DD}_{uid}`).
   - A display name or photo URL is rejected unless “show on the board” is true. A photo URL must be empty or start with `https://`.
   - One write can add at most 800 virtual points, and point increases must be at least 2 seconds apart.
4. That is basic abuse protection only. Anyone can still change the page’s JavaScript and submit a score. **Do not pay a prize from these numbers.** A server check, such as a Cloud Function that deals the card itself, would be required before any real prize. This site has no cash prizes.

## 4. Create the daily-board index

The daily board queries `dailyScores` by `day` and then by `points` descending. Firestore does not build that composite index until you ask.

1. Deploy indexes with the Firebase CLI if you use it: `firebase deploy --only firestore:indexes` with `firestore.indexes.json` in this repo.
2. Or load the site after the keys are real, open the browser console, and use the index-creation link Firestore prints. The page also says the board needs that index.

The all-time board sorts `users` by `points` only. Firestore adds that single-field index itself.

## 5. What is stored

| Place | Fields | Who can see it |
| --- | --- | --- |
| Firebase Authentication | Google account id, name, email, photo | Google and the project owner. The email is not copied into Firestore. |
| `users/{uid}` | virtual points, opt-in flag, public name, public photo, last award time | Points are world-readable. Name and photo are stored only when the player checks “Show my name and photo on the leaderboard”. |
| `dailyScores/{day}_{uid}` | same public fields plus the Eastern-time day | Same as the user row. The day is `America/New_York`. The board starts over at midnight Eastern. |
| `users/{uid}/picks/{id}` | game, five numbers, bonus ball, intended draw date, “I bought this ticket” | Only that user. |

The “I bought this ticket” box is a note the player types. The site cannot see a store receipt.

## 6. Delete an account

A signed-in player can press **Delete my account and data**, then **Yes, delete my LotteryMigo data**. That deletes their user row, daily rows, and picks, then asks Google to delete the app sign-in. Google sometimes requires a fresh sign-in first. The button explains that.

You can also delete the user in **Authentication → Users** and delete their Firestore documents by hand. Email requests go to info@lotterymigo.com.

## 7. PayPal tip

1. Create a PayPal.me name you control.
2. In `assets/site-config.js`, replace `https://paypal.me/YOUR_PAYPAL_NAME` with your real `https://paypal.me/YourName` link. One file, one URL.
3. Until that `YOUR_` text is gone, the page does not link anywhere. It says the tip is not connected.
4. The button is a voluntary tip. It does not buy points, tickets, or a better chance of winning.

## 8. Native app (Capacitor)

On a desktop browser the button uses `signInWithPopup` in the click itself, with no wait before that call. On a phone, and inside the Capacitor shell, it uses `signInWithRedirect` because a popup is not supported. If a desktop popup is blocked or closes immediately, the page uses that redirect too. If Firebase says the domain is not approved, Google is disabled, or the network failed, the page shows that reason and stays put. A redirect from inside the Android or iOS WebView may not return to the app. The native plugin below is still the reliable app sign-in.

When you are ready to sign in from the app:

1. Install a native Google sign-in plugin such as `@capacitor-firebase/authentication` (follow that package’s current readme; do not keep using the web popup).
2. Download `google-services.json` into the Android app and `GoogleService-Info.plist` into the iOS app from the Firebase project settings. Do not commit secrets beyond what Firebase marks as client config.
3. Add the Android SHA-1 of your upload key and your debug key under the Firebase Android app.
4. On iOS, add the reversed client id URL scheme from `GoogleService-Info.plist`.
5. In Firebase authorized domains, you still need the website domains. The native plugin uses the OAuth clients, not the popup.
6. Rebuild with `npm run build:web` and `npx cap sync`.
7. The app is still not store-ready. Update the privacy labels and `privacy.html` if the native SDK collects anything this page does not already describe.

Favorites on the device (`lotterymigo_favorites`) and the scratch game keep working with no account, in the browser and in the app shell.
