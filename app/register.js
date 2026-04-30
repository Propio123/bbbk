import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../src/api/firebase.config";
import { COLORS } from "../src/constants/theme";

const Register = ({ navigation }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    password: "",
    fechaNacimiento: "", // <-- NUEVO CAMPO
  });

  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [mostrarPolitica, setMostrarPolitica] = useState(false);

  const handleRegister = async () => {
    const { email, password, nombre, telefono, fechaNacimiento } = formData;

    // Validación de campos básicos
    if (!email || !password || !nombre || !fechaNacimiento) {
      Alert.alert(
        "Campos obligatorios",
        "Por favor completa todos los campos, incluyendo tu fecha de nacimiento.",
      );
      return;
    }

    // Validación de formato de fecha YYYY-MM-DD
    const fechaRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
    if (!fechaRegex.test(fechaNacimiento)) {
      Alert.alert(
        "Formato de fecha incorrecto",
        "Por favor ingresa la fecha en formato AAAA-MM-DD (ejemplo: 1990-05-24).",
      );
      return;
    }

    if (!aceptaTerminos) {
      Alert.alert(
        "Consentimiento Requerido",
        "Debe aceptar la política de tratamiento de datos personales (LOPDP) para continuar.",
      );
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // Guardamos la fechaNacimiento en Firestore
      await setDoc(doc(db, "users", user.uid), {
        nombre: nombre,
        telefono: telefono,
        email: email,
        fechaNacimiento: fechaNacimiento, // <-- GUARDADO PARA EL PANEL ADMIN
        rol: "paciente",
        fechaRegistro: new Date().toISOString(),
        puntosSalud: 0,
        consentimientoLOPDP: true,
        fechaConsentimiento: new Date().toISOString(),
      });

      Alert.alert("Éxito", "Cuenta creada correctamente.");
      router.replace("/home"); // O la ruta de inicio de tu app
    } catch (error) {
      Alert.alert("Error al registrar", error.message);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.logoText}>BBBK</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Crear Cuenta</Text>

        <TextInput
          style={styles.input}
          placeholder="Nombre Completo"
          onChangeText={(val) => setFormData({ ...formData, nombre: val })}
        />

        <TextInput
          style={styles.input}
          placeholder="Teléfono (ej: 0987654321)"
          keyboardType="phone-pad"
          onChangeText={(val) => setFormData({ ...formData, telefono: val })}
        />

        {/* INPUT DE FECHA DE NACIMIENTO */}
        <TextInput
          style={styles.input}
          placeholder="Fecha Nacimiento (AAAA-MM-DD)"
          keyboardType="numeric"
          maxLength={10}
          onChangeText={(val) =>
            setFormData({ ...formData, fechaNacimiento: val })
          }
        />

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={(val) => setFormData({ ...formData, email: val })}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          secureTextEntry
          onChangeText={(val) => setFormData({ ...formData, password: val })}
        />

        {/* SECCIÓN DE CONSENTIMIENTO */}
        <View style={styles.consentContainer}>
          <TouchableOpacity
            onPress={() => setAceptaTerminos(!aceptaTerminos)}
            style={styles.checkboxRow}
          >
            <MaterialCommunityIcons
              name={
                aceptaTerminos ? "checkbox-marked" : "checkbox-blank-outline"
              }
              size={24}
              color={aceptaTerminos ? COLORS.primaryGreen : "#666"}
            />
            <Text style={styles.consentText}>
              Acepto el tratamiento de mis datos personales según la LOPDP.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMostrarPolitica(true)}>
            <Text style={styles.linkText}>
              Leer Política de Privacidad completa
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, !aceptaTerminos && { opacity: 0.6 }]}
          onPress={handleRegister}
        >
          <Text style={styles.buttonText}>REGISTRARME</Text>
        </TouchableOpacity>
      </View>

      {/* ... (El resto del código del Modal y Styles se mantiene igual) */}
      <Modal visible={mostrarPolitica} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Política de Privacidad</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.legalText}>
                De conformidad con la Ley Orgánica de Protección de Datos
                Personales (LOPDP) de Ecuador... (Tu texto legal actual)
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.btnCloseModal}
              onPress={() => setMostrarPolitica(false)}
            >
              <Text style={styles.btnTextClose}>ENTENDIDO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

// ... (Mismos estilos que ya tenías)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryGreen },
  header: { height: 160, justifyContent: "center", alignItems: "center" },
  backButton: { position: "absolute", top: 50, left: 20 },
  logoText: { fontSize: 40, fontWeight: "bold", color: "#fff" },
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
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  consentContainer: { width: "100%", marginVertical: 15 },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  consentText: { fontSize: 12, color: "#444", marginLeft: 8, flexShrink: 1 },
  linkText: {
    fontSize: 12,
    color: COLORS.primaryGreen,
    fontWeight: "bold",
    textDecorationLine: "underline",
    marginLeft: 32,
  },
  button: {
    width: "100%",
    height: 55,
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "100%",
    height: "80%",
    borderRadius: 25,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalScroll: { flex: 1, marginBottom: 15 },
  legalText: { fontSize: 13, color: "#333", lineHeight: 20 },
  btnCloseModal: {
    backgroundColor: COLORS.primaryGreen,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  btnTextClose: { color: "#fff", fontWeight: "bold" },
});

export default Register;
