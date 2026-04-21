import { useRouter } from "expo-router";
import {
    Image,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { COLORS } from "../constants/theme";

export const ScreenWrapper = ({ children, showBack = false }) => {
  const router = useRouter();
  const bgColor = COLORS?.primaryGreen || "#8CC63F";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Ajuste para la barra de estado en Android */}
      <StatusBar barStyle="light-content" backgroundColor={bgColor} />

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

      {/* Contenedor Blanco Semiredondo */}
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Evita saltos visuales en Android con el SafeAreaView
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  headerContainer: {
    height: 80, // Un poco más de altura para que el logo respire
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // Centra el contenido principal
    paddingHorizontal: 20,
  },
  backButton: {
    position: "absolute", // Clave: saca el botón del flujo para no mover el logo
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  backText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 140,
    height: 50,
  },
  content: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 40, // Radio más pronunciado para elegancia
    borderTopRightRadius: 40,
    paddingTop: 20, // Espaciado interno para que el contenido no pegue arriba
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10, // Sombra para Android
  },
});
