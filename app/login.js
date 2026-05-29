import { useRouter } from "expo-router";
import LoginScreen from "../src/screens/Auth/LoginScreen";

export default function LoginPage() {
  const router = useRouter();

  return <LoginScreen onSwitchToRegister={() => router.push("/register")} />;
}
