import { StyleSheet } from "react-native";

export const c = {
  paper: "#F6F7F4",
  ink: "#13233A",
  inkSoft: "#55606E",
  rule: "#D8DCE1",
  marker: "#FFE15A",
  seal: "#1E6B47",
  alert: "#A3262A",
};

export const font = {
  serif: "Literata_400Regular",
  serifBold: "Literata_600SemiBold",
  sans: "AtkinsonHyperlegible_400Regular",
  sansBold: "AtkinsonHyperlegible_700Bold",
};

/** Shared across screens: one radius (4), no shadows, ink buttons, ruled inputs. */
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper },
  input: {
    borderWidth: 1, borderColor: c.rule, borderRadius: 4, backgroundColor: "#fff",
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, fontFamily: font.sans, color: c.ink,
  },
  button: { backgroundColor: c.ink, borderRadius: 4, paddingHorizontal: 16, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  buttonText: { color: c.paper, fontSize: 16, fontFamily: font.sansBold },
  link: { color: c.ink, fontSize: 14, fontFamily: font.sans, textDecorationLine: "underline" },
  error: { color: c.alert, fontSize: 14, fontFamily: font.sans },
  body: { color: c.ink, fontSize: 16, fontFamily: font.sans },
  soft: { color: c.inkSoft, fontSize: 14, fontFamily: font.sans },
});
