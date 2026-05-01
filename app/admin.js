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

  // Edición de Agenda
  const [citaBase, setCitaBase] = useState(null);
  const [nuevoMedico, setNuevoMedico] = useState(null);
  const [seleccionMultiple, setSeleccionMultiple] = useState([]);

  // Edición Especialidades & Clientes
  const [nuevaEsp, setNuevaEsp] = useState("");
  const [editandoEsp, setEditandoEsp] = useState(null);
  const [clienteEdicion, setClienteEdicion] = useState(null);

  // WhatsApp
  const [modalVisible, setModalVisible] = useState(false);
  const [citasManana, setCitasManana] = useState([]);

  // 1. CARGA DE ESPECIALIDADES
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
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCitas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [fechaSel, medicoSel, vistaActual]);

  // 3. CARGA DE CLIENTES
  useEffect(() => {
    if (vistaActual !== "clientes") return;
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      setClientes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [vistaActual]);

  // --- LÓGICA AUXILIAR ---
  const esCumpleHoy = (fechaStr) => {
    if (!fechaStr || typeof fechaStr !== "string") return false;
    const hoy = new Date();
    const mmdd = `${(hoy.getMonth() + 1).toString().padStart(2, "0")}-${hoy.getDate().toString().padStart(2, "0")}`;
    return fechaStr.endsWith(mmdd);
  };

  const clientesFiltrados = useMemo(() => {
    const term = busqueda.toLowerCase().trim();
    return clientes.filter((c) => {
      const nombre = (c.displayName || c.nombre || c.name || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return nombre.includes(term) || email.includes(term);
    });
  }, [clientes, busqueda]);

  const HORARIOS = [];
  for (let h = 8; h < 18; h++) {
    for (let m = 0; m < 60; m += 15)
      HORARIOS.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
      );
  }

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

  // --- ACCIONES ---
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

  const guardarCita = async () => {
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
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const actualizarMillas = async (id, cantidad) => {
    try {
      await updateDoc(doc(db, "users", id), {
        puntosSalud: increment(cantidad),
      });
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar puntos");
    }
  };

  const manejarEspecialidad = async () => {
    if (!nuevaEsp.trim()) return;
    try {
      if (editandoEsp) {
        await updateDoc(doc(db, "especialidades", editandoEsp.id), {
          nombre: nuevaEsp.trim(),
        });
        setEditandoEsp(null);
      } else {
        await addDoc(collection(db, "especialidades"), {
          nombre: nuevaEsp.trim(),
        });
      }
      setNuevaEsp("");
    } catch (e) {
      Alert.alert("Error", "No se pudo procesar");
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
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
                      ? "medical-bag"
                      : "calendar"
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
          <View style={{ marginTop: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {especialidades.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  onPress={() => {
                    setMedicoSel(e.nombre);
                    cancelarSeleccion();
                  }}
                  style={[
                    styles.tab,
                    medicoSel === e.nombre && styles.tabActive,
                  ]}
                >
                  <Text style={styles.tabText}>{e.nombre}</Text>
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

      {/* VISTAS */}
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
                  <Text style={styles.pacienteTag} numberOfLines={1}>
                    {info.nombrePaciente}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : vistaActual === "clientes" ? (
        <View style={styles.subContainer}>
          <TextInput
            style={styles.searchBar}
            placeholder="Buscar paciente..."
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
                      {item.displayName ||
                        item.nombre ||
                        item.name ||
                        "Sin nombre"}
                    </Text>
                    <Text style={styles.cardSubText}>{item.email}</Text>
                  </View>
                  {esCumpleHoy(item.fechaNacimiento) && (
                    <MaterialCommunityIcons
                      name="cake"
                      size={20}
                      color="#E91E63"
                    />
                  )}
                </View>

                <View style={styles.millasRow}>
                  <Text style={styles.millasText}>
                    Millas:{" "}
                    <Text style={{ color: COLORS.primaryGreen }}>
                      {item.puntosSalud || 0}
                    </Text>
                  </Text>
                  <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity
                      onPress={() => actualizarMillas(item.id, -10)}
                      style={styles.millaBtn}
                    >
                      <Text style={styles.millaBtnT}>-10</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => actualizarMillas(item.id, 10)}
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
          <View style={styles.addArea}>
            <TextInput
              style={[styles.searchBar, { flex: 1, marginBottom: 0 }]}
              placeholder={editandoEsp ? "Editar médico..." : "Nuevo médico..."}
              value={nuevaEsp}
              onChangeText={setNuevaEsp}
            />
            <TouchableOpacity
              onPress={manejarEspecialidad}
              style={styles.btnAdd}
            >
              <MaterialCommunityIcons
                name={editandoEsp ? "check" : "plus"}
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
          <FlatList
            data={especialidades}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.clienteCard}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontWeight: "bold" }}>{item.nombre}</Text>
                  <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditandoEsp(item);
                        setNuevaEsp(item.nombre);
                      }}
                      style={{ marginRight: 15 }}
                    >
                      <MaterialCommunityIcons
                        name="pencil"
                        size={22}
                        color="#444"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        deleteDoc(doc(db, "especialidades", item.id))
                      }
                    >
                      <MaterialCommunityIcons
                        name="trash-can"
                        size={22}
                        color="#FF5252"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* FOOTER AGENDA */}
      {citaBase && vistaActual === "agenda" && (
        <View style={styles.footerAccion}>
          <Text style={{ color: "#fff", fontSize: 12 }}>
            Editando: {citaBase.nombrePaciente}
          </Text>
          <ScrollView horizontal style={{ marginVertical: 5 }}>
            {especialidades.map((e) => (
              <TouchableOpacity
                key={e.id}
                onPress={() => setNuevoMedico(e.nombre)}
                style={[
                  styles.miniTab,
                  (nuevoMedico === e.nombre ||
                    (!nuevoMedico && citaBase.medico === e.nombre)) &&
                    styles.miniTabActive,
                ]}
              >
                <Text style={styles.miniTabText}>{e.nombre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <TouchableOpacity onPress={cancelarSeleccion} style={styles.btnCan}>
              <Text style={styles.btnText}>SALIR</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={guardarCita} style={styles.btnOk}>
              <Text style={styles.btnText}>GUARDAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* MODAL EDICION CLIENTE (MILLAS Y DATOS) */}
      <Modal visible={!!clienteEdicion} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Ficha</Text>
            <Text style={styles.label}>Nombre:</Text>
            <TextInput
              style={styles.modalInput}
              value={
                clienteEdicion?.displayName || clienteEdicion?.nombre || ""
              }
              onChangeText={(t) =>
                setClienteEdicion({ ...clienteEdicion, displayName: t })
              }
            />
            <Text style={styles.label}>Millas Acumuladas:</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={String(clienteEdicion?.puntosSalud || 0)}
              onChangeText={(t) =>
                setClienteEdicion({ ...clienteEdicion, puntosSalud: Number(t) })
              }
            />
            <Text style={styles.label}>Fecha Nacimiento (AAAA-MM-DD):</Text>
            <TextInput
              style={styles.modalInput}
              value={clienteEdicion?.fechaNacimiento}
              placeholder="1990-01-01"
              onChangeText={(t) =>
                setClienteEdicion({ ...clienteEdicion, fechaNacimiento: t })
              }
            />

            <TouchableOpacity
              style={styles.btnSendAll}
              onPress={async () => {
                await updateDoc(doc(db, "users", clienteEdicion.id), {
                  displayName: clienteEdicion.displayName,
                  puntosSalud: clienteEdicion.puntosSalud,
                  fechaNacimiento: clienteEdicion.fechaNacimiento || "",
                });
                setClienteEdicion(null);
              }}
            >
              <Text style={styles.btnText}>ACTUALIZAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setClienteEdicion(null)}
              style={{ marginTop: 10 }}
            >
              <Text style={{ textAlign: "center", color: "#999" }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginRight: 8,
  },
  tabActive: { backgroundColor: COLORS.primaryGreen },
  tabText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
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
    paddingBottom: 150,
  },
  slot: {
    width: "23%",
    height: 45,
    backgroundColor: "#fff",
    marginBottom: 5,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  slotText: { fontSize: 9, color: "#B0B5C1" },
  pacienteTag: { fontSize: 7, color: "#333", marginTop: 2 },
  bgAmarillo: { backgroundColor: "#FFD700" },
  bgRojo: { backgroundColor: "#FF5252" },
  bgGris: { backgroundColor: "#DDD" },
  bgSeleccion: {
    backgroundColor: "#E8F5E9",
    borderColor: COLORS.primaryGreen,
    borderWidth: 2,
  },
  subContainer: { flex: 1, padding: 15 },
  searchBar: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
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
  clienteName: { fontWeight: "bold", fontSize: 14 },
  cardSubText: { fontSize: 10, color: "#666" },
  millasRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 10,
  },
  millaBtn: {
    backgroundColor: "#f0f0f0",
    padding: 5,
    borderRadius: 5,
    marginLeft: 5,
    minWidth: 35,
    alignItems: "center",
  },
  millaBtnT: { fontSize: 10, fontWeight: "bold" },
  addArea: { flexDirection: "row", gap: 10, marginBottom: 15 },
  btnAdd: {
    backgroundColor: COLORS.primaryGreen,
    padding: 10,
    borderRadius: 10,
    justifyContent: "center",
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
  miniTab: {
    padding: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginRight: 5,
    borderRadius: 5,
  },
  miniTabActive: { backgroundColor: COLORS.primaryGreen },
  miniTabText: { color: "#fff", fontSize: 9 },
  btnOk: { backgroundColor: COLORS.primaryGreen, padding: 8, borderRadius: 10 },
  btnCan: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 8,
    borderRadius: 10,
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 11 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", padding: 20, borderRadius: 20 },
  modalTitle: { fontWeight: "bold", fontSize: 18, marginBottom: 15 },
  label: { fontSize: 12, color: "#666", marginBottom: 3 },
  modalInput: {
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
  },
  btnSendAll: {
    backgroundColor: COLORS.primaryGreen,
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
  },
});
