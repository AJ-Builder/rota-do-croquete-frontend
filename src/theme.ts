import { createContext, useContext } from "react";
import { useColorScheme } from "react-native";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeModeContextType {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

export const ThemeModeContext = createContext<ThemeModeContextType>({
  mode: "system",
  setMode: () => {},
});

export const lightColors = {
  brand: "#E67E22",
  primary: "#D96606",
  secondary: "#F2B84B",
  surface: "#FFF9F2",
  surfaceAlt: "#FFF1E0",
  card: "#FFFFFF",
  text: "#2C1A0E",
  textSecondary: "#7A5C3E",
  textMuted: "#B08060",
  border: "#EDD9BF",
  success: "#27AE60",
  error: "#E74C3C",
  white: "#FFFFFF",
  mapPin: "#D96606",
};

export const darkColors = {
  brand: "#E67E22",
  primary: "#E8730A",
  secondary: "#F2B84B",
  surface: "#1C1208",
  surfaceAlt: "#251A0C",
  card: "#2E1F0F",
  text: "#F5EDE0",
  textSecondary: "#C4A882",
  textMuted: "#8A7060",
  border: "#4A3520",
  success: "#2ECC71",
  error: "#E74C3C",
  white: "#FFFFFF",
  mapPin: "#E8730A",
};

export function useColors() {
  const { mode } = useContext(ThemeModeContext);
  const system = useColorScheme();
  const isDark = mode === "dark" || (mode === "system" && system === "dark");
  return isDark ? darkColors : lightColors;
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: "#2C1A0E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  strong: {
    shadowColor: "#D96606",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};

export function useShadows() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  return {
    card: {
      shadowColor: isDark ? "#000000" : "#2C1A0E",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.4 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    strong: {
      shadowColor: isDark ? "#000000" : "#D96606",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.6 : 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
  };
}

export const fonts = {
  display: "Outfit_700Bold",
  displayMedium: "Outfit_500Medium",
  body: "Nunito_400Regular",
  bodySemiBold: "Nunito_600SemiBold",
  bodyBold: "Nunito_700Bold",
};
