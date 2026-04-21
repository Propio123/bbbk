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
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// IMPORTANTE: El ScreenWrapper ahora envuelve a todo el contenido
import { ScreenWrapper } from "../../../components/ScreenWrapper";
import { auth } from "../../api/firebase.config";
import { COLORS } from "../../constants/theme";

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

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
    } catch (error) {
      console.log("Error Firebase:", error.code);
      let mensaje = "Error de conexión.";
      if (error.code === "auth/invalid-credential")
        mensaje = "Usuario o contraseña incorrectos.";
      mostrarNotificacion("Error de Acceso", mensaje);
    } finally {
      setCargando(false);
    }
  };

  const handleRecuperarPassword = async () => {
    if (!email) {
      mostrarNotificacion(
        "Dato Necesario",
        "Escriba su correo electrónico primero.",
      );
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      mostrarNotificacion("Correo Enviado", "Revise su bandeja de entrada.");
    } catch (error) {
      mostrarNotificacion("Recuperación", "No se pudo enviar el correo.");
    }
  };

  return (
    // EL SCREENWRAPPER ES EL PADRE DE TODO
    <ScreenWrapper showBack={false}>
      <View style={styles.innerContainer}>
        <Text style={styles.title}>Iniciar Sesión</Text>
        <Text style={styles.subtitle}>Tu salud dental en buenas manos</Text>

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
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  // Eliminamos el container verde porque ya lo tiene el ScreenWrapper
  innerContainer: {
    paddingHorizontal: 25,
    paddingTop: 10,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: COLORS.darkGreen,
    marginBottom: 10,
  },
  subtitle: {
    color: "#666",
    fontSize: 14,
    marginBottom: 30,
    textAlign: "center",
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
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 17 },
  linkText: { color: "#666", fontSize: 14 },
  boldText: { color: COLORS.primaryGreen, fontWeight: "bold" },
});

export default LoginScreen;
