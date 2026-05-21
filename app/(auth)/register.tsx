import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
import { useColors, fonts, radius, shadows, spacing } from "../../src/theme";

export default function Register() {
  const colors = useColors();
  const { register } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!username.trim() || !password) {
      setError("Preenche todos os campos");
      return;
    }
    if (password !== confirm) {
      setError("As passwords não coincidem");
      return;
    }
    if (password.length < 6) {
      setError("A password precisa de ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await register(username.trim(), password);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      setError(e.message ?? "Erro ao registar");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  const s = useMemo(() => StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surface },
    container: { flexGrow: 1, padding: spacing.xl, justifyContent: "center" },
    hero: { alignItems: "center", marginBottom: spacing.xxl },
    heroImage: { width: 140, height: 140, marginBottom: spacing.md, resizeMode: "contain" },
    title: {
      fontFamily: fonts.display,
      fontSize: 30,
      color: colors.primary,
      textAlign: "center",
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.textSecondary,
      marginTop: spacing.sm,
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
    btnText: { fontFamily: fonts.display, fontSize: 17, color: colors.white },
    link: { marginTop: spacing.lg, alignItems: "center" },
    linkText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.brand,
      textDecorationLine: "underline",
    },
  }), [colors]);

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.hero}>
          <Image source={require("../../assets/croquete.png")} style={s.heroImage} />
          <Text style={s.title}>Criar Conta</Text>
          <Text style={s.subtitle}>Junta-te à rota!</Text>
        </View>

        <View style={s.card}>
          <Text style={s.label}>Username</Text>
          <TextInput
            style={s.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="escolhe_um_username"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="mínimo 6 caracteres"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={s.label}>Confirmar Password</Text>
          <TextInput
            style={s.input}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="repetir password"
            placeholderTextColor={colors.textMuted}
          />

          {error ? <Text style={s.error}>{error}</Text> : null}

          <Pressable
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={s.btnText}>Criar Conta</Text>
            )}
          </Pressable>

          <Link href="/(auth)/login" asChild>
            <Pressable style={s.link}>
              <Text style={s.linkText}>Já tens conta? Entrar</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
