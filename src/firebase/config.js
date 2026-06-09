import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCnrBX0eU8oIEdk0l9KECdDaO4joJaoTmc",
  authDomain: "nm-servicos-sistema.firebaseapp.com",
  projectId: "nm-servicos-sistema",
  storageBucket: "nm-servicos-sistema.firebasestorage.app",
  messagingSenderId: "590076895231",
  appId: "1:590076895231:web:3e00d23688cc1fd02451ca"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);