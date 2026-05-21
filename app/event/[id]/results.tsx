import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../../src/ctx/AuthContext";
import { api } from "../../../src/lib/api";
import { useColors, fonts, radius, shadows, spacing } from "../../../src/theme";

interface RankingEntry {
  place_id: string;
  name: string;
  address: string;
  ratings_count: number;
  global_score: number;
  sabor: number;
  crocancia: number;
  recheio: number;
  qualidade_preco: number;
}

interface Participant {
  id: string;
  username: string;
  is_owner: boolean;
}

interface EventDetail {
  id: string;
  name: string;
  created_at: string;
  cover_photo_base64?: string;
  participants: string[];
  owner_id: string;
}

const MEDALS = ["🥇", "🥈", "🥉"];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ResultsScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [ev, rank, parts] = await Promise.all([
        api.get<EventDetail>(`/api/events/${id}`),
        api.get<RankingEntry[]>(`/api/events/${id}/ranking`),
        api.get<Participant[]>(`/api/events/${id}/participants`),
      ]);
      setEvent(ev);
      setRanking(rank.filter((r) => r.ratings_count > 0));
      setParticipants(parts);
    } catch {}
  }, [id]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  function share() {
    const url =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.href
        : `https://rota-do-croquete-frontend.onrender.com/event/${id}/results`;

    if (Platform.OS === "web" && (navigator as any).share) {
      (navigator as any).share({
        title: `Resultados — ${event?.name}`,
        text: "Os resultados da nossa rota do croquete 🧆",
        url,
      }).catch(() => {});
    } else {
      Clipboard.setString(url);
      Alert.alert("Link copiado!", "Cola no WhatsApp para partilhar os resultados 🧆");
    }
  }

  const s = useMemo(() => StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surface },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    container: { padding: spacing.lg, paddingBottom: 60 },
    back: { marginBottom: spacing.md },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      overflow: "hidden",
      ...shadows.strong,
      marginBottom: spacing.lg,
    },
    coverPhoto: { width: "100%", height: 200, resizeMode: "cover" },
    coverGradient: {
      height: 140,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    coverEmoji: { fontSize: 60 },
    cardBody: { padding: spacing.xl, gap: spacing.sm },
    eventName: {
      fontFamily: fonts.display,
      fontSize: 24,
      color: colors.text,
      textAlign: "center",
    },
    eventDate: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: spacing.md,
    },
    podium: {
      flexDirection: "row",
      gap: spacing.sm,
      marginVertical: spacing.md,
    },
    podiumItem: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    podiumFirst: {
      backgroundColor: "#FFF3E0",
      borderColor: colors.secondary,
      borderWidth: 2,
    },
    podiumMedal: { fontSize: 24 },
    podiumName: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: colors.text,
      textAlign: "center",
    },
    podiumScore: {
      fontFamily: fonts.display,
      fontSize: 20,
      color: colors.primary,
    },
    podiumVotes: {
      fontFamily: fonts.body,
      fontSize: 10,
      color: colors.textMuted,
    },
    restList: {
      gap: 6,
      marginBottom: spacing.sm,
    },
    restRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    restPosition: {
      fontFamily: fonts.display,
      fontSize: 14,
      color: colors.textMuted,
      width: 24,
    },
    restName: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
    restScore: { fontFamily: fonts.display, fontSize: 14, color: colors.primary },
    empty: { paddingVertical: spacing.xl, alignItems: "center" },
    emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
    participantsLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    participantsNames: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    branding: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.md,
      letterSpacing: 0.5,
    },
    shareBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      padding: spacing.lg,
      ...shadows.strong,
    },
    shareBtnText: { fontFamily: fonts.display, fontSize: 17, color: colors.white },
    hint: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.md,
    },
  }), [colors]);

  if (loading || !event) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <ScrollView style={s.flex} contentContainerStyle={s.container}>
      {/* Back */}
      <Pressable style={s.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Pressable>

      {/* Card — screenshot-friendly */}
      <View style={s.card}>
        {/* Cover photo */}
        {event.cover_photo_base64 ? (
          <Image source={{ uri: event.cover_photo_base64 }} style={s.coverPhoto} />
        ) : (
          <View style={s.coverGradient}>
            <Text style={s.coverEmoji}>🧆</Text>
          </View>
        )}

        <View style={s.cardBody}>
          {/* Header */}
          <Text style={s.eventName}>{event.name}</Text>
          <Text style={s.eventDate}>{formatDate(event.created_at)}</Text>

          {/* Podium — top 3 */}
          {top3.length > 0 && (
            <View style={s.podium}>
              {top3.map((entry, idx) => (
                <View key={entry.place_id} style={[s.podiumItem, idx === 0 && s.podiumFirst]}>
                  <Text style={s.podiumMedal}>{MEDALS[idx]}</Text>
                  <Text style={s.podiumName} numberOfLines={2}>{entry.name}</Text>
                  <Text style={s.podiumScore}>{entry.global_score.toFixed(1)}</Text>
                  <Text style={s.podiumVotes}>{entry.ratings_count} votos</Text>
                </View>
              ))}
            </View>
          )}

          {/* Rest of ranking */}
          {rest.length > 0 && (
            <View style={s.restList}>
              {rest.map((entry, idx) => (
                <View key={entry.place_id} style={s.restRow}>
                  <Text style={s.restPosition}>{idx + 4}.</Text>
                  <Text style={s.restName} numberOfLines={1}>{entry.name}</Text>
                  <Text style={s.restScore}>{entry.global_score.toFixed(1)} ⭐</Text>
                </View>
              ))}
            </View>
          )}

          {ranking.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyText}>Ainda sem avaliações nesta rota.</Text>
            </View>
          )}

          {/* Divider */}
          <View style={s.divider} />

          {/* Participants */}
          <Text style={s.participantsLabel}>Participantes</Text>
          <Text style={s.participantsNames}>
            {participants.map((p) => p.username).join(" · ")}
          </Text>

          {/* Branding */}
          <Text style={s.branding}>🧆 Rota do Croquete</Text>
        </View>
      </View>

      {/* Share button */}
      <Pressable style={s.shareBtn} onPress={share}>
        <Ionicons name="share-outline" size={20} color={colors.white} />
        <Text style={s.shareBtnText}>Partilhar resultados</Text>
      </Pressable>

      <Text style={s.hint}>Tira um screenshot do card para partilhar no WhatsApp</Text>
    </ScrollView>
  );
}
