import { StyleSheet, Text } from "react-native";
import { TouchableScale } from "./TouchableScale";
import { colors, radius } from "../theme/colors";

export function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableScale
      onPress={onPress}
      style={[styles.wrap, active && styles.active]}
      scaleTo={0.94}
    >
      <Text style={[styles.text, active && styles.activeText]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  active: {
    backgroundColor: colors.brand[500],
    borderColor: colors.brand[500],
  },
  text: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: "600",
  },
  activeText: {
    color: "#fff",
  },
});
