import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenWrapper } from "../../../components/ScreenWrapper";
import { COLORS } from "../../constants/theme";
import LoginScreen from "../Auth/LoginScreen";

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

const HomeScreen = ({ role, userData }) => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (role === "admin") {
      setIsRedirecting(true);
      const timer = setTimeout(() => {
        if (router) {
          router.replace("/admin");
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [role]);

  const handleNavigation = (path) => {
    if (router && role === "paciente") {
      router.push(path);
    }
  };

  if (role === null) {
    return <LoginScreen />;
  }

  if (role === "admin" || !role || isRedirecting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryGreen} />
      </View>
    );
  }

  const esAndroidWeb =
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    /Android/i.test(navigator.userAgent);

  // --- LÓGICA DE FIDELIZACIÓN DINÁMICA ---
  const puntosActuales = userData?.puntosSalud || 0;
  const esUsuarioPremium = puntosActuales >= 100; // Meta: 100 puntos o más

  // Estilos dinámicos para la tarjeta basados en el puntaje
  const estiloTarjetaDinamica = [
    styles.pointsCard,
    esUsuarioPremium && {
      backgroundColor: "#0D47A1", // Un azul rey/premium profundo (puedes cambiarlo por dorado #D4AF37 si prefieres)
      borderColor: "#8CC63F",
      borderWidth: 1,
    },
  ];

  const estiloBotonCanjearDinamico = [
    styles.redeemButton,
    esUsuarioPremium && {
      backgroundColor: "#8CC63F", // Resalta el botón de canje cuando tiene muchos puntos
    },
  ];

  return (
    <ScreenWrapper showBack={false}>
      {esAndroidWeb && (
        <TouchableOpacity
          style={styles.androidBanner}
          onPress={() =>
            Linking.openURL(
              "https://docs.google.com/uc?export=download&id=1Z3Pm20ZmLHkXMxN5B3I2zF1R9_LqkNEh",
            )
          }
        >
          <MaterialCommunityIcons
            name="android"
            size={20}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.androidBannerText}>
            ¿Usas Android? Descarga nuestra App nativa haciendo clic aquí
          </Text>
        </TouchableOpacity>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <View style={styles.body}>
          <Text style={styles.sloganText}>Sonriendo junto a ti</Text>

          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>
              Hola, {userData ? userData.nombre : "Bienvenido"}
            </Text>
            <Text style={styles.subtitle}>Tu Clínica Dental Digital</Text>
          </View>

          {/* 🌟 Panel de Fidelización con cambio de Color Dinámico */}
          <View style={estiloTarjetaDinamica}>
            <View style={styles.pointsHeader}>
              <View style={styles.badgeContainer}>
                <MaterialCommunityIcons
                  name={esUsuarioPremium ? "crown" : "shield-check"} // Ícono cambia a corona si es premium
                  size={20}
                  color="#fff"
                />
                <Text style={styles.typeText}>
                  {esUsuarioPremium
                    ? "PACIENTE ESTRELLA"
                    : userData?.tipoCliente || "Cliente Fiel"}
                </Text>
              </View>
              <MaterialCommunityIcons
                name={esUsuarioPremium ? "star" : "leaf"}
                size={24}
                color="rgba(255,255,255,0.6)"
              />
            </View>

            <View style={styles.pointsMain}>
              <View>
                <Text style={styles.pointsLabel}>Puntos Salud Acumulados</Text>
                <Text style={styles.pointsValue}>
                  {puntosActuales} <Text style={styles.pointsUnit}>pts</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={estiloBotonCanjearDinamico}
                onPress={() => handleNavigation("/beneficios")}
              >
                <Text style={styles.redeemButtonText}>Canjear</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Grillas de Menú */}
          <View style={styles.grid}>
            <MenuButton
              icon="calendar-plus"
              label="AGENDAR CITA"
              onPress={() => handleNavigation("/agendar")}
            />
            <MenuButton
              icon="clipboard-text-clock-outline"
              label="MIS CITAS"
              onPress={() => handleNavigation("/miscitas")}
            />
            <MenuButton
              icon="map-marker-radius-outline"
              label="UBICACIÓN"
              onPress={() => handleNavigation("/ubicacion")}
            />
          </View>

          <View style={[styles.grid, { marginTop: 25 }]}>
            <MenuButton
              icon="tooth-outline"
              label="SERVICIOS"
              onPress={() => handleNavigation("/servicios")}
            />
            <MenuButton
              icon="account-circle-outline"
              label="MI PERFIL"
              onPress={() => handleNavigation("/perfil")}
            />
            <MenuButton
              icon="whatsapp"
              label="INFO"
              onPress={() => handleNavigation("/info")}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  androidBanner: {
    backgroundColor: "#1A3A34",
    paddingVertical: 12,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  androidBannerText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
  },
  scrollContainer: {
    alignItems: "center",
    width: "100%",
  },
  body: {
    padding: 20,
    alignItems: "center",
    width: "100%",
    maxWidth: 500,
  },
  sloganText: {
    color: COLORS.primaryGreen,
    fontSize: 14,
    fontWeight: "600",
    fontStyle: "italic",
    marginBottom: 20,
    opacity: 0.8,
  },
  welcomeContainer: { alignItems: "center", marginBottom: 20 },
  welcomeTitle: {
    fontSize: 24,
    color: "#333",
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: { fontSize: 15, color: "#666", marginTop: 5 },
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
  pointsValue: { color: "#fff", fontSize: 32, fontWeight: "bold" },
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
  redeemButtonText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  menuItem: { alignItems: "center", width: "30%" },
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
