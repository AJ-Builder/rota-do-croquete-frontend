import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Clipboard,
  FlatList,
  Platform,
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

interface ActivityItem {
  id: string;
  username: string;
  action: "joined" | "added_place" | "rated";
  place_name: string;
  place_id: string;
  created_at: string;
}

function getInviteUrl(code: string): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/join/${code}`;
  }
  return code;
}

function formatActivity(item: ActivityItem): string {
  if (item.action === "joined") return `${item.username} entrou na rota`;
  if (item.action === "added_place") return `${item.username} adicionou ${item.place_name}`;
  if (item.action === "rated") return `${item.username} avaliou ${item.place_name}`;
  return "";
}

function activityIcon(action: string): string {
  if (action === "joined") return "👋";
  if (action === "added_place") return "📍";
  if (action === "rated") return "⭐";
  return "•";
}

function timeAgo(isoDate: string): string {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

export default function HomeScreen() {
  const { user, activeEvent, setActiveEvent } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      const data = await api.get<Event[]>("/api/events/mine");
      setEvents(data);
    } catch {}
  }, []);

  const loadActivity = useCallback(async () => {
    if (!activeEvent) return;
    try {
      const data = await api.get<ActivityItem[]>(`/api/events/${activeEvent.id}/activity`);
      setActivity(data.slice(0, 5));
    } catch {}
  }, [activeEvent]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    loadActivity();
    const interval = setInterval(loadActivity, 30000);
    return () => clearInterval(interval);
  }, [loadActivity]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadEvents(), loadActivity()]);
    setRefreshing(false);
  }

  async function switchEvent(event: Event) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setActiveEvent(event);
  }

  function copyInvite(code: string) {
    const url = getInviteUrl(code);
    Clipboard.setString(url);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copiado!", "Link de convite copiado. Cola no WhatsApp para convidar amigos! 🧆");
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

              <Pressable style={s.codeRow} onPress={() => copyInvite(activeEvent.invite_code)}>
                <Ionicons name="link-outline" size={14} color={colors.primary} />
                <Text style={s.codeLinkText} numberOfLines={1}>
                  {Platform.OS === "web"
                    ? `…/join/${activeEvent.invite_code}`
                    : activeEvent.invite_code}
                </Text>
                <Ionicons name="copy-outline" size={14} color={colors.primary} />
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

              <Pressable
                style={s.membersBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/event/${activeEvent.id}/members` as any);
                }}
              >
                <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                <Text style={s.membersBtnText}>
                  {user?.id === activeEvent.owner_id ? "Gerir participantes" : "Ver participantes"}
                </Text>
              </Pressable>

              {activity.length > 0 && (
                <View style={s.activitySection}>
                  <Text style={s.activityTitle}>Actividade recente</Text>
                  {activity.map((item) => (
                    <View key={item.id} style={s.activityRow}>
                      <Text style={s.activityIcon}>{activityIcon(item.action)}</Text>
                      <Text style={s.activityText} numberOfLines={1}>
                        {formatActivity(item)}
                      </Text>
                      <Text style={s.activityTime}>{timeAgo(item.created_at)}</Text>
                    </View>
                  ))}
                </View>
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
  greeting: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
  greetingName: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  greetingSub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: 2 },
  activeCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.secondary,
    ...shadows.card,
  },
  activeHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  activeLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: colors.success,
    letterSpacing: 0.8,
  },
  activeName: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginBottom: 4 },
  activeMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  codeLinkText: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.primary,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  quickActions: { flexDirection: "row", gap: spacing.sm },
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
  quickBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.white },
  quickBtnTextOutline: { color: colors.primary },
  membersBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  membersBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textSecondary },
  activitySection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  activityTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 3,
  },
  activityIcon: { fontSize: 12, width: 18, textAlign: "center" },
  activityText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
  activityTime: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xxxl,
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.card,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
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
  eventName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  eventMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  activateBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activateBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.primary },
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
  newRouteBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.primary },
});
