import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

interface User {
  id: string;
  username: string;
  created_at: string;
}

interface Event {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  participants: string[];
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  activeEvent: Event | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setActiveEvent: (event: Event | null) => Promise<void>;
  refreshEvent: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeEvent, setActiveEventState] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    try {
      const token = await AsyncStorage.getItem("croquete_token");
      if (!token) return;
      const me = await api.get<User>("/api/auth/me");
      setUser(me);

      const savedEventId = await AsyncStorage.getItem("croquete_active_event");
      if (savedEventId) {
        try {
          const ev = await api.get<Event>(`/api/events/${savedEventId}`);
          setActiveEventState(ev);
        } catch {
          await AsyncStorage.removeItem("croquete_active_event");
        }
      }
    } catch {
      await AsyncStorage.removeItem("croquete_token");
    } finally {
      setLoading(false);
    }
  }

  async function _processPendingInvite() {
    const code = await AsyncStorage.getItem("croquete_pending_join");
    if (!code) return;
    await AsyncStorage.removeItem("croquete_pending_join");
    try {
      const event = await api.post<Event>("/api/events/join", { code });
      await AsyncStorage.setItem("croquete_active_event", event.id);
      setActiveEventState(event);
    } catch {}
  }

  async function login(username: string, password: string) {
    const data = await api.login(username, password);
    await AsyncStorage.setItem("croquete_token", data.access_token);
    setUser(data.user);
    await _processPendingInvite();
  }

  async function register(username: string, password: string) {
    const data = await api.post<{ access_token: string; user: User }>(
      "/api/auth/register",
      { username, password }
    );
    await AsyncStorage.setItem("croquete_token", data.access_token);
    setUser(data.user);
    await _processPendingInvite();
  }

  async function logout() {
    await AsyncStorage.multiRemove(["croquete_token", "croquete_active_event"]);
    setUser(null);
    setActiveEventState(null);
  }

  async function setActiveEvent(event: Event | null) {
    if (event) {
      await AsyncStorage.setItem("croquete_active_event", event.id);
    } else {
      await AsyncStorage.removeItem("croquete_active_event");
    }
    setActiveEventState(event);
  }

  async function refreshEvent() {
    if (!activeEvent) return;
    try {
      const ev = await api.get<Event>(`/api/events/${activeEvent.id}`);
      setActiveEventState(ev);
    } catch {}
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        activeEvent,
        loading,
        login,
        register,
        logout,
        setActiveEvent,
        refreshEvent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
