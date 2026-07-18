/* ============================================================
   dashboard.js  —  Norland Investment Dashboard
   Backend: Firebase (auth handled via auth.js / Auth.ready)
   ============================================================ */

document.body.style.visibility = 'hidden';

Auth.ready((user) => {
  if (!user) { location.href = 'login.html'; return; }
  document.body.style.visibility = 'visible';
  _bootDashboard(user);
});

window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('page-loader');
    if (loader) loader.classList.add('hidden');
  }, 800);
});

/* ---- Mobile sidebar toggle ---- */
(function() {
  const toggle  = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  function openSidebar()  { sidebar.classList.add('open');    overlay.classList.add('show');    document.body.style.overflow = 'hidden'; }
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); document.body.style.overflow = ''; }
  if (toggle)  toggle.addEventListener('click', openSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);
  document.querySelectorAll('.sidebar-nav button').forEach(btn => {
    btn.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); });
  });
})();

/* ---- Packages ---- */
const PACKAGES = [
  { name:'Premium',  investment:20000,  roi:40000  },
  { name:'Emerald',  investment:25000,  roi:50000  },
  { name:'Platinum', investment:30000,  roi:60000  },
  { name:'Sapphire', investment:40000,  roi:80000  },
  { name:'Ultimate', investment:50000,  roi:100000 },
  { name:'Opal',     investment:60000,  roi:120000 },
  { name:'Pearl',    investment:75000,  roi:150000 },
  { name:'Gold',     investment:80000,  roi:160000 },
  { name:'Quartz',   investment:100000, roi:200000 },
  { name:'Topaz',    investment:150000, roi:300000 },
  { name:'Garnet',   investment:200000, roi:400000 },
  { name:'Ruby',     investment:250000, roi:500000 },
];

/* Package tier colors */
const PKG_COLORS = {
  'Premium':  { bg:'rgba(59,130,246,.08)',  accent:'#3b82f6',  badge:'#1e40af' },
  'Emerald':  { bg:'rgba(16,185,129,.08)',  accent:'#10b981',  badge:'#065f46' },
  'Platinum': { bg:'rgba(148,163,184,.08)', accent:'#94a3b8',  badge:'#334155' },
  'Sapphire': { bg:'rgba(99,102,241,.08)',  accent:'#6366f1',  badge:'#3730a3' },
  'Ultimate': { bg:'rgba(245,158,11,.08)',  accent:'#f59e0b',  badge:'#92400e' },
  'Opal':     { bg:'rgba(14,165,233,.08)',  accent:'#0ea5e9',  badge:'#0c4a6e' },
  'Pearl':    { bg:'rgba(236,72,153,.08)',  accent:'#ec4899',  badge:'#831843' },
  'Gold':     { bg:'rgba(234,179,8,.08)',   accent:'#eab308',  badge:'#713f12' },
  'Quartz':   { bg:'rgba(168,85,247,.08)',  accent:'#a855f7',  badge:'#581c87' },
  'Topaz':    { bg:'rgba(239,68,68,.08)',   accent:'#ef4444',  badge:'#7f1d1d' },
  'Garnet':   { bg:'rgba(249,115,22,.08)',  accent:'#f97316',  badge:'#7c2d12' },
  'Ruby':     { bg:'rgba(244,63,94,.08)',   accent:'#f43f5e',  badge:'#881337' },
};

/* Package tier icons */
const PKG_ICONS = {
  'Premium':  '💎',
  'Emerald':  '🟢',
  'Platinum': '⚪',
  'Sapphire': '🔷',
  'Ultimate': '⚡',
  'Opal':     '🌊',
  'Pearl':    '🌸',
  'Gold':     '🥇',
  'Quartz':   '💜',
  'Topaz':    '🔴',
  'Garnet':   '🔶',
  'Ruby':     '❤️',
};

/* ---- State ---- */
let selectedPkg      = null;
let countdownTimer   = null;
let balanceAnimReq   = null;
let displayedBalance = 0;

/* ---- Affiliate constants (must match auth.js) ---- */
const AFF_PER_BATCH = 20;
const AFF_REWARD    = 5000000;

/* ================================================================
   BOOT
   ================================================================ */
async function _bootDashboard(user) {
  const updated = await Auth.creditMatured();
  const u = updated || user;

  // Sidebar & topbar
  document.getElementById('sidebar-avatar').textContent = u.name.slice(0,2).toUpperCase();
  document.getElementById('sidebar-name').textContent   = u.name;
  document.getElementById('sidebar-email').textContent  = u.email;
  const tb = document.getElementById('topbar-avatar');
  if (tb) tb.textContent = u.name.slice(0,2).toUpperCase();

  // Overview hero card
  const ovAvatar = document.getElementById('ov-avatar');
  const ovName   = document.getElementById('ov-name');
  if (ovAvatar) ovAvatar.textContent = u.name.slice(0,2).toUpperCase();
  if (ovName)   ovName.textContent   = u.name.split(' ')[0];

  renderAll();

  // Poll every 5 s for matured investments
  countdownTimer = setInterval(async () => {
    await Auth.creditMatured();
    updateStatsAndBalance();
    updateActiveInvestments();
  }, 5000);

  // Countdown tick every second
  setInterval(updateActiveInvestments, 1000);
}

/* ================================================================
   RENDER ALL
   ================================================================ */
function renderAll() {
  updateStatsAndBalance();
  renderPackageGrid();
  renderAffiliate();
  updateActiveInvestments();
}

/* ---- Stats & balance ---- */
function updateStatsAndBalance() {
  const user = Auth.getUser();
  if (!user) return;

  const activeCount = (user.investments || []).filter(i => !i.credited).length;
  const totalEarned = (user.investments || []).filter(i => i.credited).reduce((s,i) => s + i.payout, 0);
  const walletBal   = user.balance || 0;

  /* Overview stat strip */
  const ovActive   = document.getElementById('ov-active-count');
  const ovEarn     = document.getElementById('ov-earned');
  const ovWithdraw = document.getElementById('ov-withdraw');
  if (ovActive)   ovActive.textContent   = activeCount;
  if (ovEarn)     ovEarn.textContent     = fmt(totalEarned);
  if (ovWithdraw) ovWithdraw.textContent = fmt(walletBal);

  /* Invest-tab wallet bar */
  const iwDisplay = document.getElementById('invest-wallet-display');
  if (iwDisplay) iwDisplay.textContent = fmt(walletBal);

  animateBalance(walletBal);
}

function animateBalance(target) {
  const el   = document.getElementById('ov-balance');
  const from = displayedBalance;
  if (from === target) { if (el) el.textContent = fmt(target); return; }
  const start = performance.now(), dur = 800;
  if (balanceAnimReq) cancelAnimationFrame(balanceAnimReq);
  function tick(now) {
    const pct = Math.min(1, (now - start) / dur);
    const val = Math.round(from + (target - from) * pct);
    if (el) el.textContent = fmt(val);
    if (pct < 1) balanceAnimReq = requestAnimationFrame(tick);
    else displayedBalance = target;
  }
  balanceAnimReq = requestAnimationFrame(tick);
}

/* ---- Active investments countdown ---- */
function updateActiveInvestments() {
  const user    = Auth.getUser();
  if (!user) return;
  const active  = (user.investments || []).filter(i => !i.credited);
  const section = document.getElementById('active-inv-section');
  const list    = document.getElementById('active-inv-list');
  if (!section) return;
  if (active.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  const now = Date.now();
  list.innerHTML = active.map(inv => {
    const remaining = Math.max(0, inv.paidAt - now);
    const total     = inv.paidAt - inv.startedAt;
    const pct       = Math.min(100, Math.round(((total - remaining) / total) * 100));
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    const done = remaining === 0;
    const timerText = done
      ? '✓ Credited!'
      : `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `
      <div class="inv-card">
        <div class="inv-card-top">
          <div>
            <div class="inv-name">🔰 ${inv.packageName} Package</div>
            <div class="inv-amounts">${fmt(inv.amount)} → <span class="arrow">${fmt(inv.payout)}</span></div>
          </div>
          <div>
            <div class="inv-timer ${done ? 'done' : ''}">${timerText}</div>
            <div class="inv-timer-label">${done ? 'Payout received' : 'until payout'}</div>
          </div>
        </div>
        <div class="inv-progress-track"><div class="inv-progress-fill" style="width:${pct}%"></div></div>
        <div class="inv-pct">${pct}% processed</div>
      </div>`;
  }).join('');
}

/* ---- Package grid (enhanced with animations) ---- */
function renderPackageGrid() {
  const el = document.getElementById('pkg-grid');
  if (!el) return;

  el.innerHTML = PACKAGES.map((pkg, index) => {
    const color = PKG_COLORS[pkg.name] || PKG_COLORS['Premium'];
    const icon  = PKG_ICONS[pkg.name] || '🔰';
    const roi   = Math.round((pkg.roi / pkg.investment - 1) * 100);
    return `
    <button
      class="pkg-item pkg-item-v2"
      onclick="selectPkg('${pkg.name}', this)"
      style="--pkg-accent:${color.accent};--pkg-bg:${color.bg};animation-delay:${index * 60}ms"
    >
      <div class="pkg-v2-header">
        <span class="pkg-v2-icon">${icon}</span>
        <span class="pkg-v2-roi-badge">+${roi}%</span>
      </div>
      <div class="pkg-v2-name">${pkg.name}</div>
      <div class="pkg-v2-invest-label">Invest</div>
      <div class="pkg-v2-invest-amt">${fmt(pkg.investment)}</div>
      <div class="pkg-v2-divider"></div>
      <div class="pkg-v2-return-row">
        <span class="pkg-v2-return-label">You Receive</span>
        <span class="pkg-v2-arrow">→</span>
        <span class="pkg-v2-return-amt">${fmt(pkg.roi)}</span>
      </div>
      <div class="pkg-v2-footer">
        <span class="pkg-v2-time">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          2 hrs payout
        </span>
        <span class="pkg-v2-select-btn">Select →</span>
      </div>
    </button>`;
  }).join('');

  /* stagger fade-in */
  requestAnimationFrame(() => {
    el.querySelectorAll('.pkg-item-v2').forEach((card, i) => {
      setTimeout(() => card.classList.add('pkg-v2-visible'), i * 60);
    });
  });
}

function selectPkg(name, btn) {
  selectedPkg = PACKAGES.find(p => p.name === name);
  if (!selectedPkg) return;

  /* ---- Balance gate ---- */
  const user    = Auth.getUser();
  const balance = user?.balance || 0;
  if (balance < selectedPkg.investment) {
    showInsufficientFunds(selectedPkg, balance);
    return;
  }

  document.querySelectorAll('.pkg-item').forEach(el => el.classList.remove('selected'));
  if (btn) btn.classList.add('selected');

  document.getElementById('modal-pkg-name').textContent = selectedPkg.name;
  document.getElementById('md-pkg').textContent  = selectedPkg.name;
  document.getElementById('md-amt').textContent  = fmt(selectedPkg.investment);
  document.getElementById('md-ret').textContent  = fmt(selectedPkg.roi);
  /* Show wallet balance in confirm modal */
  const mdWallet = document.getElementById('md-wallet');
  if (mdWallet) mdWallet.textContent = fmt(balance);
  const mdAfter = document.getElementById('md-after');
  if (mdAfter) mdAfter.textContent = fmt(balance - selectedPkg.investment);

  document.getElementById('confirm-modal').classList.add('show');
}

/* ---- Insufficient-funds modal ---- */
function showInsufficientFunds(pkg, currentBalance) {
  const needed = pkg.investment - currentBalance;
  document.getElementById('insuf-pkg-name').textContent    = pkg.name;
  document.getElementById('insuf-pkg-cost').textContent    = fmt(pkg.investment);
  document.getElementById('insuf-current').textContent     = fmt(currentBalance);
  document.getElementById('insuf-needed').textContent      = fmt(needed);
  document.getElementById('insuf-modal').classList.add('show');
}
function closeInsufficientModal() {
  document.getElementById('insuf-modal').classList.remove('show');
  selectedPkg = null;
}

function closeModal() {
  document.getElementById('confirm-modal').classList.remove('show');
  document.querySelectorAll('.pkg-item').forEach(el => el.classList.remove('selected'));
  selectedPkg = null;
}

async function confirmInvest() {
  if (!selectedPkg) return;

  /* Double-check balance at confirm time */
  const user    = Auth.getUser();
  const balance = user?.balance || 0;
  if (balance < selectedPkg.investment) {
    closeModal();
    showInsufficientFunds(selectedPkg, balance);
    return;
  }

  const btn = document.querySelector('.modal-confirm');
  btn.disabled = true;
  btn.textContent = 'Processing…';

  const result = await Auth.addInvestment(selectedPkg.name, selectedPkg.investment, selectedPkg.roi);

  btn.disabled = false;
  btn.textContent = 'Invest Now';

  if (result?.error) {
    /* Show error inside modal */
    const errEl = document.getElementById('modal-error');
    if (errEl) { errEl.textContent = result.error; errEl.style.display = 'block'; }
    setTimeout(() => { if (errEl) errEl.style.display = 'none'; }, 3000);
    return;
  }

  closeModal();
  const banner = document.getElementById('invest-success');
  banner.classList.add('show');
  setTimeout(() => banner.classList.remove('show'), 4000);
  renderAll();
}

/* ================================================================
   AFFILIATE TAB
   ================================================================ */
function renderAffiliate() {
  const user = Auth.getUser();
  if (!user) return;

  const code      = user.affiliateCode || '—';
  const refs      = user.referrals     || 0;
  const earnings  = user.affiliateEarnings || 0;
  const batches   = Math.floor(refs / AFF_PER_BATCH);
  const inBatch   = refs % AFF_PER_BATCH;
  const pct       = Math.round((inBatch / AFF_PER_BATCH) * 100);
  const nextTarget= refs - inBatch + AFF_PER_BATCH;

  // Build the referral link
  const base = window.location.href.replace(/[^/]*$/, '');
  const link = `${base}login.html?ref=${code}`;

  // Code display
  const codeEl = document.getElementById('aff-code');
  if (codeEl) codeEl.textContent = code;

  // Link preview
  const linkPrev = document.getElementById('aff-link-preview');
  if (linkPrev) linkPrev.textContent = `login.html?ref=${code}`;

  // Progress
  const fillEl = document.getElementById('aff-progress-fill');
  const pctEl  = document.getElementById('aff-progress-pct');
  const inEl   = document.getElementById('aff-progress-in-batch');
  const nextEl = document.getElementById('aff-next-target');
  if (fillEl) fillEl.style.width = pct + '%';
  if (pctEl)  pctEl.textContent  = pct + '%';
  if (inEl)   inEl.textContent   = `${inBatch} / ${AFF_PER_BATCH} referrals (₦5M every 20)`;
  if (nextEl) nextEl.textContent = nextTarget;

  // Count badge
  const countEl = document.getElementById('aff-count-num');
  if (countEl) countEl.textContent = refs;

  // Stats cards
  const totalEl   = document.getElementById('aff-total-refs');
  const batchEl   = document.getElementById('aff-batches');
  const earnEl    = document.getElementById('aff-earnings-display');
  if (totalEl) totalEl.textContent = refs;
  if (batchEl) batchEl.textContent = batches;
  if (earnEl)  earnEl.textContent  = fmt(earnings);

  // WhatsApp / Telegram share links
  const msg    = encodeURIComponent(`Join Norland Investment and start earning 2× returns! Use my referral code ${code} to register: ${link}`);
  const waLink = document.getElementById('aff-wa-link');
  const tgLink = document.getElementById('aff-tg-link');
  if (waLink) waLink.href = `https://wa.me/?text=${msg}`;
  if (tgLink) tgLink.href = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Join Norland Investment! Use code ${code} to register.`)}`;
}

function copyCode() {
  const user = Auth.getUser();
  const code = user?.affiliateCode || '';
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('aff-copy-code-btn');
    const orig = btn.innerHTML;
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Copied!`;
    btn.style.background = 'rgba(34,197,94,.15)';
    btn.style.borderColor = 'rgba(34,197,94,.4)';
    btn.style.color = '#4ade80';
    setTimeout(() => { btn.innerHTML = orig; btn.style = ''; }, 2000);
  }).catch(() => {});
}

function copyLink() {
  const user = Auth.getUser();
  const code = user?.affiliateCode || '';
  const base = window.location.href.replace(/[^/]*$/, '');
  const link = `${base}login.html?ref=${code}`;
  navigator.clipboard.writeText(link).then(() => {
    const btn = document.querySelector('.aff-share-btn');
    const orig = btn.innerHTML;
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Copied!`;
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  }).catch(() => {});
}

/* ================================================================
   TAB SWITCHING
   ================================================================ */
function switchTab(tabId, btn) {
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
  const tabEl = document.getElementById(`tab-${tabId}`);
  if (tabEl) tabEl.classList.add('active');
  document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
  const target = btn || document.querySelector(`.sidebar-nav button[data-tab="${tabId}"]`);
  if (target) target.classList.add('active');
  if (tabId === 'overview')  renderAll();
  if (tabId === 'affiliate') renderAffiliate();
}

/* ================================================================
   LOGOUT
   ================================================================ */
async function doLogout() {
  clearInterval(countdownTimer);
  await Auth.logout();
  location.href = 'index.html';
}

/* ---- Close confirm modal on backdrop click ---- */
document.getElementById('confirm-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

/* ---- Currency formatter ---- */
function fmt(n) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', minimumFractionDigits: 0,
  }).format(n);
}
