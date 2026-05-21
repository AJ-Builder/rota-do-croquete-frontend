import {
  Outfit_500Medium,
  Outfit_700Bold,
  useFonts as useOutfit,
} from "@expo-google-fonts/outfit";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  useFonts as useNunito,
} from "@expo-google-fonts/nunito";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../src/ctx/AuthContext";

SplashScreen.preventAutoHideAsync();

function NavigationGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inTabs = segments[0] === "(tabs)";
    const inAppScreen = segments[0] === "add-place" || segments[0] === "place";
    const inOnboarding = segments[0] === "onboarding";

    if (!user) {
      if (!inAuthGroup) router.replace("/(auth)/login");
    } else {
      if (!inTabs && !inAppScreen && !inOnboarding) router.replace("/(tabs)/home");
    }
  }, [user, loading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  const [outfitLoaded] = useOutfit({ Outfit_700Bold, Outfit_500Medium });
  const [nunitoLoaded] = useNunito({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const fontsLoaded = outfitLoaded && nunitoLoaded;

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <NavigationGate />
    </AuthProvider>
  );
}
