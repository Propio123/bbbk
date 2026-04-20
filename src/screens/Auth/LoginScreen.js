import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../api/firebase.config";
import { COLORS } from "../../constants/theme";

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const router = useRouter();

  // Función para Iniciar Sesión
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Campos vacíos", "Por favor, completa todos los campos.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      console.log("Acceso concedido:", userCredential.user.email);
    } catch (error) {
      console.log("Error detallado:", error.code);
      // Aquí atrapamos el error 400 y lo traducimos
      let mensajeError =
        "Ocurrió un problema con el servicio de autenticación.";

      if (error.code === "auth/invalid-api-key")
        mensajeError = "La API Key configurada es inválida.";
      if (error.code === "auth/user-not-found")
        mensajeError = "No existe una cuenta con este correo.";
      if (error.code === "auth/wrong-password")
        mensajeError = "La contraseña es incorrecta.";
      if (error.code === "auth/network-request-failed")
        mensajeError = "Error de red. Revisa tu conexión.";

      Alert.alert("Error de Acceso", mensajeError);
    }
  };

  // Función para Recuperar Contraseña (LOPDP Friendly)
  const handleRecuperarPassword = async () => {
    console.log("Intentando recuperar para:", email); // Debug en consola

    if (!email) {
      Alert.alert(
        "Dato necesario",
        "Por favor, escribe tu correo electrónico primero.",
      );
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Enlace enviado",
        "Revisa tu correo para restablecer la contraseña.",
      );
    } catch (error) {
      console.error("Error en reset:", error.code);
      Alert.alert(
        "Error",
        "No se pudo enviar el correo. Verifique que el usuario existe.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.logoText}>333K</Text>
        <Text style={styles.subtitle}>Gestión Odontológica Profesional</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Bienvenido</Text>

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
          onPress={handleRecuperarPassword} // Verifique que NO tenga paréntesis aquí
          style={styles.forgotBtn}
          activeOpacity={0.7} // Esto ayuda a ver visualmente si el clic se registra
        >
          <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>INICIAR SESIÓN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => router.push("/register")}
        >
          <Text style={styles.linkText}>
            ¿Aún no tienes cuenta?{" "}
            <Text style={styles.boldText}>Regístrate</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryGreen },
  header: { height: "30%", justifyContent: "center", alignItems: "center" },
  logoText: { fontSize: 55, fontWeight: "bold", color: "#fff" },
  subtitle: { color: "#fff", fontSize: 13, opacity: 0.8 },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    padding: 35,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: COLORS.darkGreen,
    marginBottom: 25,
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
  forgotContainer: { alignSelf: "flex-end", marginVertical: 15 },
  forgotText: { color: COLORS.primaryGreen, fontSize: 14, fontWeight: "600" },
  button: {
    width: "100%",
    height: 55,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  registerLink: { marginTop: 25 },
  linkText: { color: "#666", fontSize: 14 },
  boldText: { color: COLORS.primaryGreen, fontWeight: "bold" },
});

export default LoginScreen;
