import { Text } from "react-native";
import { highlight } from "./highlight";
import { c } from "./theme";

/** Nested <Text> segments with the marker background on every occurrence of `phrase`. */
export function Marked({ text, phrase }: { text: string; phrase: string }) {
  return (
    <>
      {highlight(text, phrase).map((s, i) =>
        s.mark ? <Text key={i} style={{ backgroundColor: c.marker, color: c.ink }}>{s.text}</Text> : s.text,
      )}
    </>
  );
}
