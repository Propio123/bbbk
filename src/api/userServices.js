import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase.config";

// Función para guardar datos del perfil
export const saveUserProfile = async (userId, userData) => {
  try {
    await setDoc(doc(db, "users", userId), userData, { merge: true });
    console.log("Perfil guardado con éxito");
  } catch (error) {
    console.error("Error al guardar perfil:", error);
  }
};
