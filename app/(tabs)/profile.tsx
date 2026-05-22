import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Clipboard,
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../src/ctx/AuthContext";
import { api } from "../../src/lib/api";
import { compressToBase64 } from "../../src/lib/imageUtils";
import { useColors, useThemeMode, fonts, radius, shadows, spacing, type ThemeMode } from "../../src/theme";

interface Event {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  participants: string[];
  created_at: string;
}

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: "light", label: "Claro", icon: "sunny-outline" },
  { mode: "system", label: "Auto", icon: "phone-portrait-outline" },
  { mode: "dark", label: "Escuro", icon: "moon-outline" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const { mode: themeMode, setMode: setThemeMode } = useThemeMode();
  const { user, activeEvent, logout, setActiveEvent, refreshEvent, updateProfile } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  function pickAvatar() {
    if (Platform.OS !== "web") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.cssText = "position:fixed;top:-100px;opacity:0;";
    document.body.appendChild(input);
    input.onchange = async () => {
      document.body.removeChild(input);
      const file = input.files?.[0];
      if (!file) return;
      setUploadingAvatar(true);
      try {
        const base64 = await compressToBase64(file, 350, 0.85);
        await updateProfile({ avatar_base64: base64 });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e: any) {
        Alert.alert("Erro", e.message);
      } finally {
        setUploadingAvatar(false);
      }
    };
    input.click();
  }

  async function saveUsername() {
    const name = editUsername.trim();
    if (!name || name === user?.username) { setEditingUsername(false); return; }
    setSavingUsername(true);
    try {
      await updateProfile({ username: name });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingUsername(false);
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setSavingUsername(false);
    }
  }

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
    avatarWrap: { position: "relative", width: 64, height: 64 },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImg: { width: 64, height: 64, borderRadius: 32 },
    avatarEdit: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontFamily: fonts.display, fontSize: 28, color: colors.white },
    userInfo: { flex: 1 },
    usernameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    username: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
    usernameEditBtn: { padding: 2 },
    usernameInput: {
      fontFamily: fonts.display,
      fontSize: 20,
      color: colors.text,
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
      paddingVertical: 2,
      minWidth: 120,
    },
    usernameActions: { flexDirection: "row", gap: 6, marginTop: 4 },
    usernameSave: {
      backgroundColor: colors.primary,
      borderRadius: radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    usernameSaveText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.white },
    usernameCancel: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    usernameCancelText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textSecondary },
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
    themeCard: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: spacing.lg,
      ...shadows.card,
    },
    themeTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.textMuted,
      letterSpacing: 0.5,
      textTransform: "uppercase",
      marginBottom: spacing.md,
    },
    themeRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    themeBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    themeBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    themeBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: colors.textSecondary,
    },
    themeBtnTextActive: { color: colors.white },
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
            <Pressable style={s.avatarWrap} onPress={pickAvatar} disabled={uploadingAvatar}>
              <View style={s.avatar}>
                {user?.avatar_base64 ? (
                  <Image source={{ uri: user.avatar_base64 }} style={s.avatarImg} />
                ) : (
                  <Text style={s.avatarText}>{user?.username?.charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={s.avatarEdit}>
                <Ionicons name="camera" size={12} color={colors.textSecondary} />
              </View>
            </Pressable>

            <View style={s.userInfo}>
              {editingUsername ? (
                <>
                  <TextInput
                    style={s.usernameInput}
                    value={editUsername}
                    onChangeText={setEditUsername}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={saveUsername}
                    selectTextOnFocus
                    maxLength={30}
                  />
                  <View style={s.usernameActions}>
                    <Pressable style={s.usernameSave} onPress={saveUsername} disabled={savingUsername}>
                      <Text style={s.usernameSaveText}>Guardar</Text>
                    </Pressable>
                    <Pressable style={s.usernameCancel} onPress={() => setEditingUsername(false)}>
                      <Text style={s.usernameCancelText}>Cancelar</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={s.usernameRow}>
                  <Text style={s.username}>{user?.username}</Text>
                  <Pressable style={s.usernameEditBtn} onPress={() => { setEditUsername(user?.username ?? ""); setEditingUsername(true); }}>
                    <Ionicons name="pencil" size={14} color={colors.textMuted} />
                  </Pressable>
                </View>
              )}
              <Text style={s.since}>Desde {user?.created_at?.split("T")[0] ?? ""}</Text>
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
          <View style={s.themeCard}>
            <Text style={s.themeTitle}>Aspecto</Text>
            <View style={s.themeRow}>
              {THEME_OPTIONS.map((opt) => {
                const active = themeMode === opt.mode;
                return (
                  <Pressable
                    key={opt.mode}
                    style={[s.themeBtn, active && s.themeBtnActive]}
                    onPress={() => setThemeMode(opt.mode)}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={18}
                      color={active ? colors.white : colors.textSecondary}
                    />
                    <Text style={[s.themeBtnText, active && s.themeBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={s.logoutText}>Sair da conta</Text>
          </Pressable>
        </View>
      }
    />
  );
}
