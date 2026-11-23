import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "Alertas" }} />
      <Tabs.Screen name="matches" options={{ title: "Resultados" }} />
      <Tabs.Screen name="account" options={{ title: "Conta" }} />
    </Tabs>
  );
}
