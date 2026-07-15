/* ============================================================
   auth.js  —  Shared auth & data layer (localStorage)
   ============================================================ */

const USERS_KEY   = "norland_users";
const SESSION_KEY = "norland_session";

const Auth = {
  /* ---- persistence helpers ---- */
  _loadUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; }
  },
  _saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },
  _today() {
    return new Date().toISOString().slice(0, 10);
  },

  /* ---- session ---- */
  getUser() {
    const id = localStorage.getItem(SESSION_KEY);
    if (!id) return null;
    return this._loadUsers().find(u => u.id === id) || null;
  },
  isLoggedIn() { return !!this.getUser(); },

  /* ---- register ---- */
  register(name, email, password) {
    const users = this._loadUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
      return { error: "Email already registered." };
    const user = {
      id: crypto.randomUUID(),
      name, email, password,
      balance: 0,
      investments: [],
      goal: 0,
      goalLabel: "",
      blogsRead: { date: this._today(), ids: [] },
      blogEarnings: 0,
      createdAt: Date.now(),
    };
    users.push(user);
    this._saveUsers(users);
    localStorage.setItem(SESSION_KEY, user.id);
    return { user };
  },

  /* ---- login ---- */
  login(email, password) {
    const users = this._loadUsers();
    const user = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) return { error: "Invalid email or password." };
    localStorage.setItem(SESSION_KEY, user.id);
    return { user };
  },

  /* ---- logout ---- */
  logout() { localStorage.removeItem(SESSION_KEY); },

  /* ---- persist any user update ---- */
  _persist(updated) {
    const users = this._loadUsers();
    const idx = users.findIndex(u => u.id === updated.id);
    if (idx >= 0) users[idx] = updated;
    else users.push(updated);
    this._saveUsers(users);
    return updated;
  },

  /* ---- invest ---- */
  addInvestment(packageName, amount, payout) {
    const user = this.getUser();
    if (!user) return null;
    const now = Date.now();
    const inv = {
      id: crypto.randomUUID(),
      packageName, amount, payout,
      startedAt: now,
      paidAt: now + 2 * 60 * 60 * 1000, // 2 hours
      credited: false,
    };
    user.investments = [inv, ...user.investments];
    return this._persist(user);
  },

  /* ---- auto-credit matured investments ---- */
  creditMatured() {
    const user = this.getUser();
    if (!user) return null;
    const now = Date.now();
    let changed = false;
    user.investments = user.investments.map(i => {
      if (!i.credited && now >= i.paidAt) {
        user.balance += i.payout;
        changed = true;
        return { ...i, credited: true };
      }
      return i;
    });
    return changed ? this._persist(user) : user;
  },

  /* ---- blog ---- */
  markBlogRead(blogId, reward) {
    const user = this.getUser();
    if (!user) return null;
    const today = this._today();
    const existing = user.blogsRead.date === today ? user.blogsRead.ids : [];
    user.balance += reward;
    user.blogEarnings += reward;
    user.blogsRead = { date: today, ids: [...existing, blogId] };
    return this._persist(user);
  },

  /* ---- goal ---- */
  setGoal(amount, label) {
    const user = this.getUser();
    if (!user) return null;
    user.goal = amount;
    user.goalLabel = label;
    return this._persist(user);
  },
};

/* Format currency */
function fmt(n) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", minimumFractionDigits: 0
  }).format(n);
}
