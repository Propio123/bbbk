import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "./src/api/firebase.config";
import LoginScreen from "./src/screens/Auth/LoginScreen";
import HomeScreen from "./src/screens/Home/HomeScreen";

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Escucha si el usuario inicia o cierra sesión
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  // Si hay usuario, mostramos la Home. Si no, el Login.
  return user ? <HomeScreen /> : <LoginScreen />;
}
