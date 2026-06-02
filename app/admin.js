import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
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

// Sub-componente interno optimizado para evitar re-renders masivos al escribir
const ClienteItem = ({ item, onUpdateMillas, onIncrement, onUpdateHC }) => {
  const [localMillas, setLocalMillas] = useState(String(item.puntosSalud || 0));
  const [localHC, setLocalHC] = useState(String(item.numHistoriaClinica || ""));

  useEffect(() => {
    setLocalMillas(String(item.puntosSalud || 0));
  }, [item.puntosSalud]);

  useEffect(() => {
    setLocalHC(String(item.numHistoriaClinica || ""));
  }, [item.numHistoriaClinica]);

  return (
    <View style={styles.clienteCard}>
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={{ fontWeight: "bold", fontSize: 14 }}>
          {item.nombre || item.displayName || "Paciente"}
        </Text>

        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}
        >
          <Text style={{ fontSize: 11, color: "#555", fontWeight: "600" }}>
            H.C:{" "}
          </Text>
          <TextInput
            style={styles.hcInput}
            placeholder="N° Historia"
            placeholderTextColor="#999"
            value={localHC}
            onChangeText={setLocalHC}
            onEndEditing={() => onUpdateHC(item.id, localHC)}
          />
        </View>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontSize: 10, color: "#666", marginRight: 5 }}>
            Millas:
          </Text>
          <TextInput
            style={styles.millasInput}
            keyboardType="numeric"
            value={localMillas}
            onChangeText={setLocalMillas}
            onEndEditing={() => {
              const val = Number(localMillas.replace(/[^0-9]/g, ""));
              onUpdateMillas(item.id, val);
            }}
          />
          <TouchableOpacity
            onPress={() => onIncrement(item.id, item.puntosSalud, -10)}
            style={[styles.btnSmall, { backgroundColor: "#FF5252" }]}
          >
            <Text style={styles.btnText}>-10</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onIncrement(item.id, item.puntosSalud, 10)}
            style={styles.btnSmall}
          >
            <Text style={styles.btnText}>+10</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function AdminMasterPanel() {
  const router = useRouter();
  const [vistaActual, setVistaActual] = useState("agenda");
  const [loading, setLoading] = useState(false);

  // --- ESTADOS MÉDICOS ---
  const [listaMedicos, setListaMedicos] = useState([]);
  const [medicoSel, setMedicoSel] = useState("");

  // Formulario para nuevo médico
  const [nuevoNombreMed, setNuevoNombreMed] = useState("");
  const [nuevaEspecialidadMed, setNuevaEspecialidadMed] = useState("");

  // --- ESTADOS AGENDA ---
  const [fechaSel, setFechaSel] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

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

  // 1. Listener de Especialidades / Médicos
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "especialidades"), (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setListaMedicos(docs);
      if (docs.length > 0 && !medicoSel) setMedicoSel(docs[0].medico);
    });
    return () => unsub();
  }, []);

  // 2. Listener de Citas o Clientes
  useEffect(() => {
    const q =
      vistaActual === "agenda"
        ? query(collection(db, "citas"), where("fecha", "==", fechaSel))
        : query(collection(db, "users"));

    const unsubData = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (vistaActual === "agenda") {
        setCitas(data);
      } else {
        setClientes(data);
      }
    });

    return () => unsubData();
  }, [fechaSel, vistaActual]);

  // --- ACCIONES CRUD MÉDICOS ---
  const handleAgregarMedico = async () => {
    if (!nuevoNombreMed.trim() || !nuevaEspecialidadMed.trim()) {
      return Alert.alert(
        "Campos vacíos",
        "Por favor ingresa tanto el servicio/especialidad como el nombre del médico.",
      );
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "especialidades"), {
        nombre: nuevaEspecialidadMed.trim(),
        medico: nuevoNombreMed.trim(),
      });
      setNuevoNombreMed("");
      setNuevaEspecialidadMed("");
      Alert.alert("Éxito", "Especialista añadido correctamente.");
    } catch (e) {
      Alert.alert("Error", "No se pudo agregar al especialista.");
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarMedico = (id, nombreDoc) => {
    Alert.alert(
      "Confirmar Eliminación",
      `¿Estás seguro de que deseas eliminar al especialista ${nombreDoc}? Esto removerá su pestaña del panel.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await deleteDoc(doc(db, "especialidades", id));
              // Si eliminamos el médico que estaba seleccionado, reseteamos la pestaña activa
              if (medicoSel === nombreDoc) setMedicoSel("");
            } catch (e) {
              Alert.alert("Error", "No se pudo eliminar el registro médico.");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleUpdateMillas = async (userId, value) => {
    try {
      await updateDoc(doc(db, "users", userId), { puntosSalud: value });
    } catch (e) {
      Alert.alert("Error", "No se pudieron actualizar los puntos.");
    }
  };

  const handleUpdateHC = async (userId, value) => {
    try {
      await updateDoc(doc(db, "users", userId), { numHistoriaClinica: value });
    } catch (e) {
      Alert.alert(
        "Error",
        "No se pudo actualizar el número de historia clínica.",
      );
    }
  };

  const handleIncrementMillas = async (userId, puntosActuales, cantidad) => {
    const actual = puntosActuales || 0;
    const nuevoValor =
      cantidad < 0 && actual < Math.abs(cantidad) ? 0 : actual + cantidad;

    try {
      await updateDoc(doc(db, "users", userId), { puntosSalud: nuevoValor });
    } catch (e) {
      Alert.alert("Error", "No se pudo modificar el puntaje.");
    }
  };

  const prepararConfirmaciones = async () => {
    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);

    const yyyy = manana.getFullYear();
    const mm = String(manana.getMonth() + 1).padStart(2, "0");
    const dd = String(manana.getDate()).padStart(2, "0");
    const fechaBusqueda = `${yyyy}-${mm}-${dd}`;

    setLoading(true);
    try {
      const q = query(
        collection(db, "citas"),
        where("fecha", "==", fechaBusqueda),
        where("estado", "==", "aprobado"),
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        Alert.alert("Aviso", `No hay citas aprobadas para: ${fechaBusqueda}`);
        setCitasManana([]);
      } else {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          seleccionado: true,
        }));
        setCitasManana(data);
        setModalVisible(true);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Error al conectar con Firestore.");
    } finally {
      setLoading(false);
    }
  };

  const enviarSeleccionados = async () => {
    const seleccionados = citasManana.filter((c) => c.seleccionado);
    if (seleccionados.length === 0) return;

    setModalVisible(false);

    for (const cita of seleccionados) {
      let tel = (cita.telefonoPaciente || cita.pacienteTelefono || "").replace(
        /\D/g,
        "",
      );

      if (tel.startsWith("0")) {
        tel = "593" + tel.substring(1);
      } else if (!tel.startsWith("593")) {
        tel = "593" + tel;
      }

      const msg = `Hola ${cita.NombrePaciente}, le saluda bbbkodontologia. Confirmamos su cita para mañana a las ${cita.hora}. ¿Nos confirma su asistencia?`;
      const url = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;

      try {
        await Linking.openURL(url);
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        console.log("Error al abrir WhatsApp para:", tel);
      }
    }
    Alert.alert(
      "Proceso completado",
      "Se abrieron las ventanas de WhatsApp de manera secuencial.",
    );
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
    if (ocupado) {
      return Alert.alert(
        "Error",
        `El Dr. ${nuevoMedicoParaCita} ya está ocupado a las ${citaEnEdicion.hora}`,
      );
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, "citas", citaEnEdicion.id), {
        medico: nuevoMedicoParaCita,
      });
      setCitaEnEdicion(null);
    } catch (e) {
      Alert.alert("Error", "No se pudo reassignar el médico.");
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setMostrarCalendario(Platform.OS === "ios");
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const dd = String(selectedDate.getDate()).padStart(2, "0");
      setFechaSel(`${yyyy}-${mm}-${dd}`);
    }
  };

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

  const HORARIOS = useMemo(() => {
    const list = [];
    for (let h = 8; h < 18; h++) {
      for (let m = 0; m < 60; m += 15) {
        list.push(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
        );
      }
    }
    return list;
  }, []);

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) =>
      (c.nombre || c.displayName || "")
        .toLowerCase()
        .includes(busqueda.toLowerCase()),
    );
  }, [clientes, busqueda]);

  const reporteCitasCerradas = useMemo(() => {
    const conteo = {};
    listaMedicos.forEach((m) => {
      conteo[m.medico] = 0;
    });

    citas.forEach((cita) => {
      if (cita.estado === "finalizado" && conteo[cita.medico] !== undefined) {
        conteo[cita.medico] += 1;
      }
    });

    return conteo;
  }, [citas, listaMedicos]);

  useEffect(() => {
    if (citaEnEdicion) {
      setNuevoMedicoParaCita(citaEnEdicion.medico || "");
    }
  }, [citaEnEdicion]);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => signOut(auth).then(() => router.replace("/login"))}
          >
            <MaterialCommunityIcons name="power" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>BBBK Master Panel</Text>
          <View style={{ flexDirection: "row" }}>
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

      {/* SECTOR DE CALENDARIO */}
      {vistaActual === "agenda" && (
        <View style={styles.calendarNavContainer}>
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => setMostrarCalendario(true)}
          >
            <MaterialCommunityIcons
              name="calendar-search"
              size={22}
              color="#fff"
            />
            <Text style={styles.calendarButtonText}>
              Buscar Fecha: {fechaSel}
            </Text>
          </TouchableOpacity>

          {mostrarCalendario && (
            <DateTimePicker
              value={new Date(fechaSel + "T12:00:00")}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              onChange={onDateChange}
            />
          )}
        </View>
      )}

      {/* CONTENIDO PRINCIPAL */}
      {vistaActual === "agenda" ? (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.grid}>
            {HORARIOS.map((h) => {
              const info = agendaMap[h];
              return (
                <TouchableOpacity
                  key={h}
                  onPress={() => info && setCitaEnEdicion(info)}
                  style={[
                    styles.slot,
                    info?.estado === "pendiente" && {
                      backgroundColor: "#FFF3E0",
                      borderColor: "#FFE0B2",
                    },
                    info?.estado === "aprobado" && {
                      backgroundColor: "#E3F2FD",
                      borderColor: "#BBDEFB",
                    },
                    info?.estado === "confirmado" && styles.bgRojo,
                    info?.estado === "finalizado" && {
                      backgroundColor: "#A5D6A7",
                      borderColor: "#81C784",
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
                      {info.NombrePaciente || info.pacienteNombre}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Panel inferior de Citas Atendidas */}
          <View style={styles.reportFooter}>
            <View style={styles.reportHeaderRow}>
              <MaterialCommunityIcons
                name="chart-box"
                size={18}
                color={COLORS.darkGreen}
              />
              <Text style={styles.reportTitle}>
                Citas Atendidas Hoy ({fechaSel})
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reportScroll}
            >
              {listaMedicos.map((m) => (
                <View key={m.id} style={styles.reportBadge}>
                  <Text style={styles.reportDoctorName}>{m.medico}: </Text>
                  <Text style={styles.reportDoctorCount}>
                    {reporteCitasCerradas[m.medico] || 0} atendidas
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 15 }}>
          <TextInput
            placeholder="Buscar cliente..."
            style={styles.searchBar}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          <FlatList
            data={clientesFiltrados}
            keyExtractor={(item) => item.id}
            initialNumToRender={15}
            maxToRenderPerBatch={20}
            renderItem={({ item }) => (
              <ClienteItem
                item={item}
                onUpdateMillas={handleUpdateMillas}
                onIncrement={handleIncrementMillas}
                onUpdateHC={handleUpdateHC}
              />
            )}
          />
        </View>
      )}

      {/* PANEL EDICIÓN DE CITA */}
      {citaEnEdicion && (
        <View style={styles.editPanel}>
          <Text style={styles.editPanelTitle}>
            Paciente:{" "}
            {citaEnEdicion.NombrePaciente || citaEnEdicion.pacienteNombre}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={styles.label}>Estado actual: </Text>
            <View
              style={[
                styles.statusTag,
                citaEnEdicion.estado === "pendiente" && {
                  backgroundColor: "#FFF3E0",
                },
                citaEnEdicion.estado === "aprobado" && {
                  backgroundColor: "#E3F2FD",
                },
                citaEnEdicion.estado === "confirmado" && {
                  backgroundColor: "#FFEBEE",
                },
                citaEnEdicion.estado === "finalizado" && {
                  backgroundColor: "#E8F5E9",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusTagText,
                  citaEnEdicion.estado === "pendiente" && { color: "#E65100" },
                  citaEnEdicion.estado === "aprobado" && { color: "#0D47A1" },
                  citaEnEdicion.estado === "confirmado" && { color: "#C62828" },
                  citaEnEdicion.estado === "finalizado" && { color: "#2E7D32" },
                ]}
              >
                {(citaEnEdicion.estado || "pendiente").toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.label}>
            Reasignar médico para las {citaEnEdicion.hora}:
          </Text>
          <ScrollView
            horizontal
            style={{ marginBottom: 15, maxHeight: 40 }}
            showsHorizontalScrollIndicator={false}
          >
            {listaMedicos.map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setNuevoMedicoParaCita(m.medico)}
                style={[
                  styles.miniTab,
                  nuevoMedicoParaCita === m.medico && styles.tabActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    nuevoMedicoParaCita !== m.medico && { color: "#333" },
                  ]}
                >
                  {m.medico}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {citaEnEdicion.estado === "pendiente" && (
              <TouchableOpacity
                onPress={async () => {
                  setLoading(true);
                  await updateDoc(doc(db, "citas", citaEnEdicion.id), {
                    estado: "aprobado",
                  });
                  setCitaEnEdicion(null);
                  setLoading(false);
                }}
                style={[styles.btnAction, { backgroundColor: "#2196F3" }]}
              >
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={16}
                  color="#fff"
                />
                <Text style={styles.btnActionText}> APROBAR CITA</Text>
              </TouchableOpacity>
            )}

            {citaEnEdicion.estado === "aprobado" && (
              <TouchableOpacity
                onPress={async () => {
                  setLoading(true);
                  await updateDoc(doc(db, "citas", citaEnEdicion.id), {
                    estado: "confirmado",
                  });
                  setCitaEnEdicion(null);
                  setLoading(false);
                }}
                style={[styles.btnAction, { backgroundColor: "#4CAF50" }]}
              >
                <MaterialCommunityIcons
                  name="whatsapp"
                  size={16}
                  color="#fff"
                />
                <Text style={styles.btnActionText}> CLIENTE CONFIRMÓ</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => guardarCambioMedico()}
              style={[
                styles.btnAction,
                { backgroundColor: COLORS.primaryGreen },
              ]}
            >
              <MaterialCommunityIcons
                name="content-save"
                size={16}
                color="#fff"
              />
              <Text style={styles.btnActionText}> GUARDAR CAMBIOS</Text>
            </TouchableOpacity>

            {citaEnEdicion.estado !== "pendiente" && (
              <TouchableOpacity
                onPress={async () => {
                  setLoading(true);
                  await updateDoc(doc(db, "citas", citaEnEdicion.id), {
                    estado: "finalizado",
                  });
                  setCitaEnEdicion(null);
                  setLoading(false);
                }}
                style={[styles.btnAction, { backgroundColor: "#9C27B0" }]}
              >
                <MaterialCommunityIcons
                  name="account-check"
                  size={16}
                  color="#fff"
                />
                <Text style={styles.btnActionText}> FINALIZAR</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setCitaEnEdicion(null)}
              style={styles.btnCancelText}
            >
              <Text style={{ color: "#666", fontWeight: "bold" }}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* MODAL WHATSAPP */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmaciones de Mañana</Text>
            <View style={styles.bulkActions}>
              <TouchableOpacity
                onPress={() =>
                  setCitasManana((prev) =>
                    prev.map((c) => ({ ...c, seleccionado: true })),
                  )
                }
              >
                <Text style={styles.actionLink}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setCitasManana((prev) =>
                    prev.map((c) => ({ ...c, seleccionado: false })),
                  )
                }
              >
                <Text style={styles.actionLink}>Ninguno</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={citasManana}
              keyExtractor={(item) => item.id.toString()}
              removeClippedSubviews={Platform.OS === "android"}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() =>
                    setCitasManana((prev) =>
                      prev.map((c) =>
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
                    <Text style={styles.waName}>
                      {item.NombrePaciente || item.pacienteNombre}
                    </Text>
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

      {/* MODAL MÉDICOS CRUD (AGREGAR, EDITAR, ELIMINAR) */}
      <Modal
        visible={modalMedicos}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMedicos(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            <Text style={styles.modalTitle}>Gestión del Staff Médico</Text>

            {/* Formulario Inline para añadir un nuevo médico */}
            <View style={styles.addDoctorForm}>
              <Text style={styles.formSectionTitle}>
                + Agregar Nuevo Especialista
              </Text>
              <TextInput
                style={styles.formInput}
                placeholder="Servicio (ej: Ortodoncia, General)"
                placeholderTextColor="#999"
                value={nuevaEspecialidadMed}
                onChangeText={setNuevaEspecialidadMed}
              />
              <TextInput
                style={styles.formInput}
                placeholder="Nombre (ej: Dra. Vanessa Nuñez)"
                placeholderTextColor="#999"
                value={nuevoNombreMed}
                onChangeText={setNuevoNombreMed}
              />
              <TouchableOpacity
                style={styles.btnAgregarForm}
                onPress={handleAgregarMedico}
              >
                <MaterialCommunityIcons
                  name="plus-circle"
                  size={18}
                  color="#fff"
                />
                <Text style={styles.btnAgregarFormText}>
                  {" "}
                  Guardar en Sistema
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.formSectionTitle, { marginTop: 15 }]}>
              Lista de Doctores Activos
            </Text>

            <FlatList
              data={listaMedicos}
              keyExtractor={(item) => item.id}
              style={{ width: "100%" }}
              renderItem={({ item }) => (
                <View style={styles.doctorItemCrudRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.doctorItemCrudService}>
                      {item.nombre}
                    </Text>
                    <TextInput
                      style={styles.inputEdit}
                      defaultValue={item.medico}
                      placeholder="Nombre del médico"
                      onEndEditing={async (e) => {
                        const nuevoTexto = e.nativeEvent.text.trim();
                        if (nuevoTexto && nuevoTexto !== item.medico) {
                          try {
                            await updateDoc(
                              doc(db, "especialidades", item.id),
                              {
                                medico: nuevoTexto,
                              },
                            );
                          } catch (error) {
                            console.error("Error al actualizar médico:", error);
                          }
                        }
                      }}
                    />
                  </View>

                  {/* Botón de Eliminación Segura */}
                  <TouchableOpacity
                    style={styles.btnEliminarDoctor}
                    onPress={() => handleEliminarMedico(item.id, item.medico)}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={22}
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
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                Finalizar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* INDICADOR DE CARGA */}
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

// Asegúrate de añadir/revisar estos estilos en tu StyleSheet de abajo

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
  calendarNavContainer: {
    paddingHorizontal: 20,
    marginTop: 15,
    alignItems: "center",
  },
  calendarButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 350,
    elevation: 3,
  },
  calendarButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 10,
  },
  grid: {
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingBottom: 20,
    marginTop: 10,
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
  bgRojo: { backgroundColor: "#FF5252", borderColor: "#FF5252" },
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
  hcInput: {
    backgroundColor: "#F4F6F8",
    width: 110,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  millasInput: {
    backgroundColor: "#F0F0F0",
    width: 55,
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
    elevation: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  editPanelTitle: { fontWeight: "bold", fontSize: 15, marginBottom: 5 },
  label: { fontSize: 12, fontWeight: "600", color: "#444", marginBottom: 5 },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 10,
  },
  statusTagText: { fontSize: 10, fontWeight: "bold" },
  miniTab: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: "#EEE",
    borderRadius: 10,
    marginRight: 5,
    justifyContent: "center",
    height: 32,
  },
  btnAction: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    minWidth: 140,
  },
  btnActionText: { color: "#fff", fontWeight: "bold", fontSize: 11 },
  btnCancelText: {
    backgroundColor: "#F0F0F0",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  btnCancel: {
    backgroundColor: "#F0F0F0",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", padding: 20, borderRadius: 25 },
  modalTitle: { fontWeight: "bold", textAlign: "center", marginBottom: 15 },
  bulkActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  actionLink: { color: COLORS.primaryGreen, fontWeight: "bold" },
  waItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  waName: { fontWeight: "bold" },
  waSub: { fontSize: 12, color: "#666" },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  btnTextBlack: { color: "#000", fontWeight: "bold" },
  btnSendAll: {
    backgroundColor: "#25D366",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  inputEdit: { borderBottomWidth: 1, borderColor: "#DDD", paddingVertical: 5 },
  btnClose: {
    backgroundColor: COLORS.darkGreen,
    padding: 12,
    borderRadius: 15,
    marginTop: 10,
    alignItems: "center",
  },
  loader: { position: "absolute", top: "50%", alignSelf: "center" },

  // ESTILOS REPORTE SUPERIOR DE CITAS CERRADAS
  reportFooter: {
    backgroundColor: "#fff",
    padding: 14,
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  reportHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  reportTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1E293B",
    marginLeft: 6,
  },
  reportScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reportBadge: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    alignItems: "center",
  },
  reportDoctorName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1B5E20",
  },
  reportDoctorCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2E7D32",
  },
});
