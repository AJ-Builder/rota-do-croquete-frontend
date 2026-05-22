import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Clipboard,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../src/ctx/AuthContext";
import { api } from "../../src/lib/api";
import { useColors, fonts, radius, shadows, spacing } from "../../src/theme";

interface Event {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  participants: string[];
  created_at: string;
  cover_photo_base64?: string;
}


const APP_ORIGIN = "https://rota-do-croquete-frontend.onrender.com";

function getInviteUrl(code: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/join/${code}`;
  }
  return `${APP_ORIGIN}/join/${code}`;
}


export default function HomeScreen() {
  const colors = useColors();
  const { user, activeEvent, setActiveEvent, refreshEvent } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverAspectRatio, setCoverAspectRatio] = useState<number | null>(null);
  const [photoFullscreen, setPhotoFullscreen] = useState(false);

  useEffect(() => {
    const uri = activeEvent?.cover_photo_base64;
    if (!uri) { setCoverAspectRatio(null); return; }
    Image.getSize(uri, (w, h) => { if (h > 0) setCoverAspectRatio(w / h); }, () => {});
  }, [activeEvent?.cover_photo_base64]);

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

  function uploadCover() {
    if (Platform.OS !== "web") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.cssText = "position:fixed;top:-100px;opacity:0;";
    document.body.appendChild(input);
    input.onchange = async () => {
      document.body.removeChild(input);
      const file = input.files?.[0];
      if (!file || !activeEvent) return;
      setUploadingCover(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const updated = await api.put<Event>(`/api/events/${activeEvent.id}/cover`, {
            cover_photo_base64: reader.result as string,
          });
          await setActiveEvent(updated);
        } catch (e: any) {
          Alert.alert("Erro", e.message);
        } finally {
          setUploadingCover(false);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function saveCoverPhoto(uri: string) {
    if (typeof window === "undefined") return;
    const a = document.createElement("a");
    a.href = uri;
    a.download = "rota-croquete.jpg";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function copyInvite(code: string) {
    const url = getInviteUrl(code);
    Clipboard.setString(url);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copiado!", "Link de convite copiado. Cola no WhatsApp para convidar amigos! 🍻");
  }

  const otherEvents = events.filter((e) => e.id !== activeEvent?.id);

  const s = useMemo(() => StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  greeting: { paddingTop: spacing.sm, paddingBottom: spacing.xs },
  greetingName: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  greetingSub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: 2 },
  activeCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.secondary,
    ...shadows.card,
  },
  coverContainer: { position: "relative" },
  coverPhoto: { width: "100%", resizeMode: "contain" },
  coverEditBtn: {
    position: "absolute", bottom: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20, padding: 8,
  },
  coverPlaceholder: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, paddingVertical: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  coverPlaceholderText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  activeCardContent: { padding: spacing.xl },
  bottomBtns: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  resultsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
  },
  resultsBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.primary },
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
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  membersBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textSecondary },
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
  photoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoFullImg: { width: "100%", height: "100%" },
  photoCloseBtn: {
    position: "absolute", top: 52, right: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20, padding: 10, zIndex: 10,
  },
  photoSaveBtn: {
    position: "absolute", bottom: 48,
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12,
  },
  photoSaveBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: "white" },
  }), [colors]);

  return (
    <>
    {activeEvent?.cover_photo_base64 && (
      <Modal visible={photoFullscreen} transparent animationType="fade" onRequestClose={() => setPhotoFullscreen(false)}>
        <View style={s.photoOverlay}>
          <Pressable style={s.photoCloseBtn} onPress={() => setPhotoFullscreen(false)}>
            <Ionicons name="close" size={24} color="white" />
          </Pressable>
          <Image
            source={{ uri: activeEvent.cover_photo_base64 }}
            style={s.photoFullImg}
            resizeMode="contain"
          />
          <Pressable style={s.photoSaveBtn} onPress={() => saveCoverPhoto(activeEvent.cover_photo_base64!)}>
            <Ionicons name="download-outline" size={20} color="white" />
            <Text style={s.photoSaveBtnText}>Guardar foto</Text>
          </Pressable>
        </View>
      </Modal>
    )}
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
              {/* Cover photo */}
              {activeEvent.cover_photo_base64 ? (
                <Pressable style={s.coverContainer} onPress={() => setPhotoFullscreen(true)}>
                  <Image
                    source={{ uri: activeEvent.cover_photo_base64 }}
                    style={[s.coverPhoto, coverAspectRatio ? { aspectRatio: coverAspectRatio } : { height: 200 }]}
                  />
                  {user?.id === activeEvent.owner_id && (
                    <Pressable style={s.coverEditBtn} onPress={(e) => { e.stopPropagation?.(); uploadCover(); }} disabled={uploadingCover}>
                      <Ionicons name="camera" size={16} color={colors.white} />
                    </Pressable>
                  )}
                </Pressable>
              ) : user?.id === activeEvent.owner_id ? (
                <Pressable style={s.coverPlaceholder} onPress={uploadCover} disabled={uploadingCover}>
                  <Ionicons name="camera-outline" size={22} color={colors.textMuted} />
                  <Text style={s.coverPlaceholderText}>Adicionar foto de grupo</Text>
                </Pressable>
              ) : null}

              <View style={s.activeCardContent}>
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
                  {getInviteUrl(activeEvent.invite_code)}
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

              <View style={s.bottomBtns}>
                <Pressable
                  style={s.membersBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/event/${activeEvent.id}/members` as any);
                  }}
                >
                  <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                  <Text style={s.membersBtnText}>
                    {user?.id === activeEvent.owner_id ? "Gerir" : "Participantes"}
                  </Text>
                </Pressable>
                <Pressable
                  style={s.resultsBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/event/${activeEvent.id}/results` as any);
                  }}
                >
                  <Ionicons name="trophy-outline" size={16} color={colors.primary} />
                  <Text style={s.resultsBtnText}>Resultados</Text>
                </Pressable>
              </View>

              </View>{/* end activeCardContent */}
            </View>
          ) : (
            <View style={s.emptyCard}>
              <Text style={s.emptyEmoji}>🍻</Text>
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
    </>
  );
}
