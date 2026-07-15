/* ============================================================
   dashboard.js  —  Norland Investment Dashboard logic
   ============================================================ */

/* ---- Redirect if not logged in ---- */
if (!Auth.isLoggedIn()) location.href = 'login.html';

/* ---- Data ---- */
const PACKAGES = [
  { name:"Premium",  investment:20000,  roi:40000  },
  { name:"Emerald",  investment:25000,  roi:50000  },
  { name:"Platinum", investment:30000,  roi:60000  },
  { name:"Sapphire", investment:40000,  roi:80000  },
  { name:"Ultimate", investment:50000,  roi:100000 },
  { name:"Opal",     investment:60000,  roi:120000 },
  { name:"Pearl",    investment:75000,  roi:150000 },
  { name:"Gold",     investment:80000,  roi:160000 },
  { name:"Quartz",   investment:100000, roi:200000 },
  { name:"Topaz",    investment:150000, roi:300000 },
  { name:"Garnet",   investment:200000, roi:400000 },
  { name:"Ruby",     investment:250000, roi:500000 },
];

const BLOGS = [
  { id:"blog1", title:"10 Smart Ways to Grow Your Money in Nigeria",    excerpt:"Discover proven strategies that everyday Nigerians use to build lasting wealth in today's economy.",                             readTime:3, reward:300, tag:"Finance Tips"   },
  { id:"blog2", title:"Why Norland Investment Returns 2x Guaranteed",   excerpt:"An inside look at how our investment model delivers consistent double returns within 2 hours.",                                    readTime:2, reward:200, tag:"Platform Guide" },
  { id:"blog3", title:"Understanding Financial Investment Basics",       excerpt:"A beginner's guide to understanding investments, returns, risk, and building a profitable portfolio.",                              readTime:4, reward:250, tag:"Education"      },
  { id:"blog4", title:"How to Set and Achieve Your Financial Goals",     excerpt:"Step-by-step framework for setting realistic financial milestones and tracking your progress.",                                    readTime:3, reward:150, tag:"Goal Setting"   },
  { id:"blog5", title:"The Power of Consistent Daily Investing",         excerpt:"Why investing small amounts every day can grow into life-changing wealth over time.",                                             readTime:2, reward:200, tag:"Strategy"      },
];

/* ---- State ---- */
let selectedPkg    = null;
let blogTimers     = {};    // blogId → { remaining, intervalId }
let countdownTimer = null;  // master interval for investment countdowns
let balanceAnimReq = null;
let displayedBalance = 0;

/* ================================================================
   INIT
   ================================================================ */
function init() {
  const user = Auth.creditMatured(); // credit any matured investments first
  if (!user) { location.href = 'login.html'; return; }

  /* Sidebar user info */
  document.getElementById('sidebar-avatar').textContent = user.name.slice(0,2).toUpperCase();
  document.getElementById('sidebar-name').textContent   = user.name;
  document.getElementById('sidebar-email').textContent  = user.email;
  document.getElementById('welcome-msg').textContent    = `Welcome back, ${user.name.split(' ')[0]} 👋`;

  renderAll();

  /* Master interval: update countdown timers + auto-credit every 5s */
  countdownTimer = setInterval(() => {
    Auth.creditMatured();
    updateActiveInvestments();
    updateStatsAndBalance();
  }, 5000);

  /* Tick countdown every second for smooth display */
  setInterval(updateActiveInvestments, 1000);
}

/* ================================================================
   RENDER ALL
   ================================================================ */
function renderAll() {
  updateStatsAndBalance();
  renderPackageGrid();
  renderBlogList();
  updateGoalTab();
  updateActiveInvestments();
}

/* ---- Stats & balance ---- */
function updateStatsAndBalance() {
  const user = Auth.getUser();
  if (!user) return;

  const totalInvested = user.investments.reduce((s,i) => s + i.amount, 0);
  const totalEarned   = user.investments.filter(i => i.credited).reduce((s,i) => s + i.payout, 0);

  document.getElementById('stat-invested').textContent = fmt(totalInvested);
  document.getElementById('stat-earned').textContent   = fmt(totalEarned);
  document.getElementById('stat-blog').textContent     = fmt(user.blogEarnings);

  animateBalance(user.balance);

  /* Goal progress bar on balance card */
  if (user.goal > 0) {
    const pct = Math.min(100, Math.round((user.balance / user.goal) * 100));
    document.getElementById('goal-progress-wrap').style.display = 'block';
    document.getElementById('goal-bar-label').textContent = user.goalLabel || fmt(user.goal);
    document.getElementById('goal-bar-pct').textContent   = pct + '%';
    document.getElementById('goal-bar-fill').style.width  = pct + '%';
  } else {
    document.getElementById('goal-progress-wrap').style.display = 'none';
  }
}

/* Balance counter animation */
function animateBalance(target) {
  const el = document.getElementById('stat-balance');
  const display = document.getElementById('balance-display');
  const from = displayedBalance;
  if (from === target) { el.textContent = fmt(target); display.textContent = fmt(target); return; }
  const start = performance.now();
  const duration = 800;
  if (balanceAnimReq) cancelAnimationFrame(balanceAnimReq);
  function tick(now) {
    const pct = Math.min(1, (now - start) / duration);
    const val = Math.round(from + (target - from) * pct);
    el.textContent = fmt(val);
    display.textContent = fmt(val);
    if (pct < 1) balanceAnimReq = requestAnimationFrame(tick);
    else { displayedBalance = target; }
  }
  balanceAnimReq = requestAnimationFrame(tick);
}

/* ---- Active investments countdown ---- */
function updateActiveInvestments() {
  const user = Auth.getUser();
  if (!user) return;
  const active = user.investments.filter(i => !i.credited);
  const section = document.getElementById('active-inv-section');
  const list    = document.getElementById('active-inv-list');

  if (active.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  const now = Date.now();
  list.innerHTML = active.map(inv => {
    const remaining     = Math.max(0, inv.paidAt - now);
    const totalDuration = inv.paidAt - inv.startedAt;
    const pct           = Math.min(100, Math.round(((totalDuration - remaining) / totalDuration) * 100));
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
        <div class="inv-progress-track">
          <div class="inv-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="inv-pct">${pct}% processed</div>
      </div>`;
  }).join('');
}

/* ---- Package grid ---- */
function renderPackageGrid() {
  const grid = document.getElementById('pkg-grid');
  grid.innerHTML = PACKAGES.map(pkg => `
    <button class="pkg-item" onclick="selectPkg('${pkg.name}')">
      <div class="name">🔰 ${pkg.name}</div>
      <div class="inv-label">Invest</div>
      <div class="inv-amount">${fmt(pkg.investment)}</div>
      <div class="ret-bar">
        <div class="ret-label">You Receive</div>
        <div class="ret-amount">${fmt(pkg.roi)}</div>
      </div>
    </button>`).join('');
}

function selectPkg(name) {
  selectedPkg = PACKAGES.find(p => p.name === name);
  if (!selectedPkg) return;
  /* Highlight selected */
  document.querySelectorAll('.pkg-item').forEach(el => el.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  /* Populate modal */
  document.getElementById('modal-pkg-name').textContent = selectedPkg.name;
  document.getElementById('md-pkg').textContent  = selectedPkg.name;
  document.getElementById('md-amt').textContent  = fmt(selectedPkg.investment);
  document.getElementById('md-ret').textContent  = fmt(selectedPkg.roi);
  document.getElementById('confirm-modal').classList.add('show');
}

function closeModal() {
  document.getElementById('confirm-modal').classList.remove('show');
  document.querySelectorAll('.pkg-item').forEach(el => el.classList.remove('selected'));
  selectedPkg = null;
}

function confirmInvest() {
  if (!selectedPkg) return;
  Auth.addInvestment(selectedPkg.name, selectedPkg.investment, selectedPkg.roi);
  closeModal();
  /* Show success */
  const banner = document.getElementById('invest-success');
  banner.classList.add('show');
  setTimeout(() => banner.classList.remove('show'), 4000);
  renderAll();
}

/* ---- Blog list ---- */
function renderBlogList() {
  const user    = Auth.getUser();
  if (!user) return;
  const today   = new Date().toISOString().slice(0,10);
  const readIds = user.blogsRead.date === today ? user.blogsRead.ids : [];

  /* Update quick-action description */
  document.getElementById('qa-blog-desc').textContent =
    `${BLOGS.length - readIds.length} articles available`;

  const list = document.getElementById('blog-list');
  list.innerHTML = BLOGS.map(blog => {
    const isRead    = readIds.includes(blog.id);
    const timerState = blogTimers[blog.id];
    const isReading  = !!timerState;
    const readSecs   = blog.readTime * 60;

    let rightHtml;
    if (isRead) {
      rightHtml = `
        <div class="blog-reward"><div class="reward-lbl">Reward</div><div class="reward-val">+${fmt(blog.reward)}</div></div>
        <div class="blog-earned">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Earned ${fmt(blog.reward)}
        </div>`;
    } else {
      rightHtml = `
        <div class="blog-reward"><div class="reward-lbl">Reward</div><div class="reward-val">+${fmt(blog.reward)}</div></div>
        <button class="blog-read-btn${isReading ? ' reading' : ''}" id="blog-btn-${blog.id}"
          onclick="startBlogRead('${blog.id}')" ${isReading ? 'disabled' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          ${isReading ? 'Reading…' : 'Read &amp; Earn'}
        </button>`;
    }

    let progressHtml = '';
    if (isReading && timerState) {
      const pct = Math.round(((readSecs - timerState.remaining) / readSecs) * 100);
      const m   = Math.floor(timerState.remaining / 60);
      const s   = timerState.remaining % 60;
      progressHtml = `
        <div class="blog-progress">
          <div class="blog-progress-labels">
            <span>Reading progress</span>
            <span class="pct">${m}:${String(s).padStart(2,'0')} left</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" id="blog-prog-${blog.id}" style="width:${pct}%;transition:width .9s linear"></div>
          </div>
        </div>`;
    }

    return `
      <div class="blog-card${isRead ? ' done' : ''}" id="blog-card-${blog.id}">
        <div class="blog-card-body">
          <div class="blog-card-top">
            <div style="flex:1;min-width:200px">
              <div class="blog-meta">
                <span class="blog-tag">${blog.tag}</span>
                <span class="blog-time">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  ${blog.readTime} min read
                </span>
              </div>
              <h3>${blog.title}</h3>
              <p>${blog.excerpt}</p>
            </div>
            <div class="blog-right">${rightHtml}</div>
          </div>
          ${progressHtml}
        </div>
      </div>`;
  }).join('');
}

function startBlogRead(blogId) {
  if (blogTimers[blogId]) return; // already reading
  const blog = BLOGS.find(b => b.id === blogId);
  if (!blog) return;
  const readSecs = blog.readTime * 60;
  blogTimers[blogId] = { remaining: readSecs };
  blogTimers[blogId].intervalId = setInterval(() => {
    blogTimers[blogId].remaining--;
    /* Update progress bar & timer label without full re-render */
    const prog = document.getElementById(`blog-prog-${blogId}`);
    const pct  = Math.round(((readSecs - blogTimers[blogId].remaining) / readSecs) * 100);
    const m    = Math.floor(blogTimers[blogId].remaining / 60);
    const s    = blogTimers[blogId].remaining % 60;
    if (prog) {
      prog.style.width = pct + '%';
      const labels = prog.closest('.blog-progress').querySelectorAll('.pct');
      labels.forEach(l => l.textContent = `${m}:${String(s).padStart(2,'0')} left`);
    }
    if (blogTimers[blogId].remaining <= 0) {
      clearInterval(blogTimers[blogId].intervalId);
      delete blogTimers[blogId];
      Auth.markBlogRead(blogId, blog.reward);
      renderBlogList();
      updateStatsAndBalance();
    }
  }, 1000);
  renderBlogList(); // re-render to show progress bar
}

/* ---- Goal tab ---- */
function updateGoalTab() {
  const user = Auth.getUser();
  if (!user) return;
  const wrap = document.getElementById('goal-current-wrap');
  if (user.goal > 0) {
    wrap.style.display = 'block';
    document.getElementById('goal-form-title').textContent = 'Update Goal';
    const pct = Math.min(100, Math.round((user.balance / user.goal) * 100));
    document.getElementById('goal-name-display').textContent   = user.goalLabel || fmt(user.goal);
    document.getElementById('goal-pct-display').textContent    = pct + '%';
    document.getElementById('goal-pct-fill').style.width       = pct + '%';
    document.getElementById('goal-saved-display').textContent  = fmt(user.balance) + ' saved';
    document.getElementById('goal-target-display').textContent = 'Goal: ' + fmt(user.goal);
    /* Milestones */
    document.getElementById('milestones').innerHTML = [25,50,75,100].map(p => {
      const reached = pct >= p;
      return `
        <div class="milestone ${reached ? 'reached' : ''}">
          ${reached
            ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'}
          <div class="m-pct">${p}%</div>
          <div class="m-amt">${fmt(Math.round(user.goal * p / 100))}</div>
        </div>`;
    }).join('');
    /* Pre-fill form */
    document.getElementById('goal-label-input').value  = user.goalLabel || '';
    document.getElementById('goal-amount-input').value = user.goal || '';
  } else {
    wrap.style.display = 'none';
    document.getElementById('goal-form-title').textContent = 'Set Your Goal';
  }
}

function saveGoal() {
  const amount = Number(document.getElementById('goal-amount-input').value);
  const label  = document.getElementById('goal-label-input').value.trim();
  if (!amount || amount < 1000) {
    alert('Please enter a valid target amount (minimum ₦1,000).');
    return;
  }
  Auth.setGoal(amount, label || fmt(amount));
  const btn = document.getElementById('goal-save-btn');
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    Goal Saved!`;
  setTimeout(() => {
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
      Save Goal`;
  }, 2000);
  updateGoalTab();
  updateStatsAndBalance();
}

/* ================================================================
   TAB SWITCHING
   ================================================================ */
function switchTab(tabId, btn) {
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
  } else {
    const target = document.querySelector(`.sidebar-nav button[data-tab="${tabId}"]`);
    if (target) target.classList.add('active');
  }
  /* Refresh data on tab enter */
  if (tabId === 'overview') { renderAll(); }
  if (tabId === 'blog')     { renderBlogList(); }
  if (tabId === 'goal')     { updateGoalTab(); }
}

/* ================================================================
   LOGOUT
   ================================================================ */
function doLogout() {
  clearInterval(countdownTimer);
  Object.values(blogTimers).forEach(t => clearInterval(t.intervalId));
  Auth.logout();
  location.href = 'index.html';
}

/* ================================================================
   CLOSE MODAL ON OVERLAY CLICK
   ================================================================ */
document.getElementById('confirm-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

/* ================================================================
   START
   ================================================================ */
init();
