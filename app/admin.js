import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
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

  useEffect(() => {
    if (vistaActual !== "clientes") return;
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      setClientes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [vistaActual]);

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

  const HORARIOS = [];
  for (let h = 8; h < 18; h++) {
    for (let m = 0; m < 60; m += 15)
      HORARIOS.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
      );
  }

  const clientesFiltrados = useMemo(() => {
    const term = busqueda.toLowerCase().trim();
    return clientes.filter(
      (c) =>
        (c.displayName || "").toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term),
    );
  }, [clientes, busqueda]);

  const esCumpleHoy = (fechaStr) => {
    if (!fechaStr || typeof fechaStr !== "string") return false;
    const hoy = new Date();
    const mmdd = `${(hoy.getMonth() + 1).toString().padStart(2, "0")}-${hoy.getDate().toString().padStart(2, "0")}`;
    return fechaStr.endsWith(mmdd);
  };

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
    if (!citaBase) return;
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
      Alert.alert("Error", "No se pudo actualizar.");
    } finally {
      setLoading(false);
    }
  };

  const finalizarCitaManual = async () => {
    if (!citaBase?.userId) return Alert.alert("Error", "Sin usuario vinculado");
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", citaBase.userId), {
        totalCitas: increment(1),
        puntosSalud: increment(1),
        ultimaAtencion: serverTimestamp(),
      });
      await updateDoc(doc(db, "citas", citaBase.id), { estado: "finalizada" });
      Alert.alert("Éxito", "Atención registrada.");
      cancelarSeleccion();
    } catch (e) {
      Alert.alert("Error", "Fallo al finalizar.");
    } finally {
      setLoading(false);
    }
  };

  const ajustarMillas = async (userId, cantidad) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        puntosSalud: increment(cantidad),
      });
    } catch (e) {
      Alert.alert("Error", "No se pudieron actualizar las millas.");
    }
  };

  const actualizarMillasManual = async (userId, valor) => {
    const num = parseInt(valor) || 0;
    try {
      await updateDoc(doc(db, "users", userId), {
        puntosSalud: num,
      });
    } catch (e) {
      console.error("Error al guardar millas manual");
    }
  };

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>333K Master</Text>
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
                  info?.esContinuacion && { borderTopWidth: 0, marginTop: -2 },
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
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChangeText={setBusqueda}
          />
          <FlatList
            data={clientesFiltrados}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.clienteCard}>
                <TouchableOpacity
                  onPress={() => setClienteEdicion(item)}
                  style={styles.cardHeader}
                >
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
                        : "⚠️ Falta Fecha Nac."}
                    </Text>
                  </View>
                  {esCumpleHoy(item.fechaNacimiento) && (
                    <MaterialCommunityIcons
                      name="cake-variant"
                      size={24}
                      color="#E91E63"
                      style={{ marginRight: 10 }}
                    />
                  )}
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
                </TouchableOpacity>

                {/* SECCIÓN MILLAS CORREGIDA */}
                <View style={styles.millasContainer}>
                  <Text style={styles.millasLabel}>Puntos de Salud:</Text>
                  <View style={styles.millasActions}>
                    <TouchableOpacity
                      style={styles.millasBtnMinus}
                      onPress={() => ajustarMillas(item.id, -1)}
                    >
                      <MaterialCommunityIcons
                        name="minus"
                        size={18}
                        color="#FFF"
                      />
                    </TouchableOpacity>

                    <View style={styles.millasDisplay}>
                      <Text style={styles.millasText}>
                        {item.puntosSalud || 0}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.millasBtnPlus}
                      onPress={() => ajustarMillas(item.id, 1)}
                    >
                      <MaterialCommunityIcons
                        name="plus"
                        size={18}
                        color="#FFF"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.nivelesRow}>
                  {["PRI", "PRO", "PREMIUM"].map((n) => (
                    <TouchableOpacity
                      key={n}
                      onPress={() =>
                        updateDoc(doc(db, "users", item.id), { tipoCliente: n })
                      }
                      style={[
                        styles.nivelBtn,
                        item.tipoCliente === n && styles.nivelBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.nivelBtnText,
                          item.tipoCliente === n && { color: "#FFF" },
                        ]}
                      >
                        {n}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          />
        </View>
      ) : (
        <View style={styles.clientesContainer}>
          <View style={styles.addArea}>
            <TextInput
              placeholder="Médico o Especialidad..."
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
                <TouchableOpacity
                  onPress={() => setClienteEdicion(item)}
                  style={styles.cardHeader}
                >
                  <View style={{ flex: 1 }}>
                    {/* Corrección de nombre: Prioriza displayName, luego email, luego nombre de cita */}
                    <Text style={styles.clienteName}>
                      {item.displayName ||
                        item.nombre ||
                        item.email ||
                        "Usuario sin nombre"}
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
                        : "⚠️ Falta Fecha Nac."}
                    </Text>
                  </View>
                  {esCumpleHoy(item.fechaNacimiento) && (
                    <MaterialCommunityIcons
                      name="cake-variant"
                      size={24}
                      color="#E91E63"
                      style={{ marginRight: 10 }}
                    />
                  )}
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
                </TouchableOpacity>

                {/* SECCIÓN MILLAS CON INPUT MANUAL E INCREMENTO DE 10 */}
                <View style={styles.millasContainer}>
                  <Text style={styles.millasLabel}>Puntos de Salud:</Text>
                  <View style={styles.millasActions}>
                    <TouchableOpacity
                      style={styles.millasBtnMinus}
                      onPress={() => ajustarMillas(item.id, -10)} // Incremento de 10 en 10
                    >
                      <MaterialCommunityIcons
                        name="minus"
                        size={18}
                        color="#FFF"
                      />
                    </TouchableOpacity>

                    <View style={styles.millasDisplay}>
                      <TextInput
                        style={styles.millasInput}
                        keyboardType="numeric"
                        defaultValue={(item.puntosSalud || 0).toString()}
                        onEndEditing={(e) =>
                          actualizarMillasManual(item.id, e.nativeEvent.text)
                        }
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.millasBtnPlus}
                      onPress={() => ajustarMillas(item.id, 10)} // Incremento de 10 en 10
                    >
                      <MaterialCommunityIcons
                        name="plus"
                        size={18}
                        color="#FFF"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {citaBase && vistaActual === "agenda" && (
        <View style={styles.footerAccion}>
          <Text style={styles.footerText}>
            Paciente: {citaBase.nombrePaciente}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginVertical: 8 }}
          >
            {especialidades.map((esp) => (
              <TouchableOpacity
                key={esp.id}
                onPress={() => setNuevoMedico(esp.nombre)}
                style={[
                  styles.miniTab,
                  (nuevoMedico === esp.nombre ||
                    (!nuevoMedico && citaBase.medico === esp.nombre)) &&
                    styles.miniTabActive,
                ]}
              >
                <Text style={styles.miniTabText}>{esp.nombre}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.footerButtons}>
            <TouchableOpacity style={styles.btnCan} onPress={cancelarSeleccion}>
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            {citaBase.estado === "aprobado" && (
              <TouchableOpacity
                style={styles.btnFinalizar}
                onPress={finalizarCitaManual}
              >
                <Text style={styles.btnText}>FINALIZAR</Text>
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

      {/* MODAL FICHA PACIENTE */}
      <Modal visible={!!clienteEdicion} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Ficha de: {clienteEdicion?.displayName}
            </Text>
            <Text style={styles.label}>Nombre Completo:</Text>
            <TextInput
              style={styles.modalInput}
              value={clienteEdicion?.displayName}
              onChangeText={(t) =>
                setClienteEdicion({ ...clienteEdicion, displayName: t })
              }
            />
            <Text style={styles.label}>Fecha Nacimiento (AAAA-MM-DD):</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="1990-05-25"
              value={clienteEdicion?.fechaNacimiento}
              onChangeText={(t) => {
                let val = t.replace(/\D/g, "");
                if (val.length > 4 && val.length <= 6)
                  val = `${val.slice(0, 4)}-${val.slice(4)}`;
                else if (val.length > 6)
                  val = `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
                setClienteEdicion({ ...clienteEdicion, fechaNacimiento: val });
              }}
              maxLength={10}
            />
            <TouchableOpacity
              style={styles.btnSendAll}
              onPress={async () => {
                await updateDoc(doc(db, "users", clienteEdicion.id), {
                  displayName: clienteEdicion.displayName,
                  fechaNacimiento: clienteEdicion.fechaNacimiento || "",
                });
                setClienteEdicion(null);
              }}
            >
              <Text style={styles.btnText}>ACTUALIZAR FICHA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setClienteEdicion(null)}
              style={{ marginTop: 15 }}
            >
              <Text style={{ textAlign: "center", color: "#999" }}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  iconBtn: { marginRight: 15 },
  medicoScroll: { marginTop: 15 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginRight: 10,
  },
  tabActive: { backgroundColor: COLORS.primaryGreen },
  tabText: { color: "#fff", fontSize: 11, fontWeight: "600" },
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
    paddingBottom: 170,
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
    borderColor: "#EDEFF2",
  },
  slotText: { fontSize: 10, color: "#B0B5C1" },
  pacienteTag: {
    fontSize: 7,
    color: "#333",
    fontWeight: "bold",
    marginTop: 2,
    textAlign: "center",
  },
  bgAmarillo: { backgroundColor: "#FFD700" },
  bgRojo: { backgroundColor: "#FF5252" },
  bgGris: { backgroundColor: "#DDD", opacity: 0.5 },
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
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardSubText: { fontSize: 11, marginTop: 2 },
  clienteName: { fontWeight: "bold", fontSize: 15 },
  nivelesRow: {
    flexDirection: "row",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 10,
  },
  nivelBtn: {
    flex: 1,
    padding: 6,
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    marginHorizontal: 2,
  },
  nivelBtnActive: { backgroundColor: COLORS.darkGreen },
  nivelBtnText: { fontSize: 8, color: "#999", fontWeight: "bold" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  millasContainer: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 10,
  },
  millasLabel: { fontSize: 12, fontWeight: "bold", color: "#666" },
  millasActions: { flexDirection: "row", alignItems: "center" },
  millasBtnMinus: { backgroundColor: "#FF5252", padding: 5, borderRadius: 5 },
  millasBtnPlus: {
    backgroundColor: COLORS.primaryGreen,
    padding: 5,
    borderRadius: 5,
  },
  millasInput: {
    fontWeight: "bold",
    fontSize: 16,
    color: COLORS.darkGreen,
    textAlign: "center",
    minWidth: 40,
    padding: 0, // Importante para que no se desfase en Android
  },
  millasDisplay: {
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginHorizontal: 5,
  },
  millasText: { fontWeight: "bold", fontSize: 16, color: COLORS.darkGreen },
  footerAccion: {
    position: "absolute",
    bottom: 15,
    left: 10,
    right: 10,
    backgroundColor: COLORS.darkGreen,
    borderRadius: 25,
    padding: 15,
    elevation: 12,
  },
  footerText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  btnOk: {
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginLeft: 8,
  },
  btnFinalizar: {
    backgroundColor: "#2196F3",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginLeft: 8,
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 10 },
  btnCan: {
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 10,
    borderRadius: 15,
  },
  miniTab: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginRight: 5,
    borderRadius: 8,
  },
  miniTabActive: { backgroundColor: COLORS.primaryGreen },
  miniTabText: { color: "#fff", fontSize: 8, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  bulkActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
  },
  actionLink: { color: COLORS.primaryGreen, fontWeight: "bold" },
  waItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  waName: { fontWeight: "bold" },
  waSub: { fontSize: 12, color: "#666" },
  modalFooter: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "space-between",
  },
  btnCancel: { padding: 15, flex: 1, alignItems: "center" },
  btnSendAll: {
    backgroundColor: "#25D366",
    padding: 15,
    borderRadius: 15,
    flex: 2,
    alignItems: "center",
  },
  btnTextBlack: { color: "#333" },
  addArea: { flexDirection: "row", marginBottom: 20, gap: 10 },
  btnAdd: {
    backgroundColor: COLORS.primaryGreen,
    width: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  label: { fontSize: 11, color: "#999", marginBottom: 5 },
  modalInput: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
});
