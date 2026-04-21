import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../src/api/firebase.config";
import { COLORS } from "../src/constants/theme";

export default function PerfilScreen() {
  const user = auth.currentUser;
  const router = useRouter();

  const handleLogout = () => {
    auth.signOut().then(() => router.replace("/login"));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Botón Volver Minimalista */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <MaterialCommunityIcons
          name="chevron-left"
          size={30}
          color={COLORS.darkGreen}
        />
      </TouchableOpacity>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <MaterialCommunityIcons
            name="account-circle"
            size={100}
            color={COLORS.primaryGreen}
          />
        </View>
        <Text style={styles.userName}>
          {user?.email ? user.email.split("@")[0] : "Cargando..."}
        </Text>
        <Text style={styles.userEmail}>{user?.email || "No identificado"}</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>PACIENTE PREMIUM</Text>
        </View>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuOption}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={24}
            color={COLORS.darkGreen}
          />
          <Text style={styles.menuText}>Privacidad y Datos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuOption}>
          <MaterialCommunityIcons
            name="bell-outline"
            size={24}
            color={COLORS.darkGreen}
          />
          <Text style={styles.menuText}>Notificaciones</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuOption, { borderBottomWidth: 0 }]}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons name="logout" size={24} color="#FF5252" />
          <Text style={[styles.menuText, { color: "#FF5252" }]}>
            Cerrar Sesión
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>333K Odontología v1.0</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  backBtn: { padding: 20 },
  profileCard: { alignItems: "center", marginTop: 20, marginBottom: 40 },
  avatarContainer: { marginBottom: 15 },
  userName: {
    fontSize: 26,
    fontWeight: "bold",
    color: COLORS.darkGreen,
    textTransform: "capitalize",
  },
  userEmail: { fontSize: 14, color: "#999", marginBottom: 15 },
  badge: {
    backgroundColor: "#F0F9EB",
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: { color: COLORS.primaryGreen, fontSize: 10, fontWeight: "bold" },
  menuContainer: {
    marginHorizontal: 30,
    backgroundColor: "#FBFBFB",
    borderRadius: 20,
    padding: 10,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuText: {
    marginLeft: 15,
    fontSize: 16,
    color: COLORS.darkGreen,
    fontWeight: "500",
  },
  footerText: {
    textAlign: "center",
    color: "#CCC",
    fontSize: 12,
    marginTop: 40,
  },
});
