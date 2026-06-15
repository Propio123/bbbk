import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
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
const ClienteItem = ({
  item,
  onUpdateMillas,
  onIncrement,
  onUpdateHC,
  onUpdateCedula,
}) => {
  const [localMillas, setLocalMillas] = useState(String(item.puntosSalud || 0));
  const [localHC, setLocalHC] = useState(String(item.numHistoriaClinica || ""));
  const [cedula, setCedula] = useState(String(item.cedula || ""));

  useEffect(() => {
    setLocalMillas(String(item.puntosSalud || 0));
  }, [item.puntosSalud]);

  useEffect(() => {
    setLocalHC(String(item.numHistoriaClinica || ""));
    setCedula(String(item.cedula || ""));
  }, [item.numHistoriaClinica, item.cedula]);

  return (
    <View style={styles.clienteCard}>
      {/* SECCIÓN IZQUIERDA: NOMBRE, H.C. Y CÉDULA */}
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={{ fontWeight: "bold", fontSize: 14, color: "#333" }}>
          {item.nombre || item.displayName || "Paciente"}
        </Text>

        {/* FILA DE HISTORIA CLÍNICA */}
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

        {/* FILA DE CÉDULA (Alineada igual que H.C.) */}
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}
        >
          <Text style={{ fontSize: 11, color: "#555", fontWeight: "600" }}>
            Cédula:{" "}
          </Text>
          <TextInput
            style={styles.hcInput} // Usamos el mismo estilo compacto para mantener simetría
            placeholder="Ej: 100xxxxxx"
            placeholderTextColor="#999"
            value={cedula}
            onChangeText={setCedula}
            keyboardType="numeric"
            maxLength={10} // Límite estándar para cédulas en Ecuador
            onEndEditing={() => onUpdateCedula(item.id, cedula.trim())} // Guarda automáticamente al terminar
          />
        </View>
      </View>

      {/* SECCIÓN DERECHA: MILLAS Y BOTONES */}
      <View style={{ alignItems: "flex-end", justifyContent: "center" }}>
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
  const [medicoActivoGrid, setMedicoActivoGrid] = useState(null);

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
  const [nuevaHoraParaCita, setNuevaHoraParaCita] = useState("");
  const [nuevaFechaParaCita, setNuevaFechaParaCita] = useState("");
  const [mostrarCalendarioEdicion, setMostrarCalendarioEdicion] =
    useState(false);

  // --- ESTADOS CLIENTES ---
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  // --- MODALES ---
  const [modalMedicos, setModalMedicos] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [citasManana, setCitasManana] = useState([]);

  // 1. Listener de Especialidades / Médicos
  // 1. Listener de Médicos (Adaptado para alimentar el Grid del Admin de forma global)
  useEffect(() => {
    // Escuchamos los médicos si el modal está abierto O si estamos en la vista de la agenda (para armar el Grid)
    if (!modalMedicos && vistaActual !== "agenda") return;

    // Filtramos solo por los médicos activos para el Grid, ordenados alfabéticamente
    const q = query(
      collection(db, "medicos"),
      where("activo", "==", true), // Asegura mostrar solo personal activo
      orderBy("nombre", "asc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const medicosFormateados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // setListaMedicos se sigue actualizando en tiempo real para el Grid y el Modal
        setListaMedicos(medicosFormateados);
      },
      (error) => {
        console.error("Error escuchando médicos en el Admin: ", error);
      },
    );

    return () => unsubscribe();
  }, [modalMedicos, vistaActual]); // Añadida la dependencia 'vistaActual'
  const agendaMap = useMemo(() => {
    const mapa = {};
    if (!medicoActivoGrid) return mapa;

    // Filtramos las citas de la fecha que pertenecen al médico activo en el Grid
    const citasDelMedico = citas.filter((c) => c.medico === medicoActivoGrid);

    citasDelMedico.forEach((cita) => {
      const numSlots = Math.ceil((cita.duracion || 15) / 15);
      let [h, m] = cita.hora.split(":").map(Number);

      for (let i = 0; i < numSlots; i++) {
        const tiempoStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        mapa[tiempoStr] = {
          ...cita,
          esInicio: i === 0, // Identificador para pintar el nombre del paciente solo en la primera celda
        };

        m += 15;
        if (m >= 60) {
          h++;
          m = 0;
        }
      }
    });
    return mapa;
  }, [citas, medicoActivoGrid]);
  // 2. Listener de Citas o Clientes (Mantiene la reactividad por fecha)
  useEffect(() => {
    const q =
      vistaActual === "agenda"
        ? query(
            collection(db, "citas"),
            where("fecha", "==", fechaSel),
            where("estado", "in", [
              "pendiente",
              "aprobado",
              "confirmado",
              "confirmada",
              "finalizado",
            ]), // Opcional: Filtra estados válidos para el Grid
          )
        : query(collection(db, "users"));

    const unsubData = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (vistaActual === "agenda") {
          setCitas(data);
        } else {
          setClientes(data);
        }
      },
      (error) => {
        console.error(`Error escuchando ${vistaActual}: `, error);
      },
    );

    return () => unsubData();
  }, [fechaSel, vistaActual]);
  useEffect(() => {
    if (listaMedicos.length > 0 && !medicoActivoGrid) {
      setMedicoActivoGrid(listaMedicos[0].nombre);
    }
  }, [listaMedicos]);
  // --- ACCIONES CRUD MÉDICOS ---
  const citasAgrupadasPorMedico = useMemo(() => {
    if (vistaActual !== "agenda") return [];

    return listaMedicos.map((medico) => {
      // Filtramos las citas de la fecha que le pertenecen a este médico específico
      const citasDelMedico = citas.filter(
        (cita) => cita.medico === medico.nombre,
      );

      return {
        ...medico,
        citas: citasDelMedico.sort((a, b) => a.hora.localeCompare(b.hora)), // Ordenadas por hora cronológica
      };
    });
  }, [citas, listaMedicos, vistaActual]);
  const handleAgregarMedico = async () => {
    // Limpiamos los textos y formateamos la especialidad a minúsculas o ID estandarizado
    const especialidadTexto = nuevaEspecialidadMed.trim();
    const nombreMedicoTexto = nuevoNombreMed.trim();

    if (!especialidadTexto || !nombreMedicoTexto) {
      Alert.alert(
        "Campos vacíos",
        "Por favor rellena ambos campos para continuar.",
      );
      return;
    }

    // Creamos un ID limpio para la especialidad (ej: "general", "ortodoncia")
    const especialidadId = especialidadTexto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    try {
      setLoading(true);

      // 1. VERIFICAR Y CREAR LA ESPECIALIDAD SI NO EXISTE
      const espRef = doc(db, "especialidades", especialidadId);
      const espSnap = await getDoc(espRef);

      if (!espSnap.exists()) {
        // Si la especialidad no existe en la bdd, la creamos primero
        await setDoc(espRef, {
          nombre: especialidadTexto, // Mantiene el formato bonito (ej: "General")
          activo: true,
        });
      }

      // 2. CREAR EL NUEVO MÉDICO EN LA COLECCIÓN INDEPENDIENTE
      await addDoc(collection(db, "medicos"), {
        nombre: nombreMedicoTexto,
        especialidadId: especialidadId, // Guardamos la relación al ID de la especialidad
        especialidadNombre: especialidadTexto, // Atributo denormalizado para ahorrar lecturas en los grids
        activo: true,
      });

      // Limpiamos los campos del formulario
      setNuevoNombreMed("");
      // Opcional: puedes dejar nuevaEspecialidadMed si van a ingresar más doctores en la misma área

      Alert.alert(
        "Éxito",
        `${nombreMedicoTexto} ha sido registrado en la especialidad ${especialidadTexto}.`,
      );
    } catch (error) {
      console.error("Error completo al añadir médico/especialidad:", error);
      Alert.alert(
        "Error",
        "No se pudo completar el registro debido a un problema de permisos o red.",
      );
    } finally {
      setLoading(false);
    }
  };
  // --- ACCIÓN PARA LIBERAR CITA ---
  const handleLiberarCita = (cita) => {
    Alert.alert(
      "Liberar Bloque Horario",
      `¿Estás seguro de que deseas cancelar y liberar la cita de las ${cita.hora} para el paciente ${cita.NombrePaciente || cita.pacienteNombre}?`,
      [
        { text: "No, mantener", style: "cancel" },
        {
          text: "Sí, liberar espacio",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              // Eliminamos la cita de la base de datos para dejar el espacio libre
              await deleteDoc(doc(db, "citas", cita.id));
              setCitaEnEdicion(null);
              Alert.alert(
                "Éxito",
                "El espacio horario ha sido liberado correctamente.",
              );
            } catch (e) {
              console.error(e);
              Alert.alert(
                "Error",
                "No se pudo liberar la cita en el servidor.",
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };
  const handleEliminarMedico = (id, nombre) => {
    Alert.alert(
      "Eliminar Especialista",
      `¿Estás seguro de que deseas eliminar al especialista ${nombre}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              // Apuntar a la colección correcta "medicos"
              await deleteDoc(doc(db, "medicos", id));
            } catch (error) {
              console.error("Error al eliminar médico:", error);
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
  const handleUpdateCedula = async (userId, value) => {
    try {
      await updateDoc(doc(db, "users", userId), { cedula: value });
    } catch (e) {
      Alert.alert("Error", "No se pudo actualizar el número de cédula.");
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
        where("estado", "in", [
          "pendiente",
          "aprobado",
          "confirmado",
          "finalizado",
        ]),
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

      const msg = `👋 Hola ${cita.NombrePaciente}, le saludamos de BBBK Odontología.

Le recordamos su cita para el día de mañana  ${cita.fecha}. A las ${cita.hora}. Por favor, confirme su asistencia respondiendo a este mensaje.

¡Será un gusto atenderle! 🦷 `;
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
  const renderMedicoItem = useCallback(({ item }) => (
    <View style={styles.doctorItemCrudRow}>
      <View style={{ flex: 1, marginRight: 8 }}>
        {/* 1. Mostramos la especialidad arriba (ej: General) */}
        <Text style={styles.doctorItemCrudService}>
          {item.especialidadNombre || "Sin Especialidad"}
        </Text>

        {/* 2. El TextInput debe usar item.nombre (Dra. Vanessa) */}
        <TextInput
          style={styles.inputEdit}
          defaultValue={item.nombre} // <-- CAMBIADO: Antes era item.medico
          placeholder="Nombre del médico"
          onEndEditing={async (e) => {
            const nuevoTexto = e.nativeEvent.text.trim();
            if (nuevoTexto && nuevoTexto !== item.nombre) {
              try {
                await updateDoc(doc(db, "medicos", item.id), {
                  nombre: nuevoTexto, // <-- CAMBIADO: Modifica la colección medicos
                });
              } catch (error) {
                console.error("Error al actualizar médico:", error);
              }
            }
          }}
        />
      </View>

      <TouchableOpacity
        style={styles.btnEliminarDoctor}
        onPress={() => handleEliminarMedico(item.id, item.nombre)} // <-- CAMBIADO: Pasar item.nombre
      >
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={22}
          color="#FF5252"
        />
      </TouchableOpacity>
    </View>
  )); // Se pasa la dependencia de la función de eliminación
  const handleGuardarCambiosCita = async () => {
    if (!citaEnEdicion) return;

    const medicoCambio = nuevoMedicoParaCita !== citaEnEdicion.medico;
    const horaCambio = nuevaHoraParaCita !== citaEnEdicion.hora;
    const fechaCambio = nuevaFechaParaCita !== citaEnEdicion.fecha;

    // Si absolutamente nada cambió, simplemente cerramos el modal
    if (!medicoCambio && !horaCambio && !fechaCambio) {
      setCitaEnEdicion(null);
      return;
    }

    // VALIDACIÓN DE COLISIÓN:
    // Buscamos si existe OTRA cita activa para el MISMO médico, en el MISMO día y en la MISMA hora elegida.
    const ocupado = citas.find(
      (c) =>
        c.id !== citaEnEdicion.id && // Que no sea la misma cita que estamos editando
        c.medico === nuevoMedicoParaCita &&
        c.fecha === nuevaFechaParaCita &&
        c.hora === nuevaHoraParaCita &&
        c.estado !== "finalizado",
    );

    if (ocupado) {
      return Alert.alert(
        "Horario Ocupado",
        `El Dr. ${nuevoMedicoParaCita} ya tiene una cita agendada a las ${nuevaHoraParaCita} el día ${nuevaFechaParaCita}.`,
      );
    }

    setLoading(true);
    try {
      const citaRef = doc(db, "citas", citaEnEdicion.id);

      // Objeto con los campos dinámicos a actualizar
      const camposActualizados = {
        medico: nuevoMedicoParaCita,
        hora: nuevaHoraParaCita,
        fecha: nuevaFechaParaCita,
      };

      await updateDoc(citaRef, camposActualizados);

      Alert.alert("Éxito", "La cita ha sido reprogramada correctamente.");
      setCitaEnEdicion(null);
    } catch (e) {
      console.error("Error al reprogramar la cita: ", e);
      Alert.alert("Error", "No se pudo actualizar la cita en el servidor.");
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
      setNuevaHoraParaCita(citaEnEdicion.hora || "");
      setNuevaFechaParaCita(citaEnEdicion.fecha || "");
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
          </View>
        )}
      </View>

      {/* SECTOR DE CALENDARIO */}
      {vistaActual === "agenda" && (
        <View style={styles.calendarNavContainer}>
          {Platform.OS !== "web" ? (
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
          ) : (
            /* SOLUCIÓN WEB COMPATIBLE */
            <View
              style={[
                styles.calendarButton,
                {
                  paddingHorizontal: 10,
                  flexDirection: "row",
                  alignItems: "center",
                },
              ]}
            >
              <MaterialCommunityIcons
                name="calendar-search"
                size={22}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <input
                type="date"
                value={fechaSel}
                onChange={(e) => {
                  const nuevaFecha = e.target.value;
                  if (nuevaFecha && onDateChange) {
                    onDateChange(
                      { type: "set" },
                      new Date(nuevaFecha + "T12:00:00"),
                    );
                  }
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fff",
                  fontSize: "16px",
                  fontFamily: "inherit",
                  outline: "none",
                  cursor: "pointer",
                  width: "100%",
                }}
              />
            </View>
          )}

          {/* CALENDARIO NATIVO MOBILE */}
          {Platform.OS !== "web" && mostrarCalendario && (
            <DateTimePicker
              value={new Date(fechaSel + "T12:00:00")}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              onChange={(event, date) => {
                setMostrarCalendario(false);
                if (date && onDateChange) onDateChange(event, date);
              }}
            />
          )}
        </View>
      )}

      {/* CONTENIDO PRINCIPAL */}
      {vistaActual === "agenda" ? (
        <View style={{ flex: 1 }}>
          {/* Selector Horizontal Único de Médicos */}
          <View style={styles.selectorMedicosContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectorMedicosScroll}
            >
              {listaMedicos.map((m) => {
                const esActivo = medicoActivoGrid === m.nombre;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.btnMedicoCard,
                      esActivo && styles.btnMedicoCardActivo,
                    ]}
                    onPress={() => setMedicoActivoGrid(m.nombre)}
                  >
                    <Text
                      style={[
                        styles.textMedicoTab,
                        esActivo && styles.textMedicoTabActivo,
                      ]}
                    >
                      {m.nombre}
                    </Text>
                    <Text
                      style={[
                        styles.subtextMedicoTab,
                        esActivo && styles.subtextMedicoTabActivo,
                      ]}
                    >
                      {m.especialidadNombre || "Especialista"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {listaMedicos.length === 0 && (
                <Text style={styles.placeholderText}>
                  No hay médicos registrados
                </Text>
              )}
            </ScrollView>
          </View>

          {/* Grid de Horarios */}
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
                color={COLORS.darkGreen || "#1A3A34"}
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
                  <Text style={styles.reportDoctorName}>{m.nombre}: </Text>
                  <Text style={styles.reportDoctorCount}>
                    {reporteCitasCerradas[m.nombre] || 0} atendidas
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      ) : (
        /* VISTA CLIENTES */
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
        <Modal
          visible={!!citaEnEdicion}
          animationType="slide"
          transparent={true}
        >
          <View style={styles.modalCentradoContainer}>
            <View style={styles.modalContenidoCard}>
              <Text style={styles.modalTitulo}>Reprogramar Cita</Text>
              <Text style={styles.pacienteSubtitulo}>
                Paciente:{" "}
                {citaEnEdicion.NombrePaciente || citaEnEdicion.pacienteNombre}
              </Text>

              {/* 1. SELECCIÓN DE MÉDICO (Integrado Horizontalmente) */}
              <Text style={styles.labelInput}>Asignar Especialista:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 15, maxHeight: 45 }}
              >
                {listaMedicos.map((med) => (
                  <TouchableOpacity
                    key={med.id}
                    style={[
                      styles.miniTab,
                      nuevoMedicoParaCita === med.nombre && {
                        backgroundColor: COLORS.primaryGreen,
                      },
                    ]}
                    onPress={() => setNuevoMedicoParaCita(med.nombre)}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color:
                          nuevoMedicoParaCita === med.nombre ? "#fff" : "#333",
                      }}
                    >
                      {med.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 2. SELECCIÓN DE FECHA */}
              <Text style={styles.labelInput}>Fecha de la Cita:</Text>
              <TouchableOpacity
                style={styles.selectorBotonInput}
                onPress={() => setMostrarCalendarioEdicion(true)}
              >
                <Text style={styles.textoBotonInput}>{nuevaFechaParaCita}</Text>
                <MaterialCommunityIcons
                  name="calendar"
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>

              {mostrarCalendarioEdicion && (
                <DateTimePicker
                  value={new Date(nuevaFechaParaCita + "T12:00:00")}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={(event, selectedDate) => {
                    setMostrarCalendarioEdicion(Platform.OS === "ios");
                    if (selectedDate) {
                      const yyyy = selectedDate.getFullYear();
                      const mm = String(selectedDate.getMonth() + 1).padStart(
                        2,
                        "0",
                      );
                      const dd = String(selectedDate.getDate()).padStart(
                        2,
                        "0",
                      );
                      setNuevaFechaParaCita(`${yyyy}-${mm}-${dd}`);
                    }
                  }}
                />
              )}

              {/* 3. SELECCIÓN DE HORA */}
              <Text style={styles.labelInput}>Hora de la Cita:</Text>
              <View style={styles.contenedorGridHorasMini}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ maxHeight: 50 }}
                >
                  {HORARIOS.map((hora) => {
                    const esSeleccionada = hora === nuevaHoraParaCita;
                    return (
                      <TouchableOpacity
                        key={hora}
                        style={[
                          styles.horaMiniChip,
                          esSeleccionada && {
                            backgroundColor: COLORS.primary || "#007BFF",
                          },
                        ]}
                        onPress={() => setNuevaHoraParaCita(hora)}
                      >
                        <Text
                          style={[
                            styles.horaMiniTexto,
                            esSeleccionada && {
                              color: "#fff",
                              fontWeight: "bold",
                            },
                          ]}
                        >
                          {hora}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* BOTONES DE ACCIÓN */}
              <View style={styles.filaBotonesModal}>
                <TouchableOpacity
                  style={[styles.btnModal, styles.btnModalCancelar]}
                  onPress={() => setCitaEnEdicion(null)}
                >
                  <Text style={styles.btnTextoModal}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnModal, styles.btnModalGuardar]}
                  onPress={handleGuardarCambiosCita}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnTextoModal}>Guardar Cambios</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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

      {/* MODAL GESTIÓN DE MÉDICOS */}
      <Modal
        visible={modalMedicos}
        transparent
        animationType="slide"
        onRequestClose={() => setModalMedicos(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            <Text style={styles.modalTitle}>Gestión del Staff Médico</Text>
            <View style={styles.addDoctorForm}>
              <Text style={styles.formSectionTitle}>
                + Agregar Nuevo Especialista
              </Text>
              <TextInput
                style={styles.formInput}
                placeholder="Servicio (ej: Ortodoncia)"
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
              renderItem={renderMedicoItem}
              windowSize={5}
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

      {/* GLOBAL LOADING INDICATOR */}
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
    backgroundColor: "#1A3A34", // Valor fallback seguro
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
  calendarNavContainer: {
    paddingHorizontal: 20,
    marginTop: 15,
    alignItems: "center",
  },
  calendarButton: {
    flexDirection: "row",
    backgroundColor: "#8CC63F",
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

  // MODAL CENTRADO (REPROGRAMACIÓN)
  modalCentradoContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalContenidoCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitulo: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  pacienteSubtitulo: {
    fontSize: 14,
    color: "#555",
    marginBottom: 15,
    textAlign: "center",
  },
  labelInput: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
    marginBottom: 5,
    marginTop: 5,
  },
  selectorBotonInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F4F6F8",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  textoBotonInput: { color: "#333" },

  contenedorGridHorasMini: { marginVertical: 10 },
  horaMiniChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    marginRight: 8,
    height: 35,
  },
  horaMiniTexto: { fontSize: 12, color: "#333" },

  filaBotonesModal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  btnModal: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 5,
  },
  btnModalCancelar: { backgroundColor: "#E2E8F0" },
  btnModalGuardar: { backgroundColor: "#007BFF" },
  btnTextoModal: { fontWeight: "bold", color: "#fff" },

  // GESTIÓN DE MÉDICOS (MUTADOS CORRECTAMENTE)
  selectorMedicosContainer: {
    backgroundColor: "#F8F9FA",
    borderBottomWidth: 1,
    borderColor: "#E9ECEF",
    paddingVertical: 10,
  },
  selectorMedicosScroll: { paddingHorizontal: 15, alignItems: "center" },
  btnMedicoCard: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    elevation: 2,
    minWidth: 130,
    alignItems: "center",
  },
  btnMedicoCardActivo: {
    backgroundColor: "#8CC63F",
    borderColor: "#8CC63F",
    elevation: 4,
  },
  textMedicoTab: { fontSize: 13, fontWeight: "700", color: "#343A40" },
  textMedicoTabActivo: { color: "#fff" },
  subtextMedicoTab: { fontSize: 11, color: "#6C757D", marginTop: 1 },
  subtextMedicoTabActivo: { color: "rgba(255,255,255,0.85)" },

  placeholderText: {
    color: "#999",
    fontStyle: "italic",
    paddingHorizontal: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", padding: 20, borderRadius: 25 },
  modalTitle: {
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    fontSize: 16,
  },
  bulkActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  actionLink: { color: "#8CC63F", fontWeight: "bold" },
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
  btnCancel: {
    backgroundColor: "#F0F0F0",
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 15,
  },
  btnTextBlack: { color: "#000", fontWeight: "bold" },
  btnSendAll: {
    backgroundColor: "#25D366",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  addDoctorForm: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  formSectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4A5568",
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 8,
    fontSize: 13,
    color: "#333",
  },
  btnAgregarForm: {
    backgroundColor: "#1A3A34",
    flexDirection: "row",
    padding: 10,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  btnAgregarFormText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  btnClose: {
    backgroundColor: "#1A3A34",
    padding: 12,
    borderRadius: 15,
    marginTop: 10,
    alignItems: "center",
  },
  loader: { position: "absolute", top: "50%", alignSelf: "center" },

  // REPORTE FOOTER
  reportFooter: {
    backgroundColor: "#fff",
    padding: 14,
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 4,
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
  reportScroll: { flexDirection: "row", alignItems: "center" },
  reportBadge: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    alignItems: "center",
    marginRight: 8,
  },
  reportDoctorName: { fontSize: 11, fontWeight: "bold", color: "#1B5E20" },
  reportDoctorCount: { fontSize: 11, fontWeight: "600", color: "#2E7D32" },
  miniTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#EEE",
    borderRadius: 10,
    marginRight: 5,
    justifyContent: "center",
  },
});
