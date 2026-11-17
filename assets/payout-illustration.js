export function parseMoney(value) {
  const text = String(value ?? '').replace(/[$,\s]/g, '');
  if (!text) return NaN;
  return Number(text);
}

export function parseRate(value) {
  const text = String(value ?? '').trim().replace(/%/g, '');
  if (!text) return null;
  return Number(text);
}

function roundCents(value) {
  return Math.round(value * 100) / 100;
}

function lineFor(base, federalRate, stateRate) {
  const federal = roundCents(base * federalRate);
  const state = roundCents(base * stateRate);
  return { base, federal, state, remainder: roundCents(base - federal - state) };
}

export function illustratePayout({ annuity, cash, applyFederal, statePercent }) {
  const errors = [];
  if (!Number.isFinite(annuity) || annuity < 0) errors.push('Enter an advertised annuity of zero or more.');
  if (!Number.isFinite(cash) || cash < 0) errors.push('Enter a cash value of zero or more.');
  if (statePercent != null && (!Number.isFinite(statePercent) || statePercent < 0 || statePercent > 100)) {
    errors.push('Enter a state rate from 0 to 100, or leave it blank.');
  }
  if (errors.length) return { ok: false, errors };
  const federalRate = applyFederal ? 0.24 : 0;
  const stateRate = statePercent == null ? 0 : statePercent / 100;
  return {
    ok: true,
    applyFederal: Boolean(applyFederal),
    statePercent: statePercent == null ? null : statePercent,
    annuity: lineFor(annuity, federalRate, stateRate),
    cash: lineFor(cash, federalRate, stateRate),
    cashShare: annuity > 0 ? cash / annuity : null
  };
}

export function formatMoney(value) {
  return Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

export function renderIllustration(result) {
  const note = '<p class="payout-note">Illustration only, not tax advice, not your actual tax bill.</p>';
  if (!result.ok) {
    return `${note}<p>${result.errors.map(escapeHtml).join(' ')}</p>`;
  }
  const federalLabel = result.applyFederal
    ? 'Federal 24 percent of the full amount, as a prepayment'
    : 'Federal withholding left off';
  const stateLabel = result.statePercent == null
    ? 'No state rate entered'
    : `State rate ${result.statePercent} percent of the full amount`;
  const share = result.cashShare == null
    ? 'The advertised annuity is zero, so there is no cash share to show.'
    : `The cash option is ${(result.cashShare * 100).toFixed(1)} percent of the advertised annuity.`;
  const lines = [
    ['Amount entered', result.annuity.base, result.cash.base],
    [federalLabel, result.annuity.federal, result.cash.federal],
    [stateLabel, result.annuity.state, result.cash.state],
    ['Illustrated remainder', result.annuity.remainder, result.cash.remainder]
  ];
  const column = (heading, index) => `<section class="payout-column"><h4>${heading}</h4><dl>${lines.map(([label, annuity, cash]) => `<div><dt>${escapeHtml(label)}</dt><dd>${formatMoney(index === 0 ? annuity : cash)}</dd></div>`).join('')}</dl></section>`;
  return `${note}
    <div class="payout-compare">
      ${column('Advertised annuity', 0)}
      ${column('Cash option', 1)}
    </div>
    <p>${escapeHtml(share)} Both rates are applied to the full amount, then subtracted. This remainder is not a take-home paycheck. An annuity is paid over many years, so the annuity figures are not the tax for one year.</p>`;
}

function bindPayoutForm() {
  const form = document.getElementById('payout-form');
  const live = document.getElementById('payout-live');
  if (!form || !live) return;
  const update = () => {
    const result = illustratePayout({
      annuity: parseMoney(form.elements.annuity.value),
      cash: parseMoney(form.elements.cash.value),
      applyFederal: form.elements.federal.checked,
      statePercent: parseRate(form.elements.state.value)
    });
    live.innerHTML = renderIllustration(result);
  };
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    update();
  });
  form.addEventListener('input', update);
  update();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindPayoutForm);
  else bindPayoutForm();
}
