import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { COLORS } from "../src/constants/theme";
import HomeScreen from "../src/screens/Home/HomeScreen";
import { useUser } from "./_layout"; // Consumimos el contexto global

export default function Page() {
  const { role, userData } = useUser();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); // Seguro de hidratación activo
  }, []);

  // Si no se ha montado en la web, o el Layout aún está resolviendo el rol en Firebase
  if (!isMounted || role === undefined) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FDFDFD",
        }}
      >
        <ActivityIndicator
          size="large"
          color={COLORS.primaryGreen || "#8CC63F"}
        />
      </View>
    );
  }

  // Renderizamos la vista principal pasándole los datos globales de manera limpia
  return <HomeScreen role={role} userData={userData} />;
}
