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

  // --- ESTADOS CLIENTES Y CUMPLEAÑOS ---
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  // --- MODALES ---
  const [modalMedicos, setModalMedicos] = useState(false);
  const [modalWA, setModalWA] = useState(false);
  const [citasManana, setCitasManana] = useState([]);

  // 1. LISTENERS EN TIEMPO REAL
  useEffect(() => {
    // Escuchar Médicos/Especialidades
    const unsubMedicos = onSnapshot(
      collection(db, "especialidades"),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setListaMedicos(docs);
        if (docs.length > 0 && !medicoSel) setMedicoSel(docs[0].medico);
      },
    );

    // Escuchar Usuarios para Millas/Cumpleaños
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubMedicos();
      unsubUsers();
    };
  }, []);

  useEffect(() => {
    if (vistaActual === "agenda") {
      const q = query(collection(db, "citas"), where("fecha", "==", fechaSel));
      return onSnapshot(q, (snap) => {
        setCitas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    }
  }, [fechaSel, vistaActual]);

  // 2. FUNCIONES DE CONTROL (CERRAR SESIÓN Y WHATSAPP)
  const ejecutarCerrarSesion = () => {
    Alert.alert("Cerrar Sesión", "¿Seguro que desea salir?", [
      { text: "Cancelar" },
      {
        text: "Salir",
        onPress: async () => {
          await signOut(auth);
          router.replace("/login");
        },
      },
    ]);
  };

  const abrirWhatsApp = async (telefono, mensaje) => {
    let num = telefono.replace(/\D/g, "");
    if (num.startsWith("0")) num = "593" + num.substring(1);
    const url = `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(mensaje)}`;

    const soportado = await Linking.canOpenURL(url);
    if (soportado) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        "Error",
        "WhatsApp no está instalado o el número es inválido",
      );
    }
  };

  // 3. GESTIÓN DE MILLAS Y REGALO CUMPLEAÑOS
  const actualizarMillas = async (id, valor) => {
    const num = parseInt(valor) || 0;
    await updateDoc(doc(db, "users", id), { puntosSalud: num });
  };

  const enviarRegaloCumple = (cliente) => {
    const msj = `¡Feliz Cumpleaños ${cliente.nombre || cliente.displayName}! 🎂 En 333K queremos festejar contigo. Te hemos acreditado 50 millas de regalo a tu cuenta. ¡Gracias por tu confianza!`;

    Alert.alert(
      "Regalo de Cumpleaños",
      `¿Enviar 50 millas de regalo a ${cliente.nombre}?`,
      [
        { text: "Cancelar" },
        {
          text: "Enviar",
          onPress: async () => {
            await updateDoc(doc(db, "users", cliente.id), {
              puntosSalud: increment(50),
            });
            abrirWhatsApp(cliente.telefono || "", msj);
          },
        },
      ],
    );
  };

  // 4. GRID DE AGENDA
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
      {/* HEADER DINÁMICO */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={ejecutarCerrarSesion}
            style={styles.powerBtn}
          >
            <MaterialCommunityIcons name="power" size={32} color="#FF5252" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>333K MASTER PANEL</Text>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              onPress={() =>
                setVistaActual(vistaActual === "agenda" ? "clientes" : "agenda")
              }
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons
                name={
                  vistaActual === "agenda" ? "account-heart" : "calendar-clock"
                }
                size={28}
                color="#fff"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalMedicos(true)}
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons
                name="cog-outline"
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
            style={styles.tabScroll}
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
                  info?.estado === "finalizado" && styles.bgVerde,
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
            placeholder="Buscar por nombre..."
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
                    {item.nombre || item.displayName}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#999" }}>
                    {item.telefono || "Sin cel"}
                  </Text>
                </View>

                <View style={styles.millasAcciones}>
                  <TouchableOpacity
                    onPress={() => enviarRegaloCumple(item)}
                    style={styles.giftBtn}
                  >
                    <MaterialCommunityIcons
                      name="cake-variant"
                      size={20}
                      color="#E91E63"
                    />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.millasInput}
                    keyboardType="numeric"
                    defaultValue={String(item.puntosSalud || 0)}
                    onEndEditing={(e) =>
                      actualizarMillas(item.id, e.nativeEvent.text)
                    }
                  />
                  <TouchableOpacity
                    onPress={() =>
                      abrirWhatsApp(
                        item.telefono || "",
                        "Hola, tenemos una promoción para ti.",
                      )
                    }
                  >
                    <MaterialCommunityIcons
                      name="whatsapp"
                      size={24}
                      color="#25D366"
                      style={{ marginLeft: 10 }}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* MODAL CONFIGURACIÓN MÉDICOS */}
      <Modal visible={modalMedicos} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Gestión de Doctores</Text>
            <View style={styles.formMedico}>
              <TextInput
                placeholder="Especialidad"
                style={styles.inputNew}
                value={nuevoDoctor.nombre}
                onChangeText={(t) =>
                  setNuevoDoctor({ ...nuevoDoctor, nombre: t })
                }
              />
              <TextInput
                placeholder="Nombre del Dr."
                style={styles.inputNew}
                value={nuevoDoctor.medico}
                onChangeText={(t) =>
                  setNuevoDoctor({ ...nuevoDoctor, medico: t })
                }
              />
              <TouchableOpacity
                onPress={async () => {
                  await addDoc(collection(db, "especialidades"), nuevoDoctor);
                  setNuevoDoctor({ nombre: "", medico: "" });
                }}
                style={styles.btnAdd}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  AGREGAR
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={listaMedicos}
              renderItem={({ item }) => (
                <View style={styles.medicoRow}>
                  <Text style={{ flex: 1 }}>
                    {item.medico} ({item.nombre})
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      deleteDoc(doc(db, "especialidades", item.id))
                    }
                  >
                    <MaterialCommunityIcons
                      name="trash-can"
                      size={20}
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
              <Text style={{ color: "#fff" }}>CERRAR</Text>
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
  container: { flex: 1, backgroundColor: "#F4F7F6" },
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
  headerTitle: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  powerBtn: { padding: 5 },
  iconBtn: { marginLeft: 15 },
  tabScroll: { marginTop: 15 },
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
    paddingBottom: 100,
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
  pacienteTag: { fontSize: 7, fontWeight: "bold", color: "#333", marginTop: 2 },
  bgRojo: { backgroundColor: "#FFEBEE", borderColor: "#FF5252" },
  bgVerde: { backgroundColor: "#E8F5E9", borderColor: "#4CAF50" },
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
    borderRadius: 20,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
  },
  millasAcciones: { flexDirection: "row", alignItems: "center" },
  giftBtn: { marginRight: 10, padding: 5 },
  millasInput: {
    backgroundColor: "#F0F2F5",
    width: 50,
    textAlign: "center",
    borderRadius: 10,
    padding: 5,
    fontWeight: "bold",
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
    maxHeight: "80%",
  },
  modalTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 15,
    textAlign: "center",
  },
  formMedico: {
    padding: 15,
    backgroundColor: "#F9F9F9",
    borderRadius: 20,
    marginBottom: 15,
  },
  inputNew: {
    borderBottomWidth: 1,
    borderColor: "#DDD",
    marginBottom: 10,
    padding: 5,
  },
  btnAdd: {
    backgroundColor: COLORS.primaryGreen,
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  medicoRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  btnClose: {
    backgroundColor: COLORS.darkGreen,
    padding: 15,
    borderRadius: 15,
    marginTop: 15,
    alignItems: "center",
  },
  loader: { position: "absolute", top: "50%", alignSelf: "center" },
});
