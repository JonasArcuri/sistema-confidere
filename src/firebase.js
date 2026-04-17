// ===== FIREBASE CONFIG =====
// Substitua os valores abaixo pelas suas credenciais do Firebase Console
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCiVtdfc31tlCuXNClbdzbAXQYOX1SDcL0",
  authDomain: "confidere-prod.firebaseapp.com",
  projectId: "confidere-prod",
  storageBucket: "confidere-prod.firebasestorage.app",
  messagingSenderId: "197598419906",
  appId: "1:197598419906:web:7a7173ccd166534d9f545b"
};

// ===== IMPORTAÇÕES (ES Modules via CDN) =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ===== INICIALIZAÇÃO =====
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

// ===== ESTADO DO USUÁRIO =====
let currentUser = null;

// ===== AUTH: OBSERVER =====
function initAuth(onLogin, onLogout) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      onLogin(user);
    } else {
      currentUser = null;
      onLogout();
    }
  });
}

// ===== AUTH: LOGIN =====
async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ===== AUTH: LOGOUT =====
async function logout() {
  await signOut(auth);
}

// ===== HELPER: UID DO USUÁRIO ATUAL =====
function getUid() {
  if (!currentUser) throw new Error("Usuário não autenticado.");
  return currentUser.uid;
}

// ===== HELPER: COLEÇÃO DO USUÁRIO =====
// Todos os dados ficam em /users/{uid}/{collection}
// Isso garante isolamento total por usuário via Firestore Security Rules
function userCol(colName) {
  return collection(db, "users", getUid(), colName);
}

function userDoc(colName, id) {
  return doc(db, "users", getUid(), colName, id);
}

// ===== ORÇAMENTOS =====
const DB = {

  // — Orçamentos —
  async listarOrcamentos() {
    const q = query(userCol("orcamentos"), orderBy("criadoEm", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async salvarOrcamento(dados, id = null) {
    if (id) {
      await setDoc(userDoc("orcamentos", id), { ...dados, atualizadoEm: serverTimestamp() }, { merge: true });
      return id;
    } else {
      const ref = await addDoc(userCol("orcamentos"), { ...dados, criadoEm: serverTimestamp() });
      return ref.id;
    }
  },

  async excluirOrcamento(id) {
    await deleteDoc(userDoc("orcamentos", id));
  },

  // — Funcionários —
  async listarFuncionarios() {
    const snap = await getDocs(query(userCol("funcionarios"), orderBy("nome")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async salvarFuncionario(dados, id = null) {
    if (id) {
      await setDoc(userDoc("funcionarios", id), { ...dados, atualizadoEm: serverTimestamp() }, { merge: true });
      return id;
    } else {
      const ref = await addDoc(userCol("funcionarios"), { ...dados, criadoEm: serverTimestamp() });
      return ref.id;
    }
  },

  async excluirFuncionario(id) {
    await deleteDoc(userDoc("funcionarios", id));
  },

  // — Agendamentos —
  async listarAgendamentos() {
    const snap = await getDocs(query(userCol("agendamentos"), orderBy("data")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async salvarAgendamento(dados, id = null) {
    if (id) {
      await setDoc(userDoc("agendamentos", id), { ...dados, atualizadoEm: serverTimestamp() }, { merge: true });
      return id;
    } else {
      const ref = await addDoc(userCol("agendamentos"), { ...dados, criadoEm: serverTimestamp() });
      return ref.id;
    }
  },

  async excluirAgendamento(id) {
    await deleteDoc(userDoc("agendamentos", id));
  },

  // — Relatórios —
  async listarRelatorios() {
    const snap = await getDocs(query(userCol("relatorios"), orderBy("data", "desc")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async salvarRelatorio(dados, id = null) {
    if (id) {
      await setDoc(userDoc("relatorios", id), { ...dados, atualizadoEm: serverTimestamp() }, { merge: true });
      return id;
    } else {
      const ref = await addDoc(userCol("relatorios"), { ...dados, criadoEm: serverTimestamp() });
      return ref.id;
    }
  },

  async excluirRelatorio(id) {
    await deleteDoc(userDoc("relatorios", id));
  },

  // — Logo —
  async salvarLogo(base64) {
    await setDoc(doc(db, "users", getUid()), { logo: base64 }, { merge: true });
  },

  async carregarLogo() {
    const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(doc(db, "users", getUid()));
    return snap.exists() ? snap.data().logo || null : null;
  },

  async removerLogo() {
    const { updateDoc, deleteField } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await updateDoc(doc(db, "users", getUid()), { logo: deleteField() });
  },

  // — Insumos / Despesas —
  async listarInsumos() {
    const snap = await getDocs(query(userCol("insumos"), orderBy("data", "desc")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async salvarInsumo(dados, id = null) {
    if (id) {
      await setDoc(userDoc("insumos", id), { ...dados, atualizadoEm: serverTimestamp() }, { merge: true });
      return id;
    } else {
      const ref = await addDoc(userCol("insumos"), { ...dados, criadoEm: serverTimestamp() });
      return ref.id;
    }
  },

  async excluirInsumo(id) {
    await deleteDoc(userDoc("insumos", id));
  },

  // — Obras —
  async listarObras() {
    const snap = await getDocs(query(userCol("obras"), orderBy("data", "desc")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async salvarObra(dados, id = null) {
    if (id) {
      await setDoc(userDoc("obras", id), { ...dados, atualizadoEm: serverTimestamp() }, { merge: true });
      return id;
    } else {
      const ref = await addDoc(userCol("obras"), { ...dados, criadoEm: serverTimestamp() });
      return ref.id;
    }
  },

  async excluirObra(id) {
    await deleteDoc(userDoc("obras", id));
  }
};

export { auth, db, currentUser, initAuth, login, logout, getUid, DB };
