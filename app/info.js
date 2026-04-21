import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking"; // Para llamadas y mapas
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenWrapper } from "../components/ScreenWrapper";
import { COLORS } from "../constants/theme";

const InfoItem = ({ icon, title, subtitle, onPress, color = "#499A47" }) => (
  <TouchableOpacity
    style={styles.infoCard}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={[styles.iconCircle, { backgroundColor: color }]}>
      <MaterialCommunityIcons name={icon} size={26} color="#fff" />
    </View>
    <View style={styles.textContainer}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoSubtitle}>{subtitle}</Text>
    </View>
    {onPress && (
      <MaterialCommunityIcons name="chevron-right" size={24} color="#CCC" />
    )}
  </TouchableOpacity>
);

const InfoScreen = () => {
  const direccion = "Manuel de la Chica Narvaez y Velasco 8-63, Ibarra 100150";
  const telefono = "(06) 261-0657";

  const abrirMapa = () => {
    // eslint-disable-next-line no-undef
    const url = Platform.select({
      ios: `maps:0,0?q=${direccion}`,
      android: `geo:0,0?q=${direccion}`,
      web: `https://www.google.com/maps/search/?api=1&query=${direccion}`,
    });
    Linking.openURL(url);
  };

  const hacerLlamada = () => {
    Linking.openURL(`tel:${telefono}`);
  };

  return (
    <ScreenWrapper showBack={true}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.mainTitle}>CONTACTO Y UBICACIÓN</Text>

        {/* Sección de Estado Actual */}
        <View style={styles.statusBanner}>
          <View style={styles.dot} />
          <Text style={styles.statusText}>Abierto mañana a las 9:00 a.m.</Text>
        </View>

        {/* Tarjetas de Información */}
        <InfoItem
          icon="map-marker"
          title="Dirección"
          subtitle={direccion}
          onPress={abrirMapa}
        />

        <InfoItem
          icon="phone"
          title="Teléfono de Citas"
          subtitle={telefono}
          onPress={hacerLlamada}
        />

        <InfoItem
          icon="clock-outline"
          title="Horario de Atención"
          subtitle="Lun - Vie: 09:00 - 18:00\nSáb: 09:00 - 13:00"
          color="#34495E"
        />

        {/* Sección de Referencia Visual (El Obelisco) */}
        <View style={styles.referenceBox}>
          <Text style={styles.referenceTitle}>Punto de Referencia</Text>
          <Text style={styles.referenceBody}>
            Nos encontramos en el sector del{" "}
            <Text style={styles.bold}>Obelisco de Ibarra</Text>, una zona
            céntrica y de fácil acceso.
          </Text>
        </View>

        {/* Botones de Redes Sociales sutiles */}
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn}>
            <MaterialCommunityIcons name="facebook" size={30} color="#1877F2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn}>
            <MaterialCommunityIcons
              name="instagram"
              size={30}
              color="#E4405F"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn} onPress={hacerLlamada}>
            <MaterialCommunityIcons name="whatsapp" size={30} color="#25D366" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { padding: 20, alignItems: "center" },
  mainTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.darkGreen,
    marginBottom: 5,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF2F2",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 25,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E74C3C",
    marginRight: 8,
  },
  statusText: { fontSize: 13, color: "#C0392B", fontWeight: "600" },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    width: "100%",
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  textContainer: { flex: 1 },
  infoTitle: { fontSize: 14, color: "#888", fontWeight: "600" },
  infoSubtitle: {
    fontSize: 15,
    color: "#333",
    fontWeight: "bold",
    marginTop: 2,
  },
  referenceBox: {
    backgroundColor: "#F9F9F9",
    width: "100%",
    padding: 20,
    borderRadius: 18,
    marginTop: 10,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primaryGreen,
  },
  referenceTitle: { fontSize: 16, fontWeight: "bold", color: COLORS.darkGreen },
  referenceBody: { fontSize: 14, color: "#555", marginTop: 5, lineHeight: 20 },
  bold: { fontWeight: "bold", color: "#333" },
  socialRow: {
    flexDirection: "row",
    marginTop: 30,
    marginBottom: 20,
    justifyContent: "center",
  },
  socialBtn: {
    marginHorizontal: 15,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 15,
    elevation: 2,
  },
});

export default InfoScreen;
