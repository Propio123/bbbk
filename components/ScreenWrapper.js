import { useRouter } from "expo-router"; // Indispensable para que funcione el 'back'
import {
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { COLORS } from "../constants/theme";

export const ScreenWrapper = ({ children, showBack = false }) => {
  const router = useRouter();

  // Fallback de seguridad: Si COLORS es undefined, usamos el valor manual para evitar el crash
  const bgColor = COLORS?.primaryGreen || "#8CC63F";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.headerContainer}>
        {showBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    marginTop: 10,
  },
  backButton: {
    padding: 10,
    zIndex: 10,
  },
  backText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  logoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 40, // Para compensar el espacio del botón 'back' y centrar el logo
  },
  logo: { width: 120, height: 45 },
  content: {
    flex: 1,
    backgroundColor: "#fff", // Fondo blanco para el contenido tipo "Card"
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
});
