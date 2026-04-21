import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Importamos el ScreenWrapper que ya tiene el logo grande y cuadrado
import { ScreenWrapper } from "../../../components/ScreenWrapper";
import { auth, db } from "../../api/firebase.config";
import { COLORS } from "../../constants/theme";

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
          router.replace("/admin");
        } else if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      }
    };
    checkAdminRedirection();
  }, []);

  return (
    <ScreenWrapper showBack={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {/* Slogan institucional */}
          <Text style={styles.sloganText}>Sonriendo junto a ti</Text>

          {/* Saludo dinámico */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>
              Hola, {userData ? userData.nombre : "Bienvenido"}
            </Text>
            <Text style={styles.subtitle}>Tu Clínica Dental Digital</Text>
          </View>

          {/* Grid de Servicios - FILA 1: Gestión de Citas y Mapa */}
          <View style={styles.grid}>
            <MenuButton
              icon="calendar-plus"
              label="AGENDAR CITA"
              onPress={() => router.push("/agendar")}
            />
            <MenuButton
              icon="clipboard-text-clock-outline"
              label="MIS CITAS"
              onPress={() => router.push("/miscitas")}
            />
            {/* Reemplazo de Historial por Ubicación (Info) */}
            <MenuButton
              icon="map-marker-radius-outline"
              label="UBICACIÓN"
              onPress={() => router.push("/info")}
            />
          </View>

          {/* Grid de Servicios - FILA 2: Info de Clínica y Usuario */}
          <View style={[styles.grid, { marginTop: 25 }]}>
            <MenuButton
              icon="tooth-outline"
              label="SERVICIOS"
              onPress={() => router.push("/agendar")}
            />
            <MenuButton
              icon="account-circle-outline"
              label="MI PERFIL"
              onPress={() => router.push("/perfil")}
            />
            <MenuButton
              icon="whatsapp"
              label="INFO"
              onPress={() => router.push("/info")} // O vincular directo a WhatsApp
            />
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  body: {
    padding: 20,
    alignItems: "center",
  },
  sloganText: {
    color: COLORS.primaryGreen,
    fontSize: 14,
    fontWeight: "600",
    fontStyle: "italic",
    marginBottom: 20,
    opacity: 0.8,
  },
  welcomeContainer: {
    alignItems: "center",
    marginBottom: 35,
  },
  welcomeTitle: {
    fontSize: 24,
    color: "#333",
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    marginTop: 5,
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  menuItem: {
    alignItems: "center",
    width: "30%",
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: "#fff",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  menuLabel: {
    fontSize: 10, // Un punto menos para evitar desbordamiento de texto
    fontWeight: "bold",
    color: "#444",
    textAlign: "center",
    textTransform: "uppercase",
  },
});

export default HomeScreen;
