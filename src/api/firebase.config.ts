import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { doc, getFirestore, increment, updateDoc } from "firebase/firestore";

// Estos datos los sacas de "Configuración del proyecto" en la consola de Firebase
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);

// Exportamos los servicios para usarlos en toda la app
export const db = getFirestore(app);
export const auth = getAuth(app);
const procesarAtencionRealizada = async (
  userId: string,
  millasDigitadas: number,
) => {
  const userRef = doc(db, "usuarios", userId);

  try {
    await updateDoc(userRef, {
      millas: increment(millasDigitadas), // Incrementa atómicamente
      // Aquí podrías añadir lógica para cambiar 'tipoCliente' si supera X millas
    });
    console.log("Millas acreditadas correctamente.");
  } catch (error) {
    console.error("Error al actualizar puntos:", error);
  }
};
