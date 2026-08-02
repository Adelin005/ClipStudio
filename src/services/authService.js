// ====================================================================
// AUTH SERVICE — Firebase Authentication + localStorage plan/counters
// ====================================================================

import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// ─── Firebase Config ──────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyBD2KOPV21U9pFe5bNtPcTExGxD0u_26cs',
  authDomain: 'clipstudio-bc32a.firebaseapp.com',
  projectId: 'clipstudio-bc32a',
  storageBucket: 'clipstudio-bc32a.firebasestorage.app',
  messagingSenderId: '901551401926',
  appId: '1:901551401926:web:65042d44e76a889feda0c7',
  measurementId: 'G-NCZ1BTKJXD',
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics — only in browser (safe guard)
try { getAnalytics(app); } catch (_) { /* ignored in SSR/test env */ }

// ─── Plan definitions ─────────────────────────────────────────────────
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    dailyLimit: 1,
    autoGenerate: false,
    qtySelector: false,
    badge: '🆓 Free',
    color: '#71717a',
    gradient: 'linear-gradient(135deg, #3f3f46, #27272a)',
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 10,
    dailyLimit: 3,
    autoGenerate: false,
    qtySelector: false,
    badge: '⚡ Basic',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 20,
    dailyLimit: Infinity,
    autoGenerate: true,
    qtySelector: true,
    badge: '👑 Pro',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
  },
};

// ─── Internal state ───────────────────────────────────────────────────
let _firebaseUser = null;          // raw Firebase user object
let _authListeners = [];           // callbacks registered via onAuthChange()
let _currentPlanId = 'free';       // synced from Firestore
let _unsubFirestore = null;        // firestore listener cleanup

// Listen for Firebase auth state changes (persists across page reloads)
onAuthStateChanged(auth, (fbUser) => {
  _firebaseUser = fbUser;
  
  if (fbUser) {
    // Subscribe to Firestore for real-time plan updates
    if (_unsubFirestore) _unsubFirestore();
    _unsubFirestore = onSnapshot(doc(db, 'users', fbUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        _currentPlanId = docSnap.data().plan || 'free';
      } else {
        _currentPlanId = 'free';
        // Initialize doc if missing
        setDoc(doc(db, 'users', fbUser.uid), { plan: 'free', email: fbUser.email }, { merge: true }).catch(console.error);
      }
      _authListeners.forEach(cb => cb(_toPublicUser(fbUser)));
    });
  } else {
    // Logged out
    if (_unsubFirestore) { _unsubFirestore(); _unsubFirestore = null; }
    _currentPlanId = 'free';
    _authListeners.forEach(cb => cb(null));
  }
});

// ─── Auth state observer ──────────────────────────────────────────────

/**
 * Register a callback that fires whenever auth state changes.
 * Fires immediately with the current user (or null).
 * Returns an unsubscribe function.
 */
export function onAuthChange(callback) {
  _authListeners.push(callback);
  // Fire immediately with current state
  callback(_firebaseUser ? _toPublicUser(_firebaseUser) : null);
  return () => {
    _authListeners = _authListeners.filter(cb => cb !== callback);
  };
}

// ─── Public Auth API ──────────────────────────────────────────────────

/**
 * Register a new user with email + password.
 * Returns { ok: true, user } or { ok: false, error: string }
 */
export async function register(email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    
    const displayName = email.split('@')[0];
    await updateProfile(cred.user, { displayName });
    
    // Inițializăm documentul Firestore, dar FĂRĂ `await`.
    // Dacă Firestore nu este activat (Permission Denied) sau pică rețeaua, 
    // promisiunea de setDoc ar putea să stea blocată la infinit (retry loop),
    // ceea ce ține butonul de signup în starea de "Se încarcă...".
    setDoc(doc(db, 'users', cred.user.uid), {
      plan: 'free',
      email: cred.user.email,
      createdAt: new Date().toISOString()
    }, { merge: true }).catch(err => {
      console.warn("Nu s-a putut salva planul in Firestore. Verifica daca baza de date este activata.", err);
    });

    return { ok: true, user: _toPublicUser(cred.user) };
  } catch (e) {
    console.error("Eroare la inregistrare:", e);
    return { ok: false, error: _translateFirebaseError(e.code) };
  }
}

/**
 * Sign in an existing user.
 * Returns { ok: true, user } or { ok: false, error: string }
 */
export async function login(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    // Firestore listener handles plan syncing automatically
    return { ok: true, user: _toPublicUser(cred.user) };
  } catch (e) {
    return { ok: false, error: _translateFirebaseError(e.code) };
  }
}

/**
 * Sign out the current user.
 */
export async function logout() {
  await signOut(auth);
}

/**
 * Send a password reset email.
 * Returns { ok: true } or { ok: false, error: string }
 */
export async function forgotPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { ok: true };
  } catch (e) {
    return { ok: false, error: _translateFirebaseError(e.code) };
  }
}

/**
 * Get the current user synchronously (may be null before Firebase initialises).
 */
export function getCurrentUser() {
  const fbUser = auth.currentUser || _firebaseUser;
  if (!fbUser) return null;
  return _toPublicUser(fbUser);
}

// ─── Plan API (Firestore-backed) ──────────────────────────────────────

/**
 * Get the plan object for the current user.
 */
export function getCurrentPlan() {
  return PLANS[_currentPlanId] || PLANS.free;
}

/**
 * Daily generation status for the current user.
 */
export function getDailyStatus() {
  const uid   = _uid();
  const plan  = getCurrentPlan();
  const limit = plan.dailyLimit;

  if (!uid) return { count: 0, limit: 1, canGenerate: false, remaining: 0 };
  if (limit === Infinity) return { count: 0, limit, canGenerate: true, remaining: Infinity };

  const key   = `viralclip_daily_${uid}_${_todayKey()}`;
  const count = parseInt(localStorage.getItem(key) || '0', 10);
  const remaining = Math.max(0, limit - count);
  return { count, limit, canGenerate: remaining > 0, remaining };
}

/**
 * Increment the daily generation counter.
 */
export function incrementDailyCount() {
  const uid = _uid();
  if (!uid) return;
  const key   = `viralclip_daily_${uid}_${_todayKey()}`;
  const count = parseInt(localStorage.getItem(key) || '0', 10);
  localStorage.setItem(key, String(count + 1));
}

// ─── Private helpers ──────────────────────────────────────────────────

function _uid() {
  const fbUser = auth.currentUser || _firebaseUser;
  return fbUser?.uid || null;
}

function _todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function _toPublicUser(fbUser) {
  return {
    uid:         fbUser.uid,
    email:       fbUser.email,
    displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
    plan:        _currentPlanId,
  };
}

function _translateFirebaseError(code) {
  const map = {
    'auth/email-already-in-use':    'Există deja un cont cu acest email.',
    'auth/invalid-email':           'Adresa de email este invalidă.',
    'auth/weak-password':           'Parola trebuie să aibă cel puțin 6 caractere.',
    'auth/user-not-found':          'Email sau parolă incorectă.',
    'auth/wrong-password':          'Email sau parolă incorectă.',
    'auth/invalid-credential':      'Email sau parolă incorectă.',
    'auth/too-many-requests':       'Prea multe încercări. Încearcă din nou mai târziu.',
    'auth/network-request-failed':  'Eroare de rețea. Verifică conexiunea la internet.',
    'auth/user-disabled':           'Contul a fost dezactivat.',
  };
  return map[code] || 'A apărut o eroare. Încearcă din nou.';
}
