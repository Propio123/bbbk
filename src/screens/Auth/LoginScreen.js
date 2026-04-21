import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenWrapper } from "../../../components/ScreenWrapper";
import { auth } from "../../api/firebase.config";
import { COLORS } from "../../constants/theme";

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  // Función Multiplataforma para Alertas (Solución para Vercel/Web)
  const mostrarNotificacion = (titulo, mensaje) => {
    if (Platform.OS === "web") {
      window.alert(`${titulo}\n${mensaje}`);
    } else {
      Alert.alert(titulo, mensaje);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      mostrarNotificacion(
        "Campos Requeridos",
        "Por favor ingrese sus credenciales.",
      );
      return;
    }

    setCargando(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // El observador de auth en su _layout se encargará de redirigir
    } catch (error) {
      console.log("Error Firebase:", error.code);
      let mensaje = "Error de conexión con el servidor.";

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password"
      ) {
        mensaje = "Usuario o contraseña incorrectos.";
      } else if (error.code === "auth/invalid-email") {
        mensaje = "El formato del correo es inválido.";
      } else if (error.code === "auth/too-many-requests") {
        mensaje = "Cuenta bloqueada temporalmente por exceso de intentos.";
      }

      mostrarNotificacion("Error de Acceso", mensaje);
    } finally {
      setCargando(false);
    }
  };

  const handleRecuperarPassword = async () => {
    if (!email) {
      mostrarNotificacion(
        "Dato Necesario",
        "Escriba su correo electrónico para enviarle el enlace.",
      );
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      mostrarNotificacion(
        "Correo Enviado",
        "Revise su bandeja de entrada (y SPAM) para restablecer su clave.",
      );
    } catch (error) {
      let mensaje = "No se pudo procesar la solicitud.";
      if (error.code === "auth/user-not-found")
        mensaje = "Este correo no está registrado.";
      mostrarNotificacion("Recuperación", mensaje);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <ScreenWrapper />
        <Text style={styles.subtitle}>Tu salud dental en buenas manos</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Iniciar Sesión</Text>

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputFlex}
            placeholder="Contraseña"
            secureTextEntry={!verPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            onPress={() => setVerPassword(!verPassword)}
            style={styles.eyeIcon}
          >
            <MaterialCommunityIcons
              name={verPassword ? "eye-off" : "eye"}
              size={24}
              color={COLORS.primaryGreen}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleRecuperarPassword}
          style={styles.forgotBtn}
        >
          <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, cargando && { opacity: 0.8 }]}
          onPress={handleLogin}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>ENTRAR</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/register")}
          style={{ marginTop: 25 }}
        >
          <Text style={styles.linkText}>
            ¿No tienes cuenta?{" "}
            <Text style={styles.boldText}>Regístrate aquí</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryGreen },
  header: { height: "35%", justifyContent: "center", alignItems: "center" },
  subtitle: { color: "#fff", fontSize: 14, opacity: 0.9, marginTop: 5 },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 45,
    borderTopRightRadius: 45,
    padding: 35,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: COLORS.darkGreen,
    marginBottom: 30,
  },
  input: {
    width: "100%",
    height: 55,
    backgroundColor: "#F5F5F5",
    borderRadius: 15,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  passwordContainer: {
    width: "100%",
    height: 55,
    backgroundColor: "#F5F5F5",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  inputFlex: { flex: 1, height: "100%", paddingHorizontal: 20 },
  eyeIcon: { paddingHorizontal: 15 },
  forgotBtn: { alignSelf: "flex-end", marginVertical: 15 },
  forgotText: { color: COLORS.primaryGreen, fontWeight: "600", fontSize: 13 },
  button: {
    width: "100%",
    height: 55,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 17 },
  linkText: { color: "#666", fontSize: 14 },
  boldText: { color: COLORS.primaryGreen, fontWeight: "bold" },
});

export default LoginScreen;
