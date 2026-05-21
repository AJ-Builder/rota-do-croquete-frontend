import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/ctx/AuthContext";
import { api } from "../../src/lib/api";
import { colors, fonts, radius, shadows, spacing } from "../../src/theme";

interface EventData {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  participants: string[];
  created_at: string;
}

export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { user, loading, setActiveEvent } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || !code) return;
    if (user) {
      doJoin();
    } else {
      AsyncStorage.setItem("croquete_pending_join", code as string).then(() => {
        router.replace("/(auth)/register");
      });
    }
  }, [user, loading, code]);

  async function doJoin() {
    try {
      const event = await api.post<EventData>("/api/events/join", { code });
      await setActiveEvent(event);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      setError(e.message ?? "Código inválido");
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.emoji}>🧆</Text>
      {error ? (
        <>
          <Text style={s.title}>Oops!</Text>
          <Text style={s.sub}>{error}</Text>
          <Pressable style={s.btn} onPress={() => router.replace("/(tabs)/home")}>
            <Text style={s.btnText}>Ir para o início</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={s.title}>Rota do Croquete</Text>
          <Text style={s.sub}>A entrar na rota...</Text>
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.xl }} />
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  emoji: { fontSize: 72, marginBottom: spacing.lg },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.text,
    textAlign: "center",
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  btn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadows.strong,
  },
  btnText: { fontFamily: fonts.display, fontSize: 16, color: colors.white },
});
