import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../src/ctx/AuthContext";
import { api } from "../../src/lib/api";
import { colors, fonts, radius, shadows, spacing } from "../../src/theme";

interface RankingEntry {
  place_id: string;
  name: string;
  address: string;
  ratings_count: number;
  sabor: number;
  crocancia: number;
  recheio: number;
  qualidade_preco: number;
  global_score: number;
}

type Metric = "global_score" | "sabor" | "crocancia" | "recheio" | "qualidade_preco";

const METRICS: { key: Metric; label: string; emoji: string }[] = [
  { key: "global_score", label: "Global", emoji: "🏆" },
  { key: "sabor", label: "Sabor", emoji: "😋" },
  { key: "crocancia", label: "Crocância", emoji: "💥" },
  { key: "recheio", label: "Recheio", emoji: "🧀" },
  { key: "qualidade_preco", label: "Q/P", emoji: "💰" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

function Stars({ value }: { value: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={value >= i ? "star" : value >= i - 0.5 ? "star-half" : "star-outline"}
          size={12}
          color={colors.secondary}
        />
      ))}
    </View>
  );
}

export default function RankingScreen() {
  const { activeEvent } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metric, setMetric] = useState<Metric>("global_score");

  const loadRanking = useCallback(async () => {
    if (!activeEvent) return;
    try {
      const data = await api.get<RankingEntry[]>(`/api/events/${activeEvent.id}/ranking`);
      setEntries(data);
    } catch {}
  }, [activeEvent]);

  useEffect(() => {
    loadRanking().finally(() => setLoading(false));
    const interval = setInterval(loadRanking, 30000);
    return () => clearInterval(interval);
  }, [loadRanking]);

  async function onRefresh() {
    setRefreshing(true);
    await loadRanking();
    setRefreshing(false);
  }

  const sorted = [...entries].sort((a, b) => b[metric] - a[metric]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.flex}>
      <View style={s.filterRow}>
        {METRICS.map((m) => (
          <Pressable
            key={m.key}
            style={[s.chip, metric === m.key && s.chipActive]}
            onPress={() => setMetric(m.key)}
          >
            <Text style={s.chipEmoji}>{m.emoji}</Text>
            <Text style={[s.chipText, metric === m.key && s.chipTextActive]}>
              {m.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(e) => e.place_id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>📊</Text>
            <Text style={s.emptyTitle}>Ainda sem avaliações</Text>
            <Text style={s.emptyText}>
              Vai a um local e avalia o croquete!
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const score = item[metric];
          const hasRatings = item.ratings_count > 0;
          return (
            <Pressable
              style={[s.card, index === 0 && hasRatings && s.cardFirst]}
              onPress={() => router.push(`/place/${item.place_id}` as any)}
            >
              <View style={s.cardHeader}>
                <Text style={s.medal}>
                  {index < 3 && hasRatings ? MEDALS[index] : `${index + 1}.`}
                </Text>
                <View style={s.cardInfo}>
                  <Text style={s.placeName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={s.placeAddress} numberOfLines={1}>
                    {item.address}
                  </Text>
                  {hasRatings && (
                    <View style={s.votosChip}>
                      <Text style={s.votosChipText}>
                        {item.ratings_count}/{activeEvent?.participants?.length ?? "?"} votos
                      </Text>
                    </View>
                  )}
                </View>
                <View style={s.scoreBox}>
                  <Text style={s.scoreNum}>
                    {hasRatings ? score.toFixed(1) : "—"}
                  </Text>
                  <Text style={s.scoreLabel}>
                    {METRICS.find((m) => m.key === metric)?.emoji}
                  </Text>
                </View>
              </View>

              {hasRatings && metric === "global_score" && (
                <View style={s.breakdown}>
                  {(["sabor", "crocancia", "recheio", "qualidade_preco"] as const).map(
                    (k) => (
                      <View key={k} style={s.breakdownRow}>
                        <Text style={s.breakdownLabel}>
                          {METRICS.find((m) => m.key === k)?.emoji}{" "}
                          {METRICS.find((m) => m.key === k)?.label}
                        </Text>
                        <Stars value={item[k]} />
                        <Text style={s.breakdownVal}>{item[k].toFixed(1)}</Text>
                      </View>
                    )
                  )}
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipEmoji: { fontSize: 13 },
  chipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipTextActive: { color: colors.white },
  list: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 40 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  cardFirst: {
    borderWidth: 2,
    borderColor: colors.secondary,
    ...shadows.strong,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  medal: {
    fontSize: 22,
    width: 36,
    textAlign: "center",
    fontFamily: fonts.display,
    color: colors.text,
  },
  cardInfo: { flex: 1 },
  placeName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
  },
  placeAddress: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scoreBox: { alignItems: "center" },
  scoreNum: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.primary,
  },
  scoreLabel: { fontSize: 14 },
  breakdown: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  breakdownLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    width: 100,
  },
  breakdownVal: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.primary,
    width: 30,
    textAlign: "right",
  },
  votosChip: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  votosChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.textMuted,
  },
  empty: { alignItems: "center", paddingVertical: spacing.xxxl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
