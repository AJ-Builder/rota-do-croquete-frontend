import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../src/ctx/AuthContext";
import { api } from "../../src/lib/api";
import { useColors, fonts, radius, shadows, spacing } from "../../src/theme";

interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  order_index: number;
  added_by_username: string;
}

export default function PlacesScreen() {
  const colors = useColors();
  const { activeEvent } = useAuth();
  const router = useRouter();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlaces = useCallback(async () => {
    if (!activeEvent) return;
    try {
      const data = await api.get<Place[]>(`/api/events/${activeEvent.id}/places`);
      setPlaces(data);
    } catch {}
  }, [activeEvent]);

  useEffect(() => {
    loadPlaces().finally(() => setLoading(false));
  }, [loadPlaces]);

  async function onRefresh() {
    setRefreshing(true);
    await loadPlaces();
    setRefreshing(false);
  }

  async function deletePlace(id: string, name: string) {
    Alert.alert("Remover local", `Remover "${name}" da rota?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          try {
            await api.delete(`/api/events/${activeEvent!.id}/places/${id}`);
            await loadPlaces();
          } catch (e: any) {
            Alert.alert("Erro", e.message);
          }
        },
      },
    ]);
  }

  async function moveUp(idx: number) {
    if (idx === 0) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newOrder = [...places];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    setPlaces(newOrder);
    try {
      await api.post(`/api/events/${activeEvent!.id}/places/reorder`, {
        place_ids: newOrder.map((p) => p.id),
      });
    } catch {}
  }

  async function moveDown(idx: number) {
    if (idx === places.length - 1) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newOrder = [...places];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    setPlaces(newOrder);
    try {
      await api.post(`/api/events/${activeEvent!.id}/places/reorder`, {
        place_ids: newOrder.map((p) => p.id),
      });
    } catch {}
  }

  async function autoOrder() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const data = await api.post<Place[]>(
        `/api/events/${activeEvent!.id}/places/auto-order`,
        {}
      );
      setPlaces(data);
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    }
  }

  const s = useMemo(() => StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surface },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    toolbar: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    autoBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    autoBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.primary,
    },
    list: {
      padding: spacing.lg,
      paddingBottom: 100,
      gap: spacing.sm,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      ...shadows.card,
    },
    cardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
    badge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
      flexShrink: 0,
    },
    badgeText: {
      fontFamily: fonts.display,
      fontSize: 15,
      color: colors.white,
    },
    info: { flex: 1 },
    name: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.text,
    },
    address: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    addedBy: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    cardRight: { flexDirection: "row", alignItems: "center", gap: 4 },
    reorder: { gap: 2 },
    reorderBtn: {
      padding: 4,
      borderRadius: radius.sm,
    },
    reorderDisabled: { opacity: 0.3 },
    deleteBtn: {
      padding: spacing.sm,
      marginLeft: 4,
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
    fab: {
      position: "absolute",
      bottom: 24,
      right: 16,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      ...shadows.strong,
    },
  }), [colors]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.flex}>
      {places.length > 1 && (
        <View style={s.toolbar}>
          <Pressable style={s.autoBtn} onPress={autoOrder}>
            <Ionicons name="git-branch" size={16} color={colors.primary} />
            <Text style={s.autoBtnText}>Ordenar por rota</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={places}
        keyExtractor={(p) => p.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🗺️</Text>
            <Text style={s.emptyTitle}>Sem locais ainda</Text>
            <Text style={s.emptyText}>
              Vai ao Mapa e adiciona o primeiro sítio da rota!
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={s.card}>
            <Pressable
              style={s.cardLeft}
              onPress={() => router.push(`/place/${item.id}`)}
            >
              <View style={s.badge}>
                <Text style={s.badgeText}>{index + 1}</Text>
              </View>
              <View style={s.info}>
                <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                <Text style={s.address} numberOfLines={1}>{item.address}</Text>
                <Text style={s.addedBy}>por {item.added_by_username}</Text>
              </View>
            </Pressable>
            <View style={s.cardRight}>
              <View style={s.reorder}>
                <Pressable
                  style={[s.reorderBtn, index === 0 && s.reorderDisabled]}
                  onPress={() => moveUp(index)}
                  disabled={index === 0}
                >
                  <Ionicons name="chevron-up" size={18} color={index === 0 ? colors.textMuted : colors.primary} />
                </Pressable>
                <Pressable
                  style={[s.reorderBtn, index === places.length - 1 && s.reorderDisabled]}
                  onPress={() => moveDown(index)}
                  disabled={index === places.length - 1}
                >
                  <Ionicons name="chevron-down" size={18} color={index === places.length - 1 ? colors.textMuted : colors.primary} />
                </Pressable>
              </View>
              <Pressable
                style={s.deleteBtn}
                onPress={() => deletePlace(item.id, item.name)}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            </View>
          </View>
        )}
      />

      <Pressable
        style={s.fab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/add-place");
        }}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>
    </View>
  );
}

