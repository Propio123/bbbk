import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react"; // ✅ Agregamos imports de React
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenWrapper } from "../../../components/ScreenWrapper";
import { auth, db } from "../../api/firebase.config"; // ✅ Asegúrate de que la ruta sea correcta
import { COLORS } from "../../constants/theme";

// Componente de botón reutilizable
const MenuButton = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.iconContainer}>
      <MaterialCommunityIcons
        name={icon}
        size={35}
        color={COLORS.primaryGreen}
      />
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
  </TouchableOpacity>
);

const HomeScreen = () => {
  const router = useRouter();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const checkAdminRedirection = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().rol === "admin") {
          // Si es admin y cayó aquí, mandarlo a su panel de inmediato
          router.replace("/admin");
        } else if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      }
    };
    checkAdminRedirection();
  }, []);
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header con el estilo curvo */}
        <View style={styles.header}>
          <ScreenWrapper />
          <Text style={styles.slogan}>Sonriendo junto a ti</Text>
        </View>

        {/* Contenido Principal */}
        <View style={styles.body}>
          {/* Saludo dinámico con el nombre de Firestore */}
          <Text style={styles.welcomeTitle}>
            Hola, {userData ? userData.nombre : "Bienvenido"}
            {"\n"}
            <Text style={styles.subtitle}>Tu Clínica Dental Digital</Text>
          </Text>

          {/* Primera Fila de Botones */}
          <View style={styles.grid}>
            <MenuButton
              icon="calendar-clock"
              label="AGENDAR CITA"
              onPress={() => router.push("/agendar")} // ✅ Corregido a router
            />
            <MenuButton
              icon="clipboard-check"
              label="MIS CITAS"
              onPress={() => router.push("/miscitas")} // ✅ Corregido a router
            />
            <MenuButton
              icon="history"
              label="HISTORIAL"
              onPress={() => console.log("Historial")}
            />
          </View>

          {/* Segunda Fila de Botones */}
          <View style={[styles.grid, { marginTop: 25 }]}>
            <MenuButton
              icon="tooth-outline"
              label="SERVICIOS"
              onPress={() => console.log("Servicios")}
            />
            <MenuButton
              icon="account-circle-outline"
              label="PERFIL"
              onPress={() => router.push("/perfil")} // ✅ Corregido a router
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 280,
    backgroundColor: COLORS.primaryGreen,
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  logoPlaceholder: {
    width: 140,
    height: 140,
    backgroundColor: "#fff",
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  logoText: { fontSize: 32, fontWeight: "bold", color: COLORS.primaryGreen },
  slogan: { color: "#fff", marginTop: 15, fontWeight: "600", fontSize: 16 },
  body: { padding: 20, alignItems: "center" },
  welcomeTitle: {
    fontSize: 24,
    textAlign: "center",
    color: "#333",
    fontWeight: "bold",
    marginBottom: 40,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "normal",
    color: "#666",
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
  },
  menuItem: { alignItems: "center", width: "30%" },
  iconContainer: {
    width: 75,
    height: 75,
    backgroundColor: "#fff",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    marginBottom: 10,
  },
  menuLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#444",
    textAlign: "center",
  },
});

export default HomeScreen;
