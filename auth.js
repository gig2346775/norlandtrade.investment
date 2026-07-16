/* ============================================================
   auth.js — Norland Investment Platform
   Backend: Firebase Authentication + Cloud Firestore
   ============================================================
   SETUP:
     1. Go to https://console.firebase.google.com
     2. Create a project → Add a Web App → copy the config below
     3. Enable Email/Password under Authentication → Sign-in method
     4. Create a Firestore database (start in test mode for now)
     5. Replace the placeholder values in firebaseConfig
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

// ---- Initialise Firebase ----
firebase.initializeApp(firebaseConfig);
const _auth = firebase.auth();
const _db   = firebase.firestore();

// ---- Internal state ----
let _firebaseUser  = null;   // Firebase auth user object
let _profile       = null;   // Firestore user profile doc
let _authReady     = false;  // true once first onAuthStateChanged fires
let _readyQueue    = [];     // callbacks waiting for auth ready

// Watch auth state
_auth.onAuthStateChanged(async (fbUser) => {
  _firebaseUser = fbUser;
  if (fbUser) {
    try {
      _profile = await _fetchProfile(fbUser.uid);
      // If the Firestore doc doesn't exist yet, create a fallback profile
      // so the user always reaches the dashboard after registering.
      if (!_profile) {
        const fallback = {
          name:         fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          email:        fbUser.email || '',
          balance:      0,
          investments:  [],
          goal:         0,
          goalLabel:    '',
          blogsRead:    { date: _today(), ids: [] },
          blogEarnings: 0,
          createdAt:    Date.now(),
        };
        // Attempt to write the fallback doc silently
        try { await _db.collection('users').doc(fbUser.uid).set(fallback); } catch(_) {}
        _profile = { id: fbUser.uid, ...fallback };
      }
    } catch (err) {
      // Firestore unavailable (rules / offline) — use minimal in-memory profile
      // so the auth guard still passes and the user sees the dashboard.
      _profile = {
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
    }
  } else {
    _profile = null;
  }
  _authReady  = true;
  _readyQueue.forEach(fn => fn(_profile));
  _readyQueue = [];
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

  /* Call this at the top of every page with a callback.
     The callback receives the profile (or null if not logged in).
     Guaranteed to fire exactly once, even if auth is already ready. */
  ready(cb) {
    if (_authReady) { cb(_profile); return; }
    _readyQueue.push(cb);
  },

  isLoggedIn() { return !!_firebaseUser; },
  getUser()    { return _profile; },

  /* ---- Register ---- */
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
      await _db.collection('users').doc(uid).set(doc);
      _firebaseUser = cred.user;
      _profile      = { id: uid, ...doc };
      return { user: _profile };
    } catch (e) {
      return { error: _mapError(e) };
    }
  },

  /* ---- Login ---- */
  async login(email, password) {
    try {
      const cred = await _auth.signInWithEmailAndPassword(email, password);
      _firebaseUser = cred.user;
      _profile      = await _fetchProfile(cred.user.uid);
      return { user: _profile };
    } catch (e) {
      return { error: _mapError(e) };
    }
  },

  /* ---- Logout ---- */
  async logout() {
    await _auth.signOut();
    _firebaseUser = null;
    _profile      = null;
  },

  /* ---- Add investment ---- */
  async addInvestment(packageName, amount, payout) {
    const uid = _uid();
    if (!uid || !_profile) return null;
    const inv = {
      id: _uuid(),
      packageName, amount, payout,
      startedAt: Date.now(),
      paidAt:    Date.now() + 2 * 60 * 60 * 1000,   // 2 hours
      credited:  false,
    };
    const investments = [inv, ...(_profile.investments || [])];
    return _patch(uid, { investments });
  },

  /* ---- Credit any matured investments ---- */
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

  /* ---- Mark blog read and credit reward ---- */
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

  /* ---- Set savings goal ---- */
  async setGoal(amount, label) {
    const uid = _uid();
    if (!uid) return null;
    return _patch(uid, { goal: amount, goalLabel: label });
  },
};

/* ---- Currency formatter (used across all pages) ---- */
function fmt(n) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', minimumFractionDigits: 0,
  }).format(n);
}
