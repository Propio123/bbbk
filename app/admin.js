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
  Platform,
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

  // --- ESTADOS AGENDA Y NAVEGACIÓN DE FECHA ---
  const [fechaObjeto, setFechaObjeto] = useState(new Date());
  const [fechaSel, setFechaSel] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [citas, setCitas] = useState([]);
  const [citaEnEdicion, setCitaEnEdicion] = useState(null);
  const [nuevoMedicoParaCita, setNuevoMedicoParaCita] = useState("");

  // --- ESTADOS CLIENTES ---
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  // --- MODALES ---
  const [modalMedicos, setModalMedicos] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [citasManana, setCitasManana] = useState([]);

  // Cambiar fecha
  const onChangeFecha = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios"); // En iOS el picker puede quedarse abierto
    if (selectedDate) {
      setFechaObjeto(selectedDate);
      const isoFecha = selectedDate.toISOString().split("T")[0];
      setFechaSel(isoFecha);
    }
  };

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
      Alert.alert("Error", "Consulta fallida.");
    } finally {
      setLoading(false);
    }
  };

  const enviarSeleccionados = async () => {
    const seleccionados = citasManana.filter((c) => c.seleccionado);
    for (const cita of seleccionados) {
      let tel = (cita.telefonoPaciente || "").replace(/\D/g, "");
      if (tel.startsWith("0")) tel = "593" + tel.substring(1);
      const msg = `Hola ${cita.nombrePaciente}, confirmamos su cita para mañana a las ${cita.hora}. ¿Nos confirma su asistencia?`;
      const url = `https://api.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent(msg)}`;
      await Linking.openURL(url);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setModalVisible(false);
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
          <Text style={styles.headerTitle}>333K Master Panel</Text>
          <View style={{ flexDirection: "row" }}>
            {/* NUEVO BOTÓN CALENDARIO */}

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
          <View>
            <Text style={styles.fechaTexto}>
              Viendo:{" "}
              {fechaSel === new Date().toISOString().split("T")[0]
                ? "Hoy"
                : fechaSel}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 10 }}
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
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
      <View style={styles.dateNav}>
        <TouchableOpacity
          onPress={() => {
            const d = new Date(fechaSel + "T12:00:00");
            d.setDate(d.getDate() - 1);
            setFechaSel(d.toISOString().split("T")[0]);
          }}
        >
          <MaterialCommunityIcons name="chevron-left" size={35} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.dateText}>{fechaSel}</Text>
        <TouchableOpacity
          onPress={() => {
            const d = new Date(fechaSel + "T12:00:00");
            d.setDate(d.getDate() + 1);
            setFechaSel(d.toISOString().split("T")[0]);
          }}
        >
          <MaterialCommunityIcons name="chevron-right" size={35} color="#fff" />
        </TouchableOpacity>
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
                  <Text style={styles.pacienteTag}>{info.nombrePaciente}</Text>
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
                  <TouchableOpacity
                    onPress={() => {
                      const actual = item.puntosSalud || 0;
                      updateDoc(doc(db, "users", item.id), {
                        puntosSalud: actual >= 10 ? increment(-10) : 0,
                      });
                    }}
                    style={[styles.btnSmall, { backgroundColor: "#FF5252" }]}
                  >
                    <Text style={styles.btnText}>-10</Text>
                  </TouchableOpacity>
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
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmaciones de Mañana</Text>
            <View style={styles.bulkActions}>
              <TouchableOpacity
                onPress={() =>
                  setCitasManana(
                    citasManana.map((c) => ({ ...c, seleccionado: true })),
                  )
                }
              >
                <Text style={styles.actionLink}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setCitasManana(
                    citasManana.map((c) => ({ ...c, seleccionado: false })),
                  )
                }
              >
                <Text style={styles.actionLink}>Ninguno</Text>
              </TouchableOpacity>
            </View>
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

      {/* MODAL MÉDICOS */}
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
  fechaTexto: { color: "#fff", fontSize: 12, marginTop: 5, opacity: 0.8 },
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
  dateNav: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
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
