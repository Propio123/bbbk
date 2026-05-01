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

export default function AdminMasterPanel() {
  const router = useRouter();
  const [vistaActual, setVistaActual] = useState("agenda");
  const [loading, setLoading] = useState(false);

  // --- ESTADOS ---
  const [fechaSel, setFechaSel] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [especialidades, setEspecialidades] = useState([]);
  const [medicoSel, setMedicoSel] = useState(null);
  const [citas, setCitas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  // Edición Especialidades (Médico + Especialidad)
  const [nuevoNombreMed, setNuevoNombreMed] = useState("");
  const [nuevaAreaEsp, setNuevaAreaEsp] = useState("");
  const [editandoEsp, setEditandoEsp] = useState(null);

  // Edición Agenda & Clientes
  const [citaBase, setCitaBase] = useState(null);
  const [nuevoMedicoCita, setNuevoMedicoCita] = useState(null);
  const [seleccionMultiple, setSeleccionMultiple] = useState([]);
  const [clienteEdicion, setClienteEdicion] = useState(null);

  // WhatsApp
  const [modalVisible, setModalVisible] = useState(false);
  const [citasManana, setCitasManana] = useState([]);

  // 1. CARGA DE MÉDICOS Y ESPECIALIDADES
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

  // 2. CARGA DE CITAS
  useEffect(() => {
    if (vistaActual !== "agenda" || !medicoSel) return;
    const q = query(
      collection(db, "citas"),
      where("fecha", "==", fechaSel),
      where("medico", "==", medicoSel),
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setCitas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [fechaSel, medicoSel, vistaActual]);

  // 3. CARGA DE CLIENTES
  useEffect(() => {
    if (vistaActual !== "clientes") return;
    const unsubscribe = onSnapshot(collection(db, "users"), (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [vistaActual]);

  // --- FUNCIONES DE APOYO ---
  const esCumpleHoy = (fechaStr) => {
    if (!fechaStr || typeof fechaStr !== "string") return false;
    const hoy = new Date();
    const mmdd = `${(hoy.getMonth() + 1).toString().padStart(2, "0")}-${hoy.getDate().toString().padStart(2, "0")}`;
    return fechaStr.endsWith(mmdd);
  };

  const enviarConfirmacionWA = async (cita) => {
    let tel = (cita.telefonoPaciente || "").replace(/\D/g, "");
    if (tel.startsWith("0")) tel = "593" + tel.substring(1);
    else if (!tel.startsWith("593")) tel = "593" + tel;

    const msg = `Hola ${cita.nombrePaciente}, le saluda 333K. Confirmamos su cita para el ${cita.fecha} a las ${cita.hora} con ${cita.medico}. ¿Nos confirma su asistencia?`;
    const url = `whatsapp://send?phone=${tel}&text=${encodeURIComponent(msg)}`;

    try {
      const puedeAbrir = await Linking.canOpenURL(url);
      if (puedeAbrir) await Linking.openURL(url);
      else
        await Linking.openURL(
          `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`,
        );
    } catch (e) {
      Alert.alert("Error", "No se pudo abrir WhatsApp");
    }
  };

  const manejarEspecialidad = async () => {
    if (!nuevoNombreMed.trim())
      return Alert.alert("Error", "El nombre del médico es obligatorio");
    setLoading(true);
    try {
      const data = { nombre: nuevoNombreMed.trim(), area: nuevaAreaEsp.trim() };
      if (editandoEsp) {
        await updateDoc(doc(db, "especialidades", editandoEsp.id), data);
        setEditandoEsp(null);
      } else {
        await addDoc(collection(db, "especialidades"), data);
      }
      setNuevoNombreMed("");
      setNuevaAreaEsp("");
    } catch (e) {
      Alert.alert("Error", "Fallo al guardar");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERIZADO ---
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

  return (
    <View style={styles.container}>
      {/* HEADER DINÁMICO */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>333K Master</Text>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons
                name="whatsapp"
                size={26}
                color="#25D366"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (vistaActual === "agenda") setVistaActual("clientes");
                else if (vistaActual === "clientes")
                  setVistaActual("especialidades");
                else setVistaActual("agenda");
              }}
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons
                name={
                  vistaActual === "agenda"
                    ? "account-heart"
                    : vistaActual === "clientes"
                      ? "stethoscope"
                      : "calendar-clock"
                }
                size={26}
                color="#fff"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => signOut(auth).then(() => router.replace("/login"))}
            >
              <MaterialCommunityIcons name="logout" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {vistaActual === "agenda" && (
          <View style={{ marginTop: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {especialidades.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  onPress={() => setMedicoSel(e.nombre)}
                  style={[
                    styles.tab,
                    medicoSel === e.nombre && styles.tabActive,
                  ]}
                >
                  <Text style={styles.tabText}>{e.nombre}</Text>
                  {e.area ? (
                    <Text style={styles.tabSubText}>{e.area}</Text>
                  ) : null}
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
                  size={30}
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
                  size={30}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* CONTENIDO SEGÚN VISTA */}
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
                    setNuevoMedicoCita(info.medico);
                    setSeleccionMultiple([info.hora]);
                  }
                }}
                style={[
                  styles.slot,
                  info?.estado === "aprobado" && styles.bgRojo,
                  estaSel && styles.bgSeleccion,
                  info?.esContinuacion && { borderTopWidth: 0 },
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
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={styles.pacienteTag}>
                      {info.nombrePaciente}
                    </Text>
                    <TouchableOpacity
                      onPress={() => enviarConfirmacionWA(info)}
                    >
                      <MaterialCommunityIcons
                        name="whatsapp"
                        size={12}
                        color="#25D366"
                        style={{ marginLeft: 4 }}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : vistaActual === "clientes" ? (
        <View style={styles.subContainer}>
          <TextInput
            style={styles.searchBar}
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChangeText={setBusqueda}
          />
          <FlatList
            data={clientes.filter((c) =>
              (c.displayName || "")
                .toLowerCase()
                .includes(busqueda.toLowerCase()),
            )}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.clienteCard}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={styles.clienteName}>
                    {item.displayName || "Usuario"}
                  </Text>
                  {esCumpleHoy(item.fechaNacimiento) && (
                    <MaterialCommunityIcons
                      name="cake-variant"
                      size={22}
                      color="#E91E63"
                    />
                  )}
                </View>
                <View style={styles.millasRow}>
                  <Text style={styles.millasText}>
                    Millas: {item.puntosSalud || 0}
                  </Text>
                  <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity
                      onPress={() =>
                        updateDoc(doc(db, "users", item.id), {
                          puntosSalud: increment(10),
                        })
                      }
                      style={styles.millaBtn}
                    >
                      <Text style={styles.millaBtnT}>+10</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setClienteEdicion(item)}
                      style={[
                        styles.millaBtn,
                        { backgroundColor: COLORS.darkGreen },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="pencil"
                        size={14}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        </View>
      ) : (
        <View style={styles.subContainer}>
          <View style={styles.addForm}>
            <TextInput
              style={styles.inputSimple}
              placeholder="Nombre del Médico"
              value={nuevoNombreMed}
              onChangeText={setNuevoNombreMed}
            />
            <TextInput
              style={styles.inputSimple}
              placeholder="Especialidad (opcional)"
              value={nuevaAreaEsp}
              onChangeText={setNuevaAreaEsp}
            />
            <TouchableOpacity
              onPress={manejarEspecialidad}
              style={styles.btnGuardarMed}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                {editandoEsp ? "ACTUALIZAR" : "AÑADIR MÉDICO"}
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={especialidades}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.medicoCard}>
                <View>
                  <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                    {item.nombre}
                  </Text>
                  <Text style={{ color: "#666" }}>
                    {item.area || "General"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row" }}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditandoEsp(item);
                      setNuevoNombreMed(item.nombre);
                      setNuevaAreaEsp(item.area || "");
                    }}
                    style={{ marginRight: 15 }}
                  >
                    <MaterialCommunityIcons
                      name="pencil"
                      size={24}
                      color={COLORS.primaryGreen}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      deleteDoc(doc(db, "especialidades", item.id))
                    }
                  >
                    <MaterialCommunityIcons
                      name="trash-can"
                      size={24}
                      color="#FF5252"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* MODAL EDICIÓN CLIENTE */}
      <Modal visible={!!clienteEdicion} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ficha Médica</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nombre"
              value={clienteEdicion?.displayName}
              onChangeText={(t) =>
                setClienteEdicion({ ...clienteEdicion, displayName: t })
              }
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Millas"
              keyboardType="numeric"
              value={String(clienteEdicion?.puntosSalud || 0)}
              onChangeText={(t) =>
                setClienteEdicion({ ...clienteEdicion, puntosSalud: Number(t) })
              }
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Cumpleaños (AAAA-MM-DD)"
              value={clienteEdicion?.fechaNacimiento}
              onChangeText={(t) =>
                setClienteEdicion({ ...clienteEdicion, fechaNacimiento: t })
              }
            />
            <TouchableOpacity
              style={styles.btnAction}
              onPress={async () => {
                await updateDoc(doc(db, "users", clienteEdicion.id), {
                  displayName: clienteEdicion.displayName,
                  puntosSalud: clienteEdicion.puntosSalud,
                  fechaNacimiento: clienteEdicion.fechaNacimiento,
                });
                setClienteEdicion(null);
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                GUARDAR CAMBIOS
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setClienteEdicion(null)}
              style={{ marginTop: 15 }}
            >
              <Text style={{ textAlign: "center", color: "#999" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FOOTER EDICIÓN AGENDA */}
      {citaBase && (
        <View style={styles.footerEdit}>
          <Text style={{ color: "#fff", fontSize: 12, marginBottom: 5 }}>
            Mover cita de: {citaBase.nombrePaciente}
          </Text>
          <ScrollView horizontal style={{ marginBottom: 10 }}>
            {especialidades.map((e) => (
              <TouchableOpacity
                key={e.id}
                onPress={() => setNuevoMedicoCita(e.nombre)}
                style={[
                  styles.miniTab,
                  nuevoMedicoCita === e.nombre && styles.miniTabActive,
                ]}
              >
                <Text style={{ color: "#fff", fontSize: 10 }}>{e.nombre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <TouchableOpacity
              onPress={() => setCitaBase(null)}
              style={styles.btnSec}
            >
              <Text style={{ color: "#fff" }}>CANCELAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                await updateDoc(doc(db, "citas", citaBase.id), {
                  hora: seleccionMultiple[0],
                  duracion: seleccionMultiple.length * 15,
                  medico: nuevoMedicoCita,
                });
                setCitaBase(null);
              }}
              style={styles.btnPri}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                CONFIRMAR
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: COLORS.darkGreen,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  iconBtn: { marginLeft: 15 },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginRight: 8,
    alignItems: "center",
  },
  tabActive: { backgroundColor: COLORS.primaryGreen },
  tabText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  tabSubText: { color: "rgba(255,255,255,0.7)", fontSize: 8 },
  dateNav: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  dateText: { color: "#fff", marginHorizontal: 15, fontWeight: "bold" },
  grid: {
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingBottom: 120,
  },
  slot: {
    width: "23%",
    height: 45,
    backgroundColor: "#fff",
    marginBottom: 6,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  slotText: { fontSize: 9, color: "#94A3B8" },
  pacienteTag: { fontSize: 7, color: "#1E293B", fontWeight: "bold" },
  bgRojo: { backgroundColor: "#FEE2E2", borderColor: "#F87171" },
  bgSeleccion: {
    backgroundColor: "#DCFCE7",
    borderColor: COLORS.primaryGreen,
    borderWidth: 2,
  },
  subContainer: { flex: 1, padding: 15 },
  searchBar: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 1,
  },
  clienteCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primaryGreen,
  },
  clienteName: { fontWeight: "bold", fontSize: 15 },
  millasRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  millaBtn: {
    backgroundColor: "#F1F5F9",
    padding: 6,
    borderRadius: 8,
    marginLeft: 6,
  },
  addForm: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },
  inputSimple: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 8,
    marginBottom: 10,
  },
  btnGuardarMed: {
    backgroundColor: COLORS.primaryGreen,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  medicoCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerEdit: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: COLORS.darkGreen,
    padding: 15,
    borderRadius: 20,
    elevation: 10,
  },
  miniTab: {
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginRight: 5,
    borderRadius: 6,
  },
  miniTabActive: { backgroundColor: COLORS.primaryGreen },
  btnPri: {
    backgroundColor: COLORS.primaryGreen,
    padding: 10,
    borderRadius: 10,
  },
  btnSec: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 10,
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", padding: 25, borderRadius: 25 },
  modalInput: {
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  btnAction: {
    backgroundColor: COLORS.primaryGreen,
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
  },
});
