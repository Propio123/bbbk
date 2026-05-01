import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  query,
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

const DATA_ESPECIALIDADES = [
  { id: "gen", nombre: "General", medico: "Dra. Doménica Palma", duracion: 30 },
  {
    id: "ort",
    nombre: "Ortodoncia",
    medico: "Dr. Bladimir Benavidez",
    duracion: 30,
  },
  { id: "end", nombre: "Endodoncia", medico: "Dr. Xavier C.", duracion: 60 },
  { id: "cir", nombre: "Cirugía", medico: "Dr. Darwin Congo", duracion: 90 },
  {
    id: "est",
    nombre: "Estética",
    medico: "Dr. Santiago Benalcazar",
    duracion: 45,
  },
  {
    id: "per",
    nombre: "Periodoncia",
    medico: "Dra. Eliana Cespedes",
    duracion: 30,
  },
  {
    id: "reh",
    nombre: "Rehabilitación",
    medico: "Dr. Jose Cargua",
    duracion: 60,
  },
  {
    id: "adop",
    nombre: "Odontopediatría",
    medico: "Dra. Sofía Benavides",
    duracion: 60,
  },
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

  // --- ESTADOS CLIENTES ---
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [puntosManuales, setPuntosManuales] = useState({}); // Para el input digitalizable

  // --- MODALES ---
  const [modalMedicos, setModalMedicos] = useState(false);
  const [modalWA, setModalWA] = useState(false);
  const [citasManana, setCitasManana] = useState([]);

  // 1. Inicialización y Escuchas
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "especialidades"), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setListaMedicos(docs);
      if (docs.length > 0 && !medicoSel) setMedicoSel(docs[0].medico);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (vistaActual === "agenda" && medicoSel) {
      const q = query(
        collection(db, "citas"),
        where("fecha", "==", fechaSel),
        where("medico", "==", medicoSel),
      );
      return onSnapshot(q, (snap) =>
        setCitas(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      );
    }
    if (vistaActual === "clientes") {
      return onSnapshot(collection(db, "users"), (snap) =>
        setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      );
    }
  }, [fechaSel, medicoSel, vistaActual]);

  // 2. Lógica de WhatsApp Masivo
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
      if (data.length === 0)
        Alert.alert("Aviso", "No hay citas aprobadas para mañana.");
      else setModalWA(true);
    } catch (e) {
      Alert.alert("Error", "Error al consultar citas.");
    } finally {
      setLoading(false);
    }
  };

  const enviarMasivo = async () => {
    const seleccionados = citasManana.filter((c) => c.seleccionado);
    for (const c of seleccionados) {
      let tel = (c.telefonoPaciente || "").replace(/\D/g, "");
      if (tel.startsWith("0")) tel = "593" + tel.substring(1);
      const msg = `Hola ${c.nombrePaciente}, confirmamos su cita de ${c.especialidad || "Odontología"} para mañana a las ${c.hora}. ¿Nos confirma su asistencia?`;
      await Linking.openURL(
        `https://api.whatsapp.com/send?phone=${tel}&text=${encodeURIComponent(msg)}`,
      );
      await new Promise((r) => setTimeout(r, 1200)); // Delay para evitar bloqueos
    }
    setModalWA(false);
  };

  // 3. Gestión de Cumpleaños
  const esCumpleanos = (fechaNac) => {
    if (!fechaNac) return false;
    const hoy = new Date();
    const cumple = new Date(fechaNac);
    return (
      hoy.getDate() === cumple.getDate() && hoy.getMonth() === cumple.getMonth()
    );
  };

  // 4. Mapeo de Agenda
  const agendaMap = useMemo(() => {
    const map = {};
    citas.forEach((cita) => {
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
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>333K Master Panel</Text>
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
              <View
                key={h}
                style={[
                  styles.slot,
                  info?.estado === "aprobado" && styles.bgRojo,
                ]}
              >
                <Text style={[styles.slotText, info && { color: "#000" }]}>
                  {h}
                </Text>
                {info?.esInicio && (
                  <Text style={styles.pacienteTag}>{info.nombrePaciente}</Text>
                )}
              </View>
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
            data={clientes.filter((c) =>
              (c.nombre || c.displayName || "")
                .toLowerCase()
                .includes(busqueda.toLowerCase()),
            )}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const cumple = esCumpleanos(item.fechaNacimiento);
              return (
                <View style={[styles.clienteCard, cumple && styles.cardCumple]}>
                  <View style={styles.cardHeader}>
                    <View>
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Text style={styles.clienteName}>
                          {item.nombre || item.displayName || "Paciente"}
                        </Text>
                        {cumple && (
                          <MaterialCommunityIcons
                            name="cake-variant"
                            size={18}
                            color="#FF4081"
                            style={{ marginLeft: 5 }}
                          />
                        )}
                      </View>
                      {cumple && (
                        <Text style={styles.cumpleAlerta}>
                          ¡Hoy es su cumpleaños!
                        </Text>
                      )}
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {item.tipoCliente || "PRI"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.millasRow}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flex: 1,
                      }}
                    >
                      <Text style={styles.millasLabel}>Millas:</Text>
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
                    </View>
                    <View style={{ flexDirection: "row" }}>
                      <TouchableOpacity
                        onPress={() =>
                          updateDoc(doc(db, "users", item.id), {
                            puntosSalud: increment(10),
                          })
                        }
                        style={styles.btnAccion}
                      >
                        <Text style={styles.btnText}>+10</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          updateDoc(doc(db, "users", item.id), {
                            puntosSalud: increment(-10),
                          })
                        }
                        style={styles.btnAccion}
                      >
                        <Text style={styles.btnText}>-10</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* MODAL WHATSAPP MASIVO */}
      <Modal visible={modalWA} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmaciones para Mañana</Text>
            <FlatList
              data={citasManana}
              keyExtractor={(item) => item.id}
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
                  <View style={{ marginLeft: 10 }}>
                    <Text style={{ fontWeight: "bold" }}>
                      {item.nombrePaciente}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#666" }}>
                      {item.hora} - {item.medico}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={enviarMasivo} style={styles.btnPrimario}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                ENVIAR MENSAJES
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalWA(false)}
              style={styles.btnSecundario}
            >
              <Text>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL EDITAR MEDICOS */}
      <Modal visible={modalMedicos} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Especialistas Activos</Text>
            <ScrollView>
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
            </ScrollView>
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
  pacienteTag: { fontSize: 7, fontWeight: "bold", textAlign: "center" },
  bgRojo: { backgroundColor: "#FF5252" },
  searchBar: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 15,
  },
  clienteCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    elevation: 2,
  },
  cardCumple: {
    borderColor: "#FF4081",
    borderWidth: 2,
    backgroundColor: "#FFF5F8",
  },
  cumpleAlerta: { fontSize: 10, color: "#FF4081", fontWeight: "bold" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clienteName: { fontWeight: "bold", fontSize: 15 },
  badge: {
    backgroundColor: COLORS.darkGreen,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  millasRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#EEE",
    paddingTop: 10,
  },
  millasLabel: { fontSize: 12, color: "#666" },
  millasInput: {
    backgroundColor: "#F0F0F0",
    width: 60,
    textAlign: "center",
    fontWeight: "bold",
    borderRadius: 5,
    padding: 5,
    marginHorizontal: 5,
    color: COLORS.darkGreen,
  },
  btnAccion: {
    backgroundColor: COLORS.primaryGreen,
    padding: 6,
    borderRadius: 8,
    marginLeft: 5,
    width: 40,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 25,
    maxHeight: "80%",
  },
  modalTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 15,
    textAlign: "center",
  },
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
    marginTop: 20,
  },
  btnSecundario: { padding: 15, alignItems: "center" },
  inputEdit: {
    borderBottomWidth: 1,
    borderColor: "#DDD",
    paddingVertical: 5,
    fontSize: 14,
  },
  btnClose: {
    backgroundColor: COLORS.darkGreen,
    padding: 12,
    borderRadius: 15,
    marginTop: 15,
    alignItems: "center",
  },
  loader: { position: "absolute", top: "50%", alignSelf: "center" },
});
