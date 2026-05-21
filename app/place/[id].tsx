import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  added_by_username: string;
}

interface Rating {
  id: string;
  username: string;
  sabor: number;
  crocancia: number;
  recheio: number;
  qualidade_preco: number;
  global_score: number;
  comment?: string;
  photo_base64?: string;
  created_at: string;
}

const PARAMS: { key: "sabor" | "crocancia" | "recheio" | "qualidade_preco"; label: string; emoji: string }[] = [
  { key: "sabor", label: "Sabor", emoji: "😋" },
  { key: "crocancia", label: "Crocância", emoji: "💥" },
  { key: "recheio", label: "Recheio", emoji: "🧀" },
  { key: "qualidade_preco", label: "Qualidade/Preço", emoji: "💰" },
];

function StarRow({
  value,
  onChange,
  colors,
}: {
  value: number;
  onChange: (v: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable
          key={i}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(i);
          }}
        >
          <Ionicons
            name={i <= value ? "star" : "star-outline"}
            size={32}
            color={i <= value ? colors.secondary : colors.border}
          />
        </Pressable>
      ))}
    </View>
  );
}

export default function PlaceDetail() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeEvent } = useAuth();
  const router = useRouter();

  const [place, setPlace] = useState<Place | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [myRating, setMyRating] = useState<Partial<Rating> | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [sabor, setSabor] = useState(3);
  const [crocancia, setCrocancia] = useState(3);
  const [recheio, setRecheio] = useState(3);
  const [qualidade_preco, setQualidade_preco] = useState(3);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !activeEvent) return;
    try {
      const [placeData, ratingsData, myRatingData, participantsData] = await Promise.all([
        api.get<Place>(`/api/places/${id}`),
        api.get<Rating[]>(`/api/places/${id}/ratings`),
        api.get<Partial<Rating>>(`/api/places/${id}/my-rating`),
        api.get<{ username: string }[]>(`/api/events/${activeEvent.id}/participants`),
      ]);
      setPlace(placeData);
      setRatings(ratingsData);
      setParticipants(participantsData.map((p) => p.username));
      if (myRatingData && myRatingData.sabor) {
        setMyRating(myRatingData);
        setSabor(myRatingData.sabor!);
        setCrocancia(myRatingData.crocancia!);
        setRecheio(myRatingData.recheio!);
        setQualidade_preco(myRatingData.qualidade_preco!);
        setComment(myRatingData.comment ?? "");
        setPhoto(myRatingData.photo_base64 ?? null);
      }
    } catch {}
  }, [id, activeEvent]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  function handleWebPhoto(useCamera: boolean) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (useCamera) (input as any).capture = "environment";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  async function pickPhoto() {
    if (Platform.OS === "web") { handleWebPhoto(false); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Preciso de acesso às fotos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }

  async function takePhoto() {
    if (Platform.OS === "web") { handleWebPhoto(true); return; }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Preciso de acesso à câmara.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }

  async function doDeleteRating() {
    setConfirmDelete(false);
    setDeleting(true);
    try {
      await api.delete(`/api/places/${id}/ratings`);
      setMyRating(null);
      setSabor(3); setCrocancia(3); setRecheio(3); setQualidade_preco(3);
      setComment(""); setPhoto(null);
      await load();
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function saveRating() {
    setSaving(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await api.post(`/api/places/${id}/ratings`, {
        sabor,
        crocancia,
        recheio,
        qualidade_preco,
        comment: comment.trim() || undefined,
        photo_base64: photo ?? undefined,
      });
      await load();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setSaving(false);
    }
  }

  const s = useMemo(() => StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surface },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    container: { paddingBottom: 60 },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: spacing.lg,
      paddingTop: 56,
      paddingBottom: spacing.lg,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.md,
    },
    back: { paddingTop: 4 },
    headerInfo: { flex: 1 },
    placeName: {
      fontFamily: fonts.display,
      fontSize: 20,
      color: colors.text,
    },
    placeAddress: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
    },
    statsCard: {
      margin: spacing.lg,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: spacing.lg,
      ...shadows.card,
    },
    statsTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: spacing.md,
      textAlign: "center",
    },
    statsRow: { flexDirection: "row", justifyContent: "space-around" },
    statItem: { alignItems: "center" },
    statEmoji: { fontSize: 20, marginBottom: 4 },
    statVal: {
      fontFamily: fonts.display,
      fontSize: 22,
      color: colors.primary,
    },
    statLabel: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textMuted,
    },
    card: {
      margin: spacing.lg,
      marginTop: 0,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.xl,
      ...shadows.card,
    },
    cardTitle: {
      fontFamily: fonts.display,
      fontSize: 18,
      color: colors.text,
      marginBottom: spacing.lg,
    },
    paramRow: { marginBottom: spacing.lg },
    paramLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    commentInput: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.sm,
      padding: spacing.md,
      fontSize: 14,
      fontFamily: fonts.body,
      color: colors.text,
      backgroundColor: colors.surface,
      minHeight: 80,
      textAlignVertical: "top",
      marginBottom: spacing.lg,
    },
    photoRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
    photoBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    photoBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.primary,
    },
    photoPreview: {
      position: "relative",
      marginBottom: spacing.md,
    },
    photoImg: {
      width: "100%",
      height: 180,
      borderRadius: radius.md,
      resizeMode: "cover",
    },
    photoRemove: {
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: colors.white,
      borderRadius: 12,
    },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      padding: spacing.lg,
      alignItems: "center",
      marginTop: spacing.sm,
      ...shadows.strong,
    },
    saveBtnDisabled: { opacity: 0.6 },
    deleteBtn: {
      borderWidth: 1.5,
      borderColor: colors.error,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: "center",
      marginTop: spacing.sm,
    },
    deleteBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.error,
    },
    saveBtnText: {
      fontFamily: fonts.display,
      fontSize: 17,
      color: colors.white,
    },
    ratingsSection: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxxl,
      gap: spacing.sm,
    },
    sectionTitle: {
      fontFamily: fonts.display,
      fontSize: 16,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    ratingCard: {
      backgroundColor: colors.card,
      borderRadius: radius.md,
      padding: spacing.md,
      ...shadows.card,
    },
    ratingHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    ratingAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    ratingAvatarText: {
      fontFamily: fonts.display,
      fontSize: 16,
      color: colors.white,
    },
    ratingUsername: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.text,
    },
    ratingScore: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
    },
    ratingComment: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
      fontStyle: "italic",
      marginBottom: spacing.sm,
    },
    ratingPhoto: {
      width: "100%",
      height: 160,
      borderRadius: radius.sm,
      resizeMode: "cover",
      marginBottom: spacing.sm,
    },
    mapsBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 6,
      alignSelf: "flex-start",
    },
    mapsBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.primary,
    },
    savedBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.success ?? "#27AE60",
      borderRadius: radius.sm,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    savedBannerText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.white,
    },
    notVotedSection: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    notVotedLabel: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      marginBottom: spacing.sm,
    },
    notVotedChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    notVotedChip: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    notVotedChipText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary },
    miniStats: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    miniStat: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    modalOverlay: {
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center", justifyContent: "center",
      zIndex: 999,
    },
    modalBox: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: spacing.xl,
      margin: spacing.xl,
      ...shadows.strong,
    },
    modalTitle: {
      fontFamily: fonts.display,
      fontSize: 18,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    modalBody: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
      lineHeight: 20,
    },
    modalActions: { flexDirection: "row", gap: spacing.md },
    modalCancel: {
      flex: 1, borderWidth: 1.5, borderColor: colors.border,
      borderRadius: radius.md, padding: spacing.md, alignItems: "center",
    },
    modalCancelText: {
      fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textSecondary,
    },
    modalConfirm: {
      flex: 1, backgroundColor: colors.error,
      borderRadius: radius.md, padding: spacing.md, alignItems: "center",
    },
    modalConfirmText: {
      fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.white,
    },
  }), [colors]);

  if (loading || !place) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const avg = (arr: number[]) =>
    arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : "—";

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={s.flex}
        contentContainerStyle={s.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={s.header}>
          <Pressable style={s.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={s.headerInfo}>
            <Text style={s.placeName}>{place.name}</Text>
            {place.address ? <Text style={s.placeAddress}>{place.address}</Text> : null}
            <Pressable
              style={s.mapsBtn}
              onPress={() => {
                const label = encodeURIComponent(place.name);
                if (Platform.OS === "web") {
                  (window as any).open(
                    `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`,
                    "_blank"
                  );
                } else {
                  const url = Platform.OS === "ios"
                    ? `maps:0,0?q=${label}@${place.latitude},${place.longitude}`
                    : `geo:${place.latitude},${place.longitude}?q=${place.latitude},${place.longitude}(${label})`;
                  Linking.openURL(url);
                }
              }}
            >
              <Ionicons name="navigate-outline" size={14} color={colors.primary} />
              <Text style={s.mapsBtnText}>Abrir no Maps</Text>
            </Pressable>
          </View>
        </View>

        {/* Stats */}
        {ratings.length > 0 && (
          <View style={s.statsCard}>
            <Text style={s.statsTitle}>
              {ratings.length} de {activeEvent?.participants?.length ?? "?"} avaliaram
            </Text>
            <View style={s.statsRow}>
              {PARAMS.map((p) => (
                <View key={p.key} style={s.statItem}>
                  <Text style={s.statEmoji}>{p.emoji}</Text>
                  <Text style={s.statVal}>
                    {avg(ratings.map((r) => r[p.key]))}
                  </Text>
                  <Text style={s.statLabel}>{p.label}</Text>
                </View>
              ))}
            </View>
            {(() => {
              const voted = new Set(ratings.map((r) => r.username));
              const notVoted = participants.filter((p) => !voted.has(p));
              if (notVoted.length === 0) return null;
              return (
                <View style={s.notVotedSection}>
                  <Text style={s.notVotedLabel}>⏳ Ainda não avaliaram</Text>
                  <View style={s.notVotedChips}>
                    {notVoted.map((name) => (
                      <View key={name} style={s.notVotedChip}>
                        <Text style={s.notVotedChipText}>{name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}
          </View>
        )}

        {/* Rating form */}
        <View style={s.card}>
          <Text style={s.cardTitle}>
            {myRating?.sabor ? "✏️ A tua avaliação" : "🧆 Avaliar croquete"}
          </Text>

          {PARAMS.map((p) => (
            <View key={p.key} style={s.paramRow}>
              <Text style={s.paramLabel}>
                {p.emoji} {p.label}
              </Text>
              <StarRow
                value={
                  p.key === "sabor"
                    ? sabor
                    : p.key === "crocancia"
                    ? crocancia
                    : p.key === "recheio"
                    ? recheio
                    : qualidade_preco
                }
                onChange={
                  p.key === "sabor"
                    ? setSabor
                    : p.key === "crocancia"
                    ? setCrocancia
                    : p.key === "recheio"
                    ? setRecheio
                    : setQualidade_preco
                }
                colors={colors}
              />
            </View>
          ))}

          <Text style={s.paramLabel}>💬 Comentário (opcional)</Text>
          <TextInput
            style={s.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="O que achaste deste croquete?"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />

          <Text style={s.paramLabel}>📷 Foto (opcional)</Text>
          <View style={s.photoRow}>
            <Pressable style={s.photoBtn} onPress={takePhoto}>
              <Ionicons name="camera" size={20} color={colors.primary} />
              <Text style={s.photoBtnText}>Câmara</Text>
            </Pressable>
            <Pressable style={s.photoBtn} onPress={pickPhoto}>
              <Ionicons name="images" size={20} color={colors.primary} />
              <Text style={s.photoBtnText}>Galeria</Text>
            </Pressable>
          </View>
          {photo && (
            <View style={s.photoPreview}>
              <Image source={{ uri: photo }} style={s.photoImg} />
              <Pressable style={s.photoRemove} onPress={() => setPhoto(null)}>
                <Ionicons name="close-circle" size={24} color={colors.error} />
              </Pressable>
            </View>
          )}

          {saved && (
            <View style={s.savedBanner}>
              <Ionicons name="checkmark-circle" size={18} color={colors.white} />
              <Text style={s.savedBannerText}>Avaliação guardada!</Text>
            </View>
          )}

          <Pressable
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={saveRating}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={s.saveBtnText}>
                {myRating?.sabor ? "Actualizar avaliação" : "Guardar avaliação"} 🧆
              </Text>
            )}
          </Pressable>

          {myRating?.sabor && (
            <Pressable
              style={[s.deleteBtn, deleting && s.saveBtnDisabled]}
              onPress={() => setConfirmDelete(true)}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color={colors.error} size="small" />
              ) : (
                <Text style={s.deleteBtnText}>Eliminar avaliação</Text>
              )}
            </Pressable>
          )}
        </View>

        {/* Other ratings */}
        {ratings.length > 0 && (
          <View style={s.ratingsSection}>
            <Text style={s.sectionTitle}>Avaliações dos amigos</Text>
            {ratings.map((r) => (
              <View key={r.id} style={s.ratingCard}>
                <View style={s.ratingHeader}>
                  <View style={s.ratingAvatar}>
                    <Text style={s.ratingAvatarText}>
                      {r.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={s.ratingUsername}>{r.username}</Text>
                    <Text style={s.ratingScore}>
                      ⭐ {r.global_score.toFixed(1)} global
                    </Text>
                  </View>
                </View>
                {r.photo_base64 ? (
                  <Image source={{ uri: r.photo_base64 }} style={s.ratingPhoto} />
                ) : null}
                {r.comment ? (
                  <Text style={s.ratingComment}>"{r.comment}"</Text>
                ) : null}
                <View style={s.miniStats}>
                  {PARAMS.map((p) => (
                    <Text key={p.key} style={s.miniStat}>
                      {p.emoji} {r[p.key].toFixed(1)}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {confirmDelete && (
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Eliminar avaliação</Text>
            <Text style={s.modalBody}>Tens a certeza que queres eliminar a tua avaliação?</Text>
            <View style={s.modalActions}>
              <Pressable style={s.modalCancel} onPress={() => setConfirmDelete(false)}>
                <Text style={s.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={s.modalConfirm} onPress={doDeleteRating}>
                <Text style={s.modalConfirmText}>Eliminar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
