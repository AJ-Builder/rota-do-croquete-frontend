import { ActivityIndicator, View } from "react-native";

// Shown while AuthContext.bootstrap() is running (NavigationGate redirects after)
export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: "#FFF9F2", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color="#D96606" />
    </View>
  );
}
