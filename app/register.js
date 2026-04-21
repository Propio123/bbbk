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
  });

  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [mostrarPolitica, setMostrarPolitica] = useState(false);

  const handleRegister = async () => {
    const { email, password, nombre, telefono } = formData;

    if (!email || !password || !nombre) {
      Alert.alert(
        "Campos obligatorios",
        "Por favor completa los campos para continuar.",
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

      await setDoc(doc(db, "users", user.uid), {
        nombre: nombre,
        telefono: telefono,
        email: email,
        rol: "paciente",
        fechaRegistro: new Date().toISOString(),
        puntosSalud: 0,
        consentimientoLOPDP: true,
        fechaConsentimiento: new Date().toISOString(),
      });

      Alert.alert("Éxito", "Cuenta creada correctamente.");
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

      {/* MODAL DE POLÍTICA DE PRIVACIDAD */}
      <Modal visible={mostrarPolitica} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Política de Privacidad</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.legalText}>
                {/* AQUÍ PEGA TU DOCUMENTO DE POLÍTICA */}
                De conformidad con la Ley Orgánica de Protección de Datos
                Personales (LOPDP) de Ecuador, le informamos que sus datos serán
                tratados por BBBK Clínica con la finalidad de gestionar sus
                citas médicas, historial clínico y contacto directo.{"\n\n"}
                1. Datos Recolectados: Nombre, teléfono y correo electrónico.
                {"\n"}
                2. Finalidad: Prestación de servicios de salud y recordatorios
                vía WhatsApp.{"\n"}
                3. Derechos: Usted puede ejercer sus derechos de acceso,
                rectificación y eliminación...
                {"\n\n"}
                En virtud de lo establecido en el artículo 8 de la Ley Orgánica
                de Protección de Datos Personales, otorgo mi consentimiento
                libre, previo, específico, informado e inequívoco para el
                tratamiento de mis datos personales. Autorizo expresamente el
                tratamiento de mis datos personales y datos sensibles,
                incluyendo información relacionada con mi estado de salud, con
                las siguientes finalidades: • Prestación de servicios de
                atención odontológica • Elaboración y gestión de la historia
                clínica • Diagnóstico y tratamiento médico • Seguimiento clínico
                • Cumplimiento de obligaciones legales y regulatorias •
                Notificación de promociones Todo ello en concordancia con el
                principio de finalidad establecido en la ley. Declaro conocer
                que mis datos serán tratados bajo estricta confidencialidad y
                que la institución implementará las medidas de seguridad
                técnicas y organizativas adecuadas para proteger mi información
                contra accesos no autorizados, pérdida, alteración o
                destrucción. He sido informado(a) de que puedo ejercer mis
                derechos como titular de datos personales conforme a la
                normativa vigente. Como titular, tengo derecho a acceder,
                rectificar y actualizar mis datos personales; solicitar su
                eliminación cuando corresponda; oponerme a su tratamiento; y
                revocar el consentimiento otorgado, de conformidad con los Arts.
                12 al 18 de la Ley Orgánica de Protección de Datos Personales;
                para ejercer estos derechos, deberé presentar una solicitud en
                el área de administración de la institución. Asimismo, conozco
                que mis datos serán conservados únicamente durante el tiempo
                necesario para cumplir con las finalidades descritas, en
                cumplimiento del principio de minimización y conservación
                previsto en el Art. 10, y que no serán comunicados a terceros
                sin mi autorización, salvo en los casos previstos por la ley,
                conforme al Art. 33.
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

  // ESTILOS DEL MODAL LEGAL
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
