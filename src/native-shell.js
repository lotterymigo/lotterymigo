import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize
} from '@capacitor-community/admob';
import admobConfig from '../admob.config.json';

const ALERT_KEY = 'lotterymigo_draw_alerts';
const NOTIFIED_KEY = 'lotterymigo_last_notified';
const CHANNEL_ID = 'new-draws';

let adsAllowed = false;
let bannerShown = false;

function bannerUnitId() {
  const block = admobConfig.useTestAds ? admobConfig.test : admobConfig.production;
  const id = Capacitor.getPlatform() === 'ios' ? block.iosBannerId : block.androidBannerId;
  return id || '';
}

function scratchResultOpen() {
  const result = document.getElementById('scratch-result');
  return !!(result && !result.classList.contains('hidden'));
}

function setBannerPadding(px) {
  document.body.style.paddingBottom = px > 0 ? px + 'px' : '';
}

async function hideBannerForScratch() {
  if (!bannerShown) {
    setBannerPadding(0);
    return;
  }
  try {
    await AdMob.hideBanner();
  } catch (err) {
    console.warn('Could not hide the banner.', err);
  }
  bannerShown = false;
  setBannerPadding(0);
}

async function syncBanner() {
  if (!adsAllowed) return;
  if (scratchResultOpen()) {
    await hideBannerForScratch();
    return;
  }
  const adId = bannerUnitId();
  if (!adId) {
    console.warn('AdMob banner id is empty. Ads stay off until admob.config.json has an id.');
    return;
  }
  if (bannerShown) return;
  await AdMob.showBanner({
    adId: adId,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0
  });
  bannerShown = true;
}

async function setupAds() {
  const adId = bannerUnitId();
  if (!admobConfig.useTestAds && !adId) return;

  let consentInfo = await AdMob.requestConsentInfo();
  if (consentInfo.isConsentFormAvailable && consentInfo.status === AdmobConsentStatus.REQUIRED) {
    consentInfo = await AdMob.showConsentForm();
  }
  if (!consentInfo.canRequestAds) {
    console.info('Ad consent does not allow ads. No banner will be shown.');
    return;
  }

  await AdMob.initialize({
    initializeForTesting: !!admobConfig.useTestAds
  });

  await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (info) => {
    if (!bannerShown || scratchResultOpen()) return;
    const height = Number(info && (info.height || info.adHeight)) || 0;
    if (height > 0) setBannerPadding(height + 8);
  });

  const result = document.getElementById('scratch-result');
  if (result) {
    const observer = new MutationObserver(() => {
      syncBanner().catch((err) => console.warn('Banner update failed.', err));
    });
    observer.observe(result, { attributes: true, attributeFilter: ['class'] });
  }

  adsAllowed = true;
  await syncBanner();
}

function snapshot() {
  if (typeof window.lmGetDrawAlertSnapshot !== 'function') return null;
  return window.lmGetDrawAlertSnapshot();
}

function readNotified() {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '{}');
  } catch (err) {
    return {};
  }
}

function writeNotified(snap) {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify({
    powerball: snap.powerball || '',
    megamillions: snap.megamillions || ''
  }));
}

async function ensureChannel() {
  if (Capacitor.getPlatform() !== 'android') return;
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: 'New drawings',
    description: 'A notice when the draw list has a newer date. Not a prediction.',
    importance: 3,
    visibility: 1
  });
}

async function maybeNotify() {
  if (localStorage.getItem(ALERT_KEY) !== 'on') return;
  const snap = snapshot();
  if (!snap || snap.source === 'sample') return;
  const previous = readNotified();
  const parts = [];
  if (snap.powerball && snap.powerball !== previous.powerball) parts.push('Powerball ' + snap.powerball);
  if (snap.megamillions && snap.megamillions !== previous.megamillions) parts.push('Mega Millions ' + snap.megamillions);
  if (!parts.length) return;
  if (!previous.powerball && !previous.megamillions) {
    writeNotified(snap);
    return;
  }
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') return;
  await LocalNotifications.schedule({
    notifications: [{
      id: 24001,
      channelId: CHANNEL_ID,
      title: 'A newer drawing is listed',
      body: parts.join(' and ') + '. This is not a prediction.',
      schedule: { at: new Date(Date.now() + 800), allowWhileIdle: true }
    }]
  });
  writeNotified(snap);
}

function setAlertButton(on) {
  const button = document.getElementById('btn-draw-alerts');
  const copy = document.getElementById('draw-alert-copy');
  if (button) {
    button.classList.remove('hidden');
    button.textContent = on ? 'Turn off draw alerts' : 'Turn on draw alerts';
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  if (copy) {
    copy.textContent = on
      ? 'Draw alerts are on for this device. You will be notified only when a newer drawing date shows up. An alert is not a prediction.'
      : 'Turn on draw alerts if you want a notice when a newer drawing is in the list. Nothing is sent until you turn this on. An alert is not a prediction.';
  }
}

async function setupAlerts() {
  const button = document.getElementById('btn-draw-alerts');
  setAlertButton(localStorage.getItem(ALERT_KEY) === 'on');
  if (!button || button.dataset.bound === 'yes') return;
  button.dataset.bound = 'yes';
  button.addEventListener('click', async () => {
    if (localStorage.getItem(ALERT_KEY) === 'on') {
      localStorage.setItem(ALERT_KEY, 'off');
      setAlertButton(false);
      return;
    }
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') {
      const copy = document.getElementById('draw-alert-copy');
      if (copy) copy.textContent = 'Notifications are blocked for this app. You can allow them in the phone settings. No alert was turned on.';
      return;
    }
    await ensureChannel();
    localStorage.setItem(ALERT_KEY, 'on');
    const snap = snapshot();
    if (snap) writeNotified(snap);
    setAlertButton(true);
  });
}

async function bootNative() {
  if (!Capacitor.isNativePlatform()) return;
  await setupAlerts();
  document.addEventListener('lm-draws-ready', () => {
    maybeNotify().catch((err) => console.warn('Draw alert failed.', err));
  });
  await App.addListener('appStateChange', (state) => {
    if (!state.isActive || typeof window.lmReloadDraws !== 'function') return;
    window.lmReloadDraws();
  });
  try {
    await setupAds();
  } catch (err) {
    console.warn('Ads did not start.', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  bootNative().catch((err) => console.warn('Native shell failed.', err));
});
