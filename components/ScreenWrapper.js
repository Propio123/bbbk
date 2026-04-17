import { Image, SafeAreaView, StyleSheet, View } from "react-native";
import { COLORS } from "../constants/theme";

export const ScreenWrapper = ({ children }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        {/* Aquí inyectas el logo una sola vez */}
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primaryGreen },
  logoContainer: {
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  logo: { width: 120, height: 40 },
  content: { flex: 1 },
});
