import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useState } from "react";
import {
  Alert,
  Platform,
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

const Info = () => {
  const [rating, setRating] = useState(0);
  const direccion = "Manuel de la Chica Narvaez y Velasco 8-63, Ibarra 100150";
  const telefono = "(06) 261-0657";

  const abrirMapa = () => {
    const url = Platform.select({
      ios: `maps:0,0?q=${direccion}`,
      android: `geo:0,0?q=${direccion}`,
    });
    Linking.openURL(url);
  };

  const hacerLlamada = () => {
    Linking.openURL(`tel:${telefono}`);
  };

  const enviarCalificacion = (value) => {
    setRating(value);
    // Aquí podrías integrar la lógica de Firebase para guardar la reseña
    Alert.alert(
      "¡Gracias por tu apoyo!",
      `Has calificado nuestra clínica con ${value} estrellas. Esto nos ayuda a seguir mejorando para ti.`,
      [{ text: "Entendido" }],
    );
  };

  return (
    <ScreenWrapper showBack={true}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* TÍTULO PRINCIPAL */}
        <Text style={styles.mainTitle}>NUESTRA CLÍNICA</Text>

        {/* BANNER DE ESTADO */}
        <View style={styles.statusBanner}>
          <View style={styles.dot} />
          <Text style={styles.statusText}>Abre a las 9:00 a.m. (Martes)</Text>
        </View>

        {/* BLOQUE DE INFORMACIÓN */}
        <InfoItem
          icon="map-marker"
          title="Dirección"
          subtitle={direccion}
          onPress={abrirMapa}
        />

        <InfoItem
          icon="phone"
          title="Teléfono"
          subtitle={telefono}
          onPress={hacerLlamada}
        />

        <InfoItem
          icon="clock-outline"
          title="Horarios"
          subtitle="Lun - Vie: 09:00 - 18:00\nSáb: 09:00 - 13:00"
          color="#34495E"
        />

        {/* PUNTO DE REFERENCIA */}
        <View style={styles.referenceBox}>
          <Text style={styles.referenceTitle}>¿Cómo llegar?</Text>
          <Text style={styles.referenceBody}>
            Estamos ubicados en el sector del{" "}
            <Text style={styles.bold}>Obelisco</Text>. Es el punto de referencia
            más conocido de Ibarra para tu comodidad.
          </Text>
        </View>

        {/* SECCIÓN DE CALIFICACIÓN (EL VALOR AGREGADO) */}
        <View style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>TU OPINIÓN NOS IMPORTA</Text>
          <Text style={styles.ratingSubtitle}>
            Califica tu experiencia con nosotros
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => enviarCalificacion(star)}
                activeOpacity={0.6}
              >
                <MaterialCommunityIcons
                  name={star <= rating ? "star" : "star-outline"}
                  size={38}
                  color={star <= rating ? "#FFD700" : "#BDC3C7"}
                  style={styles.starIcon}
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text style={styles.thanksText}>
              {rating === 5
                ? "¡Eres genial! Gracias por las 5 estrellas ✨"
                : "¡Gracias por tu valoración!"}
            </Text>
          )}
        </View>

        {/* REDES SOCIALES */}
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn} onPress={hacerLlamada}>
            <MaterialCommunityIcons name="whatsapp" size={28} color="#25D366" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn}>
            <MaterialCommunityIcons name="facebook" size={28} color="#1877F2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn}>
            <MaterialCommunityIcons
              name="instagram"
              size={28}
              color="#E4405F"
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    alignItems: "center",
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.darkGreen,
    marginBottom: 5,
    letterSpacing: 1,
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
  statusText: {
    fontSize: 13,
    color: "#C0392B",
    fontWeight: "600",
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    width: "100%",
    padding: 15,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14, // Forma de ardilla (squircle) para estilo moderno
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  textContainer: { flex: 1 },
  infoTitle: {
    fontSize: 13,
    color: "#888",
    fontWeight: "600",
    textTransform: "uppercase",
  },
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
    borderRadius: 20,
    marginTop: 5,
    borderLeftWidth: 6,
    borderLeftColor: "#499A47",
  },
  referenceTitle: { fontSize: 16, fontWeight: "bold", color: "#499A47" },
  referenceBody: { fontSize: 14, color: "#555", marginTop: 5, lineHeight: 20 },
  bold: { fontWeight: "bold", color: "#222" },

  // ESTILOS DE CALIFICACIÓN
  ratingCard: {
    backgroundColor: "#fff",
    width: "100%",
    padding: 20,
    borderRadius: 25,
    marginTop: 25,
    alignItems: "center",
    elevation: 6,
    shadowColor: COLORS.primaryGreen,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "#E8F5E9",
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.darkGreen,
    letterSpacing: 0.5,
  },
  ratingSubtitle: {
    fontSize: 13,
    color: "#7F8C8D",
    marginBottom: 15,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  starIcon: {
    marginHorizontal: 4,
  },
  thanksText: {
    marginTop: 12,
    fontSize: 14,
    color: "#499A47",
    fontWeight: "700",
  },

  socialRow: {
    flexDirection: "row",
    marginTop: 30,
    marginBottom: 30,
  },
  socialBtn: {
    marginHorizontal: 12,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 18,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

export default Info;
