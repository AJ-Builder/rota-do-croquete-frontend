import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../src/ctx/AuthContext";
import { api, searchNominatim } from "../src/lib/api";
import { useColors, fonts, radius, shadows, spacing } from "../src/theme";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: { road?: string; city?: string; town?: string; country?: string };
}

export default function AddPlace() {
  const colors = useColors();
  const { activeEvent } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    setResults([]);
    try {
      const data = await searchNominatim(query.trim() + " Portugal");
      if (data.length === 0) setError("Nenhum resultado. Tenta ser mais específico.");
      setResults(data);
    } catch {
      setError("Erro na pesquisa. Verifica a ligação à internet.");
    } finally {
      setSearching(false);
    }
  }

  async function addPlace(result: NominatimResult) {
    if (!activeEvent) return;
    setAdding(result.place_id);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const name = result.display_name.split(",")[0].trim();
      const address = result.display_name;
      await api.post(`/api/events/${activeEvent.id}/places`, {
        name,
        address,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      });
      router.back();
    } catch (e: any) {
      setError(e.message ?? "Erro ao adicionar");
    } finally {
      setAdding(null);
    }
  }

  const s = useMemo(() => StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surface },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingTop: 56,
      paddingBottom: spacing.md,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.md,
    },
    back: { padding: 4 },
    title: {
      fontFamily: fonts.display,
      fontSize: 20,
      color: colors.text,
    },
    searchRow: {
      flexDirection: "row",
      gap: spacing.sm,
      padding: spacing.lg,
      paddingBottom: spacing.sm,
    },
    input: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.sm,
      padding: spacing.md,
      fontSize: 15,
      fontFamily: fonts.body,
      color: colors.text,
      backgroundColor: colors.card,
    },
    searchBtn: {
      width: 48,
      height: 48,
      borderRadius: radius.sm,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      ...shadows.strong,
    },
    error: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.error,
      textAlign: "center",
      paddingHorizontal: spacing.xl,
    },
    list: { padding: spacing.lg, gap: spacing.sm },
    result: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: spacing.md,
      ...shadows.card,
    },
    resultIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    resultInfo: { flex: 1 },
    resultName: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.text,
    },
    resultAddress: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    hint: { alignItems: "center", paddingTop: spacing.xxxl },
    hintEmoji: { fontSize: 40, marginBottom: spacing.md },
    hintText: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 22,
    },
  }), [colors]);

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={s.header}>
        <Pressable style={s.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={s.title}>Adicionar Local</Text>
      </View>

      <View style={s.searchRow}>
        <TextInput
          style={s.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Pesquisar restaurante ou bar..."
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          onSubmitEditing={search}
          autoFocus
        />
        <Pressable style={s.searchBtn} onPress={search} disabled={searching}>
          {searching ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="search" size={20} color={colors.white} />
          )}
        </Pressable>
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      <FlatList
        data={results}
        keyExtractor={(r) => String(r.place_id)}
        contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !searching && results.length === 0 ? (
            <View style={s.hint}>
              <Text style={s.hintEmoji}>🔍</Text>
              <Text style={s.hintText}>
                Pesquisa pelo nome do sítio ou morada.{"\n"}Os resultados vêm do OpenStreetMap.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable style={s.result} onPress={() => addPlace(item)}>
            <View style={s.resultIcon}>
              <Ionicons name="location" size={20} color={colors.primary} />
            </View>
            <View style={s.resultInfo}>
              <Text style={s.resultName} numberOfLines={1}>
                {item.display_name.split(",")[0].trim()}
              </Text>
              <Text style={s.resultAddress} numberOfLines={2}>
                {item.display_name}
              </Text>
            </View>
            {adding === item.place_id ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            )}
          </Pressable>
        )}
      />
    </KeyboardAvoidingView>
  );
}
