import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  // Usamos el creador de persistencia estándar de la librería base
  //@ts-ignore
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:
    Platform.OS === "android"
      ? process.env.EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID
      : process.env.EXPO_PUBLIC_FIREBASE_APP_ID_WEB,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Inicializar la App de Firebase de forma segura
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inicializar Auth adaptado al entorno (Nativo vs Web)
export const auth = (() => {
  if (Platform.OS === "web") {
    return getAuth(app);
  } else {
    try {
      // Si la versión de Firebase exporta getReactNativePersistence directamente en 'firebase/auth'
      if (typeof getReactNativePersistence === "function") {
        return initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      }
      // Si tu versión no lo expone ahí, dejamos que use el flujo nativo por defecto
      return getAuth(app);
    } catch (e) {
      // En caso de re-inicialización en caliente (Fast Refresh de Expo)
      return getAuth(app);
    }
  }
})();

// Exportación de Firestore
export const db = getFirestore(app);
