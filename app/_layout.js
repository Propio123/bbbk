import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { auth, db } from "../src/api/firebase.config";
import { COLORS } from "../src/constants/theme";

// Contexto global para compartir la sesión con index, perfil, etc.
const UserContext = createContext({
  user: undefined,
  role: undefined,
  userData: null,
});
export const useUser = () => useContext(UserContext);

export default function RootLayout() {
  const [role, setRole] = useState(undefined);
  const [user, setUser] = useState(undefined);
  const [userData, setUserData] = useState(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      if (currUser) {
        try {
          const firestoreDb = db || getFirestore(auth.app);
          const docRef = doc(firestoreDb, "users", currUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const datos = docSnap.data();
            setRole(datos.rol || "paciente");
            setUserData({ ...datos, uid: currUser.uid });
          } else {
            // Tu manejo de documento inexistente heredado de index.js
            setRole("paciente");
            setUserData({
              uid: currUser.uid,
              nombre: "",
              apellido: "",
              puntosSalud: 0,
            });
          }
        } catch (error) {
          console.error("Error obteniendo rol en RootLayout:", error);
          // Tu manejo offline heredado de index.js
          setRole("paciente");
          setUserData({
            uid: currUser.uid,
            nombre: "Paciente (Offline)",
            puntosSalud: 0,
          });
        }
        setUser(currUser);
      } else {
        setUser(null);
        setRole(null);
        setUserData(null);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user === undefined || role === undefined) return;

    const currentSegment = segments[0];
    const inAuthGroup =
      currentSegment === "login" || currentSegment === "register";

    const navigationTimer = setTimeout(() => {
      if (!user) {
        // Si no hay usuario y trata de ir a zonas privadas, forzamos login
        if (
          !inAuthGroup &&
          currentSegment !== undefined &&
          currentSegment !== ""
        ) {
          router.replace("/login");
        }
      } else {
        if (role === "admin") {
          if (currentSegment !== "admin") {
            router.replace("/admin");
          }
        } else if (role === "paciente") {
          if (currentSegment === "admin" || inAuthGroup) {
            router.replace("/");
          }
        }
      }
    }, 10);

    return () => clearTimeout(navigationTimer);
  }, [user, role, segments]);

  if (user === undefined || role === undefined) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primaryGreen || "#8CC63F"}
        />
      </View>
    );
  }

  return (
    <UserContext.Provider value={{ user, role, userData }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="admin" />
      </Stack>
    </UserContext.Provider>
  );
}
