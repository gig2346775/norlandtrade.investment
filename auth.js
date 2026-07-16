/* ============================================================
   auth.js — Norland Investment Platform
   Backend: Firebase Authentication + Cloud Firestore
   ============================================================ */

// ▼▼▼  PASTE YOUR FIREBASE CONFIG HERE  ▼▼▼
const firebaseConfig = {
  apiKey:            "AIzaSyB95XbXGfZ211jwUayJBzdzBmmp5DQ9EcY",
  authDomain:        "norland-investment-platform.firebaseapp.com",
  projectId:         "norland-investment-platform",
  storageBucket:     "norland-investment-platform.firebasestorage.app",
  messagingSenderId: "455458363012",
  appId:             "1:455458363012:web:ed20a062b6110b7a7ad4d1",
  measurementId:     "G-KT63PMXE5H"
};
// ▲▲▲  END OF FIREBASE CONFIG  ▲▲▲

firebase.initializeApp(firebaseConfig);
const _auth = firebase.auth();
const _db   = firebase.firestore();

// ---- Internal state ----
let _firebaseUser = null;
let _profile      = null;
let _authReady    = false;
let _readyQueue   = [];
let _profileListeners = [];  // callbacks notified when Firestore profile loads

// ---------------------------------------------------------------
//  KEY DESIGN: onAuthStateChanged fires the ready callbacks
//  IMMEDIATELY using only Firebase Auth data (no Firestore wait).
//  The full Firestore profile loads in the background, then
//  listeners are notified so the dashboard can re-render.
// ---------------------------------------------------------------
_auth.onAuthStateChanged((fbUser) => {
  _firebaseUser = fbUser;

  if (fbUser) {
    // Build a minimal profile from auth data so the dashboard
    // opens instantly — no Firestore round-trip needed.
    const minimalProfile = {
      id:           fbUser.uid,
      name:         fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
      email:        fbUser.email || '',
      balance:      0,
      investments:  [],
      goal:         0,
      goalLabel:    '',
      blogsRead:    { date: _today(), ids: [] },
      blogEarnings: 0,
    };
    _profile   = minimalProfile;
    _authReady = true;
    _readyQueue.forEach(fn => fn(_profile));
    _readyQueue = [];

    // Load full Firestore profile in the background
    _fetchProfile(fbUser.uid).then(full => {
      if (full) {
        _profile = full;
      } else {
        // First-ever login for this uid — write the minimal profile
        _db.collection('users').doc(fbUser.uid)
          .set({ ...minimalProfile, createdAt: Date.now() })
          .catch(() => {});
      }
      // Notify dashboard so it can re-render with real balances / investments
      _profileListeners.forEach(fn => fn(_profile));
    }).catch(() => {
      // Firestore unreachable — minimal profile is already set, nothing to do
      _profileListeners.forEach(fn => fn(_profile));
    });

  } else {
    _profile   = null;
    _authReady = true;
    _readyQueue.forEach(fn => fn(_profile));
    _readyQueue = [];
  }
});

// ---- Helpers ----
function _today() { return new Date().toISOString().slice(0, 10); }
function _uid()   { return _firebaseUser?.uid || null; }
function _uuid()  {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function _fetchProfile(uid) {
  const snap = await _db.collection('users').doc(uid).get();
  return snap.exists ? { id: uid, ...snap.data() } : null;
}

async function _patch(uid, data) {
  await _db.collection('users').doc(uid).set(data, { merge: true });
  _profile = { ..._profile, ...data, id: uid };
  return _profile;
}

function _mapError(err) {
  const codes = {
    'auth/email-already-in-use':  'Email is already registered.',
    'auth/invalid-email':          'Invalid email address.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/user-not-found':         'No account found with this email.',
    'auth/wrong-password':         'Incorrect password.',
    'auth/invalid-credential':     'Invalid email or password.',
    'auth/too-many-requests':      'Too many attempts — please try again later.',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
  };
  return codes[err.code] || err.message || 'Something went wrong.';
}

// ================================================================
//  Auth  — public API
// ================================================================
const Auth = {

  // Fire cb immediately if auth is ready, otherwise queue it.
  ready(cb) {
    if (_authReady) { cb(_profile); return; }
    _readyQueue.push(cb);
  },

  // Register a callback that fires when the Firestore profile loads.
  // Use this on the dashboard to re-render with real data.
  onProfileLoaded(cb) {
    _profileListeners.push(cb);
  },

  isLoggedIn() { return !!_firebaseUser; },
  getUser()    { return _profile; },

  // ---- Register ----
  async register(name, email, password) {
    try {
      const cred = await _auth.createUserWithEmailAndPassword(email, password);
      const uid  = cred.user.uid;
      const doc  = {
        name, email,
        balance:      0,
        investments:  [],
        goal:         0,
        goalLabel:    '',
        blogsRead:    { date: _today(), ids: [] },
        blogEarnings: 0,
        createdAt:    Date.now(),
      };
      // Write to Firestore (non-blocking — redirect doesn't wait for this)
      _db.collection('users').doc(uid).set(doc).catch(() => {});
      // Update in-memory state immediately
      _firebaseUser = cred.user;
      _profile      = { id: uid, ...doc };
      return { user: _profile };
    } catch (e) {
      return { error: _mapError(e) };
    }
  },

  // ---- Login ----
  async login(email, password) {
    try {
      await _auth.signInWithEmailAndPassword(email, password);
      // onAuthStateChanged will populate _profile
      // Just return success — login.html will redirect
      return { ok: true };
    } catch (e) {
      return { error: _mapError(e) };
    }
  },

  // ---- Logout ----
  async logout() {
    await _auth.signOut();
    _firebaseUser = null;
    _profile      = null;
  },

  // ---- Add investment ----
  async addInvestment(packageName, amount, payout) {
    const uid = _uid();
    if (!uid || !_profile) return null;
    const inv = {
      id: _uuid(),
      packageName, amount, payout,
      startedAt: Date.now(),
      paidAt:    Date.now() + 2 * 60 * 60 * 1000,
      credited:  false,
    };
    const investments = [inv, ...(_profile.investments || [])];
    return _patch(uid, { investments });
  },

  // ---- Credit matured investments ----
  async creditMatured() {
    const uid = _uid();
    if (!uid || !_profile) return null;
    const now  = Date.now();
    let changed = false;
    let balance = _profile.balance || 0;
    const investments = (_profile.investments || []).map(i => {
      if (!i.credited && now >= i.paidAt) {
        balance += i.payout;
        changed  = true;
        return { ...i, credited: true };
      }
      return i;
    });
    if (changed) return _patch(uid, { investments, balance });
    return _profile;
  },

  // ---- Mark blog read ----
  async markBlogRead(blogId, reward) {
    const uid = _uid();
    if (!uid || !_profile) return null;
    const today        = _today();
    const prevIds      = _profile.blogsRead?.date === today ? (_profile.blogsRead.ids || []) : [];
    const balance      = (_profile.balance      || 0) + reward;
    const blogEarnings = (_profile.blogEarnings || 0) + reward;
    const blogsRead    = { date: today, ids: [...prevIds, blogId] };
    return _patch(uid, { balance, blogEarnings, blogsRead });
  },

  // ---- Set goal ----
  async setGoal(amount, label) {
    const uid = _uid();
    if (!uid) return null;
    return _patch(uid, { goal: amount, goalLabel: label });
  },
};

// ---- Currency formatter ----
function fmt(n) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', minimumFractionDigits: 0,
  }).format(n);
}
