import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
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

export default function AdminMasterPanel() {
  const router = useRouter();
  const [vistaActual, setVistaActual] = useState("citas");
  const [citas, setCitas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [nuevaEsp, setNuevaEsp] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [clienteEdicion, setClienteEdicion] = useState(null);

  useEffect(() => {
    // Suscripción en tiempo real a Citas
    const unsubCitas = onSnapshot(
      query(collection(db, "appointments"), orderBy("fecha", "asc")),
      (snap) => {
        setCitas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
    );
    // Suscripción a Clientes (Pacientes)
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    // Suscripción a Especialidades
    const unsubEsp = onSnapshot(collection(db, "especialidades"), (snap) => {
      setEspecialidades(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubCitas();
      unsubUsers();
      unsubEsp();
    };
  }, []);

  // --- LÓGICA DE WHATSAPP ---
  const enviarWhatsApp = (telefono, mensaje) => {
    if (!telefono)
      return Alert.alert("Error", "El cliente no tiene teléfono registrado.");
    let num = telefono.replace(/\D/g, "");
    if (num.startsWith("0")) num = "593" + num.substring(1);
    const url = `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(mensaje)}`;
    Linking.openURL(url);
  };

  const confirmarCita = (cita) => {
    const msj = `Hola ${cita.nombrePaciente}, te saluda BBBK. Confirmamos tu cita de ${cita.especialidad} para mañana ${cita.fecha} a las ${cita.hora}. ¿Contamos con tu asistencia?`;
    enviarWhatsApp(cita.telefono, msj);
  };

  // --- LÓGICA DE ESPECIALIDADES ---
  const agregarEspecialidad = async () => {
    if (!nuevaEsp.trim()) return;
    await addDoc(collection(db, "especialidades"), { nombre: nuevaEsp.trim() });
    setNuevaEsp("");
  };

  // --- LÓGICA DE CUMPLEAÑOS ---
  const esCumpleHoy = (fechaStr) => {
    if (!fechaStr) return false;
    const hoy = new Date();
    const mmdd = `${(hoy.getMonth() + 1).toString().padStart(2, "0")}-${hoy.getDate().toString().padStart(2, "0")}`;
    return fechaStr.endsWith(mmdd);
  };

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Seguro que desea salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        onPress: () => signOut(auth).then(() => router.replace("/login")),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* HEADER DINÁMICO */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={28} color="#FF5252" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ADMIN BBBK</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.navBar}
        >
          <NavButton
            icon="calendar-clock"
            label="Citas"
            active={vistaActual === "citas"}
            onPress={() => setVistaActual("citas")}
          />
          <NavButton
            icon="account-group"
            label="Clientes"
            active={vistaActual === "clientes"}
            onPress={() => setVistaActual("clientes")}
          />
          <NavButton
            icon="stethoscope"
            label="Especialidades"
            active={vistaActual === "especialidades"}
            onPress={() => setVistaActual("especialidades")}
          />
        </ScrollView>
      </View>

      <View style={styles.content}>
        {/* VISTA CITAS */}
        {vistaActual === "citas" && (
          <FlatList
            data={citas}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.nombrePaciente}</Text>
                  <Text style={styles.cardSub}>
                    {item.especialidad} - {item.fecha} {item.hora}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => confirmarCita(item)}
                  style={styles.btnWs}
                >
                  <MaterialCommunityIcons
                    name="whatsapp"
                    size={24}
                    color="#FFF"
                  />
                </TouchableOpacity>
              </View>
            )}
          />
        )}

        {/* VISTA CLIENTES (CON GESTIÓN DE CUMPLEAÑOS) */}
        {vistaActual === "clientes" && (
          <View style={{ flex: 1 }}>
            <TextInput
              placeholder="Buscar paciente..."
              style={styles.searchBar}
              onChangeText={setBusqueda}
            />
            <FlatList
              data={clientes.filter((c) =>
                c.nombre?.toLowerCase().includes(busqueda.toLowerCase()),
              )}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => setClienteEdicion(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.nombre}</Text>
                    <Text
                      style={[
                        styles.cardSub,
                        {
                          color: item.fechaNacimiento
                            ? COLORS.primaryGreen
                            : "#FF9800",
                        },
                      ]}
                    >
                      {item.fechaNacimiento
                        ? `Cumpleaños: ${item.fechaNacimiento}`
                        : "⚠️ Sin fecha registrada"}
                    </Text>
                  </View>
                  {esCumpleHoy(item.fechaNacimiento) && (
                    <MaterialCommunityIcons
                      name="cake-variant"
                      size={24}
                      color="#E91E63"
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* VISTA ESPECIALIDADES */}
        {vistaActual === "especialidades" && (
          <View style={{ flex: 1 }}>
            <View style={styles.addArea}>
              <TextInput
                placeholder="Nueva especialidad..."
                style={[styles.searchBar, { flex: 1, marginBottom: 0 }]}
                value={nuevaEsp}
                onChangeText={setNuevaEsp}
              />
              <TouchableOpacity
                onPress={agregarEspecialidad}
                style={styles.btnAdd}
              >
                <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={especialidades}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <Text style={{ flex: 1, fontWeight: "bold" }}>
                    {item.nombre}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      deleteDoc(doc(db, "especialidades", item.id))
                    }
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={22}
                      color="#FF5252"
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        )}
      </View>

      {/* MODAL EDITOR DE CLIENTE (FECHAS MANUALES) */}
      <Modal visible={!!clienteEdicion} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Actualizar Paciente</Text>
            <Text style={styles.label}>Nombre:</Text>
            <TextInput
              style={styles.modalInput}
              value={clienteEdicion?.nombre}
              onChangeText={(t) =>
                setClienteEdicion({ ...clienteEdicion, nombre: t })
              }
            />
            <Text style={styles.label}>Fecha Nacimiento (AAAA-MM-DD):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="1990-05-24"
              value={clienteEdicion?.fechaNacimiento}
              onChangeText={(t) =>
                setClienteEdicion({ ...clienteEdicion, fechaNacimiento: t })
              }
            />
            <TouchableOpacity
              style={styles.btnSave}
              onPress={async () => {
                await updateDoc(doc(db, "users", clienteEdicion.id), {
                  nombre: clienteEdicion.nombre,
                  fechaNacimiento: clienteEdicion.fechaNacimiento,
                });
                setClienteEdicion(null);
                Alert.alert("Éxito", "Datos actualizados");
              }}
            >
              <Text style={styles.btnSaveText}>GUARDAR CAMBIOS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setClienteEdicion(null)}
              style={{ marginTop: 15 }}
            >
              <Text style={{ textAlign: "center", color: "#666" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Componente auxiliar para botones de navegación
const NavButton = ({ icon, label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.navBtn, active && styles.navBtnActive]}
  >
    <MaterialCommunityIcons
      name={icon}
      size={20}
      color={active ? "#FFF" : "#CCC"}
    />
    <Text style={[styles.navBtnText, active && styles.navBtnTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  header: {
    backgroundColor: COLORS.darkGreen,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 50,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  navBar: { flexDirection: "row", marginTop: 20, paddingLeft: 20 },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  navBtnActive: { backgroundColor: COLORS.primaryGreen },
  navBtnText: { color: "#CCC", marginLeft: 5, fontSize: 12 },
  navBtnTextActive: { color: "#FFF", fontWeight: "bold" },
  content: { flex: 1, padding: 20 },
  card: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  cardTitle: { fontWeight: "bold", fontSize: 15 },
  cardSub: { fontSize: 12, color: "#666", marginTop: 2 },
  btnWs: { backgroundColor: "#25D366", padding: 10, borderRadius: 12 },
  searchBar: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 1,
  },
  addArea: { flexDirection: "row", marginBottom: 15, gap: 10 },
  btnAdd: {
    backgroundColor: COLORS.primaryGreen,
    padding: 12,
    borderRadius: 15,
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#FFF", padding: 25, borderRadius: 30 },
  modalTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  modalInput: {
    borderBottomWidth: 1,
    borderColor: "#EEE",
    paddingVertical: 8,
    marginBottom: 15,
    fontWeight: "bold",
  },
  label: { fontSize: 11, color: "#999" },
  btnSave: {
    backgroundColor: COLORS.primaryGreen,
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
  },
  btnSaveText: { color: "#FFF", fontWeight: "bold" },
});
