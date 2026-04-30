import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc, increment, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { ScreenWrapper } from ".././components/ScreenWrapper";
import { auth, db } from "../src/api/firebase.config";
import { COLORS } from "../src/constants/theme";

const BENEFICIOS_DATA = [
  {
    id: "1",
    titulo: "Limpieza Dental Gratis",
    puntos: 500,
    icono: "tooth",
    descripcion: "Limpieza profunda con ultrasonido.",
  },
  {
    id: "2",
    titulo: "Blanqueamiento 2x1",
    puntos: 1200,
    icono: "brightness-7",
    descripcion: "Aplica para ti y un acompañante.",
  },
  {
    id: "3",
    titulo: "Descuento del 20%",
    puntos: 300,
    icono: "sale",
    descripcion: "Válido en cualquier tratamiento estético.",
  },
  {
    id: "4",
    titulo: "Kit de Higiene Pro",
    puntos: 150,
    icono: "brush",
    descripcion: "Cepillo eléctrico y seda dental especial.",
  },
];

const BeneficiosScreen = () => {
  const router = useRouter();
  const [misPuntos, setMisPuntos] = useState(0);

  useEffect(() => {
    const fetchPuntos = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMisPuntos(docSnap.data().puntosSalud || 0);
        }
      }
    };
    fetchPuntos();
  }, []);

  const handleCanjear = (beneficio) => {
    if (misPuntos < beneficio.puntos) {
      Alert.alert(
        "Puntos Insuficientes",
        "Sigue cuidando tu salud dental para acumular más puntos.",
      );
      return;
    }

    Alert.alert(
      "Confirmar Canje",
      `¿Deseas canjear ${beneficio.puntos} puntos por: ${beneficio.titulo}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Canjear",
          onPress: async () => {
            try {
              const userRef = doc(db, "users", auth.currentUser.uid);
              await updateDoc(userRef, {
                puntosSalud: increment(-beneficio.puntos),
              });
              setMisPuntos((prev) => prev - beneficio.puntos);
              Alert.alert(
                "¡Éxito!",
                "Tu cupón ha sido generado. Muéstralo en recepción.",
              );
            } catch (error) {
              Alert.alert("Error", "No se pudo procesar el canje.");
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => {
    const puedeCanjear = misPuntos >= item.puntos;

    return (
      <View style={[styles.card, !puedeCanjear && styles.cardDisabled]}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons
            name={item.icono}
            size={30}
            color={COLORS.primaryGreen}
          />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.cardTitle}>{item.titulo}</Text>
          <Text style={styles.cardDesc}>{item.descripcion}</Text>
          <View style={styles.priceTag}>
            <MaterialCommunityIcons
              name="leaf"
              size={14}
              color={COLORS.primaryGreen}
            />
            <Text style={styles.pointsText}>{item.puntos} Puntos Salud</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btnCanjear, !puedeCanjear && styles.btnDisabled]}
          onPress={() => handleCanjear(item)}
        >
          <Text style={styles.btnText}>
            {puedeCanjear ? "Canjear" : "Faltan pts"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScreenWrapper title="Beneficios Salud" onBack={() => router.back()}>
      <View style={styles.headerPuntos}>
        <Text style={styles.headerLabel}>Tu saldo actual:</Text>
        <Text style={styles.headerValue}>
          {misPuntos} <Text style={{ fontSize: 16 }}>pts</Text>
        </Text>
      </View>

      <FlatList
        data={BENEFICIOS_DATA}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  headerPuntos: {
    backgroundColor: COLORS.darkGreen || "#1A3A34",
    padding: 25,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  headerLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600",
  },
  headerValue: { color: "#fff", fontSize: 36, fontWeight: "bold" },
  list: { padding: 20 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 15,
    marginBottom: 15,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  cardDisabled: { opacity: 0.8 },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F0F9EB",
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: { flex: 1, marginLeft: 15, marginRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  cardDesc: { fontSize: 12, color: "#777", marginVertical: 3 },
  priceTag: { flexDirection: "row", alignItems: "center" },
  pointsText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primaryGreen,
    marginLeft: 5,
  },
  btnCanjear: {
    backgroundColor: COLORS.primaryGreen,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  btnDisabled: { backgroundColor: "#CCC" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
});

export default BeneficiosScreen;
