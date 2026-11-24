import type { ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { c, font } from "@/lib/theme";

const icon = (name: keyof typeof Ionicons.glyphMap) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color as string} />;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.inkSoft,
        tabBarLabelStyle: { fontFamily: font.sans, fontSize: 12 },
        tabBarStyle: { backgroundColor: c.paper, borderTopColor: c.rule },
        headerStyle: { backgroundColor: c.paper },
        headerShadowVisible: false,
        headerTintColor: c.ink,
        headerTitleStyle: { fontFamily: font.serifBold, fontSize: 20 },
        sceneStyle: { backgroundColor: c.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Alertas", tabBarIcon: icon("notifications-outline") }} />
      <Tabs.Screen name="matches" options={{ title: "Atos", tabBarIcon: icon("document-text-outline") }} />
      <Tabs.Screen name="account" options={{ title: "Conta", tabBarIcon: icon("person-outline") }} />
    </Tabs>
  );
}
