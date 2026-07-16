# Norland Investment Platform — Firebase Setup Guide

## Quick Start (5 minutes)

### Step 1 — Create a Firebase project
1. Go to **https://console.firebase.google.com**
2. Click **Add project** → give it a name → Continue
3. Disable Google Analytics if you don't need it → **Create project**

---

### Step 2 — Add a Web App
1. In your project, click the **</>** (Web) icon
2. Register the app with any nickname (e.g. "Norland Web")
3. Firebase will show you a `firebaseConfig` object — **copy it**

---

### Step 3 — Paste your config into auth.js
Open `auth.js` and replace the placeholder block at the top:

```js
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",          // ← replace
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

---

### Step 4 — Enable Email/Password sign-in
1. In Firebase Console → **Authentication** → **Sign-in method**
2. Click **Email/Password** → Enable it → **Save**

---

### Step 5 — Create a Firestore database
1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in test mode** (allows all reads/writes while you build)
3. Pick any region → **Done**

---

### Step 6 — Open the site
- Open `index.html` in a browser (or use VS Code Live Server)
- Register a new account on the Sign In page
- Your data is now stored in **Firebase**, not localStorage

---

## Firestore data structure

Each user creates one document in the `users` collection:

```
users/
  {uid}/
    name:         "John Doe"
    email:        "john@example.com"
    balance:      0
    investments:  [ { id, packageName, amount, payout, startedAt, paidAt, credited } ]
    goal:         0
    goalLabel:    ""
    blogsRead:    { date: "YYYY-MM-DD", ids: [] }
    blogEarnings: 0
    createdAt:    1234567890000
```

---

## Securing Firestore (before going live)

Replace the default test rules in **Firestore → Rules** with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This ensures each user can only read and write their own data.

---

## Files overview

| File            | Purpose                                    |
|-----------------|--------------------------------------------|
| `auth.js`       | Firebase Auth + Firestore (paste config here) |
| `dashboard.js`  | Dashboard logic (async Firebase calls)     |
| `script.js`     | Landing page + live withdrawal feed        |
| `styles.css`    | All styles — responsive, all pages         |
| `index.html`    | Landing page                               |
| `login.html`    | Sign in / Register                         |
| `dashboard.html`| User dashboard                             |
| `favicon.svg`   | Browser tab icon                           |
