import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8001";

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("croquete_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      const json = await res.json();
      msg = json.detail ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),

  // Form-encoded login
  login: async (username: string, password: string) => {
    const body = new URLSearchParams({ username, password });
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.detail ?? "Credenciais inválidas");
    }
    return res.json();
  },
};

export async function searchNominatim(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query
  )}&format=json&limit=8&addressdetails=1`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "pt", "User-Agent": "RotaDoCroquete/1.0" },
  });
  return res.json();
}

export async function reverseGeocode(lat: number, lon: number): Promise<{ name: string; address: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
  const res = await fetch(url, {
    headers: { "Accept-Language": "pt", "User-Agent": "RotaDoCroquete/1.0" },
  });
  const data = await res.json();
  const name = data.name || data.address?.road || data.display_name?.split(",")[0] || "Local sem nome";
  return { name, address: data.display_name ?? "" };
}

export interface OverpassPOI {
  id: number;
  name: string;
  type?: string;
  lat: number;
  lon: number;
}

export async function searchNearbyPOIs(lat: number, lon: number, radius = 60): Promise<OverpassPOI[]> {
  const query = `[out:json][timeout:5];(node(around:${radius},${lat},${lon})[name];way(around:${radius},${lat},${lon})[name];);out center 15;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
  });
  const data = await res.json();
  return (data.elements ?? [])
    .filter((e: any) => e.tags?.name)
    .map((e: any) => ({
      id: e.id,
      name: e.tags.name,
      type: e.tags.amenity || e.tags.shop || e.tags.cuisine || "",
      lat: e.lat ?? e.center?.lat,
      lon: e.lon ?? e.center?.lon,
    }))
    .filter((e: OverpassPOI) => e.lat && e.lon);
}
