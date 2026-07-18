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
let _firebaseUser  = null;
let _profile       = null;
let _authReady     = false;
let _readyQueue    = [];
let _registering   = false;   // blocks onAuthStateChanged fallback during register()

// Affiliate reward constants
const AFFILIATE_PER_BATCH  = 20;          // referrals needed per payout
const AFFILIATE_REWARD     = 5000000;     // ₦5,000,000 per 20 referrals

// Watch auth state
_auth.onAuthStateChanged(async (fbUser) => {
  _firebaseUser = fbUser;

  // If register() is running, it owns profile setup and readyQueue — skip here.
  if (_registering) return;

  if (fbUser) {
    try {
      _profile = await _fetchProfile(fbUser.uid);
      if (!_profile) {
        // Back-fill for users somehow created externally (not via register())
        const code     = _genCode(fbUser.uid);
        const fallback = {
          name:              fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          email:             fbUser.email || '',
          balance:           0,
          investments:       [],
          affiliateCode:     code,
          referrals:         0,
          affiliateEarnings: 0,
          referredBy:        null,
          createdAt:         Date.now(),
        };
        try { await _db.collection('users').doc(fbUser.uid).set(fallback); } catch(_) {}
        _profile = { id: fbUser.uid, ...fallback };
      }
      // Back-fill affiliateCode for existing users who don't have one yet
      if (!_profile.affiliateCode) {
        const code = _genCode(fbUser.uid);
        await _patch(fbUser.uid, { affiliateCode: code, referrals: 0, affiliateEarnings: 0 });
      }
    } catch (err) {
      _profile = {
        id:                fbUser.uid,
        name:              fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        email:             fbUser.email || '',
        balance:           0,
        investments:       [],
        affiliateCode:     _genCode(fbUser.uid),
        referrals:         0,
        affiliateEarnings: 0,
        referredBy:        null,
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
function _today()  { return new Date().toISOString().slice(0, 10); }
function _uid()    { return _firebaseUser?.uid || null; }
function _uuid()   {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function _genCode(uid) {
  // e.g. NRL-A3F9K2
  return 'NRL-' + uid.slice(0, 6).toUpperCase();
}

async function _fetchProfile(uid) {
  const snap = await _db.collection('users').doc(uid).get();
  return snap.exists ? { id: uid, ...snap.data() } : null;
}

async function _fetchProfileByCode(code) {
  const snap = await _db.collection('users').where('affiliateCode', '==', code).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
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

  ready(cb) {
    if (_authReady) { cb(_profile); return; }
    _readyQueue.push(cb);
  },

  isLoggedIn() { return !!_firebaseUser; },
  getUser()    { return _profile; },

  /* ---- Register (with optional referral code) ---- */
  async register(name, email, password, refCode) {
    _registering = true;
    try {
      const cred = await _auth.createUserWithEmailAndPassword(email, password);
      // NOTE: onAuthStateChanged fires here, but _registering=true so it returns early.
      // We own profile creation from this point.

      const uid     = cred.user.uid;
      const code    = _genCode(uid);
      const cleanRef = refCode ? refCode.trim().toUpperCase() : null;
      const doc  = {
        name, email,
        balance:           1000000,   // ₦1,000,000 welcome bonus for new members
        investments:       [],
        affiliateCode:     code,
        referrals:         0,
        affiliateEarnings: 0,
        referredBy:        cleanRef,  // track who referred this user
        createdAt:         Date.now(),
      };
      await _db.collection('users').doc(uid).set(doc);
      _firebaseUser = cred.user;
      _profile      = { id: uid, ...doc };

      // Signal auth ready NOW (profile is correct)
      _registering = false;
      _authReady   = true;
      _readyQueue.forEach(fn => fn(_profile));
      _readyQueue  = [];

      // Credit the referrer atomically (fire-and-forget — don't block registration)
      if (cleanRef) {
        _creditReferrer(cleanRef, uid).catch(() => {});
      }

      return { user: _profile };
    } catch (e) {
      _registering = false;
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

  /* ---- Add investment (deducts cost from wallet balance) ---- */
  async addInvestment(packageName, amount, payout) {
    const uid = _uid();
    if (!uid || !_profile) return null;

    const currentBalance = _profile.balance || 0;
    if (currentBalance < amount) {
      return { error: 'Insufficient wallet balance. Please fund your wallet first.' };
    }

    const inv = {
      id: _uuid(),
      packageName, amount, payout,
      startedAt: Date.now(),
      paidAt:    Date.now() + 2 * 60 * 60 * 1000,
      credited:  false,
    };
    const investments = [inv, ...(_profile.investments || [])];
    const newBalance   = currentBalance - amount;   // deduct investment cost from wallet
    return _patch(uid, { investments, balance: newBalance });
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

  /* ---- Refresh profile from Firestore (for affiliate count updates) ---- */
  async refreshProfile() {
    const uid = _uid();
    if (!uid) return _profile;
    try {
      _profile = await _fetchProfile(uid);
    } catch(_) {}
    return _profile;
  },
};

/* ---- Credit referrer when a new user registers with their code ----
   Uses a Firestore TRANSACTION so the counter increment is atomic even
   if multiple users register simultaneously with the same code.
   newUid is the newly-registered user's UID (used to prevent self-ref).        */
async function _creditReferrer(code, newUid) {
  // Find the referrer's Firestore doc by their affiliate code
  const snap = await _db.collection('users').where('affiliateCode', '==', code).limit(1).get();
  if (snap.empty) return;                        // code not found
  const refDoc = snap.docs[0];
  if (refDoc.id === newUid) return;              // prevent self-referral

  const refDocRef = _db.collection('users').doc(refDoc.id);

  await _db.runTransaction(async (tx) => {
    const latest   = await tx.get(refDocRef);
    if (!latest.exists) return;

    const data      = latest.data();
    const prevCount = data.referrals || 0;
    const newCount  = prevCount + 1;

    // Check whether this increment crosses a 20-referral milestone
    const prevBatches = Math.floor(prevCount / AFFILIATE_PER_BATCH);
    const newBatches  = Math.floor(newCount  / AFFILIATE_PER_BATCH);
    const reward      = (newBatches - prevBatches) * AFFILIATE_REWARD;

    const patch = { referrals: newCount };
    if (reward > 0) {
      patch.balance           = (data.balance           || 0) + reward;
      patch.affiliateEarnings = (data.affiliateEarnings || 0) + reward;
    }
    tx.update(refDocRef, patch);
  });
}

/* ---- Currency formatter ---- */
function fmt(n) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', minimumFractionDigits: 0,
  }).format(n);
}
