import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  updateDoc, // Importante para creación masiva
  where,
  writeBatch
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { db } from "../src/api/firebase.config";
import { COLORS } from "../src/constants/theme";

// Datos exactos que solicitaste
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

  // --- OTROS ESTADOS (Agenda, Clientes, Modales) ---
  const [fechaSel, setFechaSel] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [citas, setCitas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [puntosEdit, setPuntosEdit] = useState({});
  const [modalMedicos, setModalMedicos] = useState(false);

  // 1. FUNCIÓN TEMPORAL: Crear especialidades en Firestore
  const ejecutarInicializacion = async () => {
    setLoading(true);
    const batch = writeBatch(db);

    DATA_ESPECIALIDADES.forEach((esp) => {
      const docRef = doc(db, "especialidades", esp.id);
      batch.set(docRef, esp);
    });

    try {
      await batch.commit();
      Alert.alert(
        "Éxito",
        "Especialidades creadas correctamente en Firestore.",
      );
    } catch (e) {
      Alert.alert(
        "Error de Permisos",
        "Asegúrate de que tu usuario tenga rol 'admin' en Firestore.",
      );
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 2. Escucha de Médicos
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "especialidades"),
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setListaMedicos(docs);
        if (docs.length > 0 && !medicoSel) setMedicoSel(docs[0].medico);
      },
    );
    return () => unsubscribe();
  }, []);

  // 3. Escucha de Citas
  useEffect(() => {
    if (vistaActual !== "agenda" || !medicoSel) return;
    const q = query(
      collection(db, "citas"),
      where("fecha", "==", fechaSel),
      where("medico", "==", medicoSel),
    );
    return onSnapshot(q, (snapshot) => {
      setCitas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [fechaSel, medicoSel, vistaActual]);

  // 4. Escucha de Clientes
  useEffect(() => {
    if (vistaActual !== "clientes") return;
    return onSnapshot(collection(db, "users"), (snapshot) => {
      setClientes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [vistaActual]);

  // Lógica de filtrado y mapeo (se mantiene igual)
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
            {/* BOTÓN TEMPORAL DE INICIALIZACIÓN */}
            <TouchableOpacity
              onPress={ejecutarInicializacion}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: "rgba(255,0,0,0.3)",
                  borderRadius: 5,
                  padding: 2,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="database-plus"
                size={24}
                color="#FF5252"
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

      {/* RENDERIZADO DE VISTAS (Agenda / Clientes) */}
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
            renderItem={({ item }) => (
              <View style={styles.clienteCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.clienteName}>
                    {item.nombre || item.displayName || "Paciente"}
                  </Text>
                  <Text style={styles.millasText}>
                    Millas: {item.puntosSalud || 0}
                  </Text>
                </View>
                <View style={styles.millasActions}>
                  <TouchableOpacity
                    onPress={() =>
                      updateDoc(doc(db, "users", item.id), {
                        puntosSalud: increment(10),
                      })
                    }
                    style={styles.btnMilla}
                  >
                    <Text style={{ color: "#fff" }}>+10</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      updateDoc(doc(db, "users", item.id), {
                        puntosSalud: increment(-10),
                      })
                    }
                    style={styles.btnMilla}
                  >
                    <Text style={{ color: "#fff" }}>-10</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* MODAL GESTIÓN MÉDICOS */}
      <Modal visible={modalMedicos} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Especialistas</Text>
            {listaMedicos.map((m) => (
              <View key={m.id} style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: "bold" }}>
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
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  iconBtn: { marginLeft: 10, padding: 4 },
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
  clienteCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  clienteName: { fontWeight: "bold" },
  millasText: { color: COLORS.primaryGreen, fontWeight: "bold" },
  millasActions: { flexDirection: "row", marginTop: 10 },
  btnMilla: {
    backgroundColor: COLORS.darkGreen,
    padding: 5,
    borderRadius: 5,
    marginRight: 10,
    width: 40,
    alignItems: "center",
  },
  searchBar: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", padding: 20, borderRadius: 20 },
  modalTitle: { fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  inputEdit: { borderBottomWidth: 1, borderColor: "#ccc", padding: 5 },
  btnClose: {
    backgroundColor: COLORS.darkGreen,
    padding: 10,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  loader: { position: "absolute", top: "50%", alignSelf: "center" },
});
