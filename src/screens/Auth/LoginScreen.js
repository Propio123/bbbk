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
    // 1. Validación de cliente inmediata
    if (!email || !password) {
      Alert.alert("Atención", "Por favor, ingresa correo y contraseña.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      console.log("Login exitoso");
      // Aquí el router hará su trabajo automáticamente
    } catch (error) {
      console.error("Código de error Firebase:", error.code);

      // 2. Mapeo explícito de errores para que SIEMPRE diga algo
      let mensaje = "No se pudo iniciar sesión. Verifique su conexión.";

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        mensaje = "Usuario o contraseña incorrectos.";
      } else if (error.code === "auth/invalid-email") {
        mensaje = "El formato del correo electrónico no es válido.";
      } else if (error.code === "auth/too-many-requests") {
        mensaje = "Demasiados intentos. Intente más tarde.";
      }

      Alert.alert("Error de Acceso", mensaje);
    }
  };

  const handleRecuperarPassword = async () => {
    console.log("Iniciando recuperación para:", email);

    if (!email) {
      Alert.alert(
        "Dato requerido",
        "Escriba su correo electrónico para enviarle el enlace.",
      );
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Correo enviado",
        "Se ha enviado un enlace de restauración a " +
          email +
          ". Si no lo ve, revise la carpeta de SPAM.",
      );
    } catch (error) {
      console.error("Error en recuperación:", error.code);

      let mensaje = "No se pudo enviar el correo de recuperación.";
      if (error.code === "auth/user-not-found") {
        mensaje = "No existe un usuario registrado con ese correo.";
      } else if (error.code === "auth/invalid-email") {
        mensaje = "El formato del correo es incorrecto.";
      }

      Alert.alert("Recuperación", mensaje);
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
