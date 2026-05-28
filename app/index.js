import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../src/api/firebase.config";
import HomeScreen from "../src/screens/Home/HomeScreen";

export default function Page() {
  const [role, setRole] = useState(undefined);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      if (currUser) {
        try {
          const docRef = doc(db, "users", currUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const datos = docSnap.data();
            setRole(datos.rol || "paciente");
            setUserData(datos);
          } else {
            setRole("paciente");
            setUserData({ nombre: "Paciente", puntosSalud: 0 });
          }
        } catch (error) {
          console.error("Error cargando datos en index:", error);
          setRole("paciente");
          setUserData({ nombre: "Paciente (Offline)", puntosSalud: 0 });
        }
      }
    });

    return unsubscribe;
  }, []);

  return <HomeScreen role={role} userData={userData} />;
}
