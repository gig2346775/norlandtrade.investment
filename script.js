/* ============================================================
   script.js  —  Landing page logic (Firebase-aware)
   ============================================================ */

/* ---- Update navbar once Firebase auth state is known ---- */
Auth.ready((user) => {
  const signinBtn = document.getElementById('nav-signin-btn');
  if (user && signinBtn) {
    signinBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      Dashboard`;
    signinBtn.href = 'dashboard.html';
  }
});

/* ---- Mobile hamburger menu ---- */
(function() {
  const toggle     = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const overlay    = document.getElementById('mobile-overlay');

  function openMenu()  { mobileMenu.classList.add('open');    overlay.classList.add('show');    toggle.setAttribute('aria-expanded','true');  document.body.style.overflow = 'hidden'; }
  function closeMenu() { mobileMenu.classList.remove('open'); overlay.classList.remove('show'); toggle.setAttribute('aria-expanded','false'); document.body.style.overflow = ''; }

  if (toggle)  toggle.addEventListener('click', () => mobileMenu.classList.contains('open') ? closeMenu() : openMenu());
  if (overlay) overlay.addEventListener('click', closeMenu);
  document.querySelectorAll('.mobile-nav button, .mobile-nav a').forEach(el => el.addEventListener('click', closeMenu));
})();

/* ---- Data ---- */
const packages = [
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

const testimonials = [
  { name:'Oluwaseun Adebayo', role:'Verified Investor', avatar:'OA', text:'I invested ₦50,000 in the Ultimate package and received ₦100,000 exactly 1 hour 45 minutes later. Extremely reliable platform!' },
  { name:'Chioma Nwosu',      role:'Verified Investor', avatar:'CN', text:'Norland Investment is truly legitimate. My Pearl package payout came through perfectly. I highly recommend it to anyone looking to grow their wealth.' },
  { name:'Abubakar Ibrahim',  role:'Verified Investor', avatar:'AI', text:'Fast processing and amazing customer support. I doubled my ₦100,000 to ₦200,000 without any hassle. This is the real deal.' },
];

const steps = [
  { icon:'package',     title:'Choose a Package', desc:'Select any investment package that fits your budget.' },
  { icon:'credit-card', title:'Make Payment',      desc:'Transfer your investment amount to our provided account.' },
  { icon:'file-text',   title:'Submit Details',    desc:'Provide your account number for the return transfer.' },
  { icon:'banknote',    title:'Receive Returns',   desc:'Get 2x your investment within 2 hours.' },
];
const stepIcons = {
  'package':     `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  'credit-card': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  'file-text':   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  'banknote':    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>`,
};

/* ---- Scroll helper ---- */
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior:'smooth' });
}

/* ---- Render packages ---- */
function renderPackages() {
  const grid = document.getElementById('packages-grid');
  if (!grid) return;
  grid.innerHTML = packages.map(pkg => `
    <div class="pkg-card fade-up">
      <div class="pkg-name">🔰 ${pkg.name}</div>
      <div class="pkg-label">Investment</div>
      <div class="pkg-invest">${fmt(pkg.investment)}</div>
      <div class="pkg-roi-wrap">
        <div class="pkg-roi-lbl">Return (2x)</div>
        <div class="pkg-roi">${fmt(pkg.roi)}</div>
      </div>
      <button class="pkg-btn" onclick="scrollToSection('invest')">
        Invest in ${pkg.name}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </button>
    </div>`).join('');
}

/* ---- Render testimonials ---- */
function renderTestimonials() {
  const grid = document.getElementById('testi-grid');
  if (!grid) return;
  const star = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  grid.innerHTML = testimonials.map(t => `
    <div class="testi-card fade-up">
      <svg class="quote-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
      <div class="testi-stars">${star.repeat(5)}</div>
      <p class="testi-text">"${t.text}"</p>
      <div class="testi-author">
        <div class="testi-avatar">${t.avatar}</div>
        <div><div class="testi-name">${t.name}</div><div class="testi-role">${t.role}</div></div>
      </div>
    </div>`).join('');
}

/* ---- Render steps ---- */
function renderSteps() {
  const container = document.getElementById('steps-container');
  if (!container) return;
  container.innerHTML = steps.map((s,i) => `
    <div class="step fade-up">
      <div class="step-circle">
        ${stepIcons[s.icon]}
        <span class="step-num">${i+1}</span>
      </div>
      <h4>${s.title}</h4>
      <p>${s.desc}</p>
    </div>`).join('');
}

/* ---- Populate package select ---- */
function populateSelect() {
  const sel = document.getElementById('pkg-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Choose an investment package --</option>' +
    packages.map(p => `<option value="${p.name}">🔰 ${p.name} — ${fmt(p.investment)} (Returns ${fmt(p.roi)})</option>`).join('');
}

/* ---- Form submit ---- */
function submitInvestForm(e) {
  e.preventDefault();
  document.getElementById('form-content').style.display = 'none';
  const msg = document.getElementById('success-msg');
  msg.style.display = 'flex';
  setTimeout(() => { msg.style.display = 'none'; document.getElementById('form-content').style.display = 'block'; e.target.reset(); }, 5000);
}

/* ---- Floating CTA ---- */
window.addEventListener('scroll', () => {
  const cta = document.getElementById('floating-cta');
  if (cta) cta.classList.toggle('visible', window.scrollY > 800);
});

/* ---- Scroll animations ---- */
function initAnimations() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const siblings = entry.target.parentElement.querySelectorAll('.fade-up');
        const idx = Array.from(siblings).indexOf(entry.target);
        setTimeout(() => entry.target.classList.add('visible'), idx * 80);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
}

/* ============================================================
   LIVE WITHDRAWAL FEED
   ============================================================ */
const WD_NAMES = [
  'Oluwaseun A.','Chioma N.','Abubakar I.','Funmilayo O.','Emeka C.',
  'Blessing U.','Taiwo A.','Kelechi O.','Ngozi E.','Yusuf M.',
  'Adaeze O.','Seun B.','Tunde A.','Ify N.','Chidi O.',
  'Amaka E.','Gbenga F.','Sade K.','Obinna M.','Fatima Y.',
  'Uchenna A.','Halima S.','Rotimi B.','Ebele I.','Musa D.',
  'Chiamaka O.','Lanre F.','Esther N.','Ifeanyi U.','Bola A.',
  'Zainab K.','Chukwuma E.','Tolani O.','Rejoice M.','Damilare S.',
  'Adaora B.','Bamidele C.','Grace I.','Uche P.','Mariam T.',
];
const WD_PACKAGES = ['Premium','Emerald','Platinum','Sapphire','Ultimate','Opal','Pearl','Gold','Quartz','Topaz','Garnet','Ruby'];
const WD_AMOUNTS  = [40000,50000,60000,80000,100000,120000,150000,160000,200000,300000,400000,500000,750000,1000000,1200000,1500000,2000000,2500000,3000000,4000000,5000000];

function fmtWd(n) {
  if (n >= 1_000_000) return '₦' + (n/1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
  if (n >= 1_000)     return '₦' + (n/1_000).toFixed(0) + 'K';
  return '₦' + n.toLocaleString();
}
function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function initials(name) { return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function genWithdrawal() {
  const pkg = randFrom(WD_PACKAGES);
  return { name:randFrom(WD_NAMES), pkg, amount:WD_AMOUNTS[WD_PACKAGES.indexOf(pkg)], time:['just now','1 min ago','2 mins ago','3 mins ago','5 mins ago','8 mins ago','12 mins ago'][Math.floor(Math.random()*7)] };
}
function buildWithdrawals(n) { return Array.from({length:n}, genWithdrawal); }

function animateCounter(el, target) {
  const start = performance.now(), dur = 1800;
  function tick(now) {
    const pct = Math.min(1, (now-start)/dur);
    const ease = 1 - Math.pow(1-pct,3);
    el.textContent = '₦' + Math.round(target*ease).toLocaleString();
    if (pct < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderWithdrawalFeed() {
  const track = document.getElementById('lw-track');
  const list  = document.getElementById('lw-list');
  if (!track || !list) return;

  const pool = buildWithdrawals(30);
  const todayTotal = pool.slice(0,10).reduce((s,w)=>s+w.amount,0);
  const weekTotal  = Math.round(pool.reduce((s,w)=>s+w.amount,0)*4.2);
  const allTotal   = Math.round(weekTotal*12+847_000_000);

  const todayEl = document.getElementById('lw-paid-today');
  const weekEl  = document.getElementById('lw-paid-week');
  const allEl   = document.getElementById('lw-paid-all');
  if (todayEl) animateCounter(todayEl, todayTotal);
  if (weekEl)  animateCounter(weekEl,  weekTotal);
  if (allEl)   animateCounter(allEl,   allTotal);

  const chips = [...pool, ...pool];
  track.innerHTML = chips.map(w => `
    <div class="lw-chip">
      <div class="lw-chip-avatar">${initials(w.name)}</div>
      <div class="lw-chip-name">${w.name}</div>
      <div class="lw-chip-sep">·</div>
      <div class="lw-chip-amt">${fmtWd(w.amount)}</div>
      <div class="lw-chip-dot"></div>
    </div>`).join('');

  list.innerHTML = pool.slice(0,8).map(w => `
    <div class="lw-item">
      <div class="lw-item-avatar">${initials(w.name)}</div>
      <div class="lw-item-meta">
        <div class="lw-item-name">${w.name}</div>
        <div class="lw-item-pkg">🔰 ${w.pkg} Package</div>
      </div>
      <div class="lw-item-right">
        <div class="lw-item-amount">${fmtWd(w.amount)}</div>
        <div class="lw-item-time">${w.time}</div>
      </div>
      <div class="lw-item-tick">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
    </div>`).join('');

  setInterval(() => {
    if (document.hidden) return;
    const w  = genWithdrawal();
    const el = document.createElement('div');
    el.className = 'lw-item';
    el.innerHTML = `
      <div class="lw-item-avatar">${initials(w.name)}</div>
      <div class="lw-item-meta">
        <div class="lw-item-name">${w.name}</div>
        <div class="lw-item-pkg">🔰 ${w.pkg} Package</div>
      </div>
      <div class="lw-item-right">
        <div class="lw-item-amount">${fmtWd(w.amount)}</div>
        <div class="lw-item-time">just now</div>
      </div>
      <div class="lw-item-tick">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>`;
    list.prepend(el);
    while (list.children.length > 8) list.removeChild(list.lastChild);
    const ctr = document.getElementById('lw-total-count');
    if (ctr) ctr.textContent = ((parseInt(ctr.textContent.replace(/,/g,'')) || 12847) + 1).toLocaleString();
  }, 3800 + Math.random() * 1200);
}

function startWithdrawalToasts() {
  const toast = document.getElementById('wd-toast');
  const tName = document.getElementById('wd-toast-name');
  const tAmt  = document.getElementById('wd-toast-amount');
  if (!toast) return;
  function show() {
    const w = genWithdrawal();
    tName.textContent = w.name + ' (' + w.pkg + ' pkg)';
    tAmt.textContent  = fmtWd(w.amount) + ' withdrawn';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
  }
  setTimeout(() => { show(); setInterval(show, 6000 + Math.random()*4000); }, 3000);
}

/* ---- Boot ---- */
document.addEventListener('DOMContentLoaded', () => {
  renderPackages();
  renderTestimonials();
  renderSteps();
  populateSelect();
  renderWithdrawalFeed();
  startWithdrawalToasts();
  setTimeout(initAnimations, 50);
});
