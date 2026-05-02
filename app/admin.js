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

  // 2. WhatsApp Masivo
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
      setCitasManana(data);
      if (data.length === 0) Alert.alert("Aviso", "No hay citas para mañana.");
      else setModalWA(true);
    } catch (e) {
      Alert.alert("Error", "Error al consultar citas.");
    } finally {
      setLoading(false);
    }
  };

  const enviarMasivo = async () => {
    const seleccionados = citasManana.filter((c) => c.seleccionado);

    if (seleccionados.length === 0) {
      Alert.alert("Aviso", "No hay citas seleccionadas.");
      return;
    }

    // Cerramos el modal para que no interfiera con la navegación
    setModalWA(false);

    // Función recursiva o secuencial para enviar uno por uno
    for (let i = 0; i < seleccionados.length; i++) {
      const c = seleccionados[i];
      let tel = (c.telefonoPaciente || "").replace(/\D/g, "");

      if (tel.startsWith("0")) {
        tel = "593" + tel.substring(1);
      } else if (!tel.startsWith("593") && tel.length > 0) {
        tel = "593" + tel;
      }

      const msg = `Hola ${c.nombrePaciente}, confirmamos su cita de ${c.especialidad || "Odontología"} para mañana a las ${c.hora}. ¿Nos confirma su asistencia?`;

      // Intentar primero con el esquema universal para asegurar compatibilidad
      const url = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;

      // Mostramos una alerta para cada mensaje (esto es necesario para que el
      // sistema operativo permita abrir múltiples URLs externas una tras otra)
      await new Promise((resolve) => {
        Alert.alert(
          `Envío ${i + 1} de ${seleccionados.length}`,
          `Enviar recordatorio a ${c.nombrePaciente}?`,
          [
            {
              text: "Saltar",
              onPress: () => resolve(true),
              style: "cancel",
            },
            {
              text: "Enviar",
              onPress: async () => {
                try {
                  await Linking.openURL(url);
                } catch (err) {
                  Alert.alert("Error", "No se pudo abrir WhatsApp");
                }
                resolve(true);
              },
            },
          ],
          { cancelable: false },
        );
      });

      // Pequeño delay para dar tiempo al sistema a registrar la acción
      await new Promise((r) => setTimeout(r, 1000));
    }

    Alert.alert("Finalizado", "Se ha recorrido la lista de contactos.");
  };

  // 3. Lógica de Edición y Cierre
  const cerrarSesion = () => {
    Alert.alert("Cerrar Sesión", "¿Está seguro?", [
      { text: "No" },
      {
        text: "Sí",
        onPress: () => signOut(auth).then(() => router.replace("/login")),
      },
    ]);
  };

  const guardarCambioMedico = async () => {
    if (!nuevoMedicoParaCita || nuevoMedicoParaCita === citaEnEdicion.medico) {
      setCitaEnEdicion(null);
      return;
    }
    const ocupado = citas.find(
      (c) =>
        c.medico === nuevoMedicoParaCita &&
        c.hora === citaEnEdicion.hora &&
        c.estado !== "finalizado",
    );
    if (ocupado)
      return Alert.alert(
        "Error",
        `El Dr. ${nuevoMedicoParaCita} ya está ocupado a las ${citaEnEdicion.hora}`,
      );

    setLoading(true);
    await updateDoc(doc(db, "citas", citaEnEdicion.id), {
      medico: nuevoMedicoParaCita,
    });
    setCitaEnEdicion(null);
    setLoading(false);
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
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => signOut(auth).then(() => router.replace("/login"))}
          >
            <MaterialCommunityIcons name="power" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>BBBK Master Panel</Text>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity onPress={prepararWA} style={styles.iconBtn}>
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
                  <Text style={styles.pacienteTag}>
                    {info.displayName || info.nombrePaciente || "Paciente"}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding: 15 }}>
          <TextInput
            placeholder="Buscar cliente..."
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
                <Text style={{ fontWeight: "bold", flex: 1 }}>
                  {item.nombre || item.displayName || "Paciente"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontSize: 10, color: "#666", marginRight: 5 }}>
                    Millas:
                  </Text>

                  {/* INPUT PARA DIGITACIÓN MANUAL */}
                  <TextInput
                    style={styles.millasInput}
                    keyboardType="numeric"
                    value={String(item.puntosSalud || 0)}
                    onChangeText={(text) => {
                      const val = Number(text.replace(/[^0-9]/g, ""));
                      updateDoc(doc(db, "users", item.id), {
                        puntosSalud: val,
                      });
                    }}
                  />

                  {/* BOTÓN DECREMENTO */}
                  <TouchableOpacity
                    onPress={() => {
                      const actual = item.puntosSalud || 0;
                      if (actual >= 10) {
                        updateDoc(doc(db, "users", item.id), {
                          puntosSalud: increment(-10),
                        });
                      } else {
                        updateDoc(doc(db, "users", item.id), {
                          puntosSalud: 0,
                        });
                      }
                    }}
                    style={[styles.btnSmall, { backgroundColor: "#FF5252" }]}
                  >
                    <Text style={styles.btnText}>-10</Text>
                  </TouchableOpacity>

                  {/* BOTÓN INCREMENTO */}
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

      {/* PANEL EDICIÓN DE CITA (Grid) */}
      {citaEnEdicion && (
        <View style={styles.editPanel}>
          <Text style={styles.editPanelTitle}>
            Paciente: {citaEnEdicion.nombrePaciente}
          </Text>
          <Text style={styles.label}>
            Reasignar médico para las {citaEnEdicion.hora}:
          </Text>
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
              onPress={guardarCambioMedico}
              style={styles.btnSave}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>GUARDAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                updateDoc(doc(db, "citas", citaEnEdicion.id), {
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

      {/* MODAL WHATSAPP */}
      <Modal visible={modalWA} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Citas para Mañana</Text>

            <FlatList
              data={citasManana}
              keyExtractor={(item) => item.id.toString()} // 1. Clave única indispensable
              contentContainerStyle={{ paddingBottom: 20 }} // Espaciado interno
              style={{ maxHeight: 400 }} // 2. Evita que el modal se pierda si hay muchas citas
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    // 3. Usamos el estado previo para garantizar la actualización
                    setCitasManana((prevCitas) =>
                      prevCitas.map((x) =>
                        x.id === item.id
                          ? { ...x, seleccionado: !x.seleccionado }
                          : x,
                      ),
                    );
                  }}
                  style={styles.waItem}
                  activeOpacity={0.7} // Feedback visual al tocar
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
                  <Text style={{ marginLeft: 10, flex: 1 }}>
                    {item.hora} - {item.nombrePaciente}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <View style={{ marginTop: 10 }}>
              <TouchableOpacity
                onPress={enviarMasivo}
                style={styles.btnPrimario}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  ENVIAR WHATSAPP
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setModalWA(false)}
                style={styles.btnSecundario}
              >
                <Text style={{ color: "#666" }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL MÉDICOS EDITABLES */}
      <Modal visible={modalMedicos} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Especialidades y Doctores</Text>
            {listaMedicos.map((m) => (
              <View key={m.id} style={{ marginBottom: 10 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: COLORS.primaryGreen,
                    fontWeight: "bold",
                  }}
                >
                  {m.nombre}
                </Text>
                <TextInput
                  style={styles.inputEdit}
                  defaultValue={m.medico}
                  onEndEditing={(e) =>
                    updateDoc(doc(db, "especialidades", m.id), {
                      medico: e.nativeEvent.text,
                    })
                  }
                />
              </View>
            ))}
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
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
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
    paddingBottom: 120,
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
  searchBar: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
  },
  clienteCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 15,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  millasInput: {
    backgroundColor: "#F0F0F0",
    width: 65,
    textAlign: "center",
    borderRadius: 8,
    padding: 5,
    fontWeight: "bold",
    color: COLORS.darkGreen,
    marginRight: 5,
  },
  btnSmall: {
    backgroundColor: COLORS.primaryGreen,
    padding: 6,
    borderRadius: 8,
    marginLeft: 5,
    minWidth: 35,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
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
  editPanelTitle: { fontWeight: "bold", fontSize: 15, marginBottom: 10 },
  miniTab: {
    padding: 10,
    backgroundColor: "#EEE",
    borderRadius: 10,
    marginRight: 5,
  },
  btnSave: {
    backgroundColor: COLORS.primaryGreen,
    padding: 12,
    borderRadius: 12,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
  },
  btnDone: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 12,
    flex: 1,
    marginRight: 5,
    alignItems: "center",
  },
  btnCancel: {
    backgroundColor: "#F0F0F0",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", padding: 20, borderRadius: 25 },
  modalTitle: { fontWeight: "bold", textAlign: "center", marginBottom: 15 },
  waItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  btnPrimario: {
    backgroundColor: "#25D366",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 15,
  },
  btnSecundario: { padding: 10, alignItems: "center" },
  inputEdit: { borderBottomWidth: 1, borderColor: "#DDD", paddingVertical: 5 },
  btnClose: {
    backgroundColor: COLORS.darkGreen,
    padding: 12,
    borderRadius: 15,
    marginTop: 10,
    alignItems: "center",
  },
  loader: { position: "absolute", top: "50%", alignSelf: "center" },
});
