import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../../src/ctx/AuthContext";
import { api } from "../../../src/lib/api";
import { colors, fonts, radius, shadows, spacing } from "../../../src/theme";

interface Participant {
  id: string;
  username: string;
  is_owner: boolean;
}

export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.get<Participant[]>(`/api/events/${id}/participants`);
      setParticipants(data);
    } catch {}
  }, [id]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  function confirmRemove(p: Participant) {
    if (Platform.OS === "web") {
      if (window.confirm(`Remover ${p.username} da rota?`)) {
        doRemove(p.id);
      }
    } else {
      Alert.alert(
        "Remover participante",
        `Tens a certeza que queres remover ${p.username}?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Remover", style: "destructive", onPress: () => doRemove(p.id) },
        ]
      );
    }
  }

  async function doRemove(userId: string) {
    setRemoving(userId);
    try {
      await api.delete(`/api/events/${id}/participants/${userId}`);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await load();
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Não foi possível remover o participante.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <View style={s.flex}>
      <View style={s.header}>
        <Pressable style={s.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={s.title}>Participantes</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {participants.map((p) => (
            <View key={p.id} style={s.row}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{p.username.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={s.info}>
                <Text style={s.name}>{p.username}</Text>
                {p.is_owner && (
                  <Text style={s.ownerBadge}>Criador</Text>
                )}
              </View>
              {!p.is_owner && p.id !== user?.id && (
                <Pressable
                  style={[s.removeBtn, removing === p.id && s.removeBtnDisabled]}
                  onPress={() => confirmRemove(p)}
                  disabled={removing === p.id}
                >
                  {removing === p.id ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Ionicons name="person-remove-outline" size={18} color={colors.error} />
                  )}
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  back: {},
  title: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.card,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
  },
  info: { flex: 1 },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
  },
  ownerBadge: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
  },
  removeBtn: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeBtnDisabled: { opacity: 0.5 },
});
