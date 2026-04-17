import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../src/api/firebase.config";

export default function RootLayout() {
  const [role, setRole] = useState(undefined);
  const [user, setUser] = useState(undefined);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      if (currUser) {
        // Solo buscamos el rol si el usuario existe
        try {
          const docRef = doc(db, "users", currUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setRole(docSnap.data().rol); // Asegúrate que en Firestore diga "admin" (minúsculas)
          } else {
            setRole("paciente");
          }
        } catch (error) {
          setRole("paciente");
        }
        setUser(currUser);
      } else {
        setUser(null);
        setRole(null);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user === undefined || role === undefined) return;

    // IMPORTANTE: segments[0] puede ser "(admin)" o "admin" dependiendo de tu estructura
    const currentSegment = segments[0];
    const inAuthGroup =
      currentSegment === "login" || currentSegment === "register";

    if (!user) {
      if (!inAuthGroup) router.replace("/login");
    } else {
      if (role === "admin") {
        // REVISIÓN: Si tu archivo es app/admin.js, el segmento es "admin"
        if (currentSegment !== "admin") {
          router.replace("/admin");
        }
      } else {
        // Si no es admin, fuera de las rutas protegidas
        if (inAuthGroup || currentSegment === "admin") {
          router.replace("/");
        }
      }
    }
  }, [user, role, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
