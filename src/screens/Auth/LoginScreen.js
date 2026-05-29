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

import { ScreenWrapper } from "../../../components/ScreenWrapper";
import { auth } from "../../api/firebase.config";
import { COLORS } from "../../constants/theme";

const LoginScreen = ({ onSwitchToRegister }) => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);

  const mostrarNotificacion = (titulo, mensaje) => {
    if (Platform.OS === "web") {
      window.alert(`${titulo}\n${mensaje}`);
    } else {
      Alert.alert(titulo, mensaje);
    }
  };

  const handleLogin = async () => {
    if (cargando) return; // Freno de seguridad
    if (!email || !password) {
      mostrarNotificacion(
        "Campos Requeridos",
        "Por favor ingrese sus credenciales.",
      );
      return;
    }
    setCargando(true);
    const emailFormateado = email.trim().toLowerCase();

    try {
      await signInWithEmailAndPassword(auth, emailFormateado, password);
    } catch (error) {
      console.log("Error Firebase Login:", error.code);
      let mensaje = "Error de conexión.";
      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        mensaje = "Usuario o contraseña incorrectos.";
      } else if (error.code === "auth/invalid-email") {
        mensaje = "El formato del correo no es válido.";
      }
      mostrarNotificacion("Error de Acceso", mensaje);
    } finally {
      setCargando(false);
    }
  };

  const handleRecuperarPassword = async () => {
    if (cargando) return; // Evita ejecuciones paralelas si hay doble clic veloz

    if (!email) {
      mostrarNotificacion(
        "Dato Necesario",
        "Por favor, escriba su correo electrónico en el campo superior primero.",
      );
      return;
    }

    const emailLimpio = email.trim().toLowerCase();
    setCargando(true);

    try {
      auth.languageCode = "es";

      // 🔐 Configuración de redirección personalizada (Custom Handler)
      // Esto intercepta el flujo genérico y delega la captura del token a tu web
      const actionCodeSettings = {
        url: "https://bbbkodontologia.com/recuperar-clave",
        handleCodeInApp: false, // Indica que la acción se resuelve en entorno web, no dentro de la APK
      };

      // Enviamos el correo adjuntando los parámetros de continuidad de dominio
      await sendPasswordResetEmail(auth, emailLimpio, actionCodeSettings);

      mostrarNotificacion(
        "Correo Enviado",
        "Hemos enviado un enlace seguro y personalizado para restablecer tu contraseña.\n\n" +
          "⚠️ IMPORTANTE: Si no lo encuentras en tu bandeja de entrada en un par de minutos, revisa tu carpeta de Correo No Deseado o SPAM. Recuerda utilizar únicamente el último enlace recibido.",
      );
    } catch (error) {
      console.log("Error Firebase Recuperación Clave:", error.code);

      let mensajeError =
        "No se pudo procesar la solicitud de recuperación en este momento.";

      if (error.code === "auth/user-not-found") {
        mensajeError =
          "El correo electrónico ingresado no coincide con ningún paciente registrado en la clínica.";
      } else if (error.code === "auth/invalid-email") {
        mensajeError =
          "El formato del correo electrónico ingresado no es válido.";
      } else if (error.code === "auth/too-many-requests") {
        mensajeError =
          "Se han realizado demasiados intentos. Por favor, inténtelo de nuevo más tarde.";
      }

      mostrarNotificacion("Recuperación de Cuenta", mensajeError);
    } finally {
      setCargando(false);
    }
  };

  return (
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
          editable={!cargando}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputFlex}
            placeholder="Contraseña"
            secureTextEntry={!verPassword}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            editable={!cargando}
          />
          <TouchableOpacity
            onPress={() => setVerPassword(!verPassword)}
            style={styles.eyeIcon}
            disabled={cargando}
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
          style={[styles.forgotBtn, cargando && { opacity: 0.5 }]}
          disabled={cargando}
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
          onPress={() => {
            if (onSwitchToRegister) {
              onSwitchToRegister();
            } else {
              router.push("/register");
            }
          }}
          style={{ marginTop: 25 }}
          disabled={cargando}
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
  innerContainer: {
    paddingHorizontal: 25,
    paddingTop: 10,
    alignItems: "center",
    width: "100%",
    maxWidth: 450,
    alignSelf: "center",
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
