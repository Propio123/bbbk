import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  onSnapshot,
  query,
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

export default function AdminMasterPanel() {
  const router = useRouter();
  const [vistaActual, setVistaActual] = useState("agenda");
  const [loading, setLoading] = useState(false);

  // --- ESTADOS MÉDICOS ---
  const [listaMedicos, setListaMedicos] = useState([]);
  const [medicoSel, setMedicoSel] = useState("");
  const [nuevoDoctor, setNuevoDoctor] = useState({ nombre: "", medico: "" });

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

  // 1. Listeners de Firebase
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "especialidades"), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setListaMedicos(docs);
      if (docs.length > 0 && !medicoSel) setMedicoSel(docs[0].medico);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q =
      vistaActual === "agenda"
        ? query(collection(db, "citas"), where("fecha", "==", fechaSel))
        : query(collection(db, "users"));

    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      vistaActual === "agenda" ? setCitas(data) : setClientes(data);
    });
  }, [fechaSel, vistaActual]);

  // 2. Funciones de Control (Cerrar Sesión y WhatsApp)
  const ejecutarCerrarSesion = async () => {
    Alert.alert("Cerrar Sesión", "¿Desea salir del panel de administración?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/login");
        },
      },
    ]);
  };

  const prepararWA = async () => {
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
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        seleccionado: true,
      }));

      if (data.length === 0) {
        Alert.alert("Aviso", "No hay citas programadas para mañana.");
      } else {
        setCitasManana(data);
        setModalWA(true);
      }
    } catch (e) {
      Alert.alert("Error", "No se pudieron cargar las citas de mañana.");
    } finally {
      setLoading(false);
    }
  };

  const enviarMensajesWA = async () => {
    const seleccionados = citasManana.filter((c) => c.seleccionado);
    for (const c of seleccionados) {
      let tel = (c.telefonoPaciente || "").replace(/\D/g, "");
      if (tel.startsWith("0")) tel = "593" + tel.substring(1);
      const msg = `Hola ${c.nombrePaciente}, le saludamos de 333K. Confirmamos su cita de ${c.especialidad} para mañana a las ${c.hora}. ¿Nos confirma su asistencia?`;
      const url = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
      await Linking.openURL(url);
    }
    setModalWA(false);
  };

  // 3. Gestión de Médicos Avanzada
  const agregarMedico = async () => {
    if (!nuevoDoctor.nombre || !nuevoDoctor.medico)
      return Alert.alert("Error", "Complete ambos campos");
    await addDoc(collection(db, "especialidades"), nuevoDoctor);
    setNuevoDoctor({ nombre: "", medico: "" });
  };

  const eliminarMedico = (id) => {
    Alert.alert("Eliminar", "¿Borrar este profesional?", [
      { text: "No" },
      { text: "Sí", onPress: () => deleteDoc(doc(db, "especialidades", id)) },
    ]);
  };

  // 4. Mapeo de Grid
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
      {/* HEADER CORREGIDO */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={ejecutarCerrarSesion}
            style={styles.logoutBtn}
          >
            <MaterialCommunityIcons name="power" size={28} color="#FF5252" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>333K MASTER</Text>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity onPress={prepararWA} style={styles.iconBtn}>
              <MaterialCommunityIcons
                name="whatsapp"
                size={28}
                color="#25D366"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalMedicos(true)}
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons
                name="account-plus"
                size={28}
                color="#fff"
              />
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
                <Text style={styles.tabText}>{m.medico}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* CONTENIDO PRINCIPAL */}
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
                  <Text style={styles.pacienteTag} numberOfLines={1}>
                    {info.nombrePaciente}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding: 15 }}>
          <TextInput
            placeholder="Buscar paciente por nombre..."
            style={styles.searchBar}
            onChangeText={setBusqueda}
          />
          <FlatList
            data={clientes.filter((c) =>
              (c.nombre || c.displayName || "")
                .toLowerCase()
                .includes(busqueda.toLowerCase()),
            )}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.clienteCard}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "bold" }}>
                    {item.nombre || item.displayName || "Paciente"}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#999" }}>
                    {item.email}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
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
                  <TouchableOpacity
                    onPress={() =>
                      updateDoc(doc(db, "users", item.id), {
                        puntosSalud: increment(10),
                      })
                    }
                    style={styles.btnSmall}
                  >
                    <Text style={styles.btnText}>+10</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* PANEL EDICIÓN DE CITA */}
      {citaEnEdicion && (
        <View style={styles.editPanel}>
          <Text style={styles.editPanelTitle}>
            Editar: {citaEnEdicion.nombrePaciente}
          </Text>
          <Text style={styles.label}>Cambiar a otro médico disponible:</Text>
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
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              onPress={async () => {
                const ocupado = citas.find(
                  (c) =>
                    c.medico === nuevoMedicoParaCita &&
                    c.hora === citaEnEdicion.hora &&
                    c.estado !== "finalizado",
                );
                if (ocupado)
                  return Alert.alert(
                    "Error",
                    "Este médico ya tiene cita a esa hora",
                  );
                await updateDoc(doc(db, "citas", citaEnEdicion.id), {
                  medico: nuevoMedicoParaCita,
                });
                setCitaEnEdicion(null);
              }}
              style={styles.btnSave}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>CAMBIAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                await updateDoc(doc(db, "citas", citaEnEdicion.id), {
                  estado: "finalizado",
                });
                setCitaEnEdicion(null);
              }}
              style={styles.btnDone}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                FINALIZAR
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCitaEnEdicion(null)}
              style={styles.btnCancel}
            >
              <Text>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* MODAL GESTIÓN TOTAL DE MÉDICOS */}
      <Modal visible={modalMedicos} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Gestión de Profesionales</Text>

            {/* Formulario Nuevo Médico */}
            <View style={styles.formMedico}>
              <TextInput
                placeholder="Especialidad (ej: Cirugía)"
                style={styles.inputNew}
                value={nuevoDoctor.nombre}
                onChangeText={(t) =>
                  setNuevoDoctor({ ...nuevoDoctor, nombre: t })
                }
              />
              <TextInput
                placeholder="Nombre (ej: Dr. Perez)"
                style={styles.inputNew}
                value={nuevoDoctor.medico}
                onChangeText={(t) =>
                  setNuevoDoctor({ ...nuevoDoctor, medico: t })
                }
              />
              <TouchableOpacity onPress={agregarMedico} style={styles.btnAdd}>
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  AÑADIR PROFESIONAL
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={listaMedicos}
              renderItem={({ item }) => (
                <View style={styles.medicoRow}>
                  <View style={{ flex: 1 }}>
                    <TextInput
                      style={{ fontWeight: "bold" }}
                      defaultValue={item.nombre}
                      onEndEditing={(e) =>
                        updateDoc(doc(db, "especialidades", item.id), {
                          nombre: e.nativeEvent.text,
                        })
                      }
                    />
                    <TextInput
                      style={{ color: COLORS.primaryGreen }}
                      defaultValue={item.medico}
                      onEndEditing={(e) =>
                        updateDoc(doc(db, "especialidades", item.id), {
                          medico: e.nativeEvent.text,
                        })
                      }
                    />
                  </View>
                  <TouchableOpacity onPress={() => eliminarMedico(item.id)}>
                    <MaterialCommunityIcons
                      name="delete"
                      size={24}
                      color="#FF5252"
                    />
                  </TouchableOpacity>
                </View>
              )}
            />
            <TouchableOpacity
              onPress={() => setModalMedicos(false)}
              style={styles.btnClose}
            >
              <Text style={{ color: "#fff" }}>Terminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL WHATSAPP */}
      <Modal visible={modalWA} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmación Mañana</Text>
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
                    size={24}
                    color={COLORS.primaryGreen}
                  />
                  <Text style={{ marginLeft: 10 }}>
                    {item.hora} - {item.nombrePaciente}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              onPress={enviarMensajesWA}
              style={styles.btnPrimario}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                ABRIR WHATSAPP
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalWA(false)}
              style={styles.btnSecundario}
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
  headerTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  logoutBtn: { padding: 5 },
  iconBtn: { marginLeft: 12 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 12,
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
    paddingBottom: 150,
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
    color: "#333",
    marginTop: 2,
    paddingHorizontal: 2,
  },
  bgRojo: { backgroundColor: "#FFCDD2", borderColor: "#FF5252" },
  searchBar: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 2,
  },
  clienteCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
  },
  millasInput: {
    backgroundColor: "#F0F0F0",
    width: 60,
    textAlign: "center",
    borderRadius: 10,
    padding: 8,
    fontWeight: "bold",
    color: COLORS.darkGreen,
  },
  btnSmall: {
    backgroundColor: COLORS.primaryGreen,
    padding: 10,
    borderRadius: 10,
    marginLeft: 8,
  },
  btnText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  editPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 25,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    elevation: 25,
  },
  editPanelTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 15,
    color: COLORS.darkGreen,
  },
  formMedico: {
    backgroundColor: "#F9F9F9",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
  },
  inputNew: {
    borderBottomWidth: 1,
    borderColor: "#DDD",
    marginBottom: 10,
    padding: 5,
  },
  btnAdd: {
    backgroundColor: COLORS.darkGreen,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  medicoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  // eslint-disable-next-line no-dupe-keys
  editPanelTitle: { fontWeight: "bold", fontSize: 15, marginBottom: 10 },
  miniTab: {
    padding: 10,
    backgroundColor: "#EEE",
    borderRadius: 10,
    marginRight: 5,
  },
  btnSave: {
    backgroundColor: COLORS.primaryGreen,
    padding: 15,
    borderRadius: 15,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
  },
  btnDone: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 15,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
  },
  btnCancel: {
    backgroundColor: "#F0F0F0",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 30,
    maxHeight: "85%",
  },
  modalTitle: {
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    fontSize: 18,
  },
  waItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  btnPrimario: {
    backgroundColor: "#25D366",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 15,
  },
  btnSecundario: { padding: 15, alignItems: "center" },
  inputEdit: { borderBottomWidth: 1, borderColor: "#DDD", paddingVertical: 5 },
  btnClose: {
    backgroundColor: COLORS.darkGreen,
    padding: 15,
    borderRadius: 18,
    marginTop: 15,
    alignItems: "center",
  },
  loader: { position: "absolute", top: "50%", alignSelf: "center" },
});
