import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
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
import { auth, db } from "../src/api/firebase.config";
import { COLORS } from "../src/constants/theme";

const MEDICOS = [
  "Dr. Chávez",
  "Dra. Espinoza",
  "Dr. Ruiz",
  "Dra. Mora",
  "Dr. León",
  "Dra. Vallejo",
  "Dr. Castillo",
  "Dra. Paredes",
  "Dr. Salazar",
];

export default function AdminMasterPanel() {
  const router = useRouter();
  const [vistaActual, setVistaActual] = useState("agenda"); // 'agenda' o 'clientes'
  const [loading, setLoading] = useState(false);

  // --- ESTADOS AGENDA ---
  const [fechaSel, setFechaSel] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [medicoSel, setMedicoSel] = useState(MEDICOS[0]);
  const [citas, setCitas] = useState([]);
  const [citaBase, setCitaBase] = useState(null);
  const [nuevoMedico, setNuevoMedico] = useState(null);
  const [seleccionMultiple, setSeleccionMultiple] = useState([]);

  // --- ESTADOS CLIENTES & MILLAS ---
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [puntosEdit, setPuntosEdit] = useState({}); // Control local de edición de puntos

  // --- ESTADOS WHATSAPP MODAL ---
  const [modalVisible, setModalVisible] = useState(false);
  const [citasManana, setCitasManana] = useState([]);

  // 1. Escucha de Citas (Agenda)
  useEffect(() => {
    if (vistaActual !== "agenda") return;
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

  // 2. Escucha de Usuarios (Clientes)
  useEffect(() => {
    if (vistaActual !== "clientes") return;
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      setClientes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [vistaActual]);

  // 3. Mapeo de Agenda para el Grid
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

  // 4. Buscador de Clientes
  const clientesFiltrados = useMemo(() => {
    const term = busqueda.toLowerCase().trim();
    if (!term) return clientes;
    return clientes.filter(
      (c) =>
        (c.displayName || "").toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term),
    );
  }, [clientes, busqueda]);

  // --- LÓGICA GESTIÓN DE MILLAS (PUNTOS) ---
  const ajustarPuntosLocal = (userId, actual, delta) => {
    const base = puntosEdit[userId] ?? actual;
    setPuntosEdit({ ...puntosEdit, [userId]: Math.max(0, base + delta) });
  };

  const guardarPuntosBD = async (userId) => {
    const nuevosPuntos = puntosEdit[userId];
    if (nuevosPuntos === undefined) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", userId), { puntosSalud: nuevosPuntos });
      const copy = { ...puntosEdit };
      delete copy[userId];
      setPuntosEdit(copy);
      Alert.alert("Éxito", "Millas actualizadas.");
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar.");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGICA AGENDA ---
  const cancelarSeleccion = () => {
    setCitaBase(null);
    setSeleccionMultiple([]);
    setNuevoMedico(null);
  };

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

  const finalizarCitaManual = async () => {
    if (!citaBase?.userId) return Alert.alert("Error", "Cita sin usuario");
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", citaBase.userId), {
        totalCitas: increment(1),
        puntosSalud: increment(1),
        ultimaAtencion: serverTimestamp(),
      });
      await updateDoc(doc(db, "citas", citaBase.id), { estado: "finalizada" });
      Alert.alert("Éxito", "Atención finalizada.");
      cancelarSeleccion();
    } catch (e) {
      Alert.alert("Error", "No se pudo finalizar.");
    } finally {
      setLoading(false);
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
      cancelarSeleccion();
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar.");
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA WHATSAPP MASIVO ---
  const prepararConfirmaciones = async () => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const fechaManana = manana.toISOString().split("T")[0];
    setLoading(true);
    try {
      const q = query(
        collection(db, "citas"),
        where("fecha", "==", fechaManana),
        where("estado", "==", "aprobado"),
      );
      const snap = await getDocs(q);
      setCitasManana(
        snap.docs.map((d) => ({ id: d.id, ...d.data(), seleccionado: true })),
      );
      setModalVisible(true);
    } catch (e) {
      Alert.alert("Error", "Error al consultar citas.");
    } finally {
      setLoading(false);
    }
  };

  const enviarSeleccionados = async () => {
    const seleccionados = citasManana.filter((c) => c.seleccionado);
    for (const cita of seleccionados) {
      let tel = (cita.telefonoPaciente || "").replace(/\D/g, "");
      if (tel.startsWith("0")) tel = "593" + tel.substring(1);
      if (tel && !tel.startsWith("593")) tel = "593" + tel;
      const msg = `Hola ${cita.nombrePaciente}, confirmamos su cita para mañana a las ${cita.hora}. ¿Nos confirma su asistencia?`;
      const url = `https://api.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent(msg)}`;
      await Linking.openURL(url);
      await new Promise((r) => setTimeout(r, 800));
    }
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>333K Master Panel</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={prepararConfirmaciones}
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons
                name="whatsapp"
                size={28}
                color="#25D366"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setVistaActual(
                  vistaActual === "agenda" ? "clientes" : "agenda",
                );
                cancelarSeleccion();
              }}
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
              {MEDICOS.map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => {
                    setMedicoSel(m);
                    cancelarSeleccion();
                  }}
                  style={[styles.tab, medicoSel === m && styles.tabActive]}
                >
                  <Text style={styles.tabText}>{m}</Text>
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

      {/* CONTENIDO PRINCIPAL */}
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
                  info?.estado === "finalizada" && styles.bgGris,
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
                  <Text style={styles.pacienteTag} numberOfLines={1}>
                    {info.nombrePaciente}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.clientesContainer}>
          <TextInput
            style={styles.searchBar}
            placeholder="Buscar cliente..."
            value={busqueda}
            onChangeText={setBusqueda}
          />
          <FlatList
            data={clientesFiltrados}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const valorPuntos =
                puntosEdit[item.id] ?? (item.puntosSalud || 0);
              const hayCambioMillas = puntosEdit[item.id] !== undefined;

              return (
                <View style={styles.clienteCard}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.clienteName}>
                        {item.displayName || "Paciente"}
                      </Text>
                      <Text style={{ fontSize: 10, color: "#666" }}>
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
                              : item.tipoCliente === "PRO"
                                ? "#C0C0C0"
                                : "#CD7F32",
                        },
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {item.tipoCliente || "PRI"}
                      </Text>
                    </View>
                  </View>

                  {/* GESTIÓN DE MILLAS */}
                  <View style={styles.millasRow}>
                    <View style={styles.millasInfo}>
                      <MaterialCommunityIcons
                        name="leaf"
                        size={16}
                        color={COLORS.primaryGreen}
                      />
                      <Text style={styles.millasLabel}>Millas:</Text>
                      <Text
                        style={[
                          styles.millasValor,
                          hayCambioMillas && { color: COLORS.primaryGreen },
                        ]}
                      >
                        {valorPuntos}
                      </Text>
                    </View>
                    <View style={styles.millasControls}>
                      <TouchableOpacity
                        onPress={() =>
                          ajustarPuntosLocal(
                            item.id,
                            item.puntosSalud || 0,
                            -10,
                          )
                        }
                        style={styles.btnMillaMini}
                      >
                        <MaterialCommunityIcons
                          name="minus"
                          size={14}
                          color="#fff"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          ajustarPuntosLocal(item.id, item.puntosSalud || 0, 10)
                        }
                        style={styles.btnMillaMini}
                      >
                        <MaterialCommunityIcons
                          name="plus"
                          size={14}
                          color="#fff"
                        />
                      </TouchableOpacity>
                      {hayCambioMillas && (
                        <TouchableOpacity
                          onPress={() => guardarPuntosBD(item.id)}
                          style={styles.btnGuardarMillas}
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

                  <View style={styles.nivelesRow}>
                    {["PRI", "PRO", "PREMIUM"].map((n) => (
                      <TouchableOpacity
                        key={n}
                        onPress={() =>
                          updateDoc(doc(db, "users", item.id), {
                            tipoCliente: n,
                          })
                        }
                        style={[
                          styles.nivelBtn,
                          item.tipoCliente === n && styles.nivelBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.nivelBtnText,
                            item.tipoCliente === n && { color: "#FFF" },
                          ]}
                        >
                          {n}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* FOOTER EDITOR AGENDA */}
      {citaBase && vistaActual === "agenda" && (
        <View style={styles.footerAccion}>
          <Text style={styles.footerText}>
            Paciente: {citaBase.nombrePaciente}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginVertical: 8 }}
          >
            {MEDICOS.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setNuevoMedico(m)}
                style={[
                  styles.miniTab,
                  (nuevoMedico === m ||
                    (!nuevoMedico && citaBase.medico === m)) &&
                    styles.miniTabActive,
                ]}
              >
                <Text style={styles.miniTabText}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.footerButtons}>
            <TouchableOpacity style={styles.btnCan} onPress={cancelarSeleccion}>
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            {citaBase.estado === "aprobado" && (
              <TouchableOpacity
                style={styles.btnFinalizar}
                onPress={finalizarCitaManual}
              >
                <Text style={styles.btnText}>FINALIZAR</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.btnOk}
              onPress={guardarCambiosAgenda}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>GUARDAR</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* MODAL WHATSAPP */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmaciones de Mañana</Text>
            <FlatList
              data={citasManana}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() =>
                    setCitasManana(
                      citasManana.map((c) =>
                        c.id === item.id
                          ? { ...c, seleccionado: !c.seleccionado }
                          : c,
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
                    size={24}
                    color={COLORS.primaryGreen}
                  />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.waName}>{item.nombrePaciente}</Text>
                    <Text style={styles.waSub}>
                      {item.hora} - {item.medico}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnTextBlack}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSendAll}
                onPress={enviarSeleccionados}
              >
                <Text style={styles.btnText}>Enviar WhatsApps</Text>
              </TouchableOpacity>
            </View>
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
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  iconBtn: { marginRight: 15 },
  medicoScroll: { marginTop: 15 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginRight: 10,
  },
  tabActive: { backgroundColor: COLORS.primaryGreen },
  tabText: { color: "#fff", fontSize: 11, fontWeight: "600" },
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
    paddingBottom: 170,
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
    borderColor: "#EDEFF2",
  },
  slotText: { fontSize: 10, color: "#B0B5C1" },
  pacienteTag: {
    fontSize: 7,
    color: "#333",
    fontWeight: "bold",
    marginTop: 2,
    textAlign: "center",
  },
  bgAmarillo: { backgroundColor: "#FFD700" },
  bgRojo: { backgroundColor: "#FF5252" },
  bgGris: { backgroundColor: "#DDD", opacity: 0.5 },
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
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  clienteName: { fontWeight: "bold", fontSize: 16 },
  millasRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  millasInfo: { flexDirection: "row", alignItems: "center" },
  millasLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#444",
    marginLeft: 5,
    marginRight: 5,
  },
  millasValor: { fontSize: 16, fontWeight: "bold", color: COLORS.darkGreen },
  millasControls: { flexDirection: "row", alignItems: "center" },
  btnMillaMini: {
    backgroundColor: "#666",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 5,
  },
  btnGuardarMillas: {
    backgroundColor: COLORS.primaryGreen,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  nivelesRow: { flexDirection: "row", marginTop: 10 },
  nivelBtn: {
    flex: 1,
    padding: 8,
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    marginHorizontal: 2,
  },
  nivelBtnActive: { backgroundColor: COLORS.darkGreen },
  nivelBtnText: { fontSize: 9, color: "#999", fontWeight: "bold" },
  badge: { paddingHorizontal: 8, borderRadius: 5, justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  footerAccion: {
    position: "absolute",
    bottom: 15,
    left: 10,
    right: 10,
    backgroundColor: COLORS.darkGreen,
    borderRadius: 25,
    padding: 15,
    elevation: 12,
  },
  footerText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  btnOk: {
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginLeft: 8,
  },
  btnFinalizar: {
    backgroundColor: "#2196F3",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginLeft: 8,
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 10 },
  btnCan: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 10,
    borderRadius: 15,
  },
  miniTab: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginRight: 5,
    borderRadius: 8,
  },
  miniTabActive: { backgroundColor: COLORS.primaryGreen },
  miniTabText: { color: "#fff", fontSize: 8, fontWeight: "bold" },
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
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  waItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  waName: { fontWeight: "bold" },
  waSub: { fontSize: 12, color: "#666" },
  modalFooter: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "space-between",
  },
  btnCancel: { padding: 15, flex: 1, alignItems: "center" },
  btnSendAll: {
    backgroundColor: "#25D366",
    padding: 15,
    borderRadius: 15,
    flex: 2,
    alignItems: "center",
  },
  btnTextBlack: { color: "#333" },
  loader: { position: "absolute", top: "50%", left: "45%" },
});
