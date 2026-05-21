import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Clipboard,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
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
}

export default function ProfileScreen() {
  const colors = useColors();
  const { user, activeEvent, logout, setActiveEvent, refreshEvent } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);

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
    router.replace("/(tabs)/map");
  }

  function copyCode(code: string) {
    Clipboard.setString(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copiado!", `Código ${code} copiado. Cola no WhatsApp para partilhar com os amigos.`);
  }

  function startEdit() {
    setEditName(activeEvent?.name ?? "");
    setEditing(true);
  }

  async function saveName() {
    if (!activeEvent || !editName.trim()) return;
    setSavingName(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const updated = await api.patch<Event>(`/api/events/${activeEvent.id}`, { name: editName.trim() });
      await setActiveEvent(updated);
      await loadEvents();
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setSavingName(false);
    }
  }

  async function handleLogout() {
    Alert.alert("Sair", "Tens a certeza que queres sair da conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  const isOwner = activeEvent?.owner_id === user?.id;

  const s = useMemo(() => StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surface },
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
    userCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.xl,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.lg,
      ...shadows.card,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontFamily: fonts.display, fontSize: 28, color: colors.white },
    username: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
    since: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 2 },
    activeCard: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: spacing.lg,
      borderWidth: 2,
      borderColor: colors.secondary,
      ...shadows.card,
    },
    activeHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
    activeLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: colors.success,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    activeName: { fontFamily: fonts.display, fontSize: 18, color: colors.text, flex: 1 },
    editBtn: { padding: 4 },
    editRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    editInput: {
      flex: 1,
      fontFamily: fonts.display,
      fontSize: 18,
      color: colors.text,
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
      paddingVertical: 4,
    },
    editSave: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    editCancel: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    codeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: 4,
      alignSelf: "flex-start",
    },
    codeLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
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
    codeText: { fontFamily: fonts.display, fontSize: 14, color: colors.primary, letterSpacing: 1 },
    participants: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 4 },
    sectionTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.text, marginTop: spacing.sm },
    eventCard: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      ...shadows.card,
    },
    eventCardActive: { borderWidth: 1.5, borderColor: colors.secondary },
    eventInfo: { flex: 1 },
    eventName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
    eventCode: { fontFamily: fonts.body, fontSize: 12, color: colors.primary, marginTop: 2 },
    eventPart: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 2 },
    activeBadge: {
      backgroundColor: colors.secondary,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
    },
    activeBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.white },
    footer: { gap: spacing.md, marginTop: spacing.md },
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
      ...shadows.card,
    },
    newRouteBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.primary },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      padding: spacing.md,
    },
    logoutText: { fontFamily: fonts.body, fontSize: 14, color: colors.error },
  }), [colors]);

  return (
    <FlatList
      style={s.flex}
      contentContainerStyle={s.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListHeaderComponent={
        <>
          <View style={s.userCard}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {user?.username?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={s.username}>{user?.username}</Text>
              <Text style={s.since}>
                Desde {user?.created_at?.split("T")[0] ?? ""}
              </Text>
            </View>
          </View>

          {activeEvent && (
            <View style={s.activeCard}>
              <View style={s.activeHeader}>
                <Ionicons name="radio-button-on" size={14} color={colors.success} />
                <Text style={s.activeLabel}>Rota activa</Text>
              </View>

              {editing ? (
                <View style={s.editRow}>
                  <TextInput
                    style={s.editInput}
                    value={editName}
                    onChangeText={setEditName}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={saveName}
                    selectTextOnFocus
                  />
                  <Pressable style={s.editSave} onPress={saveName} disabled={savingName}>
                    <Ionicons name="checkmark" size={20} color={colors.white} />
                  </Pressable>
                  <Pressable style={s.editCancel} onPress={() => setEditing(false)}>
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ) : (
                <View style={s.nameRow}>
                  <Text style={s.activeName}>{activeEvent.name}</Text>
                  {isOwner && (
                    <Pressable onPress={startEdit} style={s.editBtn}>
                      <Ionicons name="pencil" size={16} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>
              )}

              <Pressable style={s.codeRow} onPress={() => copyCode(activeEvent.invite_code)}>
                <Text style={s.codeLabel}>Código de convite:</Text>
                <View style={s.codePill}>
                  <Text style={s.codeText}>{activeEvent.invite_code}</Text>
                  <Ionicons name="copy-outline" size={14} color={colors.primary} />
                </View>
              </Pressable>
              <Text style={s.participants}>
                {activeEvent.participants.length} participante
                {activeEvent.participants.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}

          <Text style={s.sectionTitle}>As minhas rotas</Text>
        </>
      }
      data={events}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => (
        <Pressable
          style={[s.eventCard, item.id === activeEvent?.id && s.eventCardActive]}
          onPress={() => switchEvent(item)}
        >
          <View style={s.eventInfo}>
            <Text style={s.eventName}>{item.name}</Text>
            <Text style={s.eventCode}>{item.invite_code}</Text>
            <Text style={s.eventPart}>
              {item.participants.length} participante
              {item.participants.length !== 1 ? "s" : ""}
            </Text>
          </View>
          {item.id === activeEvent?.id ? (
            <View style={s.activeBadge}>
              <Text style={s.activeBadgeText}>Activa</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          )}
        </Pressable>
      )}
      ListFooterComponent={
        <View style={s.footer}>
          <Pressable style={s.newRouteBtn} onPress={() => router.push("/onboarding")}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={s.newRouteBtnText}>Nova rota / entrar com código</Text>
          </Pressable>
          <Pressable style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={s.logoutText}>Sair da conta</Text>
          </Pressable>
        </View>
      }
    />
  );
}
