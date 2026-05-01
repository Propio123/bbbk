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
  const [vistaActual, setVistaActual] = useState("agenda"); // agenda, clientes, especialidades
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
  const [citaBase, setCitaBase] = useState(null);
  const [nuevoMedico, setNuevoMedico] = useState(null);
  const [seleccionMultiple, setSeleccionMultiple] = useState([]);
  const [nuevaEsp, setNuevaEsp] = useState("");
  const [clienteEdicion, setClienteEdicion] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [citasManana, setCitasManana] = useState([]);

  // 1. ESCUCHA DE ESPECIALIDADES
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

  // 2. ESCUCHA DE CITAS
  useEffect(() => {
    if (vistaActual !== "agenda" || !medicoSel) return;
    const q = query(
      collection(db, "citas"),
      where("fecha", "==", fechaSel),
      where("medico", "==", medicoSel),
    );
    const prepararConfirmaciones = async () => {
      setLoading(true);
      try {
        // Calculamos la fecha de mañana
        const manana = new Date();
        manana.setDate(manana.getDate() + 1);
        const fechaMananaStr = manana.toISOString().split("T")[0];

        // Consultamos las citas pendientes o aprobadas para mañana
        const q = query(
          collection(db, "citas"),
          where("fecha", "==", fechaMananaStr),
          where("estado", "in", ["pendiente", "aprobado"]),
        );

        const snapshot = await getDocs(q);
        const listaCitas = snapshot.docs.map((d) => ({
          id: d.id,
          seleccionado: true, // Por defecto marcamos todas para enviar
          ...d.data(),
        }));

        if (listaCitas.length === 0) {
          Alert.alert("Aviso", "No hay citas programadas para mañana.");
          return;
        }

        setCitasManana(listaCitas);
        setModalVisible(true);
      } catch (error) {
        console.error("Error al preparar confirmaciones:", error);
        Alert.alert("Error", "No se pudieron obtener las citas de mañana.");
      } finally {
        setLoading(false);
      }
    };
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCitas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [fechaSel, medicoSel, vistaActual]);

  // 3. ESCUCHA DE USUARIOS
  useEffect(() => {
    if (vistaActual !== "clientes") return;
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      setClientes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [vistaActual]);

  // --- LOGICA AGENDA ---
  const agendaMap = useMemo(() => {
    const map = {};
    citas.forEach((cita) => {
      const slots = Math.ceil((cita.duracion || 15) / 15);
      let [h, m] = cita.hora.split(":").map(Number);
      for (let i = 0; i < slots; i++) {
        const currentH = h.toString().padStart(2, "0");
        const currentM = m.toString().padStart(2, "0");
        const key = `${currentH}:${currentM}`;
        if (!map[key]) {
          map[key] = { ...cita, esInicio: i === 0, esContinuacion: i > 0 };
        }
        m += 15;
        if (m >= 60) {
          h++;
          m = 0;
        }
      }
    });
    return map;
  }, [citas]);

  const HORARIOS = useMemo(() => {
    const hours = [];
    for (let h = 8; h < 18; h++) {
      for (let m = 0; m < 60; m += 15) {
        hours.push(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
        );
      }
    }
    return hours;
  }, []);

  const clientesFiltrados = useMemo(() => {
    const term = busqueda.toLowerCase().trim();
    return clientes.filter(
      (c) =>
        (c.displayName || "").toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term),
    );
  }, [clientes, busqueda]);

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
  const guardarCambiosAgenda = async () => {
    if (!citaBase || seleccionMultiple.length === 0) return;

    setLoading(true);
    try {
      // La primera hora seleccionada será la nueva hora de inicio
      const nuevaHoraInicio = seleccionMultiple[0];

      // Calculamos la nueva duración basada en cuántos slots de 15 min se seleccionaron
      // (Ejemplo: 3 slots = 45 minutos)
      const nuevaDuracion = seleccionMultiple.length * 15;

      const citaRef = doc(db, "citas", citaBase.id);

      await updateDoc(citaRef, {
        hora: nuevaHoraInicio,
        duracion: nuevaDuracion,
        medico: nuevoMedico || citaBase.medico,
        // Si se mueve de horario, es buena práctica resetear a 'aprobado'
        // para que el sistema lo trate como una cita confirmada en firme
        estado: "aprobado",
        ultimaModificacion: serverTimestamp(),
      });

      Alert.alert("Éxito", "Agenda actualizada correctamente.");
      cancelarSeleccion();
    } catch (error) {
      console.error("Error al actualizar agenda:", error);
      Alert.alert(
        "Error",
        "No se pudieron guardar los cambios en la base de datos.",
      );
    } finally {
      setLoading(false);
    }
  };
  const finalizarCitaManual = async () => {
    if (!citaBase?.userId) return Alert.alert("Error", "Sin usuario vinculado");
    setLoading(true);
    try {
      // Registro de actividad LOPDP: Puntos de salud y atención
      await updateDoc(doc(db, "users", citaBase.userId), {
        totalCitas: increment(1),
        puntosSalud: increment(1),
        ultimaAtencion: serverTimestamp(),
      });
      await updateDoc(doc(doc(db, "citas", citaBase.id)), {
        estado: "finalizada",
      });
      Alert.alert("Éxito", "Atención registrada.");
      cancelarSeleccion();
    } catch (e) {
      Alert.alert("Error", "No se pudo finalizar la cita.");
    } finally {
      setLoading(false);
    }
  };

  const enviarSeleccionados = async () => {
    const seleccionados = citasManana.filter((c) => c.seleccionado);
    if (seleccionados.length === 0) return setModalVisible(false);

    for (const cita of seleccionados) {
      let tel = (cita.telefonoPaciente || "").replace(/\D/g, "");
      if (tel.startsWith("0")) tel = "593" + tel.substring(1);
      const msg = `Hola ${cita.nombrePaciente}, confirmamos su cita para mañana a las ${cita.hora}. ¿Nos confirma su asistencia?`;
      const url = `https://api.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent(msg)}`;

      try {
        await Linking.openURL(url);
        // Pequeña pausa para no saturar el sistema de apertura de URLs
        await new Promise((r) => setTimeout(r, 800));
      } catch (err) {
        console.log("Error abriendo WA", err);
      }
    }
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* HEADER COMPACTO */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Agro Redes IA Master</Text>
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
                setVistaActual((prev) =>
                  prev === "agenda"
                    ? "clientes"
                    : prev === "clientes"
                      ? "especialidades"
                      : "agenda",
                );
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

      {/* RENDERIZADO SEGÚN VISTA */}
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
                  info?.esContinuacion && {
                    borderTopWidth: 0,
                    marginTop: -1,
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                  },
                  info?.esInicio && {
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                  },
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
            placeholder="Buscar paciente..."
            value={busqueda}
            onChangeText={setBusqueda}
          />
          <FlatList
            data={clientesFiltrados}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.clienteCard}
                onPress={() => setClienteEdicion(item)}
              >
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
                        ? `Nacimiento: ${item.fechaNacimiento}`
                        : "⚠️ Sin datos LOPDP"}
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
              </TouchableOpacity>
            )}
          />
        </View>
      ) : (
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
              <View style={styles.clienteCard}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
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

      {/* FOOTER ACCIÓN AGENDA */}
      {citaBase && (
        <View style={styles.footerAccion}>
          <Text style={styles.footerText}>
            Paciente: {citaBase.nombrePaciente}
          </Text>
          <View style={styles.footerButtons}>
            <TouchableOpacity style={styles.btnCan} onPress={cancelarSeleccion}>
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            {citaBase.estado === "aprobado" && (
              <TouchableOpacity
                style={styles.btnFinalizar}
                onPress={finalizarCitaManual}
              >
                <Text style={styles.btnText}>FINALIZAR ATENCIÓN</Text>
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
    elevation: 5,
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
    paddingBottom: 120,
  },
  slot: {
    width: "23%",
    height: 55,
    backgroundColor: "#fff",
    marginBottom: 6,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EDEFF2",
  },
  slotText: { fontSize: 9, color: "#B0B5C1" },
  pacienteTag: {
    fontSize: 7,
    color: "#333",
    fontWeight: "bold",
    marginTop: 2,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  bgAmarillo: { backgroundColor: "#FFF9C4" }, // Más suave
  bgRojo: { backgroundColor: "#FFCDD2" }, // Más suave
  bgGris: { backgroundColor: "#E0E0E0", opacity: 0.6 },
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
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clienteName: { fontWeight: "bold", fontSize: 15 },
  cardSubText: { fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  footerAccion: {
    position: "absolute",
    bottom: 20,
    left: 15,
    right: 15,
    backgroundColor: COLORS.darkGreen,
    borderRadius: 20,
    padding: 15,
    elevation: 10,
  },
  footerText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    alignItems: "center",
  },
  btnOk: {
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  btnFinalizar: {
    backgroundColor: "#2196F3",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  btnCan: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 8,
    borderRadius: 12,
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 10 },
  addArea: { flexDirection: "row", marginBottom: 20, gap: 10 },
  btnAdd: {
    backgroundColor: COLORS.primaryGreen,
    width: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
