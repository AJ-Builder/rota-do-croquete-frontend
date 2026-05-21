import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../src/ctx/AuthContext";
import { colors, fonts, radius, shadows, spacing } from "../../src/theme";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!username.trim() || !password) {
      setError("Preenche todos os campos");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await login(username.trim(), password);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      setError(e.message ?? "Erro ao entrar");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
          <Image source={require("../../assets/croquete.png")} style={s.heroImage} />
          <Text style={s.title}>Rota do Croquete</Text>
          <Text style={s.subtitle}>A melhor rota gastronómica de Portugal</Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Username</Text>
          <TextInput
            style={s.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="o_teu_username"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••"
            placeholderTextColor={colors.textMuted}
          />

          {error ? <Text style={s.error}>{error}</Text> : null}

          <Pressable
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={s.btnText}>Entrar 🚀</Text>
            )}
          </Pressable>

          <Link href="/(auth)/register" asChild>
            <Pressable style={s.link}>
              <Text style={s.linkText}>Ainda não tens conta? Regista-te</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  container: {
    flexGrow: 1,
    padding: spacing.xl,
    justifyContent: "center",
  },
  hero: { alignItems: "center", marginBottom: spacing.xxl },
  heroImage: { width: 140, height: 140, marginBottom: spacing.md, resizeMode: "contain" },
  title: {
    fontFamily: fonts.display,
    fontSize: 32,
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
    marginTop: spacing.md,
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
  btnText: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.white,
  },
  link: { marginTop: spacing.lg, alignItems: "center" },
  linkText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.brand,
    textDecorationLine: "underline",
  },
});
