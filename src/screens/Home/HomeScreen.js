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
          <Text style={styles.sloganText}>Sonriendo junto a ti</Text>

          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>
              Hola, {userData ? userData.nombre : "Bienvenido"}
            </Text>
            <Text style={styles.subtitle}>Tu Clínica Dental Digital</Text>
          </View>

          {/* Panel de Fidelización con puntosSalud y tipoCliente */}
          <View style={styles.pointsCard}>
            <View style={styles.pointsHeader}>
              <View style={styles.badgeContainer}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.typeText}>
                  {userData?.tipoCliente || "Cliente Fiel"}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="leaf"
                size={24}
                color="rgba(255,255,255,0.6)"
              />
            </View>

            <View style={styles.pointsMain}>
              <View>
                <Text style={styles.pointsLabel}>Puntos Salud Acumulados</Text>
                <Text style={styles.pointsValue}>
                  {userData?.puntosSalud || 0}{" "}
                  <Text style={styles.pointsUnit}>pts</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.redeemButton}
                onPress={() => router.push("/beneficios")}
              >
                <Text style={styles.redeemButtonText}>Canjear</Text>
              </TouchableOpacity>
            </View>
          </View>

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
            <MenuButton
              icon="map-marker-radius-outline"
              label="UBICACIÓN"
              onPress={() => router.push("/ubicacion")}
            />
          </View>

          <View style={[styles.grid, { marginTop: 25 }]}>
            <MenuButton
              icon="tooth-outline"
              label="SERVICIOS"
              onPress={() => router.push("/servicios")}
            />
            <MenuButton
              icon="account-circle-outline"
              label="MI PERFIL"
              onPress={() => router.push("/perfil")}
            />
            <MenuButton
              icon="whatsapp"
              label="INFO"
              onPress={() => router.push("/info")}
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
    marginBottom: 20,
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
  // --- Estilos para Puntos Salud ---
  pointsCard: {
    backgroundColor: COLORS.darkGreen || "#1A3A34",
    width: "100%",
    borderRadius: 22,
    padding: 18,
    marginBottom: 35,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  pointsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  typeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 6,
    textTransform: "uppercase",
  },
  pointsMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  pointsLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginBottom: 2,
  },
  pointsValue: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  pointsUnit: {
    fontSize: 16,
    fontWeight: "normal",
    color: COLORS.primaryGreen,
  },
  redeemButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  redeemButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  // --- Grid ---
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
    fontSize: 10,
    fontWeight: "bold",
    color: "#444",
    textAlign: "center",
    textTransform: "uppercase",
  },
});

export default HomeScreen;
