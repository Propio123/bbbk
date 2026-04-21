import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../.././constants/theme";

export const RatingSection = () => {
  const [rating, setRating] = useState(0);

  const handleRating = (value) => {
    setRating(value);
    // Aquí podrías enviar el dato a Firestore
    Alert.alert(
      "¡Gracias!",
      `Has calificado nuestra atención con ${value} estrellas. Tu opinión es muy importante para nosotros.`,
      [{ text: "OK" }],
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>¿Cómo fue tu experiencia?</Text>
      <Text style={styles.subtitle}>Califica nuestra atención</Text>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleRating(star)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={star <= rating ? "star" : "star-outline"}
              size={40}
              color={star <= rating ? "#FFD700" : "#CCC"}
              style={styles.starIcon}
            />
          </TouchableOpacity>
        ))}
      </View>

      {rating > 0 && (
        <Text style={styles.thanksText}>
          {rating === 5
            ? "¡Nos alegra que te encantara! ✨"
            : "Gracias por tu feedback."}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 20,
    alignItems: "center",
    width: "90%",
    alignSelf: "center",
    marginTop: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  starIcon: {
    marginHorizontal: 5,
  },
  thanksText: {
    marginTop: 15,
    fontSize: 14,
    color: COLORS.primaryGreen,
    fontWeight: "600",
  },
});
