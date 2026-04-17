import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
    collection,
    onSnapshot,
    orderBy,
    query,
    where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { auth, db } from "../src/api/firebase.config";
import { COLORS } from "../src/constants/theme";

const MisCitas = () => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Consulta: Citas donde el pacienteId coincida con el usuario actual
    const q = query(
      collection(db, "citas"),
      where("pacienteId", "==", auth.currentUser.uid),
      orderBy("fecha", "asc"),
    );

    // Escucha en tiempo real
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const listaCitas = [];
      querySnapshot.forEach((doc) => {
        listaCitas.push({ id: doc.id, ...doc.data() });
      });
      setCitas(listaCitas);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderCita = ({ item }) => (
    <View style={styles.citaCard}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name="calendar-check"
          size={28}
          color={COLORS.primaryGreen}
        />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.servicioText}>{item.servicio.toUpperCase()}</Text>
        <Text style={styles.fechaText}>
          📅 {item.fecha} | ⏰ {item.hora}
        </Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.estado === "pendiente" ? "#FFE0B2" : "#C8E6C9",
            },
          ]}
        >
          <Text style={styles.statusText}>{item.estado}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primaryGreen} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Próximas Citas</Text>
      </View>

      {citas.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons
            name="calendar-blank"
            size={60}
            color="#CCC"
          />
          <Text style={styles.emptyText}>Aún no tienes citas programadas.</Text>
        </View>
      ) : (
        <FlatList
          data={citas}
          keyExtractor={(item) => item.id}
          renderItem={renderCita}
          contentContainerStyle={{ padding: 20 }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    padding: 30,
    backgroundColor: COLORS.primaryGreen,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  citaCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  iconContainer: {
    width: 60,
    height: 60,
    backgroundColor: "#F0F9EB",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  infoContainer: { flex: 1, justifyContent: "center" },
  servicioText: { fontSize: 16, fontWeight: "bold", color: COLORS.darkGreen },
  fechaText: { fontSize: 14, color: "#666", marginVertical: 5 },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: { fontSize: 10, fontWeight: "bold", textTransform: "uppercase" },
  emptyText: { marginTop: 10, color: "#999", fontSize: 16 },
});

export default MisCitas;
