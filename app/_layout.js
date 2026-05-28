import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { auth, db } from "../src/api/firebase.config";

export default function RootLayout() {
  const [role, setRole] = useState(undefined);
  const [user, setUser] = useState(undefined);
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
            const datosDelUsuario = docSnap.data();
            setRole(datosDelUsuario.rol || "paciente");
          } else {
            setRole("paciente");
          }
        } catch (error) {
          console.error("Error obteniendo rol en RootLayout:", error);
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

    const currentSegment = segments[0];
    const inAuthGroup =
      currentSegment === "login" || currentSegment === "register";

    if (!user) {
      if (!inAuthGroup) {
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
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="admin" />
    </Stack>
  );
}
