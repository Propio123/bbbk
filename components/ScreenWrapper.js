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

  // Color base de la App
  const bgColor = COLORS?.primaryGreen || "#8CC63F";
  // Color específico del fondo del LOGO (según su indicación)
  const logoBgColor = "#499A47";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
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

        {/* CONTENEDOR CUADRADO INTEGRADO (BADGE) */}
        <View style={[styles.logoBadge, { backgroundColor: logoBgColor }]}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain" // Mantiene la proporción del logo dentro del cuadrado
          />
        </View>
      </View>

      {/* Contenedor Blanco Semiredondo */}
      <View style={styles.content}>
        <View style={styles.innerContent}>{children}</View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  headerContainer: {
    height: 140, // Aumentamos la altura para acomodar el badge más grande
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 20, // Ajustado para la nueva altura
    zIndex: 20,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.15)", // Fondo sutil para el botón en Vercel/Web
    borderRadius: 20,
  },
  backText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  logoBadge: {
    // TAMAÑO MUCHO MÁS GRANDE (120x120)
    width: 120,
    height: 120,
    // borderRadius pequeño para un acabado cuadrado pero suave (biselado)
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    // SOMBRA FUERTE PARA RELIEVE (Efecto físico)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12, // Sombra para Android APK
    // Borde sutil para definir el cuadrado sobre el fondo verde de la app
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    marginTop: 30, // Centrado vertical en el header
  },
  logo: {
    // El logo ocupa casi todo el contenedor integrado
    width: 100,
    height: 100,
  },
  content: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    // TRASLAPE: El cuadrado se monta sobre la tarjeta blanca
    marginTop: -30,
    zIndex: 5,
  },
  innerContent: {
    flex: 1,
    // Espacio superior extra para que el contenido no pegue con la curva ni el traslape
    paddingTop: 40,
    paddingHorizontal: 5, // Pequeño ajuste lateral
  },
});
