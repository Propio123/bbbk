import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  updateDoc,
  where,
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
  View,
} from "react-native";
import { auth, db } from "../src/api/firebase.config";
import { COLORS } from "../src/constants/theme";

export default function AdminMasterPanel() {
  const router = useRouter();
  const [vistaActual, setVistaActual] = useState("agenda");
  const [clientes, setClientes] = useState([]);
  const [citas, setCitas] = useState([]);
  const [medicoSel, setMedicoSel] = useState("");
  const [listaMedicos, setListaMedicos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [fechaSel] = useState(new Date().toISOString().split("T")[0]);

  // 1. CARGA DE DATOS
  useEffect(() => {
    const unsubMedicos = onSnapshot(
      collection(db, "especialidades"),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setListaMedicos(docs);
        if (docs.length > 0 && !medicoSel) setMedicoSel(docs[0].medico);
      },
    );

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubMedicos();
      unsubUsers();
    };
  }, []);

  useEffect(() => {
    const q = query(collection(db, "citas"), where("fecha", "==", fechaSel));
    return onSnapshot(q, (snap) => {
      setCitas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [fechaSel]);

  // 2. FUNCIONES DE COMUNICACIÓN Y SESIÓN
  const cerrarSesion = async () => {
    Alert.alert("Salir", "¿Cerrar sesión administrativa?", [
      { text: "No" },
      {
        text: "Sí",
        onPress: () => signOut(auth).then(() => router.replace("/login")),
      },
    ]);
  };

  const enviarWhatsApp = (telefono, mensaje) => {
    if (!telefono)
      return Alert.alert("Error", "El cliente no tiene teléfono registrado");
    let num = telefono.replace(/\D/g, "");
    if (num.startsWith("0")) num = "593" + num.substring(1);
    const url = `whatsapp://send?phone=${num}&text=${encodeURIComponent(mensaje)}`;

    Linking.openURL(url).catch(() => {
      // Si falla el protocolo directo, usar web api
      Linking.openURL(
        `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(mensaje)}`,
      );
    });
  };

  // 3. LÓGICA DE CUMPLEAÑOS
  const esHoyCumple = (fechaNacimiento) => {
    if (!fechaNacimiento) return false;
    const hoy = new Date();
    const cumple = new Date(fechaNacimiento);
    return (
      hoy.getDate() === cumple.getDate() && hoy.getMonth() === cumple.getMonth()
    );
  };

  const procesarRegalo = async (cliente) => {
    const mensaje = `¡Feliz Cumpleaños ${cliente.nombre}! 🎂 En 333K te regalamos 50 millas para tu próxima atención. ¡Disfrútalas!`;

    Alert.alert(
      "Regalo de Cumpleaños",
      `¿Acreditar 50 millas a ${cliente.nombre}?`,
      [
        { text: "Cancelar" },
        {
          text: "¡Dar Regalo!",
          onPress: async () => {
            await updateDoc(doc(db, "users", cliente.id), {
              puntosSalud: increment(50),
              regaloEntregado: new Date().getFullYear(), // Evita doble regalo el mismo año
            });
            enviarWhatsApp(cliente.telefono, mensaje);
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
      {/* HEADER CON BOTONES RECUPERADOS */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={cerrarSesion}>
            <MaterialCommunityIcons name="power" size={32} color="#FF5252" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>333K ADMIN</Text>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              onPress={() =>
                enviarWhatsApp("0987654321", "Consulta administrativa 333K")
              }
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons
                name="whatsapp"
                size={28}
                color="#25D366"
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
                  vistaActual === "agenda" ? "account-heart" : "calendar-month"
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

      {/* CONTENIDO */}
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
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding: 15 }}>
          <TextInput
            placeholder="Buscar paciente..."
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
            renderItem={({ item }) => {
              const cumpleHoy = esHoyCumple(item.fechaNacimiento);
              return (
                <View style={styles.clienteCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "bold" }}>
                      {item.nombre || item.displayName}
                    </Text>
                    <Text style={{ fontSize: 10, color: "#999" }}>
                      {item.telefono || "Sin número"}
                    </Text>
                  </View>

                  <View style={styles.acciones}>
                    {/* Icono de pastel que cambia de color si es el cumple */}
                    <TouchableOpacity
                      onPress={() => procesarRegalo(item)}
                      style={styles.btnAccion}
                    >
                      <MaterialCommunityIcons
                        name="cake-variant"
                        size={24}
                        color={cumpleHoy ? "#E91E63" : "#CCC"}
                      />
                    </TouchableOpacity>

                    <TextInput
                      style={styles.millasInput}
                      keyboardType="numeric"
                      defaultValue={String(item.puntosSalud || 0)}
                      onEndEditing={(e) =>
                        updateDoc(doc(db, "users", item.id), {
                          puntosSalud: parseInt(e.nativeEvent.text) || 0,
                        })
                      }
                    />

                    <TouchableOpacity
                      onPress={() =>
                        enviarWhatsApp(
                          item.telefono,
                          "Hola, te escribimos de 333K...",
                        )
                      }
                      style={styles.btnAccion}
                    >
                      <MaterialCommunityIcons
                        name="whatsapp"
                        size={24}
                        color="#25D366"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
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
  pacienteTag: { fontSize: 7, fontWeight: "bold", color: "#333" },
  bgRojo: { backgroundColor: "#FFEBEE", borderColor: "#FF5252" },
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
  acciones: { flexDirection: "row", alignItems: "center" },
  btnAccion: { padding: 5, marginLeft: 5 },
  millasInput: {
    backgroundColor: "#F0F2F5",
    width: 45,
    textAlign: "center",
    borderRadius: 8,
    padding: 5,
    fontWeight: "bold",
    fontSize: 12,
  },
});
