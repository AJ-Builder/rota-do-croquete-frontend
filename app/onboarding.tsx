import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../src/ctx/AuthContext";
import { api } from "../src/lib/api";
import { colors, fonts, radius, shadows, spacing } from "../src/theme";

export default function Onboarding() {
  const { user, setActiveEvent, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [routeName, setRouteName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!routeName.trim()) {
      setError("Dá um nome à rota");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const event = await api.post<any>("/api/events", { name: routeName.trim() });
      await setActiveEvent(event);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      setError(e.message ?? "Erro ao criar rota");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!code.trim()) {
      setError("Introduz o código da rota");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const event = await api.post<any>("/api/events/join", {
        code: code.trim().toUpperCase(),
      });
      await setActiveEvent(event);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      setError(e.message ?? "Código inválido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.hero}>
          <Text style={s.emoji}>🗺️</Text>
          <Text style={s.title}>Olá, {user?.username}!</Text>
          <Text style={s.subtitle}>Cria ou junta-te a uma rota de croquetes</Text>
        </View>

        <View style={s.tabs}>
          <Pressable
            style={[s.tabBtn, tab === "create" && s.tabBtnActive]}
            onPress={() => { setTab("create"); setError(""); }}
          >
            <Text style={[s.tabText, tab === "create" && s.tabTextActive]}>
              Criar Rota
            </Text>
          </Pressable>
          <Pressable
            style={[s.tabBtn, tab === "join" && s.tabBtnActive]}
            onPress={() => { setTab("join"); setError(""); }}
          >
            <Text style={[s.tabText, tab === "join" && s.tabTextActive]}>
              Entrar com Código
            </Text>
          </Pressable>
        </View>

        <View style={s.card}>
          {tab === "create" ? (
            <>
              <Text style={s.label}>Nome da Rota</Text>
              <TextInput
                style={s.input}
                value={routeName}
                onChangeText={setRouteName}
                placeholder="ex: Rota do Croquete Lisboa 2025"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={s.hint}>
                Vais receber um código para partilhar com os amigos.
              </Text>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <Pressable
                style={[s.btn, loading && s.btnDisabled]}
                onPress={handleCreate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={s.btnText}>Criar Rota 🧆</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={s.label}>Código de Convite</Text>
              <TextInput
                style={[s.input, s.codeInput]}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                placeholder="CROQ-XXXXXX"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={s.hint}>
                Pede o código ao amigo que criou a rota.
              </Text>
              {error ? <Text style={s.error}>{error}</Text> : null}
              <Pressable
                style={[s.btn, loading && s.btnDisabled]}
                onPress={handleJoin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={s.btnText}>Entrar na Rota 🚀</Text>
                )}
              </Pressable>
            </>
          )}
        </View>

        <Pressable style={s.logoutBtn} onPress={logout}>
          <Text style={s.logoutText}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  container: { flexGrow: 1, padding: spacing.xl, justifyContent: "center" },
  hero: { alignItems: "center", marginBottom: spacing.xxl },
  emoji: { fontSize: 56, marginBottom: spacing.md },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.primary,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.sm,
  },
  tabBtnActive: { backgroundColor: colors.card, ...shadows.card },
  tabText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  tabTextActive: { color: colors.primary },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadows.card,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  codeInput: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 2,
    textAlign: "center",
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.error,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
    marginTop: spacing.xl,
    ...shadows.strong,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontFamily: fonts.display, fontSize: 17, color: colors.white },
  logoutBtn: { alignItems: "center", marginTop: spacing.xxl },
  logoutText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textDecorationLine: "underline",
  },
});
