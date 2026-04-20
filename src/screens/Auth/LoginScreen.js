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

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert("Aviso", "Por favor, ingresa tus credenciales");
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log("Login exitoso:", userCredential.user.email);
        // El router.replace se encargará de llevarlo al Home según su flujo
      })
      .catch((error) => {
        let mensaje = "Credenciales incorrectas o problema de red.";
        if (error.code === "auth/user-not-found")
          mensaje = "El usuario no existe.";
        if (error.code === "auth/wrong-password")
          mensaje = "Contraseña incorrecta.";
        Alert.alert("Error", mensaje);
      });
  };

  const handleRecuperarPassword = () => {
    if (!email) {
      Alert.alert(
        "Atención",
        "Por favor ingresa tu correo electrónico para enviarte el enlace de recuperación.",
      );
      return;
    }

    sendPasswordResetEmail(auth, email)
      .then(() => {
        Alert.alert(
          "Correo enviado",
          "Revisa tu bandeja de entrada para restablecer tu contraseña.",
        );
      })
      .catch((error) => {
        Alert.alert("Error", "No se pudo enviar el correo: " + error.message);
      });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.logoText}>333K</Text>
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

        {/* CONTENEDOR DE PASSWORD CON ICONO */}
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
              color="#666"
            />
          </TouchableOpacity>
        </View>

        {/* RECUPERAR CONTRASEÑA */}
        <TouchableOpacity
          onPress={handleRecuperarPassword}
          style={styles.forgotBtn}
        >
          <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>ENTRAR</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/register")}>
          <Text style={styles.linkText}>
            ¿No tienes cuenta?{" "}
            <Text style={{ fontWeight: "bold" }}>Regístrate aquí</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryGreen },
  header: { height: "35%", justifyContent: "center", alignItems: "center" },
  logoText: { fontSize: 50, fontWeight: "bold", color: "#fff" },
  subtitle: { color: "#fff", fontSize: 14, opacity: 0.9 },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 30,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.darkGreen,
    marginBottom: 30,
  },
  input: {
    width: "100%",
    height: 55,
    backgroundColor: "#F0F0F0",
    borderRadius: 15,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  passwordContainer: {
    width: "100%",
    height: 55,
    backgroundColor: "#F0F0F0",
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  inputFlex: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 20,
  },
  eyeIcon: {
    paddingHorizontal: 15,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotText: {
    color: COLORS.darkGreen,
    fontSize: 13,
    fontWeight: "500",
  },
  button: {
    width: "100%",
    height: 55,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  linkText: { marginTop: 20, color: COLORS.primaryGreen },
});

export default LoginScreen;
