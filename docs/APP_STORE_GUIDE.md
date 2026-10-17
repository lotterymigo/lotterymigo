# LotteryMigo app store guide

This guide explains how to build, sign, and submit the Capacitor shell. **The app is not store-ready.** Nothing in this repository has been signed, uploaded, or approved. Completing the checklist at the end is still required before any store submission.

The branch that added this shell was cut from the latest `main` **plus** the unmerged accessibility work on `cursor/senior-accessibility-5dfd` (pull request #3). `main` alone does not yet contain the larger type, contrast controls, or plain-language labels.

## What is already in the repo

- `package.json` and `capacitor.config.json` with app id `com.lotterymigo.app` and app name `LotteryMigo`.
- `npm run build:web` copies the HTML pages, `assets/`, and `data/draws.json` into `www/`.
- `android/` and `ios/` are the generated Capacitor projects when this environment was able to create them. See the pull request for which platforms were actually generated.
- On a phone, the app loads the hosted draw file at `https://lotterymigo.com/data/draws.json` when it can, and otherwise uses the `draws.json` copied into the app. That saved copy is a snapshot from the day you last ran the build. It is not a live feed.
- Favorite numbers are stored on the device under `lotterymigo_favorites`.
- Draw alerts are off until the person taps **Turn on draw alerts**. They are local notifications, not remote push. The first opt-in remembers the dates already on screen and only alerts when a later date appears.
- Ads use Google’s public **test** ad unit IDs from `admob.config.json`. A consent check runs through Google’s User Messaging Platform (UMP) before any banner. The banner is hidden while the scratch-card result is visible, so it does not cover **Try again**.

## What this environment did not do

- No Apple Developer or Google Play account was used.
- No upload keystore, distribution certificate, or provisioning profile was created.
- No `.aab` or `.ipa` was built or uploaded.
- No AdMob production app was created. Test IDs cannot earn money and do not prove the app is allowed to show ads.
- Page styles live in `assets/design.css`. Inter and Chart.js still load from public CDNs. A phone with no network can still read the saved draw file, but type and the chart may look unfinished until those CDN files are vendored. Vendoring them is a remaining step if offline appearance matters.

## 1. Accounts you must open yourself

1. **Apple Developer Program** (paid yearly membership) at [developer.apple.com/programs](https://developer.apple.com/programs/). You need this for TestFlight and the App Store. A free Apple ID can run on your own phone for a few days, which is not a store submission.
2. **App Store Connect** access for that same team.
3. **Google Play Console** (one-time registration fee) at [play.google.com/console](https://play.google.com/console/).
4. **Google AdMob** only if you later decide real ads are allowed for this app. Do not create production ad units until you have read the policy section below.

Use the bundle / application id `com.lotterymigo.app` in both stores unless you intentionally pick a new id and change `capacitor.config.json` to match.

## 2. Build the web bundle

From the repository root, with Node.js 20 or newer:

```bash
npm install
npm run build:web
npx cap sync
```

`npm run build:web` refreshes `www/` and rebuilds `assets/native-shell.js`. `npx cap sync` copies `www/` into the native projects. Run both again after any site or `data/draws.json` change. The GitHub Action that updates `data/draws.json` does **not** publish a new app binary by itself.

Open the native projects only after sync:

```bash
npx cap open android
npx cap open ios
```

`npx cap open ios` requires a Mac with Xcode.

## 3. Android: build, sign, and Play Console

### Tools

- Android Studio (current stable) with Android SDK.
- A JDK. This project was generated with the system JDK available on the build machine; Android Studio’s JDK is the one to use for a release build.
- Confirm `minSdk` meets the AdMob plugin (Android 7 / API 24 or newer) and that `targetSdk` meets the current Play requirement. Play raises the target API most years. Check the current “target API level” article in Play Console help before you upload.

### App id already set

`android/app/src/main/AndroidManifest.xml` should reference `@string/admob_app_id`. `android/app/src/main/res/values/strings.xml` should contain Google’s **test** application id:

`ca-app-pub-3940256099942544~3347511713`

Leave that value until a production AdMob app id exists and the policies allow it.

### Signing

1. In Android Studio: **Build > Generate Signed App Bundle / APK**. Choose **Android App Bundle**.
2. Create a new upload key with a strong password. Store the `.jks` or `.keystore` file and the passwords somewhere you can recover. If you lose the upload key, Play App Signing can sometimes reset it, but you should treat the file as required.
3. Prefer **Play App Signing** so Google holds the app signing key and you hold the upload key.
4. Or from `android/`: `./gradlew bundleRelease` after `signingConfigs` in `android/app/build.gradle` point at your keystore. Do not commit the keystore or passwords.

The debug build (`npx cap run android`) is only for a device or emulator you control. A debug APK is not a Play upload.

### Play Console listing

1. Create the app with the name LotteryMigo and default language.
2. Complete the store listing: short description, full description, icon, feature graphic, phone screenshots. Say clearly that the app is entertainment, does not sell tickets, and does not promise a win.
3. Set the privacy policy URL to `https://lotterymigo.com/privacy.html` after that page matches the binary you ship.
4. Complete the content rating questionnaire **honestly**. The app discusses lottery drawings and includes a free scratch game with no cash value. That is still a gambling or simulated-gambling theme. Do not label it as a children’s app. Expect a mature rating.
5. Complete **Data safety**. See the form section below. Declare device-local favorites and notification preference, and advertising data if any ad SDK ships in the binary. The test AdMob SDK is still the Google Mobile Ads SDK, so declare it if you leave the dependency in the app.
6. Complete ads declaration. If the binary includes AdMob, answer that the app contains ads, even while only test ids are configured.
7. Upload the `.aab` to a **closed testing** track first, not production.

### Closed testing

Google has required many **new personal** Play Console accounts to run a closed test before production access. The published bar has been at least **12 testers who have opted in, for 14 days in a row**. Organization accounts and older accounts can differ. Open Play Console’s current “closed testing” requirement for your account and follow the number it shows. Recruit real testers, give them the opt-in link, and do not count yourself as all 12 people. Production access, if granted, is a separate button after the test period. A closed test is not approval of the gambling or ads policy.

## 4. iOS: build, sign, and App Store

A signed iOS archive cannot be made on Linux. Use one of these:

- A Mac with Xcode (simplest).
- A rented Mac (MacinCloud, MacStadium, or an AWS EC2 Mac instance). You still use your own Apple account.
- A cloud CI Mac image:
  - **GitHub Actions** `macos-latest` (or the current Xcode image) with the Apple certificate and provisioning profile stored as encrypted secrets, then `xcodebuild archive` and `xcodebuild -exportArchive`, or Fastlane.
  - **Codemagic** or **Bitrise**, which have Capacitor and iOS signing docs.
- Do not expect `npx cap add ios` on a Linux machine to install CocoaPods or produce an `.ipa`. If the `ios/` folder exists, it still needs a Mac to resolve Swift packages or pods, sign, and upload.

### On a Mac

1. Install Xcode from the Mac App Store, then open `ios/App/App.xcworkspace` if CocoaPods created it, otherwise `ios/App/App.xcodeproj`.
2. In Xcode, select the App target. Set the bundle id to `com.lotterymigo.app`. Pick your team. Turn on automatically managed signing for the first TestFlight build.
3. In [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources), register the app id `com.lotterymigo.app` with Push Notifications only if you later add real remote push. Local notifications do not need the push entitlement.
4. Confirm `ios/App/App/Info.plist` contains:
   - `GADApplicationIdentifier` = `ca-app-pub-3940256099942544~1458002511` (Google’s test app id).
   - `NSUserTrackingUsageDescription` explaining that the identifier is used to deliver ads, and only if you actually request tracking. The current shell does not call the tracking prompt by itself. Remove the tracking key if you ship without App Tracking Transparency.
   - `SKAdNetworkItems` still needs the full list from Google’s current iOS AdMob setup guide before real ads. The generated plist may contain only a starter entry.
5. Set the version and build number. Each upload needs a new build number.
6. Choose **Any iOS Device (arm64)**, then **Product > Archive**.
7. In the Organizer, **Distribute App > App Store Connect > Upload**.
8. In App Store Connect, create the app record, attach the build, and fill in the same kind of listing as Play: description, screenshots for the required device sizes, support URL, and privacy policy URL `https://lotterymigo.com/privacy.html`.
9. Answer the age-rating questions honestly. Frequent lottery or simulated-gambling references commonly lead to **17+**. Do not mark the app as made for kids.
10. Export compliance: the app uses HTTPS to load pages and draw data and does not add its own cryptography. You can usually answer that it uses only exempt encryption. Read the current App Store encryption questions rather than copying an old answer.
11. Send the build to **TestFlight** internal testers first. External TestFlight needs a short beta review. TestFlight is not App Store approval.

## 5. Age rating

Treat both questionnaires as legal forms.

- Say that the app shows lottery drawings, odds, and a free scratch game.
- Say that it does not sell tickets, take wagers, or pay prizes.
- Do not describe the scratch game as a cash prize.
- A “made for ages 18+ / 21+” note on the website does not replace the store rating. The store may still rate the app 17+ or equivalent because of gambling themes.
- If a question does not match the app, stop and re-read it. Do not pick the answer that looks easiest.

## 6. Privacy and data safety forms

Match the forms to `privacy.html` and to the binary. Update the page first if the binary changes.

Declare, in plain language:

| Topic | What is true in this project |
| --- | --- |
| Account | No account is created. |
| Favorite numbers | Stored only on the device (`lotterymigo_favorites`). Not sent to LotteryMigo. |
| Reading settings and dismissed notice | Stored only on the device. |
| Draw alerts | The app asks for notification permission only after the person opts in. The choice and the last notified dates stay on the device. These are local notifications. |
| Draw results | Loaded from your server or from the copy inside the app. Winning numbers are public. |
| Ads | The Google Mobile Ads SDK and UMP SDK are included while AdMob stays in the project. Test ads can still cause the SDK to receive an advertising identifier and IP address. Declare advertising data if the SDK ships. |
| Tracking | Do not claim “no tracking” on iOS if you later call App Tracking Transparency or use ad personalization. |
| Sale of data | This project does not sell personal information. Ad SDKs can still be “shared with a third party” for advertising. Answer the store’s sharing question for Google if the SDK is present. |

Apple’s privacy nutrition labels and Google’s Data safety form use different words for the same facts. Fill both out from the table above, then read each question again. A privacy policy URL is required on both stores.

## 7. AdMob, test IDs, and gambling policy

### Test IDs in use

`admob.config.json` has `"useTestAds": true`. Banner requests use:

- Android banner: `ca-app-pub-3940256099942544/6300978111`
- iOS banner: `ca-app-pub-3940256099942544/2934735716`

Application ids in the native projects:

- Android: `ca-app-pub-3940256099942544~3347511713`
- iOS: `ca-app-pub-3940256099942544~1458002511`

These are Google’s demo ids (also documented by `@capacitor-community/admob`). They always request test ads. They are not your publisher id.

The shell does not show an interstitial or a rewarded ad. Do not add one on the scratch result. The result’s **Try again** button must stay clear of ad taps. The banner is removed while `#scratch-result` is visible and the page padding is cleared so the button is not sitting under a native banner.

### Consent (UMP)

Before `AdMob.initialize`, the shell calls `AdMob.requestConsentInfo()`. If a form is required, it calls `AdMob.showConsentForm()`. If `canRequestAds` is false, no banner is shown.

UMP will not show your real European message until you create one in AdMob under **Privacy & messaging**. The committed code does not force a debug region, so a form may not appear in every country during development. To test the form, follow the plugin’s consent testing notes and a debug device id on a development build only. Remove debug geography before release.

### Swapping in real ids later

Do this only after AdMob and the stores allow this app to show ads:

1. In the AdMob console, create an app for Android and an app for iOS. Copy each **application** id (the one with `~`) and each **banner ad unit** id (the one with `/`).
2. Edit `admob.config.json`: set `useTestAds` to `false` and fill every `production` field. Leave test ids in the `test` block so you can turn test mode back on.
3. Put the Android application id in `android/app/src/main/res/values/strings.xml` as `admob_app_id`.
4. Put the iOS application id in `Info.plist` under `GADApplicationIdentifier`.
5. Add Google’s current full `SKAdNetworkItems` list to `Info.plist`.
6. Rebuild with `npm run build:web` and `npx cap sync`.
7. Update `privacy.html`, the Play Data safety form, and the App Store privacy labels before you ship that binary.
8. Ship the ad-enabled binary only to a test track first and confirm the banner never covers **Try again**.

If any production id is empty, the shell logs a warning and does not show a banner.

### Gambling-policy notes

Read these yourself before you apply for real ads or production store access. Policies change and this file is not legal advice:

- [Google Play Real-Money Gambling, Games, and Contests](https://support.google.com/googleplay/android-developer/answer/9877032)
- [Google Publisher policies](https://support.google.com/admob/answer/6128543), including the gambling content rules linked from AdMob policy help
- [AdMob allowed countries and restricted categories](https://support.google.com/admob/answer/7666519) (confirm the current gambling section)

Lottery and gambling apps are restricted. Many of them need a license, a country allow-list, and a separate Google certification. An entertainment-only frequency app that does not sell tickets can still be rejected because it discusses gambling or includes a scratch game. **Test ad units do not mean Google has approved this app.** If the current policy says this app is not eligible, remove `@capacitor-community/admob`, the manifest meta-data, and the Info.plist ad keys, then submit without ads. Do not try to disguise the lottery subject to pass review.

## 7b. Google sign-in in the app

The website can use Firebase Google sign-in after the owner fills `assets/site-config.js`. That popup is not used inside this Capacitor shell. The account button explains that the app needs a native plugin. Follow `docs/FIREBASE_SETUP.md` before adding `@capacitor-firebase/authentication`, `google-services.json`, and `GoogleService-Info.plist`. Do not ship a prize based on the Firestore point totals. They are written by the phone and are not tamper-proof.

## 8. Icons, notifications, and offline limits

- The launcher icon is already the LotteryMigo mark. The source is `icons/logo.svg`, and `icons/icon-1024.png` was copied into the iOS app icon and the Android mipmaps. Replace the splash screens and the Android notification small icon before you submit. Those are still the Capacitor defaults.
- Android notification small icons must be white-on-transparent. The shell uses the plugin default until you add one.
- Draw alerts need a real device to confirm the permission prompt. An emulator can skip or break notifications.
- The saved `draws.json` goes stale until you ship a new binary or the phone reaches `https://lotterymigo.com/data/draws.json`.
- Inter and Chart.js are still loaded from CDNs. Page CSS is local.

## 9. Remaining manual steps

Check these off yourself. None of them were done for this repository:

- [ ] Merge or rebase onto `main` after accessibility pull request #3 lands, then re-run `npm run build:web` and `npx cap sync`.
- [ ] On a Mac, install Xcode, resolve iOS packages, and run the app on a simulator and a device.
- [ ] Run the Android app on an emulator and a device. Confirm favorites survive a restart, draw alerts ask permission only after the button tap, and the scratch result’s **Try again** button is not under a banner.
- [ ] Confirm the bundled draw file appears when the phone is offline, and that a newer hosted file wins when the phone is online.
- [ ] Replace splash screens and the Android notification icon. The launcher icon is already the brand mark.
- [ ] Create the Apple Developer account, App Store Connect app, certificate, and provisioning profile.
- [ ] Create the Play Console account and an upload keystore. Turn on Play App Signing. Do not commit the keystore.
- [ ] Raise `targetSdk` / iOS deployment target if the stores require a newer OS than this project has.
- [ ] Write store descriptions, screenshots, and a support URL.
- [ ] Point both stores at `https://lotterymigo.com/privacy.html` and re-read that page against the binary.
- [ ] Complete the Apple age rating and Google content rating without calling the app a kids app.
- [ ] Complete Apple privacy labels and Google Data safety, including the ad SDK if it remains.
- [ ] Put a closed-test build on Play, meet the tester count your account actually requires, and wait out the required period.
- [ ] Upload a TestFlight build and test on a physical iPhone.
- [ ] Read the current Play gambling policy and AdMob gambling policy. If the app is not eligible, remove AdMob before review.
- [ ] If it is eligible, create a UMP message, test the consent form, then replace test ids in `admob.config.json`, `strings.xml`, and `Info.plist` together.
- [ ] Vendor CDN assets if you need the app to look right offline.
- [ ] Submit for review only after the list above is done. Approval is not guaranteed.
