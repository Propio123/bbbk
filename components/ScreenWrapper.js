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

        {/* Contenedor del Logo Llamativo */}
        <View style={styles.logoBadge}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
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
    height: 120, // Aumentamos la altura para acomodar el badge
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 30, // Ajustado por la nueva altura del header
    zIndex: 20,
    padding: 10,
  },
  backText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  logoBadge: {
    width: 100, // Tamaño más grande para logo cuadrado
    height: 100,
    backgroundColor: "#fff",
    borderRadius: 50, // Lo hace perfectamente circular
    justifyContent: "center",
    alignItems: "center",
    // Sombra para dar relieve
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.3)", // Un pequeño borde sutil
    marginTop: 20,
  },
  logo: {
    width: 75, // Ajuste interno
    height: 75,
  },
  content: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    // Este margen negativo hace que el círculo del logo se "traslape" con la tarjeta blanca
    marginTop: -20,
    zIndex: 5,
  },
  innerContent: {
    flex: 1,
    paddingTop: 30, // Espacio para que el contenido no choque con la curva
  },
});
