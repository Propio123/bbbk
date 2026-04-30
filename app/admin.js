import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { db } from "../src/api/firebase.config";
import { COLORS } from "../src/constants/theme";

export default function AdminMasterPanel() {
  const router = useRouter();
  const [vistaActual, setVistaActual] = useState("agenda");
  const [loading, setLoading] = useState(false);

  // --- ESTADOS MÉDICOS ---
  const [listaMedicos, setListaMedicos] = useState([]);
  const [medicoSel, setMedicoSel] = useState("");

  // --- ESTADOS AGENDA Y EDICIÓN ---
  const [fechaSel, setFechaSel] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [citas, setCitas] = useState([]);
  const [citaEnEdicion, setCitaEnEdicion] = useState(null);
  const [nuevoMedicoParaCita, setNuevoMedicoParaCita] = useState("");

  // --- ESTADOS CLIENTES ---
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  // --- MODALES ---
  const [modalMedicos, setModalMedicos] = useState(false);
  const [modalWA, setModalWA] = useState(false);
  const [citasManana, setCitasManana] = useState([]);

  // Escuchas de Firebase
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "especialidades"), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setListaMedicos(docs);
      if (docs.length > 0 && !medicoSel) setMedicoSel(docs[0].medico);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (vistaActual === "agenda" && medicoSel) {
      const q = query(collection(db, "citas"), where("fecha", "==", fechaSel));
      return onSnapshot(q, (snap) =>
        setCitas(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      );
    }
    if (vistaActual === "clientes") {
      return onSnapshot(collection(db, "users"), (snap) =>
        setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      );
    }
  }, [fechaSel, medicoSel, vistaActual]);

  // --- LÓGICA DE VALIDACIÓN DE HORARIOS ---
  const guardarCambioMedico = async () => {
    if (!nuevoMedicoParaCita || nuevoMedicoParaCita === citaEnEdicion.medico) {
      setCitaEnEdicion(null);
      return;
    }

    // Verificar si el médico destino está ocupado en esa hora
    const ocupado = citas.find(
      (c) =>
        c.medico === nuevoMedicoParaCita &&
        c.hora === citaEnEdicion.hora &&
        c.id !== citaEnEdicion.id &&
        c.estado !== "finalizado",
    );

    if (ocupado) {
      Alert.alert(
        "Error",
        `El ${nuevoMedicoParaCita} ya tiene una cita a las ${citaEnEdicion.hora}`,
      );
      return;
    }

    try {
      setLoading(true);
      await updateDoc(doc(db, "citas", citaEnEdicion.id), {
        medico: nuevoMedicoParaCita,
      });
      setCitaEnEdicion(null);
      Alert.alert("Éxito", "Médico asignado correctamente");
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar la cita");
    } finally {
      setLoading(false);
    }
  };

  const finalizarCita = async (id) => {
    Alert.alert("Finalizar", "¿Desea marcar esta cita como completada?", [
      { text: "No" },
      {
        text: "Sí",
        onPress: async () => {
          setLoading(true);
          await updateDoc(doc(db, "citas", id), { estado: "finalizado" });
          setCitaEnEdicion(null);
          setLoading(false);
        },
      },
    ]);
  };

  // --- GRID Y MAPEO ---
  const agendaMap = useMemo(() => {
    const map = {};
    citas
      .filter((c) => c.medico === medicoSel)
      .forEach((cita) => {
        const slots = Math.ceil((cita.duracion || 15) / 15);
        let [h, m] = cita.hora.split(":").map(Number);
        for (let i = 0; i < slots; i++) {
          const key = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
          if (!map[key]) map[key] = { ...cita, esInicio: i === 0 };
          m += 15;
          if (m >= 60) {
            h++;
            m = 0;
          }
        }
      });
    return map;
  }, [citas, medicoSel]);

  const HORARIOS = [];
  for (let h = 8; h < 18; h++) {
    for (let m = 0; m < 60; m += 15)
      HORARIOS.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
      );
  }

  return (
    <View style={styles.container}>
      {/* Header y Tabs (Omitidos por brevedad pero se mantienen iguales) */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>333K Master Panel</Text>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              onPress={() => setModalMedicos(true)}
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons name="doctor" size={26} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                setVistaActual(vistaActual === "agenda" ? "clientes" : "agenda")
              }
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons
                name={
                  vistaActual === "agenda" ? "account-group" : "calendar-month"
                }
                size={26}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </View>
        {vistaActual === "agenda" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 15 }}
          >
            {listaMedicos.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setMedicoSel(m.medico)}
                style={[styles.tab, medicoSel === m.medico && styles.tabActive]}
              >
                <Text style={styles.tabText}>{m.nombre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* GRID DE AGENDA DINÁMICO */}
      {vistaActual === "agenda" ? (
        <ScrollView contentContainerStyle={styles.grid}>
          {HORARIOS.map((h) => {
            const info = agendaMap[h];
            return (
              <TouchableOpacity
                key={h}
                onPress={() => info && setCitaEnEdicion(info)}
                style={[
                  styles.slot,
                  info?.estado === "aprobado" && styles.bgRojo,
                  info?.estado === "finalizado" && {
                    backgroundColor: "#A5D6A7",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.slotText,
                    info && { color: "#000", fontWeight: "bold" },
                  ]}
                >
                  {h}
                </Text>
                {info?.esInicio && (
                  <Text style={styles.pacienteTag}>{info.nombrePaciente}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        /* Vista de Clientes con Millas Digitalizables */
        <View style={{ flex: 1, padding: 10 }}>
          <TextInput
            placeholder="Buscar..."
            style={styles.searchBar}
            onChangeText={setBusqueda}
          />
          <FlatList
            data={clientes.filter((c) =>
              (c.nombre || "").toLowerCase().includes(busqueda.toLowerCase()),
            )}
            renderItem={({ item }) => (
              <View style={styles.clienteCard}>
                <Text style={{ fontWeight: "bold" }}>
                  {item.nombre || item.displayName}
                </Text>
                <TextInput
                  style={styles.millasInput}
                  keyboardType="numeric"
                  defaultValue={String(item.puntosSalud || 0)}
                  onEndEditing={(e) =>
                    updateDoc(doc(db, "users", item.id), {
                      puntosSalud: Number(e.nativeEvent.text),
                    })
                  }
                />
              </View>
            )}
          />
        </View>
      )}

      {/* PANEL DE EDICIÓN DE CITA (Grid) */}
      {citaEnEdicion && (
        <View style={styles.editPanel}>
          <Text style={styles.editPanelTitle}>
            Editar Cita: {citaEnEdicion.nombrePaciente}
          </Text>
          <Text style={{ fontSize: 12, marginBottom: 10 }}>
            Hora: {citaEnEdicion.hora}
          </Text>

          <Text style={styles.label}>Cambiar de Médico:</Text>
          <ScrollView horizontal style={{ marginBottom: 15 }}>
            {listaMedicos.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setNuevoMedicoParaCita(m.medico)}
                style={[
                  styles.miniTab,
                  nuevoMedicoParaCita === m.medico && styles.tabActive,
                ]}
              >
                <Text style={styles.tabText}>{m.medico}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <TouchableOpacity
              onPress={guardarCambioMedico}
              style={styles.btnSave}
            >
              <Text style={{ color: "#fff" }}>Guardar Cambio</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => finalizarCita(citaEnEdicion.id)}
              style={styles.btnDone}
            >
              <Text style={{ color: "#fff" }}>Finalizar Cita</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCitaEnEdicion(null)}
              style={styles.btnCancel}
            >
              <Text>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* MODAL ESPECIALIDADES EDITABLES */}
      <Modal visible={modalMedicos} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Gestionar Especialistas</Text>
            <FlatList
              data={listaMedicos}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={{ marginBottom: 15 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: COLORS.primaryGreen,
                      fontWeight: "bold",
                    }}
                  >
                    {item.nombre}
                  </Text>
                  <TextInput
                    style={styles.inputEdit}
                    defaultValue={item.medico}
                    onEndEditing={(e) =>
                      updateDoc(doc(db, "especialidades", item.id), {
                        medico: e.nativeEvent.text,
                      })
                    }
                  />
                </View>
              )}
            />
            <TouchableOpacity
              onPress={() => setModalMedicos(false)}
              style={styles.btnClose}
            >
              <Text style={{ color: "#fff" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {loading && (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={COLORS.primaryGreen}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F6F8" },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: COLORS.darkGreen,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  iconBtn: { marginLeft: 15 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginRight: 8,
  },
  tabActive: { backgroundColor: COLORS.primaryGreen },
  tabText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  grid: {
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingBottom: 100,
  },
  slot: {
    width: "23%",
    height: 55,
    backgroundColor: "#fff",
    marginBottom: 8,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  slotText: { fontSize: 10, color: "#CCC" },
  pacienteTag: {
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
  },
  bgRojo: { backgroundColor: "#FF5252" },
  editPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    elevation: 20,
  },
  editPanelTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 5 },
  label: { fontSize: 12, color: "#666", marginBottom: 5 },
  miniTab: {
    padding: 8,
    backgroundColor: "#EEE",
    borderRadius: 10,
    marginRight: 5,
  },
  btnSave: {
    backgroundColor: COLORS.primaryGreen,
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
  },
  btnDone: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
  },
  btnCancel: {
    backgroundColor: "#F0F0F0",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 25,
    maxHeight: "70%",
  },
  modalTitle: { fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  inputEdit: { borderBottomWidth: 1, borderColor: "#DDD", paddingVertical: 5 },
  btnClose: {
    backgroundColor: COLORS.darkGreen,
    padding: 12,
    borderRadius: 15,
    marginTop: 10,
    alignItems: "center",
  },
  loader: { position: "absolute", top: "50%", alignSelf: "center" },
  clienteCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  millasInput: {
    backgroundColor: "#F0F0F0",
    width: 60,
    textAlign: "center",
    borderRadius: 8,
    padding: 5,
    fontWeight: "bold",
  },
  searchBar: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
});
