import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../src/api/firebase.config";
import { COLORS } from "../src/constants/theme";

const Register = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    password: "",
    fechaNacimiento: new Date(), // Objeto Date inicial
  });

  const [showPicker, setShowPicker] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [mostrarPolitica, setMostrarPolitica] = useState(false);

  // Manejador del cambio de fecha
  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || formData.fechaNacimiento;
    setShowPicker(Platform.OS === "ios"); // En iOS el picker puede quedarse abierto
    setFormData({ ...formData, fechaNacimiento: currentDate });
    setFechaSeleccionada(true);
  };

  const handleRegister = async () => {
    const { email, password, nombre, telefono, fechaNacimiento } = formData;

    // 1. Validaciones de Negocio
    if (!email || !password || !nombre || !fechaSeleccionada) {
      Alert.alert(
        "Campos incompletos",
        "Por favor completa todos los datos, incluyendo tu fecha de nacimiento.",
      );
      return;
    }

    if (!aceptaTerminos) {
      Alert.alert(
        "LOPDP",
        "Debes aceptar el tratamiento de datos para continuar.",
      );
      return;
    }

    try {
      // 2. Registro en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // 3. Formateo de fecha a String (ISO) para persistencia limpia
      // Esto nos da "YYYY-MM-DD" para que tu Panel Admin funcione perfecto
      const fechaString = fechaNacimiento.toISOString().split("T")[0];

      // 4. Persistencia en Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        nombre,
        telefono,
        email,
        fechaNacimiento: fechaString,
        rol: "paciente",
        puntosSalud: 0,
        consentimientoLOPDP: true,
        fechaRegistro: new Date().toISOString(),
      });

      Alert.alert("¡Éxito!", "Cuenta creada correctamente.");
      router.replace("/home");
    } catch (error) {
      Alert.alert("Error", error.message);
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
          placeholder="Teléfono"
          keyboardType="phone-pad"
          onChangeText={(val) => setFormData({ ...formData, telefono: val })}
        />

        {/* SELECTOR DE FECHA (MÁS SEGURO QUE TEXTINPUT) */}
        <TouchableOpacity
          style={[styles.input, { justifyContent: "center" }]}
          onPress={() => setShowPicker(true)}
        >
          <Text style={{ color: fechaSeleccionada ? "#000" : "#999" }}>
            {fechaSeleccionada
              ? formData.fechaNacimiento.toLocaleDateString()
              : "Fecha de Nacimiento"}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={formData.fechaNacimiento}
            mode="date"
            display="default"
            maximumDate={new Date()} // No permite fechas futuras
            onChange={onChangeDate}
          />
        )}

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
              Acepto el tratamiento de datos personales (LOPDP).
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMostrarPolitica(true)}>
            <Text style={styles.linkText}>Ver Política de Privacidad</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, !aceptaTerminos && { opacity: 0.6 }]}
          onPress={handleRegister}
        >
          <Text style={styles.buttonText}>REGISTRARME</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL LOPDP - Se mantiene igual que tu versión previa */}
      <Modal visible={mostrarPolitica} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Política LOPDP</Text>
            <ScrollView>
              <Text style={styles.legalText}>
                De conformidad con la Ley Orgánica de Protección de Datos, en
                virtud de lo establecido en el artículo 8 de la Ley Orgánica de
                Protección de Datos Personales, otorgo mi consentimiento libre,
                previo, específico, informado e inequívoco para el tratamiento
                de mis datos personales. Autorizo expresamente el tratamiento de
                mis datos personales y datos sensibles, incluyendo información
                relacionada con mi estado de salud, con las siguientes
                finalidades: • Prestación de servicios de atención odontológica
                • Elaboración y gestión de la historia clínica • Diagnóstico y
                tratamiento médico • Seguimiento clínico • Cumplimiento de
                obligaciones legales y regulatorias • Notificación de
                promociones Todo ello en concordancia con el principio de
                finalidad establecido en la ley. Declaro conocer que mis datos
                serán tratados bajo estricta confidencialidad y que la
                institución implementará las medidas de seguridad técnicas y
                organizativas adecuadas para proteger mi información contra
                accesos no autorizados, pérdida, alteración o destrucción. He
                sido informado(a) de que puedo ejercer mis derechos como titular
                de datos personales conforme a la normativa vigente. Como
                titular, tengo derecho a acceder, rectificar y actualizar mis
                datos personales; solicitar su eliminación cuando corresponda;
                oponerme a su tratamiento; y revocar el consentimiento otorgado,
                de conformidad con los Arts. 12 al 18 de la Ley Orgánica de
                Protección de Datos Personales; para ejercer estos derechos,
                deberé presentar una solicitud en el área de administración de
                la institución. Asimismo, conozco que mis datos serán
                conservados únicamente durante el tiempo necesario para cumplir
                con las finalidades descritas, en cumplimiento del principio de
                minimización y conservación previsto en el Art. 10, y que no
                serán comunicados a terceros sin mi autorización, salvo en los
                casos previstos por la ley, conforme al Art. 33.
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
