import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { auth, db } from "../src/api/firebase.config";
import { COLORS } from "../src/constants/theme";

export default function AdminMasterPanel() {
  const router = useRouter();
  const [vistaActual, setVistaActual] = useState("agenda"); // agenda, clientes, especialidades
  const [loading, setLoading] = useState(false);

  const [fechaSel, setFechaSel] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [especialidades, setEspecialidades] = useState([]);
  const [medicoSel, setMedicoSel] = useState(null);
  const [citas, setCitas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [citaBase, setCitaBase] = useState(null);
  const [nuevoMedico, setNuevoMedico] = useState(null);
  const [seleccionMultiple, setSeleccionMultiple] = useState([]);

  const [nuevaEsp, setNuevaEsp] = useState("");
  const [clienteEdicion, setClienteEdicion] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [citasManana, setCitasManana] = useState([]);

  // Carga de Especialidades
  useEffect(() => {
    const unsubEsp = onSnapshot(
      query(collection(db, "especialidades"), orderBy("nombre")),
      (snap) => {
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEspecialidades(lista);
        if (lista.length > 0 && !medicoSel) setMedicoSel(lista[0].nombre);
      },
    );
    return () => unsubEsp();
  }, []);

  // Carga de Citas (Vista Agenda)
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

  // Carga de Clientes
  useEffect(() => {
    if (vistaActual !== "clientes") return;
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      setClientes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [vistaActual]);

  // Mapeo de slots de tiempo
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
        (c.displayName || "").toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term),
    );
  }, [clientes, busqueda]);

  const esCumpleHoy = (fechaStr) => {
    if (!fechaStr || typeof fechaStr !== "string") return false;
    const hoy = new Date();
    const mmdd = `${(hoy.getMonth() + 1).toString().padStart(2, "0")}-${hoy.getDate().toString().padStart(2, "0")}`;
    return fechaStr.endsWith(mmdd);
  };

  const cancelarSeleccion = () => {
    setCitaBase(null);
    setSeleccionMultiple([]);
    setNuevoMedico(null);
  };

  const ajustarMillas = async (userId, cantidad) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        puntosSalud: increment(cantidad),
      });
    } catch (e) {
      Alert.alert("Error", "No se pudieron actualizar los puntos.");
    }
  };

  const actualizarMillasManual = async (userId, valor) => {
    const num = parseInt(valor) || 0;
    try {
      await updateDoc(doc(db, "users", userId), { puntosSalud: num });
    } catch (e) {
      console.error("Error al guardar millas manual", e);
    }
  };

  const enviarWhatsApp = async (cita) => {
    let tel = (cita.telefonoPaciente || "").replace(/\D/g, "");
    if (tel.startsWith("0")) tel = "593" + tel.substring(1);
    const msg = `Hola ${cita.nombrePaciente}, confirmamos su cita para mañana a las ${cita.hora}. ¿Nos confirma su asistencia?`;
    const url = `https://api.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent(msg)}`;
    await Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>333K Master</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
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
                if (vistaActual === "agenda") setVistaActual("clientes");
                else if (vistaActual === "clientes")
                  setVistaActual("especialidades");
                else setVistaActual("agenda");
                cancelarSeleccion();
              }}
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons
                name={
                  vistaActual === "agenda"
                    ? "account-group"
                    : vistaActual === "clientes"
                      ? "briefcase-medical"
                      : "calendar-month"
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
              {especialidades.map((esp) => (
                <TouchableOpacity
                  key={esp.id}
                  onPress={() => {
                    setMedicoSel(esp.nombre);
                    cancelarSeleccion();
                  }}
                  style={[
                    styles.tab,
                    medicoSel === esp.nombre && styles.tabActive,
                  ]}
                >
                  <Text style={styles.tabText}>{esp.nombre}</Text>
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
                onPress={() => {
                  if (citaBase) {
                    setSeleccionMultiple((prev) =>
                      prev.includes(h)
                        ? prev.filter((x) => x !== h)
                        : [...prev, h].sort(),
                    );
                  } else if (info) {
                    setCitaBase(info);
                    setNuevoMedico(info.medico);
                    setSeleccionMultiple([info.hora]);
                  }
                }}
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
      ) : vistaActual === "clientes" ? (
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
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clienteName}>
                      {item.displayName || "Paciente"}
                    </Text>
                    <Text
                      style={[
                        styles.cardSubText,
                        {
                          color: item.fechaNacimiento
                            ? COLORS.primaryGreen
                            : "#FF9800",
                        },
                      ]}
                    >
                      {item.fechaNacimiento
                        ? `Nac: ${item.fechaNacimiento}`
                        : "⚠️ Sin fecha"}
                    </Text>
                  </View>
                  {esCumpleHoy(item.fechaNacimiento) && (
                    <MaterialCommunityIcons
                      name="cake-variant"
                      size={24}
                      color="#E91E63"
                    />
                  )}
                  <TouchableOpacity onPress={() => setClienteEdicion(item)}>
                    <MaterialCommunityIcons
                      name="pencil"
                      size={20}
                      color={COLORS.primaryGreen}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.millasContainer}>
                  <Text style={styles.millasLabel}>Puntos:</Text>
                  <View style={styles.millasActions}>
                    <TouchableOpacity
                      style={styles.millasBtnMinus}
                      onPress={() => ajustarMillas(item.id, -10)}
                    >
                      <MaterialCommunityIcons
                        name="minus"
                        size={18}
                        color="#FFF"
                      />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.millasInput}
                      keyboardType="numeric"
                      defaultValue={(item.puntosSalud || 0).toString()}
                      onEndEditing={(e) =>
                        actualizarMillasManual(item.id, e.nativeEvent.text)
                      }
                    />
                    <TouchableOpacity
                      style={styles.millasBtnPlus}
                      onPress={() => ajustarMillas(item.id, 10)}
                    >
                      <MaterialCommunityIcons
                        name="plus"
                        size={18}
                        color="#FFF"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        </View>
      ) : (
        /* VISTA ESPECIALIDADES CORREGIDA */
        <View style={styles.clientesContainer}>
          <View style={styles.addArea}>
            <TextInput
              placeholder="Nueva especialidad..."
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
              <View style={styles.espRow}>
                <Text style={styles.espText}>{item.nombre}</Text>
                <TouchableOpacity
                  onPress={() => deleteDoc(doc(db, "especialidades", item.id))}
                >
                  <MaterialCommunityIcons
                    name="trash-can"
                    size={24}
                    color="#ff5252"
                  />
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      {/* FOOTER ACCIONES AGENDA */}
      {citaBase && vistaActual === "agenda" && (
        <View style={styles.footerAccion}>
          <Text style={styles.footerText}>
            Paciente: {citaBase.nombrePaciente}
          </Text>
          <View style={styles.footerButtons}>
            <TouchableOpacity style={styles.btnCan} onPress={cancelarSeleccion}>
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnOk}
              onPress={async () => {
                setLoading(true);
                await updateDoc(doc(db, "citas", citaBase.id), {
                  duracion: seleccionMultiple.length * 15,
                  hora: seleccionMultiple[0],
                  medico: nuevoMedico,
                  estado: "aprobado",
                });
                setLoading(false);
                cancelarSeleccion();
              }}
            >
              <Text style={styles.btnText}>GUARDAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f4" },
  header: {
    backgroundColor: COLORS.primaryGreen || "#2e7d32",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  iconBtn: { marginRight: 15 },
  medicoScroll: { marginBottom: 10 },
  tab: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginRight: 10,
  },
  tabActive: { backgroundColor: "#fff" },
  tabText: { color: "#000", fontWeight: "600" },
  dateNav: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dateText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 20,
  },
  grid: { padding: 10 },
  slot: {
    height: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#eee",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  bgAmarillo: { backgroundColor: "#fff9c4" },
  bgRojo: { backgroundColor: "#ffcdd2" },
  bgGris: { backgroundColor: "#e0e0e0" },
  bgSeleccion: { backgroundColor: "#bbdefb" },
  slotText: { width: 50, color: "#999" },
  pacienteTag: { flex: 1, fontSize: 14 },
  clientesContainer: { flex: 1, padding: 15 },
  searchBar: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  clienteCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clienteName: { fontSize: 16, fontWeight: "bold" },
  cardSubText: { fontSize: 12, marginTop: 2 },
  millasContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    paddingTop: 10,
  },
  millasLabel: { flex: 1, fontSize: 13, color: "#666" },
  millasActions: { flexDirection: "row", alignItems: "center" },
  millasBtnMinus: { backgroundColor: "#ff5252", padding: 5, borderRadius: 5 },
  millasBtnPlus: { backgroundColor: "#4caf50", padding: 5, borderRadius: 5 },
  millasInput: {
    width: 60,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
    color: "#333",
    marginHorizontal: 5,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    padding: 2,
  },
  addArea: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  btnAdd: {
    backgroundColor: COLORS.primaryGreen,
    padding: 12,
    borderRadius: 10,
    marginLeft: 10,
  },
  espRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
  },
  espText: { fontSize: 16, fontWeight: "500" },
  footerAccion: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
  },
  footerText: { fontWeight: "bold", fontSize: 16, marginBottom: 10 },
  footerButtons: { flexDirection: "row", gap: 10 },
  btnOk: {
    flex: 1,
    backgroundColor: COLORS.primaryGreen,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  btnCan: { backgroundColor: "#ff5252", padding: 15, borderRadius: 10 },
  btnText: { color: "#fff", fontWeight: "bold" },
});
