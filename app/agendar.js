import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { auth, db } from "../src/api/firebase.config";
import { COLORS } from "../src/constants/theme";

LocaleConfig.locales["es"] = {
  monthNames: [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ],
  monthNamesShort: [
    "Ene.",
    "Feb.",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul.",
    "Ago",
    "Sep.",
    "Oct.",
    "Nov.",
    "Dic.",
  ],
  dayNames: [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ],
  dayNamesShort: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
  today: "Hoy",
};
LocaleConfig.defaultLocale = "es";

const SERVICIOS = [
  {
    id: "general",
    nombre: "General",
    duracion: 30,
    img: {
      uri: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=500",
    },
  },
  {
    id: "ortodoncia",
    nombre: "Ortodoncia",
    duracion: 15,
    img: {
      uri: "https://www.clinicadentallarranaga.com/wp-content/uploads/que_es_una_ortodoncia.jpg",
    },
  },
  {
    id: "endodoncia",
    nombre: "Endodoncia",
    duracion: 60,
    img: {
      uri: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=500",
    },
  },
  {
    id: "cirugia",
    nombre: "Cirugía",
    duracion: 90,
    img: {
      uri: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=500",
    },
  },
  {
    id: "estetica",
    nombre: "Estética",
    duracion: 45,
    img: {
      uri: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=500",
    },
  },
  {
    id: "periodoncia",
    nombre: "Periodoncia",
    duracion: 30,
    img: {
      uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRaqA3a4FMjxIamyVTtGQj7cPs0qTjRjelO7g&s",
    },
  },
  {
    id: "rehabilitacion",
    nombre: "Rehabilitación",
    duracion: 60,
    img: {
      uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGRLV8Z4wKO2wubIje4glcRu0QajOV7ermLg&s",
    },
  },
  {
    id: "odontopediatria",
    nombre: "Odontopediatría",
    duracion: 60,
    img: {
      uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdw1rCOOQ4GmqRr7LCRE9MmB8GJtgpydrJSg&s",
    },
  },
  {
    id: "rayosx",
    nombre: "Rayos X",
    duracion: 60,
    img: {
      uri: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=500",
    },
  },
];

const AgendarCitaClient = () => {
  const router = useRouter();
  const scrollRef = useRef(null);

  const [servicioSel, setServicioSel] = useState(null);
  const [medicoSel, setMedicoSel] = useState(null);
  const [fechaSel, setFechaSel] = useState(null);
  const [horaSel, setHoraSel] = useState(null);

  const [loading, setLoading] = useState(false);
  const [bloquesOcupados, setBloquesOcupados] = useState([]);
  const [todosLosMedicos, setTodosLosMedicos] = useState([]);

  // --- ESCUCHA DE MÉDICOS DESDE FIRESTORE ---
  useEffect(() => {
    const q = query(collection(db, "medicos"), where("activo", "==", true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const medicosFormateados = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTodosLosMedicos(medicosFormateados);
      },
      (error) => {
        console.error("Error cargando médicos en la vista cliente:", error);
      },
    );
    return () => unsubscribe();
  }, []);

  // --- FILTRADO DINÁMICO DE MÉDICOS ---
  const medicosFiltrados = useMemo(() => {
    if (!servicioSel) return [];
    return todosLosMedicos.filter(
      (m) =>
        m.especialidadId === servicioSel.id ||
        m.especialidadNombre?.toLowerCase() ===
          servicioSel.nombre.toLowerCase(),
    );
  }, [servicioSel, todosLosMedicos]);

  const servicioRequiereMedico = servicioSel && medicosFiltrados.length > 0;

  const medicosGrid = useMemo(() => {
    if (!servicioSel) return [];
    let lista = medicosFiltrados.map((m) => m.nombre);
    while (lista.length < 2) {
      lista.push("Médico por asignar");
    }
    return lista;
  }, [servicioSel, medicosFiltrados]);

  const tieneMedicoValido = useMemo(() => {
    if (!servicioSel) return false;
    if (!servicioRequiereMedico) return true;
    return medicoSel && medicoSel !== "Médico por asignar";
  }, [servicioSel, medicoSel, servicioRequiereMedico]);

  const estaListo = servicioSel && tieneMedicoValido && fechaSel && horaSel;

  const getHoyLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // --- ESCUCHA DE HORARIOS OCUPADOS (AGENDA) ---
  useEffect(() => {
    if (!fechaSel || !servicioSel) return;

    const medicoQuery = servicioRequiereMedico ? medicoSel : "Por asignar";
    if (servicioRequiereMedico && !medicoSel) return;

    const q = query(
      collection(db, "agenda_medica"),
      where("fecha", "==", fechaSel),
      where("medico", "==", medicoQuery),
      where("estado", "in", [
        "pendiente",
        "aprobado",
        "confirmado",
        "confirmada",
        "finalizado",
      ]),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const occupied = [];
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const numSlots = Math.ceil((data.duracion || 15) / 15);
          let [h, m] = data.hora.split(":").map(Number);

          for (let i = 0; i < numSlots; i++) {
            occupied.push(
              `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
            );
            m += 15;
            if (m >= 60) {
              h++;
              m = 0;
            }
          }
        });
        setBloquesOcupados(occupied);

        if (horaSel && occupied.includes(horaSel)) {
          setHoraSel(null);
          const nombreAviso = servicioRequiereMedico
            ? medicoSel
            : servicioSel.nombre;

          if (Platform.OS === "web") {
            alert(
              `El horario de las ${horaSel} ya no está disponible para ${nombreAviso}.`,
            );
          } else {
            Alert.alert(
              "Aviso",
              `El horario de las ${horaSel} ya no está disponible para ${nombreAviso}.`,
            );
          }
        }
      },
      (error) => {
        console.error("Error en escucha de agenda:", error);
      },
    );

    return () => unsubscribe();
  }, [fechaSel, medicoSel, servicioSel, servicioRequiereMedico]);

  // --- GENERACIÓN DE SLOTS DE HORARIOS ---
  const horariosFiltrados = useMemo(() => {
    const slots = [];
    const ahora = new Date();
    const hoyLocal = getHoyLocal();
    const esHoy = fechaSel === hoyLocal;
    const { 0: horaActual, 1: minActual } = [
      ahora.getHours(),
      ahora.getMinutes(),
    ];

    for (let h = 8; h < 18; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        const ocupado = bloquesOcupados.includes(hStr);
        let yaPaso = false;
        if (esHoy) {
          if (h < horaActual || (h === horaActual && m <= minActual))
            yaPaso = true;
        }
        slots.push({ hora: hStr, disponible: !ocupado && !yaPaso });
      }
    }
    return slots;
  }, [fechaSel, bloquesOcupados]);

  // --- ENVÍO DE FORMULARIO A FIRESTORE Y WHATSAPP ---
  const enviarSolicitud = async () => {
    if (!estaListo) return;
    setLoading(true);
    try {
      const user = auth.currentUser;
      let nombreRealPaciente = "Paciente Registrado";
      let telefonoRealPaciente = "";
      let historiaClinicaPaciente = "No asignada";
      let cedulaPaciente = "No registrada"; // <-- Inicializador por defecto para la cédula

      if (user) {
        // Intento 1: Obtener directamente por UID de documento
        try {
          const directDocRef = doc(db, "users", user.uid);
          const directDocSnap = await getDoc(directDocRef);
          if (directDocSnap.exists()) {
            const data = directDocSnap.data();
            if (data.nombre) nombreRealPaciente = data.nombre.trim();
            if (data.telefono) telefonoRealPaciente = data.telefono;
            if (data.numHistoriaClinica)
              historiaClinicaPaciente = data.numHistoriaClinica;
            if (data.cedula) cedulaPaciente = data.cedula.trim(); // <-- Carga de cédula Intento 1
          }
        } catch (e1) {
          console.log("I1 fallido:", e1.message);
        }

        // Intento 2: Búsqueda alternativa mediante query por campo 'uid'
        if (nombreRealPaciente === "Paciente Registrado") {
          try {
            const qUser = query(
              collection(db, "users"),
              where("uid", "==", user.uid),
            );
            const querySnapshot = await getDocs(qUser);
            if (!querySnapshot.empty) {
              const data = querySnapshot.docs[0].data();
              if (data.nombre) nombreRealPaciente = data.nombre.trim();
              if (data.telefono) telefonoRealPaciente = data.telefono;
              if (data.numHistoriaClinica)
                historiaClinicaPaciente = data.numHistoriaClinica;
              if (data.cedula) cedulaPaciente = data.cedula.trim(); // <-- Carga de cédula Intento 2
            }
          } catch (e2) {
            console.log("I2 fallido:", e2.message);
          }
        }
      }

      const medicoFinal = servicioRequiereMedico ? medicoSel : "Por asignar";

      // Guardamos la cita en Firestore incluyendo la cédula
      const docCitaRef = await addDoc(collection(db, "citas"), {
        pacienteId: user ? user.uid : "anonimo",
        NombrePaciente: nombreRealPaciente,
        telefonoPaciente: telefonoRealPaciente,
        numHistoriaClinica: historiaClinicaPaciente,
        cedula: cedulaPaciente, // <-- Guardada en la colección de citas
        servicio: servicioSel.nombre,
        duracion: servicioSel.duracion,
        fecha: fechaSel,
        hora: horaSel,
        medico: medicoFinal,
        estado: "pendiente",
        creadoEn: serverTimestamp(),
      });

      await addDoc(collection(db, "agenda_medica"), {
        citaId: docCitaRef.id,
        medico: medicoFinal,
        fecha: fechaSel,
        hora: horaSel,
        duracion: servicioSel.duracion,
        estado: "pendiente",
      });

      // Estructura del mensaje para incluir H.C. y Cédula
      const msg =
        `🦷 *Nueva Solicitud de Cita*\n\n` +
        `👤 *Paciente:* ${nombreRealPaciente}\n` +
        `💳 *Cédula:* ${cedulaPaciente}\n` + // <-- Agregada en el WhatsApp
        `🗂️ *H.C. N°:* ${historiaClinicaPaciente}\n` +
        `✨ *Servicio:* ${servicioSel.nombre}\n` +
        `👨‍⚕️ *Médico:* ${medicoFinal}\n` +
        `🗓️ *Fecha:* ${fechaSel}\n` +
        `⏰ *Hora:* ${horaSel}\n\n` +
        `Por favor, confirmar disponibilidad. ¡Muchas gracias!`;

      if (Platform.OS === "web") {
        alert(
          "🎉 ¡Solicitud Registrada!\nSu cita ha sido guardada en nuestro sistema. A continuación se abrirá WhatsApp para enviar su comprobante.",
        );
      } else {
        Alert.alert(
          "🎉 ¡Solicitud Registrada!",
          "Su cita ha sido guardada en nuestro sistema. A continuación se abrirá WhatsApp para enviar su comprobante.",
        );
      }

      const telefonoClinica = "593999036517";
      let whatsappUrl = "";

      if (Platform.OS === "web") {
        // Detección estricta de entorno iOS dentro del navegador
        const isIOS =
          /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        if (isIOS) {
          // Enlace universal: Resuelve el bypass del sandbox de Safari/Chrome en iOS
          whatsappUrl = `https://api.whatsapp.com/send?phone=${telefonoClinica}&text=${encodeURIComponent(msg)}`;
        } else {
          whatsappUrl = `https://wa.me/${telefonoClinica}?text=${encodeURIComponent(msg)}`;
        }
      } else {
        // Protocolo nativo seguro para las Apps compiladas (Android/iOS)
        whatsappUrl = `whatsapp://send?phone=${telefonoClinica}&text=${encodeURIComponent(msg)}`;
      }

      // Ejecución del redireccionamiento adaptado
      try {
        if (Platform.OS === "web") {
          // En iOS Web, si se bloquea el popup por culpa de los awaits anteriores, el fallback asigna la pestaña actual
          window.open(whatsappUrl, "_blank") ||
            window.location.assign(whatsappUrl);
        } else {
          await Linking.openURL(whatsappUrl);
        }
      } catch (err) {
        console.log("Error al abrir WhatsApp:", err);
        if (Platform.OS === "web") window.location.href = whatsappUrl;
      }

      // Limpieza de estados
      setServicioSel(null);
      setMedicoSel(null);
      setFechaSel(null);
      setHoraSel(null);
    } catch (e) {
      if (Platform.OS === "web") {
        alert("Error al agendar: " + e.message);
      } else {
        Alert.alert("Error", e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFDFD" }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconBtn}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={26}
                color="#fff"
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reserva tu Cita</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.stepIndicator}>
            <View style={[styles.step, servicioSel && styles.stepDone]} />
            <View style={[styles.step, tieneMedicoValido && styles.stepDone]} />
            <View style={[styles.step, fechaSel && styles.stepDone]} />
            <View style={[styles.step, horaSel && styles.stepDone]} />
          </View>
        </View>

        {/* PASO 1: SERVICIOS */}
        <View style={styles.section}>
          <Text style={styles.label}>1. Elige un servicio</Text>
          <View style={styles.grid}>
            {SERVICIOS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.serviceCard,
                  servicioSel?.id === item.id && styles.selectedBorder,
                ]}
                onPress={() => {
                  setServicioSel(item);
                  setMedicoSel(null);
                  setFechaSel(null);
                  setHoraSel(null);
                  const proxY = 380;
                  scrollRef.current?.scrollTo({ y: proxY, animated: true });
                }}
              >
                <ImageBackground
                  source={item.img}
                  style={styles.imgBg}
                  imageStyle={{ borderRadius: 12 }}
                >
                  <View
                    style={[
                      styles.overlay,
                      servicioSel?.id === item.id && styles.activeOverlay,
                    ]}
                  >
                    <Text style={styles.serviceText}>{item.nombre}</Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* PASO 2: DOCTORES */}
        <View style={styles.section}>
          <Text style={[styles.label, !servicioSel && styles.disabledText]}>
            2. Selecciona el Profesional
          </Text>
          {servicioSel ? (
            servicioRequiereMedico ? (
              <View style={styles.grid}>
                {medicosGrid.map((medico, index) => {
                  const esPlaceholder = medico === "Médico por asignar";
                  return (
                    <TouchableOpacity
                      key={`${medico}-${index}`}
                      disabled={esPlaceholder}
                      activeOpacity={esPlaceholder ? 1 : 0.7}
                      style={[
                        styles.doctorCard,
                        medicoSel === medico && styles.doctorCardActive,
                        esPlaceholder && styles.doctorCardDisabled,
                      ]}
                      onPress={() => {
                        setMedicoSel(medico);
                        setFechaSel(null);
                        setHoraSel(null);
                        scrollRef.current?.scrollTo({ y: 720, animated: true });
                      }}
                    >
                      <MaterialCommunityIcons
                        name={esPlaceholder ? "account-lock-outline" : "doctor"}
                        size={24}
                        color={
                          medicoSel === medico
                            ? "#fff"
                            : esPlaceholder
                              ? "#A5A5A5"
                              : COLORS.primaryGreen || "#8CC63F"
                        }
                      />
                      <Text
                        style={[
                          styles.doctorText,
                          medicoSel === medico && { color: "#fff" },
                          esPlaceholder && {
                            color: "#A5A5A5",
                            fontStyle: "italic",
                          },
                        ]}
                      >
                        {medico}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.infoCardAviso}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={22}
                  color="#0288D1"
                />
                <Text style={styles.infoCardAvisoText}>
                  Este servicio no requiere la selección de un especialista
                  específico. Puedes elegir directamente la fecha y hora de tu
                  preferencia a continuación.
                </Text>
              </View>
            )
          ) : (
            <Text style={styles.placeholderText}>
              Selecciona primero un servicio para ver doctores disponibles.
            </Text>
          )}
        </View>

        {/* PASO 3: CALENDARIO */}
        <View style={styles.section}>
          <Text
            style={[styles.label, !tieneMedicoValido && styles.disabledText]}
          >
            3. Selecciona la fecha
          </Text>
          <Calendar
            minDate={getHoyLocal()}
            disabledByDefault={!tieneMedicoValido}
            onDayPress={(day) => {
              if (!tieneMedicoValido) return;
              setFechaSel(day.dateString);
              scrollRef.current?.scrollTo({ y: 1250, animated: true });
            }}
            markedDates={{
              [fechaSel]: {
                selected: true,
                selectedColor: COLORS.primaryGreen || "#8CC63F",
              },
            }}
            theme={{
              todayTextColor: COLORS.primaryGreen || "#8CC63F",
              arrowColor: COLORS.primaryGreen || "#8CC63F",
            }}
            style={styles.calendar}
          />
        </View>

        {/* PASO 4: HORARIOS */}
        <View style={styles.section}>
          <Text style={[styles.label, !fechaSel && styles.disabledText]}>
            4. Elige el horario
          </Text>
          <View style={styles.timeGrid}>
            {fechaSel && tieneMedicoValido ? (
              horariosFiltrados.map((item) => (
                <TouchableOpacity
                  key={item.hora}
                  disabled={!item.disponible}
                  style={[
                    styles.timeSlot,
                    horaSel === item.hora && styles.timeSlotActive,
                    !item.disponible && styles.timeSlotDisabled,
                  ]}
                  onPress={() => setHoraSel(item.hora)}
                >
                  <Text
                    style={[
                      styles.timeText,
                      horaSel === item.hora && { color: "#fff" },
                      !item.disponible && { color: "#ccc" },
                    ]}
                  >
                    {item.hora}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.placeholderText}>
                Selecciona una fecha válida en el calendario para consultar
                horarios.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* BOTÓN FLOTANTE */}
      {servicioSel && (
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: estaListo ? "#25D366" : "#9E9E9E" },
          ]}
          onPress={enviarSolicitud}
          disabled={!estaListo || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.fabContent}>
              <MaterialCommunityIcons name="whatsapp" size={28} color="#fff" />
              <Text style={styles.fabText}>
                {estaListo
                  ? "Pedir Cita Ahora"
                  : "Completa los pasos superiores"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: COLORS.darkGreen || "#1A3A34",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, color: "#fff", fontWeight: "bold" },
  iconBtn: { padding: 5 },
  stepIndicator: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "center",
  },
  step: {
    width: 30,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 4,
    borderRadius: 2,
  },
  stepDone: { backgroundColor: COLORS.primaryGreen || "#8CC63F" },
  section: { paddingHorizontal: 20, paddingVertical: 15 },
  label: { fontSize: 17, fontWeight: "bold", color: "#333", marginBottom: 12 },
  disabledText: { color: "#CCC" },
  placeholderText: {
    color: "#999",
    fontSize: 14,
    fontStyle: "italic",
    marginTop: 5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  serviceCard: { width: "48%", height: 110, marginBottom: 15 },
  selectedBorder: {
    borderWidth: 3,
    borderColor: COLORS.primaryGreen || "#8CC63F",
    borderRadius: 15,
  },
  imgBg: { width: "100%", height: "100%", justifyContent: "flex-end" },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.4)",
    height: "100%",
    justifyContent: "center",
    borderRadius: 12,
  },
  activeOverlay: { backgroundColor: "rgba(140, 198, 63, 0.6)" },
  serviceText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    padding: 5,
  },
  doctorCard: {
    width: "48%",
    paddingVertical: 16,
    paddingHorizontal: 10,
    backgroundColor: "#FFF",
    marginBottom: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EAEAEA",
    elevation: 2,
  },
  doctorCardActive: {
    backgroundColor: COLORS.primaryGreen || "#8CC63F",
    borderColor: COLORS.primaryGreen || "#8CC63F",
  },
  doctorCardDisabled: {
    backgroundColor: "#F8F9FA",
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    elevation: 0,
  },
  doctorText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#444",
    textAlign: "center",
    marginTop: 8,
  },
  infoCardAviso: {
    flexDirection: "row",
    backgroundColor: "#E1F5FE",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#B3E5FC",
  },
  infoCardAvisoText: {
    flex: 1,
    fontSize: 13,
    color: "#01579B",
    marginLeft: 10,
    lineHeight: 18,
    fontWeight: "500",
  },
  calendar: { borderRadius: 15, elevation: 2, padding: 10 },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  timeSlot: {
    width: "23%",
    padding: 12,
    backgroundColor: "#FFF",
    marginBottom: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  timeSlotActive: {
    backgroundColor: COLORS.primaryGreen || "#8CC63F",
    borderColor: COLORS.primaryGreen || "#8CC63F",
  },
  timeSlotDisabled: { backgroundColor: "#F5F5F5", opacity: 0.6 },
  timeText: { fontSize: 13, fontWeight: "600" },
  fab: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 35,
    elevation: 10,
    minWidth: 260,
  },
  fabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: "#fff", fontWeight: "bold", marginLeft: 10 },
});

export default AgendarCitaClient;
