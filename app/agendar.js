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
  Platform, // <-- AGREGADO PARA DETECTAR WEB VS NATIVO
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { auth, db } from "../src/api/firebase.config";
import { COLORS } from "../src/constants/theme";

// Configuración de idioma para el calendario
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
    id: "gen",
    nombre: "General",
    duracion: 30,
    medicos: ["Dr. Darwin Congo", "Dra. Kati Amatima", "Dra. Doménica Palma"],
    img: {
      uri: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=500",
    },
  },
  {
    id: "ort",
    nombre: "Ortodoncia",
    duracion: 30,
    medicos: [
      "Dr. Bladimir Benavides",
      "Dr. Julian Rosero",
      "Dra. Daniela Benavides",
      "Dra. Verónica Benavides",
    ],
    img: {
      uri: "https://www.clinicadentallarranaga.com/wp-content/uploads/que_es_una_ortodoncia.jpg",
    },
  },
  {
    id: "end",
    nombre: "Endodoncia",
    duracion: 60,
    medicos: ["Dra. Vanessa Nuñez"],
    img: {
      uri: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=500",
    },
  },
  {
    id: "cir",
    nombre: "Cirugía",
    duracion: 90,
    medicos: ["Dr. Darwin Congo"],
    img: {
      uri: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=500",
    },
  },
  {
    id: "est",
    nombre: "Estética",
    duracion: 45,
    medicos: ["Dr. Oscar Benalcázar"],
    img: {
      uri: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=500",
    },
  },
  {
    id: "per",
    nombre: "Periodoncia",
    duracion: 30,
    medicos: ["Dra. Eliana Cespedes"],
    img: {
      uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRaqA3a4FMjxIamyVTtGQj7cPs0qTjRjelO7g&s",
    },
  },
  {
    id: "reh",
    nombre: "Rehabilitación",
    duracion: 60,
    medicos: ["Dr. José Cargua"],
    img: {
      uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGRLV8Z4wKO2wubIje4glcRu0QajOV7ermLg&s",
    },
  },
  {
    id: "adop",
    nombre: "Odontopediatría",
    duracion: 60,
    medicos: ["Dra. Cinthia Benevides"],
    img: {
      uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdw1rCOOQ4GmqRr7LCRE9MmB8GJtgpydrJSg&s",
    },
  },
  {
    id: "rx",
    nombre: "Rayos X",
    duracion: 60,
    medicos: [],
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

  const estaListo = servicioSel && medicoSel && fechaSel && horaSel;

  const getHoyLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const medicosGrid = useMemo(() => {
    if (!servicioSel) return [];
    let lista = [...servicioSel.medicos];
    while (lista.length < 2) {
      lista.push("Médico por asignar");
    }
    return lista;
  }, [servicioSel]);

  useEffect(() => {
    if (!fechaSel || !medicoSel || medicoSel === "Médico por asignar") return;

    const q = query(
      collection(db, "agenda_medica"),
      where("fecha", "==", fechaSel),
      where("medico", "==", medicoSel),
      where("estado", "in", ["pendiente", "confirmada"]),
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
          Alert.alert(
            "Aviso",
            `El horario de las ${horaSel} ya no está disponible para el ${medicoSel}.`,
          );
        }
      },
      (error) => {
        console.error("Error en escucha de agenda:", error);
      },
    );

    return () => unsubscribe();
  }, [fechaSel, medicoSel]);

  const horariosFiltrados = useMemo(() => {
    const slots = [];
    const ahora = new Date();
    const hoyLocal = getHoyLocal();
    const esHoy = fechaSel === hoyLocal;
    const horaActual = ahora.getHours();
    const minActual = ahora.getMinutes();

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

  const enviarSolicitud = async () => {
    if (!estaListo) return;
    if (medicoSel === "Médico por asignar") {
      Alert.alert(
        "Aviso",
        "Por favor selecciona un médico disponible para este servicio.",
      );
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      let nombreRealPaciente = "Paciente Registrado";
      let telefonoRealPaciente = "";

      if (user) {
        try {
          const directDocRef = doc(db, "users", user.uid);
          const directDocSnap = await getDoc(directDocRef);
          if (directDocSnap.exists()) {
            const data = directDocSnap.data();
            if (data.nombre) nombreRealPaciente = data.nombre.trim();
            if (data.telefono) telefonoRealPaciente = data.telefono;
          }
        } catch (e1) {
          console.log("I1 fallido:", e1.message);
        }

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
            }
          } catch (e2) {
            console.log("I2 fallido:", e2.message);
          }
        }

        if (nombreRealPaciente === "Paciente Registrado" && user.email) {
          try {
            const qEmail = query(
              collection(db, "users"),
              where("email", "==", user.email),
            );
            const querySnapshotEmail = await getDocs(qEmail);
            if (!querySnapshotEmail.empty) {
              const data = querySnapshotEmail.docs[0].data();
              if (data.nombre) nombreRealPaciente = data.nombre.trim();
              if (data.telefono) telefonoRealPaciente = data.telefono;
            }
          } catch (e3) {
            console.log("I3 fallido:", e3.message);
          }
        }
      }

      // 1. Guardar la cita en Firebase
      const docCitaRef = await addDoc(collection(db, "citas"), {
        pacienteId: user ? user.uid : "anonimo",
        NombrePaciente: nombreRealPaciente,
        telefonoPaciente: telefonoRealPaciente,
        servicio: servicioSel.nombre,
        duracion: servicioSel.duracion,
        fecha: fechaSel,
        hora: horaSel,
        medico: medicoSel,
        estado: "pendiente",
        creadoEn: serverTimestamp(),
      });

      await addDoc(collection(db, "agenda_medica"), {
        citaId: docCitaRef.id,
        medico: medicoSel,
        fecha: fechaSel,
        hora: horaSel,
        duracion: servicioSel.duracion,
        estado: "pendiente",
      });

      // 2. Mensaje y Alerta de confirmación inmediata al usuario (Feedback)
      const msg =
        `🦷 *Nueva Solicitud de Cita*\n\n` +
        `👤 *Paciente:* ${nombreRealPaciente}\n` +
        `✨ *Servicio:* ${servicioSel.nombre}\n` +
        `👨‍⚕️ *Médico:* ${medicoSel}\n` +
        `🗓️ *Fecha:* ${fechaSel}\n` +
        `⏰ *Hora:* ${horaSel}\n\n` +
        `Por favor, confirmar disponibilidad. ¡Muchas gracias!`;

      // Alerta nativa / Web alert para frenar clics dobles antes de saltar a WhatsApp
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

      // 3. Resolución Inteligente del enlace de WhatsApp según plataforma (Fija error en iOS/Android Web)
      const telefonoClinica = "593999036517";
      const whatsappUrl =
        Platform.OS === "web"
          ? `https://wa.me/${telefonoClinica}?text=${encodeURIComponent(msg)}` // Enlace universal para navegadores móviles y desktop
          : `whatsapp://send?phone=${telefonoClinica}&text=${encodeURIComponent(msg)}`; // Protocolo nativo rápido para la APK

      await Linking.openURL(whatsappUrl);

      // Limpiar el formulario para dejar listo el espacio a una nueva cita
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
            <View style={[styles.step, medicoSel && styles.stepDone]} />
            <View style={[styles.step, fechaSel && styles.stepDone]} />
            <View style={[styles.step, horaSel && styles.stepDone]} />
          </View>
        </View>

        {/* PASO 1 */}
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
                  scrollRef.current?.scrollTo({ y: 380, animated: true });
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

        {/* PASO 2 */}
        <View style={styles.section}>
          <Text style={[styles.label, !servicioSel && styles.disabledText]}>
            2. Selecciona el Profesional
          </Text>
          {servicioSel ? (
            <View style={styles.grid}>
              {medicosGrid.map((medico, index) => {
                const esPlaceholder = medico === "Médico por asignar";
                return (
                  <TouchableOpacity
                    key={`${medico}-${index}`}
                    disabled={esPlaceholder}
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
                      name={esPlaceholder ? "account-clock-outline" : "doctor"}
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
            <Text style={styles.placeholderText}>
              Selecciona primero un servicio para ver doctores disponibles.
            </Text>
          )}
        </View>

        {/* PASO 3 */}
        <View style={styles.section}>
          <Text style={[styles.label, !medicoSel && styles.disabledText]}>
            3. Selecciona la fecha
          </Text>
          <Calendar
            minDate={getHoyLocal()}
            disabledByDefault={!medicoSel}
            onDayPress={(day) => {
              if (!medicoSel) return;
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

        {/* PASO 4 */}
        <View style={styles.section}>
          <Text style={[styles.label, !fechaSel && styles.disabledText]}>
            4. Elige el horario
          </Text>
          <View style={styles.timeGrid}>
            {fechaSel ? (
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
                Selecciona una fecha para consultar horarios disponibles.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Botón Flotante */}
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
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
