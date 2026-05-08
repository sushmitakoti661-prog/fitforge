import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBUpyX136jYDdumg9rjCTVAGlUeUZthh5w",
  authDomain: "fitforge-com.firebaseapp.com",
  projectId: "fitforge-com",
  storageBucket: "fitforge-com.firebasestorage.app",
  messagingSenderId: "684727800460",
  appId: "1:684727800460:web:0207c32946ac09bb65a1a9",
  measurementId: "G-QVRJ3N8MQH"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
