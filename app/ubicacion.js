import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenWrapper } from "../components/ScreenWrapper";
import { COLORS } from "../src/constants/theme";

const Ubicacion = () => {
  const router = useRouter();

  // Datos extraídos del enlace de Google Maps proporcionado
  const LAT = "0.3489278";
  const LNG = "-78.1214684";
  const PLACE_ID = "ChIJm6Sa5bc8KiQRmwEZV6xXRCY"; // ID de BBBK Odontología

  const abrirMapa = () => {
    // URL optimizada para abrir directamente en la app de Google Maps o Apple Maps
    const url = `https://www.google.com/maps/search/?api=1&query=${LAT},${LNG}&query_place_id=${PLACE_ID}`;
    Linking.openURL(url);
  };

  const llamarClinica = () => {
    Linking.openURL("tel:+593999036517"); // Número configurado previamente
  };

  return (
    <ScreenWrapper title="Ubicación y Contacto" onBack={() => router.back()}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Card de Mapa con la ubicación real de BBBK */}
        <View style={styles.card}>
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800",
              }}
              style={styles.mapPlaceholder}
            />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>BBBK Odontología</Text>
            </View>
            <TouchableOpacity style={styles.fabMap} onPress={abrirMapa}>
              <MaterialCommunityIcons
                name="google-maps"
                size={30}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.addressTitle}>Nuestra Ubicación</Text>
            <Text style={styles.addressText}>
              Juan de Velasco 7-39 y Olmedo{"\n"}
              Ibarra 100105, Imbabura{"\n"}
              Ecuador
            </Text>

            <View style={styles.ratingRow}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <MaterialCommunityIcons
                    key={s}
                    name="star"
                    size={20}
                    color="#FFD700"
                  />
                ))}
              </View>
              <Text style={styles.ratingText}>
                Excelente reputación en Ibarra
              </Text>
            </View>
          </View>
        </View>

        {/* Botones de Acción */}
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={llamarClinica}>
            <MaterialCommunityIcons
              name="phone"
              size={28}
              color={COLORS.primaryGreen}
            />
            <Text style={styles.actionLabel}>Llamar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnActive]}
            onPress={abrirMapa}
          >
            <MaterialCommunityIcons name="navigation" size={28} color="#fff" />
            <Text style={[styles.actionLabel, { color: "#fff" }]}>
              Cómo llegar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Horarios actualizados */}
        <View style={styles.hoursCard}>
          <Text style={styles.sectionTitle}>Horarios de Atención</Text>
          <View style={styles.hourRow}>
            <Text style={styles.dayText}>Lunes a Viernes</Text>
            <Text style={styles.timeText}>08:30 - 18:30</Text>
          </View>
          <View style={styles.hourRow}>
            <Text style={styles.dayText}>Sábado</Text>
            <Text style={styles.timeText}>09:00 - 13:00</Text>
          </View>
          <View style={styles.hourRow}>
            <Text style={[styles.dayText, { color: "#e74c3c" }]}>Domingo</Text>
            <Text style={styles.timeText}>Cerrado</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <MaterialCommunityIcons
            name="check-decagram"
            size={24}
            color={COLORS.primaryGreen}
          />
          <Text style={styles.footerText}>Cuidado dental de alta calidad</Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginBottom: 20,
  },
  imageContainer: { height: 180, position: "relative" },
  mapPlaceholder: { width: "100%", height: "100%", backgroundColor: "#eee" },
  badge: {
    position: "absolute",
    top: 15,
    left: 15,
    backgroundColor: "rgba(26, 58, 52, 0.85)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  fabMap: {
    position: "absolute",
    bottom: 15,
    right: 15,
    backgroundColor: COLORS.primaryGreen,
    padding: 12,
    borderRadius: 30,
    elevation: 5,
  },
  infoSection: { padding: 20 },
  addressTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  addressText: { fontSize: 15, color: "#666", lineHeight: 22 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 15,
  },
  stars: { flexDirection: "row", marginRight: 10 },
  ratingText: { fontSize: 13, color: "#888", fontWeight: "600" },
  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  actionBtn: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  actionBtnActive: {
    backgroundColor: COLORS.primaryGreen,
    borderColor: COLORS.primaryGreen,
  },
  actionLabel: {
    marginTop: 8,
    fontWeight: "bold",
    fontSize: 14,
    color: COLORS.primaryGreen,
  },
  hoursCard: {
    backgroundColor: "#F9F9F9",
    padding: 20,
    borderRadius: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  hourRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dayText: { fontSize: 15, color: "#555" },
  timeText: { fontSize: 15, fontWeight: "600", color: "#333" },
  footer: { alignItems: "center", paddingBottom: 20 },
  footerText: { marginTop: 5, color: "#888", fontSize: 14 },
});

export default Ubicacion;
