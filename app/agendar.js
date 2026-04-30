import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
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
    medico: "Dr. Doménica Palma",
    img: {
      uri: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=500",
    },
  },
  {
    id: "ort",
    nombre: "Ortodoncia",
    duracion: 30,
    medico: "Dr. Bladimir Denavidez",
    img: {
      uri: "https://www.clinicadentallarranaga.com/wp-content/uploads/que_es_una_ortodoncia.jpg",
    },
  },
  {
    id: "end",
    nombre: "Endodoncia",
    duracion: 60,
    medico: "Dr. Xavier C.",
    img: {
      uri: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=500",
    },
  },
  {
    id: "cir",
    nombre: "Cirugía",
    duracion: 90,
    medico: "Dr. Darwin Congo",
    img: {
      uri: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=500",
    },
  },
  {
    id: "est",
    nombre: "Estética",
    duracion: 45,
    medico: "Dr. Santiago Benalcazar",
    img: {
      uri: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=500",
    },
  },
  {
    id: "per",
    nombre: "Periodoncia",
    duracion: 30,
    medico: "Dra. Eliana Cespedes",
    img: {
      uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRaqA3a4FMjxIamyVTtGQj7cPs0qTjRjelO7g&s",
    },
  },
  {
    id: "reh",
    nombre: "Rehabilitación",
    duracion: 60,
    medico: "Dr. Jose Cargua",
    img: {
      uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGRLV8Z4wKO2wubIje4glcRu0QajOV7ermLg&s",
    },
  },
  {
    id: "adop",
    nombre: "Odontopediatría",
    duracion: 60,
    medico: "Dra.Sofía Benavides",
    img: {
      uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdw1rCOOQ4GmqRr7LCRE9MmB8GJtgpydrJSg&s",
    },
  },
];

const AgendarCitaClient = () => {
  const router = useRouter();
  const scrollRef = useRef(null);
  const [servicioSel, setServicioSel] = useState(null);
  const [fechaSel, setFechaSel] = useState(null);
  const [horaSel, setHoraSel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bloquesOcupados, setBloquesOcupados] = useState([]);

  const estaListo = servicioSel && fechaSel && horaSel;

  // Obtención de fecha local actual YYYY-MM-DD
  const getHoyLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // 1. ESCUCHA DE OCUPACIÓN
  // 1. ESCUCHA DE OCUPACIÓN DINÁMICA
  useEffect(() => {
    // Solo escuchamos si hay fecha Y un servicio seleccionado (para saber quién es el médico)
    if (!fechaSel || !servicioSel) return;

    const q = query(
      collection(db, "citas"),
      where("fecha", "==", fechaSel),
      where("medico", "==", servicioSel.medico), // <--- Filtro dinámico por médico
      where("estado", "in", ["pendiente", "confirmada"]), // Filtramos citas válidas
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const occupied = [];
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        // Calculamos cuántos bloques de 15 min ocupa la cita
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

      // VALIDACIÓN AUTOMÁTICA: Si la hora ya seleccionada ahora está ocupada por el nuevo médico, la reseteamos
      if (horaSel && occupied.includes(horaSel)) {
        setHoraSel(null);
        Alert.alert(
          "Aviso",
          `El ${servicioSel.medico} no está disponible a las ${horaSel}. Por favor selecciona otro horario.`,
        );
      }
    });

    return () => unsubscribe();
  }, [fechaSel, servicioSel]); // <--- Se dispara al cambiar de servicio

  // 2. GENERADOR DE HORARIOS (Lógica Local de Ibarra)
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
          if (h < horaActual) yaPaso = true;
          if (h === horaActual && m <= minActual) yaPaso = true;
        }

        slots.push({ hora: hStr, disponible: !ocupado && !yaPaso });
      }
    }
    return slots;
  }, [fechaSel, bloquesOcupados]);

  const manejarCerrarSesion = () => {
    Alert.alert("Cerrar Sesión", "¿Deseas salir del sistema 333K?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
            router.replace("/login");
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  const enviarSolicitud = async () => {
    if (!estaListo) return;
    setLoading(true);
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "citas"), {
        pacienteId: user.uid,
        nombrePaciente: user.displayName || "Paciente",
        servicio: servicioSel.nombre,
        duracion: servicioSel.duracion,
        fecha: fechaSel,
        hora: horaSel,
        medico: "Dr. Chávez",
        estado: "pendiente",
        creadoEn: serverTimestamp(),
      });

      const msg = `🦷 *Nueva Solicitud BBBK*\n\nServicio: ${servicioSel.nombre}\nFecha: ${fechaSel}\nHora: ${horaSel}`;
      await Linking.openURL(
        `whatsapp://send?phone=593969743150&text=${encodeURIComponent(msg)}`,
      );
    } catch (e) {
      Alert.alert("Error", e.message);
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
        {/* HEADER MODIFICADO CON BOTÓN ATRÁS */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            {/* NUEVO: Botón Atrás */}
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
          </View>

          <View style={styles.stepIndicator}>
            <View style={[styles.step, servicioSel && styles.stepDone]} />
            <View style={[styles.step, fechaSel && styles.stepDone]} />
            <View style={[styles.step, horaSel && styles.stepDone]} />
          </View>
        </View>

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
                  scrollRef.current?.scrollTo({ y: 400, animated: true });
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

        <View style={styles.section}>
          <Text style={[styles.label, !servicioSel && styles.disabledText]}>
            2. Selecciona la fecha
          </Text>
          <Calendar
            minDate={getHoyLocal()}
            onDayPress={(day) => {
              setFechaSel(day.dateString);
              scrollRef.current?.scrollTo({ y: 850, animated: true });
            }}
            markedDates={{
              [fechaSel]: {
                selected: true,
                selectedColor: COLORS.primaryGreen,
              },
            }}
            theme={{
              todayTextColor: COLORS.primaryGreen,
              arrowColor: COLORS.primaryGreen,
            }}
            style={styles.calendar}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, !fechaSel && styles.disabledText]}>
            3. Elige el horario
          </Text>
          <View style={styles.timeGrid}>
            {horariosFiltrados.map((item) => (
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
            ))}
          </View>
        </View>
      </ScrollView>

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
                {estaListo ? "Pedir Cita Ahora" : "Falta fecha u hora"}
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
    padding: 40,
    backgroundColor: COLORS.darkGreen || "#1A3A34",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: { fontSize: 22, color: "#fff", fontWeight: "bold" },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  logoutBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
  },
  stepIndicator: { flexDirection: "row", marginTop: 15 },
  step: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 5,
    borderRadius: 2,
  },
  stepDone: { backgroundColor: COLORS.primaryGreen || "#8CC63F" },
  section: { padding: 20 },
  label: { fontSize: 17, fontWeight: "bold", color: "#333", marginBottom: 15 },
  disabledText: { color: "#CCC" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  serviceCard: { width: "48%", height: 110, marginBottom: 15 },
  selectedBorder: {
    borderWidth: 3,
    borderColor: COLORS.primaryGreen,
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
  serviceText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
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
    backgroundColor: COLORS.primaryGreen,
    borderColor: COLORS.primaryGreen,
  },
  timeSlotDisabled: { backgroundColor: "#F5F5F5", opacity: 0.6 },
  timeText: { fontSize: 13, fontWeight: "600" },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 35,
    elevation: 10,
    minWidth: 200,
  },
  fabContent: { flexDirection: "row", alignItems: "center" },
  fabText: { color: "#fff", fontWeight: "bold", marginLeft: 10 },
});

export default AgendarCitaClient;
