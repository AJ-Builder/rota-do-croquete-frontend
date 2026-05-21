import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Clipboard,
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

interface Event {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  participants: string[];
  created_at: string;
}

export default function HomeScreen() {
  const { user, activeEvent, setActiveEvent } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const data = await api.get<Event[]>("/api/events/mine");
      setEvents(data);
    } catch {}
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  async function onRefresh() {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }

  async function switchEvent(event: Event) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setActiveEvent(event);
  }

  function copyCode(code: string) {
    Clipboard.setString(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copiado!", `Código ${code} copiado. Cola no WhatsApp para convidar amigos.`);
  }

  const otherEvents = events.filter((e) => e.id !== activeEvent?.id);

  return (
    <FlatList
      style={s.flex}
      contentContainerStyle={s.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListHeaderComponent={
        <>
          {/* Greeting */}
          <View style={s.greeting}>
            <Text style={s.greetingName}>Olá, {user?.username}!</Text>
            <Text style={s.greetingSub}>Pronto para descobrir croquetes?</Text>
          </View>

          {/* Active route card */}
          {activeEvent ? (
            <View style={s.activeCard}>
              <View style={s.activeHeader}>
                <View style={s.activeDot} />
                <Text style={s.activeLabel}>ROTA ACTIVA</Text>
              </View>
              <Text style={s.activeName}>{activeEvent.name}</Text>
              <Text style={s.activeMeta}>
                {activeEvent.participants.length} participante
                {activeEvent.participants.length !== 1 ? "s" : ""}
              </Text>

              <Pressable style={s.codeRow} onPress={() => copyCode(activeEvent.invite_code)}>
                <Text style={s.codeLabel}>Código de convite:</Text>
                <View style={s.codePill}>
                  <Text style={s.codeText}>{activeEvent.invite_code}</Text>
                  <Ionicons name="copy-outline" size={14} color={colors.primary} />
                </View>
              </Pressable>

              <View style={s.quickActions}>
                <Pressable
                  style={s.quickBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/(tabs)/map");
                  }}
                >
                  <Ionicons name="map" size={24} color={colors.white} />
                  <Text style={s.quickBtnText}>Mapa</Text>
                </Pressable>
                <Pressable
                  style={[s.quickBtn, s.quickBtnOutline]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/(tabs)/places");
                  }}
                >
                  <Ionicons name="list" size={24} color={colors.primary} />
                  <Text style={[s.quickBtnText, s.quickBtnTextOutline]}>Locais</Text>
                </Pressable>
                <Pressable
                  style={[s.quickBtn, s.quickBtnOutline]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/(tabs)/ranking");
                  }}
                >
                  <Ionicons name="trophy" size={24} color={colors.primary} />
                  <Text style={[s.quickBtnText, s.quickBtnTextOutline]}>Ranking</Text>
                </Pressable>
              </View>

              {user?.id === activeEvent.owner_id && (
                <Pressable
                  style={s.membersBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/event/${activeEvent.id}/members`);
                  }}
                >
                  <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                  <Text style={s.membersBtnText}>Gerir participantes</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={s.emptyCard}>
              <Text style={s.emptyEmoji}>🧆</Text>
              <Text style={s.emptyTitle}>Sem rota activa</Text>
              <Text style={s.emptySub}>
                Cria uma nova rota ou entra numa existente com um código de convite
              </Text>
            </View>
          )}

          {otherEvents.length > 0 && (
            <Text style={s.sectionTitle}>Outras rotas</Text>
          )}
        </>
      }
      data={otherEvents}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => (
        <Pressable style={s.eventCard} onPress={() => switchEvent(item)}>
          <View style={s.eventInfo}>
            <Text style={s.eventName}>{item.name}</Text>
            <Text style={s.eventMeta}>
              {item.participants.length} participante
              {item.participants.length !== 1 ? "s" : ""} · {item.invite_code}
            </Text>
          </View>
          <View style={s.activateBadge}>
            <Text style={s.activateBadgeText}>Activar</Text>
          </View>
        </Pressable>
      )}
      ListFooterComponent={
        <Pressable style={s.newRouteBtn} onPress={() => router.push("/onboarding")}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={s.newRouteBtnText}>Nova rota / entrar com código</Text>
        </Pressable>
      }
    />
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  greeting: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  greetingName: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.text,
  },
  greetingSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  activeCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.secondary,
    ...shadows.card,
  },
  activeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.sm,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success ?? "#27AE60",
  },
  activeLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.success ?? "#27AE60",
    letterSpacing: 0.8,
  },
  activeName: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
    marginBottom: 4,
  },
  activeMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    alignSelf: "flex-start",
  },
  codeLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  codePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeText: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.primary,
    letterSpacing: 1,
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: 4,
    ...shadows.card,
  },
  quickBtnOutline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  quickBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.white,
  },
  quickBtnTextOutline: {
    color: colors.primary,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xxxl,
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.card,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text,
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.text,
    marginTop: spacing.sm,
  },
  eventCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadows.card,
  },
  eventInfo: { flex: 1 },
  eventName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
  },
  eventMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  activateBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activateBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.primary,
  },
  membersBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  membersBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  newRouteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginTop: spacing.sm,
    ...shadows.card,
  },
  newRouteBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.primary,
  },
});
