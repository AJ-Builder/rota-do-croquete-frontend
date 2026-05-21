import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../ctx/AuthContext";
import { api } from "../lib/api";
import { colors, fonts, radius, shadows, spacing } from "../theme";

interface Place {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  order_index: number;
}

export default function MapScreenWeb() {
  const { activeEvent } = useAuth();
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [leafletReady, setLeafletReady] = useState(false);

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

  // Inject Leaflet CSS once
  useEffect(() => {
    if (document.getElementById("leaflet-css")) { setLeafletReady(true); return; }
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.onload = () => setLeafletReady(true);
    document.head.appendChild(link);
  }, []);

  // Build/refresh map when data and CSS are ready
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || loading) return;

    import("leaflet").then((L) => {
      const Lx = L.default ?? L;

      // Destroy previous instance
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

      const center: [number, number] =
        places.length > 0
          ? [places[0].latitude, places[0].longitude]
          : [38.7223, -9.1393];

      const map = Lx.map(mapContainerRef.current!, { zoomControl: true }).setView(center, 15);
      mapRef.current = map;

      Lx.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      // Polyline
      if (places.length > 1) {
        Lx.polyline(
          places.map((p) => [p.latitude, p.longitude] as [number, number]),
          { color: colors.primary, weight: 2.5, dashArray: "8 4" }
        ).addTo(map);
      }

      // Markers
      places.forEach((place, idx) => {
        const rated = myRatings[place.id] !== undefined;
        const bg = rated ? "#27AE60" : colors.primary;

        const icon = Lx.divIcon({
          className: "",
          html: `<div style="
            width:34px;height:34px;border-radius:50%;
            background:${bg};border:2.5px solid white;
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:700;font-size:14px;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            cursor:pointer;
          ">${idx + 1}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const marker = Lx.marker([place.latitude, place.longitude], { icon });
        marker.addTo(map);
        marker.bindTooltip(`<b>${place.name}</b>`, { direction: "top", offset: [0, -20] });
        marker.on("click", () => router.push(`/place/${place.id}` as any));
      });

      // Fit bounds if multiple places
      if (places.length > 1) {
        map.fitBounds(places.map((p) => [p.latitude, p.longitude] as [number, number]), { padding: [40, 40] });
      }
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [leafletReady, places, myRatings, loading]);

  function centerOnUser() {
    navigator.geolocation?.getCurrentPosition((pos) => {
      mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 16);
    });
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.flex}>
      {/* @ts-ignore - div is valid on web */}
      <div ref={mapContainerRef} style={{ flex: 1, width: "100%", height: "100%" }} />

      <View style={s.fab}>
        <Pressable
          style={s.fabBtn}
          onPress={() => router.push("/add-place")}
        >
          <Ionicons name="search" size={22} color={colors.white} />
        </Pressable>
        <Pressable style={[s.fabBtn, s.fabBtnSecondary]} onPress={centerOnUser}>
          <Ionicons name="locate" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {places.length === 0 && (
        <View style={s.emptyBanner}>
          <Text style={s.emptyText}>Usa a lupa para adicionar o primeiro sítio! 🧆</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  fab: { position: "absolute", bottom: 24, right: 16, gap: 10 },
  fabBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.strong,
  },
  fabBtnSecondary: { backgroundColor: colors.white, ...shadows.card },
  emptyBanner: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 80,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
