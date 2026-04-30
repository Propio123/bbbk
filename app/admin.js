import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  updateDoc
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Modal,
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
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [clienteEdicion, setClienteEdicion] = useState(null); // Para el modal de edición

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubUsers();
  }, []);

  const enviarWhatsApp = (telefono, mensaje) => {
    if (!telefono) return Alert.alert("Error", "Sin número registrado");
    let num = telefono.replace(/\D/g, "");
    if (num.startsWith("0")) num = "593" + num.substring(1);
    const url = `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(mensaje)}`;
    Linking.openURL(url);
  };

  const guardarCambiosCliente = async () => {
    if (!clienteEdicion) return;
    try {
      await updateDoc(doc(db, "users", clienteEdicion.id), {
        nombre: clienteEdicion.nombre,
        telefono: clienteEdicion.telefono,
        fechaNacimiento: clienteEdicion.fechaNacimiento, // Formato YYYY-MM-DD
      });
      setClienteEdicion(null);
      Alert.alert("Éxito", "Datos actualizados");
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar");
    }
  };

  const esHoyCumple = (fecha) => {
    if (!fecha) return false;
    const hoy = new Date();
    const d = hoy.getDate().toString().padStart(2, "0");
    const m = (hoy.getMonth() + 1).toString().padStart(2, "0");
    return fecha.endsWith(`${m}-${d}`); // Compara MM-DD
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => signOut(auth).then(() => router.replace("/login"))}
          >
            <MaterialCommunityIcons name="power" size={32} color="#FF5252" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>333K GESTIÓN</Text>
          <TouchableOpacity
            onPress={() =>
              setVistaActual(vistaActual === "agenda" ? "clientes" : "agenda")
            }
          >
            <MaterialCommunityIcons
              name={vistaActual === "agenda" ? "account-edit" : "calendar"}
              size={28}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </View>

      {vistaActual === "clientes" && (
        <View style={{ flex: 1, padding: 15 }}>
          <TextInput
            placeholder="Buscar paciente..."
            style={styles.searchBar}
            onChangeText={setBusqueda}
          />
          <FlatList
            data={clientes.filter((c) =>
              (c.nombre || "").toLowerCase().includes(busqueda.toLowerCase()),
            )}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.clienteCard}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => setClienteEdicion(item)}
                >
                  <Text style={{ fontWeight: "bold" }}>
                    {item.nombre || "Sin Nombre"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: item.fechaNacimiento ? "#4CAF50" : "#FF9800",
                    }}
                  >
                    {item.fechaNacimiento
                      ? `Cumple: ${item.fechaNacimiento}`
                      : "⚠️ Falta Fecha"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.acciones}>
                  <TouchableOpacity
                    onPress={() => {
                      if (!item.fechaNacimiento)
                        return Alert.alert(
                          "Aviso",
                          "Edita al cliente para poner su fecha primero",
                        );
                      updateDoc(doc(db, "users", item.id), {
                        puntosSalud: increment(50),
                      });
                      enviarWhatsApp(
                        item.telefono,
                        "¡Feliz Cumpleaños! Te regalamos 50 millas.",
                      );
                    }}
                  >
                    <MaterialCommunityIcons
                      name="cake-variant"
                      size={24}
                      color={
                        esHoyCumple(item.fechaNacimiento) ? "#E91E63" : "#EEE"
                      }
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
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* MODAL EDITOR DE CLIENTE */}
      <Modal visible={!!clienteEdicion} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Datos de Cliente</Text>
            <Text style={styles.label}>Nombre Completo:</Text>
            <TextInput
              style={styles.input}
              value={clienteEdicion?.nombre}
              onChangeText={(t) =>
                setClienteEdicion({ ...clienteEdicion, nombre: t })
              }
            />
            <Text style={styles.label}>Teléfono (con código):</Text>
            <TextInput
              style={styles.input}
              value={clienteEdicion?.telefono}
              placeholder="Ej: 593987654321"
              onChangeText={(t) =>
                setClienteEdicion({ ...clienteEdicion, telefono: t })
              }
            />
            <Text style={styles.label}>Fecha Nacimiento (YYYY-MM-DD):</Text>
            <TextInput
              style={styles.input}
              value={clienteEdicion?.fechaNacimiento}
              placeholder="1990-05-24"
              onChangeText={(t) =>
                setClienteEdicion({ ...clienteEdicion, fechaNacimiento: t })
              }
            />
            <TouchableOpacity
              onPress={guardarCambiosCliente}
              style={styles.btnGuardar}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                GUARDAR CAMBIOS
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setClienteEdicion(null)}
              style={{ marginTop: 15, alignItems: "center" }}
            >
              <Text style={{ color: "#999" }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  acciones: { flexDirection: "row", alignItems: "center" },
  millasInput: {
    backgroundColor: "#F0F2F5",
    width: 45,
    textAlign: "center",
    borderRadius: 8,
    padding: 5,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", padding: 25, borderRadius: 30 },
  modalTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  label: { fontSize: 12, color: "#666", marginTop: 10 },
  input: {
    borderBottomWidth: 1,
    borderColor: "#DDD",
    paddingVertical: 5,
    marginBottom: 10,
    fontWeight: "bold",
  },
  btnGuardar: {
    backgroundColor: COLORS.primaryGreen,
    padding: 15,
    borderRadius: 15,
    marginTop: 20,
    alignItems: "center",
  },
});
