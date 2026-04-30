import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
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
import { auth, db } from "../src/api/firebase.config";
import { COLORS } from "../src/constants/theme";

// Lista inicial basada en tu requerimiento
const INITIAL_MEDICOS = [
  { id: "gen", nombre: "General", medico: "Dra. Doménica Palma" },
  { id: "ort", nombre: "Ortodoncia", medico: "Dr. Bladimir Benavidez" },
  { id: "end", nombre: "Endodoncia", medico: "Dr. Xavier C." },
  { id: "cir", nombre: "Cirugía", medico: "Dr. Darwin Congo" },
  { id: "est", nombre: "Estética", medico: "Dr. Santiago Benalcazar" },
  { id: "per", nombre: "Periodoncia", medico: "Dra. Eliana Cespedes" },
  { id: "reh", nombre: "Rehabilitación", medico: "Dr. Jose Cargua" },
  { id: "adop", nombre: "Odontopediatría", medico: "Dra. Sofía Benavides" },
];

export default function AdminMasterPanel() {
  const router = useRouter();
  const [vistaActual, setVistaActual] = useState("agenda");
  const [loading, setLoading] = useState(false);

  // --- ESTADOS MÉDICOS DINÁMICOS ---
  const [listaMedicos, setListaMedicos] = useState([]);
  const [medicoSel, setMedicoSel] = useState("");

  // --- ESTADOS AGENDA ---
  const [fechaSel, setFechaSel] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [citas, setCitas] = useState([]);
  const [citaBase, setCitaBase] = useState(null);
  const [nuevoMedico, setNuevoMedico] = useState(null);
  const [seleccionMultiple, setSeleccionMultiple] = useState([]);

  // --- ESTADOS CLIENTES ---
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [puntosEdit, setPuntosEdit] = useState({});

  // --- MODALES ---
  const [modalWA, setModalWA] = useState(false);
  const [citasManana, setCitasManana] = useState([]);
  const [modalMedicos, setModalMedicos] = useState(false);

  // 1. Cargar Médicos desde Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "especialidades"),
      (snapshot) => {
        if (snapshot.empty) {
          // Si no hay datos, inicializamos con los proporcionados
          INITIAL_MEDICOS.forEach((m) =>
            setDoc(doc(db, "especialidades", m.id), m),
          );
        } else {
          const medicosData = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          setListaMedicos(medicosData);
          if (!medicoSel) setMedicoSel(medicosData[0]?.medico);
        }
      },
    );
    return () => unsubscribe();
  }, []);

  // 2. Escucha de Citas
  useEffect(() => {
    if (vistaActual !== "agenda" || !medicoSel) return;
    const q = query(
      collection(db, "citas"),
      where("fecha", "==", fechaSel),
      where("medico", "==", medicoSel),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCitas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [fechaSel, medicoSel, vistaActual]);

  // 3. Escucha de Usuarios
  useEffect(() => {
    if (vistaActual !== "clientes") return;
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      setClientes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [vistaActual]);

  const agendaMap = useMemo(() => {
    const map = {};
    citas.forEach((cita) => {
      const slots = Math.ceil((cita.duracion || 15) / 15);
      let [h, m] = cita.hora.split(":").map(Number);
      for (let i = 0; i < slots; i++) {
        const key = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        if (!map[key])
          map[key] = { ...cita, esInicio: i === 0, esContinuacion: i > 0 };
        m += 15;
        if (m >= 60) {
          h++;
          m = 0;
        }
      }
    });
    return map;
  }, [citas]);

  const HORARIOS = [];
  for (let h = 8; h < 18; h++) {
    for (let m = 0; m < 60; m += 15)
      HORARIOS.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
      );
  }

  const clientesFiltrados = useMemo(() => {
    const term = busqueda.toLowerCase().trim();
    return clientes.filter(
      (c) =>
        (c.nombre || c.displayName || "Paciente")
          .toLowerCase()
          .includes(term) || (c.email || "").toLowerCase().includes(term),
    );
  }, [clientes, busqueda]);

  // --- FUNCIONES MÉDICOS ---
  const actualizarNombreMedico = async (id, nuevoNombre) => {
    try {
      await updateDoc(doc(db, "especialidades", id), { medico: nuevoNombre });
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar el médico");
    }
  };

  // --- LOGICA AGENDA ---
  const manejarToqueSlot = (hora, info) => {
    if (citaBase) {
      if (info && info.id !== citaBase.id) return;
      setSeleccionMultiple((prev) =>
        prev.includes(hora)
          ? prev.filter((h) => h !== hora)
          : [...prev, hora].sort(),
      );
    } else if (info) {
      setCitaBase(info);
      setNuevoMedico(info.medico);
      setSeleccionMultiple([info.hora]);
    }
  };

  const guardarCambiosAgenda = async () => {
    if (!citaBase) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "citas", citaBase.id), {
        duracion: seleccionMultiple.length * 15,
        hora: seleccionMultiple[0],
        medico: nuevoMedico || citaBase.medico,
        estado: "aprobado",
      });
      setCitaBase(null);
      setSeleccionMultiple([]);
    } catch (e) {
      Alert.alert("Error", "Fallo al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>333K Master Panel</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
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
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => signOut(auth).then(() => router.replace("/login"))}
            >
              <MaterialCommunityIcons name="power" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {vistaActual === "agenda" && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.medicoScroll}
            >
              {listaMedicos.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setMedicoSel(m.medico)}
                  style={[
                    styles.tab,
                    medicoSel === m.medico && styles.tabActive,
                  ]}
                >
                  <Text style={styles.tabText}>{m.nombre}</Text>
                  <Text style={styles.medicoSubText}>{m.medico}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.dateNav}>
              <TouchableOpacity
                onPress={() => {
                  const d = new Date(fechaSel + "T12:00:00");
                  d.setDate(d.getDate() - 1);
                  setFechaSel(d.toISOString().split("T")[0]);
                }}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={35}
                  color="#fff"
                />
              </TouchableOpacity>
              <Text style={styles.dateText}>{fechaSel}</Text>
              <TouchableOpacity
                onPress={() => {
                  const d = new Date(fechaSel + "T12:00:00");
                  d.setDate(d.getDate() + 1);
                  setFechaSel(d.toISOString().split("T")[0]);
                }}
              >
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={35}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {vistaActual === "agenda" ? (
        <ScrollView contentContainerStyle={styles.grid}>
          {HORARIOS.map((h) => {
            const info = agendaMap[h];
            const estaSel = seleccionMultiple.includes(h);
            return (
              <TouchableOpacity
                key={h}
                onPress={() => manejarToqueSlot(h, info)}
                style={[
                  styles.slot,
                  info?.estado === "pendiente" && styles.bgAmarillo,
                  info?.estado === "aprobado" && styles.bgRojo,
                  estaSel && styles.bgSeleccion,
                  info?.esContinuacion && { borderTopWidth: 0, marginTop: -2 },
                ]}
              >
                <Text
                  style={[
                    styles.slotText,
                    (info || estaSel) && { color: "#000", fontWeight: "bold" },
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
        <View style={styles.clientesContainer}>
          <TextInput
            style={styles.searchBar}
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChangeText={setBusqueda}
          />
          <FlatList
            data={clientesFiltrados}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.clienteCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.clienteName}>
                      {item.nombre || item.displayName || "Paciente sin nombre"}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#666" }}>
                      {item.email}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          item.tipoCliente === "PREMIUM"
                            ? "#D4AF37"
                            : "#CD7F32",
                      },
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {item.tipoCliente || "PRI"}
                    </Text>
                  </View>
                </View>
                {/* Controles de puntos y niveles simplificados aquí para legibilidad */}
              </View>
            )}
          />
        </View>
      )}

      {/* MODAL GESTIÓN DE MÉDICOS */}
      <Modal visible={modalMedicos} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Especialistas</Text>
            <FlatList
              data={listaMedicos}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.editMedicoRow}>
                  <Text style={styles.editMedicoEsp}>{item.nombre}</Text>
                  <TextInput
                    style={styles.editMedicoInput}
                    defaultValue={item.medico}
                    onEndEditing={(e) =>
                      actualizarNombreMedico(item.id, e.nativeEvent.text)
                    }
                  />
                </View>
              )}
            />
            <TouchableOpacity
              style={styles.btnClose}
              onPress={() => setModalMedicos(false)}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FOOTER EDITOR AGENDA (Se activa al tocar una cita) */}
      {citaBase && (
        <View style={styles.footerAccion}>
          <Text style={styles.footerText}>
            Editando: {citaBase.nombrePaciente}
          </Text>
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={styles.btnCan}
              onPress={() => setCitaBase(null)}
            >
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnOk}
              onPress={guardarCambiosAgenda}
            >
              <Text style={styles.btnText}>GUARDAR CAMBIOS</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  iconBtn: { marginRight: 15 },
  medicoScroll: { marginTop: 15 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginRight: 8,
    alignItems: "center",
  },
  tabActive: { backgroundColor: COLORS.primaryGreen },
  tabText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  medicoSubText: { color: "#fff", fontSize: 8, opacity: 0.8 },
  dateNav: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  dateText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginHorizontal: 20,
  },
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
    borderColor: "#EDEFF2",
  },
  slotText: { fontSize: 10, color: "#B0B5C1" },
  pacienteTag: {
    fontSize: 7,
    color: "#333",
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 2,
  },
  bgAmarillo: { backgroundColor: "#FFD700" },
  bgRojo: { backgroundColor: "#FF5252" },
  bgSeleccion: {
    backgroundColor: "#E8F5E9",
    borderColor: COLORS.primaryGreen,
    borderWidth: 2,
  },
  clientesContainer: { flex: 1, padding: 15 },
  searchBar: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
  },
  clienteCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clienteName: { fontWeight: "bold", fontSize: 14, color: "#333" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", borderRadius: 20, padding: 20 },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  editMedicoRow: { marginBottom: 15 },
  editMedicoEsp: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.primaryGreen,
  },
  editMedicoInput: {
    borderBottomWidth: 1,
    borderColor: "#DDD",
    paddingVertical: 5,
    fontSize: 14,
  },
  btnClose: {
    backgroundColor: COLORS.darkGreen,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  footerAccion: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: COLORS.darkGreen,
    padding: 15,
    borderRadius: 20,
    elevation: 10,
  },
  footerText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    alignItems: "center",
  },
  btnOk: {
    backgroundColor: COLORS.primaryGreen,
    padding: 10,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: "center",
  },
  btnCan: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 10,
    borderRadius: 10,
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
});
