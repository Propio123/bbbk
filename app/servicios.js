import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenWrapper } from "../components/ScreenWrapper";
import { COLORS } from "../constants/theme";

const SERVICIOS_DATA = [
  {
    id: "1",
    titulo: "Consulta General",
    descripcion:
      "Evaluación integral de tu salud bucal, limpieza profesional y diagnóstico con cámara intraoral.",
    icon: "tooth-outline",
    precio: "Desde $30",
  },
  {
    id: "2",
    titulo: "Ortodoncia",
    descripcion:
      "Diseño de sonrisa con brackets metálicos, cerámicos o alineadores invisibles para alinear tus dientes.",
    icon: "tooth",
    precio: "Previa valoración",
  },
  {
    id: "3",
    titulo: "Endodoncia",
    descripcion:
      "Tratamiento de conductos para salvar piezas dentales dañadas, eliminando el dolor de raíz.",
    icon: "medical-bag",
    precio: "Desde $120",
  },
  {
    id: "4",
    titulo: "Estética Dental",
    descripcion:
      "Blanqueamiento dental láser, carillas de porcelana y diseño de encías para una sonrisa perfecta.",
    icon: "sparkles",
    precio: "Desde $80",
  },
  {
    id: "5",
    titulo: "Odontopediatría",
    descripcion:
      "Atención especializada para los más pequeños, enfocada en la prevención y pérdida del miedo al dentista.",
    icon: "face-man-shimmer-outline",
    precio: "Desde $35",
  },
];

const Servicios = () => {
  const router = useRouter();

  const renderServicio = ({ item }) => (
    <View style={styles.serviceCard}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name={item.icon} size={32} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.serviceTitle}>{item.titulo.toUpperCase()}</Text>
        <Text style={styles.serviceDesc}>{item.descripcion}</Text>
        <View style={styles.footerCard}>
          <Text style={styles.priceTag}>{item.precio}</Text>
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() => router.push("/agendar")}
          >
            <Text style={styles.bookBtnText}>AGENDAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenWrapper showBack={true}>
      <View style={styles.container}>
        <Text style={styles.mainTitle}>NUESTROS SERVICIOS</Text>
        <Text style={styles.mainSubtitle}>
          Tecnología avanzada para tu bienestar
        </Text>

        <FlatList
          data={SERVICIOS_DATA}
          keyExtractor={(item) => item.id}
          renderItem={renderServicio}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.darkGreen,
    textAlign: "center",
    marginTop: 10,
  },
  mainSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  serviceCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    // Sombra sutil para mantener el estilo de la app
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  iconBox: {
    width: 60,
    height: 60,
    backgroundColor: "#499A47", // El color de fondo del logo para consistencia
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.darkGreen,
    marginBottom: 5,
  },
  serviceDesc: {
    fontSize: 13,
    color: "#777",
    lineHeight: 18,
    marginBottom: 10,
  },
  footerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  priceTag: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.primaryGreen,
  },
  bookBtn: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bookBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
});

export default Servicios;
