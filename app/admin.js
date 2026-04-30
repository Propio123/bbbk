import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { db } from "../src/api/firebase.config";
import { COLORS } from "../src/constants/theme";

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

  // --- ESTADOS MÉDICOS ---
  const [listaMedicos, setListaMedicos] = useState([]);
  const [medicoSel, setMedicoSel] = useState("");

  // --- ESTADOS AGENDA ---
  const [fechaSel, setFechaSel] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [citas, setCitas] = useState([]);
  const [citaBase, setCitaBase] = useState(null);
  const [seleccionMultiple, setSeleccionMultiple] = useState([]);

  // --- ESTADOS CLIENTES ---
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [puntosEdit, setPuntosEdit] = useState({});

  // --- MODALES ---
  const [modalWA, setModalWA] = useState(false);
  const [citasManana, setCitasManana] = useState([]);
  const [modalMedicos, setModalMedicos] = useState(false);

  // 1. Cargar Médicos y Sincronizar
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "especialidades"),
      (snapshot) => {
        if (snapshot.empty) {
          INITIAL_MEDICOS.forEach((m) =>
            setDoc(doc(db, "especialidades", m.id), m),
          );
        } else {
          const medicosData = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          setListaMedicos(medicosData);
          if (!medicoSel && medicosData.length > 0)
            setMedicoSel(medicosData[0].medico);
        }
      },
    );
    return () => unsubscribe();
  }, []);

  // 2. Escucha de Citas Activas
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

  // --- LÓGICA DE NEGOCIO ---
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
        (c.nombre || c.displayName || "").toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term),
    );
  }, [clientes, busqueda]);

  // --- GESTIÓN DE WHATSAPP ---
  const prepararConfirmaciones = async () => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaM = manana.toISOString().split("T")[0];
    setLoading(true);
    try {
      const q = query(
        collection(db, "citas"),
        where("fecha", "==", fechaM),
        where("estado", "==", "aprobado"),
      );
      const snap = await getDocs(q);
      setCitasManana(
        snap.docs.map((d) => ({ id: d.id, ...d.data(), seleccionado: true })),
      );
      setModalWA(true);
    } catch (e) {
      Alert.alert("Error", "Error al buscar citas");
    } finally {
      setLoading(false);
    }
  };

  const enviarWhatsapps = async () => {
    const lista = citasManana.filter((c) => c.seleccionado);
    for (const c of lista) {
      let tel = (c.telefonoPaciente || "").replace(/\D/g, "");
      if (tel.startsWith("0")) tel = "593" + tel.substring(1);
      const msg = `Hola ${c.nombrePaciente}, le saludamos de la clínica. Confirmamos su cita para mañana a las ${c.hora}. ¿Nos confirma?`;
      await Linking.openURL(
        `https://api.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent(msg)}`,
      );
      await new Promise((r) => setTimeout(r, 1000));
    }
    setModalWA(false);
  };

  // --- GESTIÓN DE MILLAS ---
  const modPuntos = (id, actual, delta) => {
    const base = puntosEdit[id] ?? actual;
    setPuntosEdit({ ...puntosEdit, [id]: Math.max(0, base + delta) });
  };

  const guardarMillas = async (id) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", id), { puntosSalud: puntosEdit[id] });
      const n = { ...puntosEdit };
      delete n[id];
      setPuntosEdit(n);
      Alert.alert("Éxito", "Millas actualizadas");
    } catch (e) {
      Alert.alert("Error", "No se pudo guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>333K Master Panel</Text>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              onPress={prepararConfirmaciones}
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons
                name="whatsapp"
                size={26}
                color="#25D366"
              />
            </TouchableOpacity>
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

      {vistaActual === "agenda" ? (
        <ScrollView contentContainerStyle={styles.grid}>
          {HORARIOS.map((h) => {
            const info = agendaMap[h];
            const sel = seleccionMultiple.includes(h);
            return (
              <TouchableOpacity
                key={h}
                onPress={() => {
                  if (info) {
                    setCitaBase(info);
                    setSeleccionMultiple([info.hora]);
                  } else if (citaBase)
                    setSeleccionMultiple((prev) =>
                      prev.includes(h)
                        ? prev.filter((x) => x !== h)
                        : [...prev, h].sort(),
                    );
                }}
                style={[
                  styles.slot,
                  info?.estado === "aprobado" && styles.bgRojo,
                  sel && styles.bgSeleccion,
                ]}
              >
                <Text
                  style={[styles.slotText, (info || sel) && { color: "#000" }]}
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
        <View style={{ flex: 1, padding: 15 }}>
          <TextInput
            style={styles.searchBar}
            placeholder="Buscar cliente..."
            onChangeText={setBusqueda}
          />
          <FlatList
            data={clientesFiltrados}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const pts = puntosEdit[item.id] ?? (item.puntosSalud || 0);
              return (
                <View style={styles.clienteCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.clienteName}>
                      {item.nombre || item.displayName || "Paciente"}
                    </Text>
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

                  <View style={styles.millasRow}>
                    <Text style={styles.millasText}>Millas: {pts}</Text>
                    <View style={{ flexDirection: "row" }}>
                      <TouchableOpacity
                        onPress={() =>
                          modPuntos(item.id, item.puntosSalud || 0, -10)
                        }
                        style={styles.millaBtn}
                      >
                        <Text style={{ color: "#fff" }}>-</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          modPuntos(item.id, item.puntosSalud || 0, 10)
                        }
                        style={styles.millaBtn}
                      >
                        <Text style={{ color: "#fff" }}>+</Text>
                      </TouchableOpacity>
                      {puntosEdit[item.id] !== undefined && (
                        <TouchableOpacity
                          onPress={() => guardarMillas(item.id)}
                          style={styles.millaSave}
                        >
                          <MaterialCommunityIcons
                            name="check"
                            size={16}
                            color="#fff"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* MODAL EDITAR MEDICOS */}
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
                    style={styles.editInput}
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
              style={styles.btnClose}
              onPress={() => setModalMedicos(false)}
            >
              <Text style={{ color: "#fff" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL WHATSAPP */}
      <Modal visible={modalWA} transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>WhatsApp Mañana</Text>
            <FlatList
              data={citasManana}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() =>
                    setCitasManana(
                      citasManana.map((x) =>
                        x.id === item.id
                          ? { ...x, seleccionado: !x.seleccionado }
                          : x,
                      ),
                    )
                  }
                  style={styles.waItem}
                >
                  <MaterialCommunityIcons
                    name={
                      item.seleccionado
                        ? "checkbox-marked"
                        : "checkbox-blank-outline"
                    }
                    size={20}
                  />
                  <Text style={{ marginLeft: 10 }}>
                    {item.nombrePaciente} ({item.hora})
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={enviarWhatsapps} style={styles.btnSend}>
              <Text style={{ color: "#fff" }}>Enviar Seleccionados</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalWA(false)}
              style={{ marginTop: 10, alignItems: "center" }}
            >
              <Text>Cerrar</Text>
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
    paddingBottom: 50,
  },
  slot: {
    width: "23%",
    height: 50,
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
  bgSeleccion: {
    backgroundColor: "#E8F5E9",
    borderColor: COLORS.primaryGreen,
    borderWidth: 2,
  },
  clienteCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clienteName: { fontWeight: "bold", fontSize: 14 },
  badge: { padding: 4, borderRadius: 5 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  searchBar: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  millasRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#EEE",
    paddingTop: 10,
  },
  millaBtn: {
    backgroundColor: "#666",
    width: 25,
    height: 25,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 5,
  },
  millaSave: {
    backgroundColor: COLORS.primaryGreen,
    width: 25,
    height: 25,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  editInput: { borderBottomWidth: 1, borderColor: "#CCC", padding: 5 },
  btnClose: {
    backgroundColor: COLORS.darkGreen,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  btnSend: {
    backgroundColor: "#25D366",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  waItem: {
    flexDirection: "row",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  loader: { position: "absolute", top: "50%", alignSelf: "center" },
});
