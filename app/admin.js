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
  updateDoc,
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
    // 1. Escuchar Citas (Asegúrate que la colección en Firebase sea 'citas')
    const unsubCitas = onSnapshot(
      query(collection(db, "citas"), orderBy("fecha", "asc")),
      (snap) => {
        setCitas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
    );

    // 2. Escuchar Clientes
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // 3. Escuchar Especialidades
    const unsubEsp = onSnapshot(collection(db, "especialidades"), (snap) => {
      setEspecialidades(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubCitas();
      unsubUsers();
      unsubEsp();
    };
  }, []);

  // --- LÓGICA DE COMUNICACIÓN ---
  const enviarWhatsApp = (telefono, mensaje) => {
    if (!telefono) return Alert.alert("Error", "Teléfono no registrado.");
    let num = telefono.replace(/\D/g, "");
    if (num.startsWith("0")) num = "593" + num.substring(1);
    const url = `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(mensaje)}`;
    Linking.openURL(url);
  };

  const confirmarCita = (cita) => {
    const msj = `Hola ${cita.nombrePaciente}, te saludamos de BBBK. Confirmamos tu cita de ${cita.especialidad} para mañana ${cita.fecha} a las ${cita.hora}. ¿Confirmas tu asistencia?`;
    enviarWhatsApp(cita.telefono, msj);
  };

  // --- LÓGICA DE NEGOCIO ---
  const esCumpleHoy = (fechaStr) => {
    if (!fechaStr) return false;
    const hoy = new Date();
    const mmdd = `${(hoy.getMonth() + 1).toString().padStart(2, "0")}-${hoy.getDate().toString().padStart(2, "0")}`;
    return fechaStr.endsWith(mmdd);
  };

  const handleLogout = () => {
    Alert.alert("Salir", "¿Cerrar sesión administrativa?", [
      { text: "No" },
      {
        text: "Sí",
        onPress: () => signOut(auth).then(() => router.replace("/login")),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleLogout}>
            <MaterialCommunityIcons name="power" size={30} color="#FF5252" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PANEL DE CONTROL BBBK</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.navBar}
        >
          <NavButton
            icon="calendar-check"
            label="Citas"
            active={vistaActual === "citas"}
            onPress={() => setVistaActual("citas")}
          />
          <NavButton
            icon="account-multiple"
            label="Pacientes"
            active={vistaActual === "clientes"}
            onPress={() => setVistaActual("clientes")}
          />
          <NavButton
            icon="briefcase-medical"
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
                  <Text style={styles.cardTitle}>
                    {item.nombrePaciente || "Paciente"}
                  </Text>
                  <Text style={styles.cardSub}>
                    {item.especialidad} | {item.fecha} - {item.hora}
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

        {/* VISTA CLIENTES (Gestión LOPDP de fechas) */}
        {vistaActual === "clientes" && (
          <View style={{ flex: 1 }}>
            <TextInput
              placeholder="Buscar por nombre..."
              style={styles.searchBar}
              onChangeText={setBusqueda}
            />
            <FlatList
              data={clientes.filter((c) =>
                (c.nombre || "").toLowerCase().includes(busqueda.toLowerCase()),
              )}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => setClienteEdicion(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {item.nombre || "Sin Nombre"}
                    </Text>
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
                        ? `Cumple: ${item.fechaNacimiento}`
                        : "⚠️ Falta fecha de nacimiento"}
                    </Text>
                  </View>
                  {esCumpleHoy(item.fechaNacimiento) && (
                    <MaterialCommunityIcons
                      name="cake-variant"
                      size={26}
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
                placeholder="Nombre especialidad..."
                style={[styles.searchBar, { flex: 1, marginBottom: 0 }]}
                value={nuevaEsp}
                onChangeText={setNuevaEsp}
              />
              <TouchableOpacity
                onPress={() => {
                  if (nuevaEsp.trim()) {
                    addDoc(collection(db, "especialidades"), {
                      nombre: nuevaEsp.trim(),
                    });
                    setNuevaEsp("");
                  }
                }}
                style={styles.btnAdd}
              >
                <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={especialidades}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <Text style={{ flex: 1, fontWeight: "600" }}>
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

      {/* MODAL PARA ACTUALIZAR FECHAS FALTANTES */}
      <Modal visible={!!clienteEdicion} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Información</Text>

            <Text style={styles.label}>Nombre del Paciente:</Text>
            <TextInput
              style={styles.modalInput}
              value={clienteEdicion?.nombre}
              onChangeText={(t) =>
                setClienteEdicion({ ...clienteEdicion, nombre: t })
              }
            />

            <Text style={styles.label}>Fecha de Nacimiento (AAAA-MM-DD):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="1995-10-15"
              value={clienteEdicion?.fechaNacimiento}
              onChangeText={(t) => {
                // Máscara básica
                let val = t.replace(/\D/g, "");
                if (val.length > 4 && val.length <= 6)
                  val = `${val.slice(0, 4)}-${val.slice(4)}`;
                else if (val.length > 6)
                  val = `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
                setClienteEdicion({ ...clienteEdicion, fechaNacimiento: val });
              }}
              maxLength={10}
            />

            <TouchableOpacity
              style={styles.btnSave}
              onPress={async () => {
                const regex =
                  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
                if (
                  clienteEdicion.fechaNacimiento &&
                  !regex.test(clienteEdicion.fechaNacimiento)
                ) {
                  return Alert.alert("Error", "Formato de fecha inválido.");
                }
                await updateDoc(doc(db, "users", clienteEdicion.id), {
                  nombre: clienteEdicion.nombre,
                  fechaNacimiento: clienteEdicion.fechaNacimiento || "",
                });
                setClienteEdicion(null);
              }}
            >
              <Text style={styles.btnSaveText}>GUARDAR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setClienteEdicion(null)}
              style={{ marginTop: 15 }}
            >
              <Text style={{ textAlign: "center", color: "#999" }}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const NavButton = ({ icon, label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.navBtn, active && styles.navBtnActive]}
  >
    <MaterialCommunityIcons
      name={icon}
      size={20}
      color={active ? "#FFF" : "#888"}
    />
    <Text style={[styles.navBtnText, active && styles.navBtnTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  header: {
    backgroundColor: COLORS.darkGreen,
    paddingBottom: 25,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    paddingTop: 50,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },
  navBar: { flexDirection: "row", marginTop: 25, paddingLeft: 25 },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  navBtnActive: { backgroundColor: COLORS.primaryGreen },
  navBtnText: { color: "#888", marginLeft: 8, fontSize: 12, fontWeight: "500" },
  navBtnTextActive: { color: "#FFF", fontWeight: "bold" },
  content: { flex: 1, padding: 20 },
  card: {
    backgroundColor: "#FFF",
    padding: 18,
    borderRadius: 22,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: { fontWeight: "700", fontSize: 16, color: COLORS.darkGreen },
  cardSub: { fontSize: 13, color: "#777", marginTop: 4 },
  btnWs: { backgroundColor: "#25D366", padding: 12, borderRadius: 15 },
  searchBar: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 18,
    marginBottom: 20,
    elevation: 2,
    fontSize: 14,
  },
  addArea: { flexDirection: "row", marginBottom: 20, gap: 12 },
  btnAdd: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 20,
    borderRadius: 18,
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    padding: 30,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    minHeight: "50%",
  },
  modalTitle: {
    fontWeight: "800",
    fontSize: 20,
    marginBottom: 25,
    textAlign: "center",
    color: COLORS.darkGreen,
  },
  modalInput: {
    backgroundColor: "#F8F9FA",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    fontSize: 16,
    fontWeight: "600",
  },
  label: {
    fontSize: 12,
    color: "#AAA",
    marginBottom: 8,
    marginLeft: 5,
    fontWeight: "600",
  },
  btnSave: {
    backgroundColor: COLORS.primaryGreen,
    padding: 18,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 10,
    elevation: 4,
  },
  btnSaveText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});
