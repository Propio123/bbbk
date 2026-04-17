import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
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
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    password: "",
  });

  const handleRegister = async () => {
    const { email, password, nombre, telefono } = formData;

    if (!email || !password || !nombre) {
      alert("Por favor completa los campos obligatorios");
      return;
    }

    try {
      // 1. Crear usuario en Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // 2. Crear documento de perfil en Firestore
      await setDoc(doc(db, "users", user.uid), {
        nombre: nombre,
        telefono: telefono,
        email: email,
        rol: "paciente",
        fechaRegistro: new Date().toISOString(),
        puntosSalud: 0, // Sistema de lealtad para la clínica
      });

      console.log("Usuario registrado y perfil creado");
    } catch (error) {
      alert("Error al registrar: " + error.message);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.logoText}>333K</Text>
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
          placeholder="Teléfono"
          keyboardType="phone-pad"
          onChangeText={(val) => setFormData({ ...formData, telefono: val })}
        />

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          autoCapitalize="none"
          onChangeText={(val) => setFormData({ ...formData, email: val })}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          secureTextEntry
          onChangeText={(val) => setFormData({ ...formData, password: val })}
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>REGISTRARME</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryGreen },
  header: { height: 180, justifyContent: "center", alignItems: "center" },
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
    marginBottom: 25,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 15,
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
    elevation: 4,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default Register;
