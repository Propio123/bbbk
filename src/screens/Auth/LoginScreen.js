import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import {
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

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const handleLogin = () => {
    if (!email || !password) {
      alert("Por favor, ingresa tus credenciales");
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        console.log("Login exitoso:", userCredential.user.email);
      })
      .catch((error) => {
        console.error("Error en Firebase:", error.code);
        alert("Error: Credenciales incorrectas o problema de red.");
      });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.logoText}>BBBK</Text>
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
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>ENTRAR</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/register")}>
          <Text style={styles.linkText}>
            ¿No tienes cuenta? Regístrate aquí
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
  button: {
    width: "100%",
    height: 55,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    elevation: 5,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  linkText: { marginTop: 20, color: COLORS.primaryGreen, fontWeight: "600" },
});

export default LoginScreen;
