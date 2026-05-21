import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";
import { useAuth } from "../ctx/AuthContext";
import { api, reverseGeocode, searchNearbyPOIs, type OverpassPOI } from "../lib/api";
import { colors, fonts, radius, shadows, spacing } from "../theme";

interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  order_index: number;
}

interface PendingPin {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
}

export default function MapScreen() {
  const { activeEvent } = useAuth();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingPin | null>(null);
  const [nearby, setNearby] = useState<OverpassPOI[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardOffset(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardOffset(0)
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  const loadPlaces = useCallback(async () => {
    if (!activeEvent) return;
    try {
      const [placesData, ratingsData] = await Promise.all([
        api.get<Place[]>(`/api/events/${activeEvent.id}/places`),
        api.get<Record<string, number>>(`/api/events/${activeEvent.id}/my-ratings`),
      ]);
      setPlaces(placesData);
      setMyRatings(ratingsData);
    } catch {}
  }, [activeEvent]);

  useEffect(() => {
    loadPlaces().finally(() => setLoading(false));
  }, [loadPlaces]);

  useEffect(() => {
    if (loading || places.length > 0) return;
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== "granted") return;
      Location.getCurrentPositionAsync({}).then((loc) => {
        mapRef.current?.animateToRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 600);
      }).catch(() => {});
    });
  }, [loading, places.length]);

  async function centerOnUser() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const loc = await Location.getCurrentPositionAsync({});
    const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 800);
  }

  async function handleMapPress(e: any) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPending({ latitude, longitude, name: "", address: "" });
    setNearby([]);
    setGeocoding(true);
    try {
      const pois = await searchNearbyPOIs(latitude, longitude, 60);
      if (pois.length === 1) {
        const geo = await reverseGeocode(pois[0].lat, pois[0].lon);
        setPending({ latitude: pois[0].lat, longitude: pois[0].lon, name: pois[0].name, address: geo.address });
        setNearby([]);
      } else if (pois.length > 1) {
        setNearby(pois);
        setPending({ latitude, longitude, name: "", address: "" });
      } else {
        const geo = await reverseGeocode(latitude, longitude);
        setPending({ latitude, longitude, name: geo.name, address: geo.address });
        setNearby([]);
      }
    } catch {
      setPending((p) => p ? { ...p, name: "Local" } : null);
    } finally {
      setGeocoding(false);
    }
  }

  async function selectPOI(poi: OverpassPOI) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNearby([]);
    setGeocoding(true);
    try {
      const geo = await reverseGeocode(poi.lat, poi.lon);
      setPending({ latitude: poi.lat, longitude: poi.lon, name: poi.name, address: geo.address });
    } catch {
      setPending({ latitude: poi.lat, longitude: poi.lon, name: poi.name, address: "" });
    } finally {
      setGeocoding(false);
    }
  }

  async function savePin() {
    if (!pending || !activeEvent) return;
    if (!pending.latitude || !pending.longitude || isNaN(pending.latitude) || isNaN(pending.longitude)) return;
    setSaving(true);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await api.post(`/api/events/${activeEvent.id}/places`, {
        name: pending.name.trim() || "Local",
        address: pending.address,
        latitude: pending.latitude,
        longitude: pending.longitude,
      });
      setPending(null);
      setNearby([]);
      await loadPlaces();
    } finally {
      setSaving(false);
    }
  }

  const initialRegion =
    places.length > 0
      ? { latitude: places[0].latitude, longitude: places[0].longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
      : { latitude: 38.7223, longitude: -9.1393, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.flex}>
      <MapView
        ref={mapRef}
        style={s.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={handleMapPress}
      >
        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} flipY={false} />
        {places.map((place, idx) => {
          const rated = myRatings[place.id] !== undefined;
          return (
            <Marker
              key={place.id}
              coordinate={{ latitude: place.latitude, longitude: place.longitude }}
              onPress={() => router.push(`/place/${place.id}`)}
            >
              <View style={s.markerContainer}>
                <View style={[s.marker, rated && s.markerRated]}>
                  <Text style={s.markerText}>{idx + 1}</Text>
                </View>
                {rated && <View style={s.ratedDot} />}
                <View style={[s.markerTail, rated && s.markerTailRated]} />
              </View>
            </Marker>
          );
        })}
        {pending && (
          <Marker coordinate={{ latitude: pending.latitude, longitude: pending.longitude }} anchor={{ x: 0.5, y: 1 }}>
            <View style={s.markerContainer}>
              <View style={[s.marker, s.markerPending]}>
                <Ionicons name="add" size={18} color={colors.white} />
              </View>
              <View style={[s.markerTail, s.markerTailPending]} />
            </View>
          </Marker>
        )}
        {places.length > 1 && (
          <Polyline
            coordinates={places.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))}
            strokeColor={colors.primary}
            strokeWidth={2.5}
            lineDashPattern={[8, 4]}
          />
        )}
      </MapView>

      {!pending && (
        <View style={s.fab}>
          <Pressable
            style={s.fabBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/add-place");
            }}
          >
            <Ionicons name="search" size={22} color={colors.white} />
          </Pressable>
          <Pressable style={[s.fabBtn, s.fabBtnSecondary]} onPress={centerOnUser}>
            <Ionicons name="locate" size={22} color={colors.primary} />
          </Pressable>
        </View>
      )}

      {pending && (
        <View style={[s.sheet, { bottom: keyboardOffset }]}>
          {geocoding ? (
            <View style={s.sheetLoading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={s.sheetLoadingText}>A identificar local...</Text>
            </View>
          ) : nearby.length > 0 ? (
            <>
              <Text style={s.sheetLabel}>Qual destes locais?</Text>
              {nearby.slice(0, 5).map((poi) => (
                <Pressable key={poi.id} style={s.poiRow} onPress={() => selectPOI(poi)}>
                  <Ionicons name="location" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.poiName}>{poi.name}</Text>
                    {poi.type ? <Text style={s.poiType}>{poi.type}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
              <Pressable style={s.sheetCancel} onPress={() => { setPending(null); setNearby([]); }}>
                <Text style={s.sheetCancelText}>Cancelar</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={s.sheetLabel}>Nome do local</Text>
              <TextInput
                style={s.sheetInput}
                value={pending.name}
                onChangeText={(t) => setPending((p) => p ? { ...p, name: t } : null)}
                placeholder="Nome do sítio"
                placeholderTextColor={colors.textMuted}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={savePin}
              />
              {pending.address ? (
                <Text style={s.sheetAddress} numberOfLines={1}>{pending.address}</Text>
              ) : null}
              <View style={s.sheetRow}>
                <Pressable style={s.sheetCancelBtn} onPress={() => { setPending(null); Keyboard.dismiss(); }}>
                  <Text style={s.sheetCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable style={[s.sheetSave, saving && { opacity: 0.6 }]} onPress={savePin} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={s.sheetSaveText}>Adicionar</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}

      {places.length === 0 && !pending && (
        <View style={s.emptyBanner}>
          <Text style={s.emptyText}>Toca no mapa para adicionar o primeiro sítio! 🧆</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  markerContainer: { alignItems: "center" },
  marker: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2.5, borderColor: colors.white,
    ...shadows.strong,
  },
  markerRated: { backgroundColor: "#27AE60" },
  markerPending: { backgroundColor: colors.secondary },
  ratedDot: {
    position: "absolute", top: -3, right: -3,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: "#27AE60", borderWidth: 2, borderColor: colors.white,
  },
  markerText: { fontFamily: fonts.display, fontSize: 14, color: colors.white },
  markerTail: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: "transparent", borderRightColor: "transparent",
    borderTopColor: colors.primary, marginTop: -1,
  },
  markerTailRated: { borderTopColor: "#27AE60" },
  markerTailPending: { borderTopColor: colors.secondary },
  fab: { position: "absolute", bottom: 24, right: 16, gap: 10 },
  fabBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
    ...shadows.strong,
  },
  fabBtnSecondary: { backgroundColor: colors.white, ...shadows.card },
  emptyBanner: {
    position: "absolute", bottom: 100, left: 16, right: 80,
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: spacing.md, ...shadows.card,
  },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: "center" },
  sheet: {
    position: "absolute", left: 0, right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 32 : spacing.xl,
    ...shadows.strong,
  },
  sheetLoading: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  sheetLoadingText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  sheetLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text, marginBottom: spacing.sm },
  sheetInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm,
    padding: spacing.md, fontSize: 16, fontFamily: fonts.body,
    color: colors.text, backgroundColor: colors.surface,
  },
  sheetAddress: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
  sheetRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  sheetCancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, alignItems: "center",
  },
  sheetCancel: { marginTop: spacing.md, alignItems: "center", padding: spacing.sm },
  sheetCancelText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textSecondary },
  sheetSave: {
    flex: 2, backgroundColor: colors.primary,
    borderRadius: radius.md, padding: spacing.md, alignItems: "center",
    ...shadows.strong,
  },
  sheetSaveText: { fontFamily: fonts.display, fontSize: 15, color: colors.white },
  poiRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  poiName: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  poiType: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
