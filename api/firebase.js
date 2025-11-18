import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCnDQ6niZtEicW-sPc8tTRoGJOpIeRRYyQ",
  authDomain: "avitrack-bbb7a.firebaseapp.com",
  projectId: "avitrack-bbb7a",
  storageBucket: "avitrack-bbb7a.firebasestorage.app",
  messagingSenderId: "701211411436",
  appId: "1:701211411436:web:304ba9edbd51a08359b6c9",
  measurementId: "G-3K55BDC6WT"
};

// Initialize Firebase
console.log('🔥 Inicializando Firebase...');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
console.log('✅ Firebase inicializado correctamente');
console.log('📊 Firestore DB:', db ? 'Conectado' : 'Error');

export { auth, db };
