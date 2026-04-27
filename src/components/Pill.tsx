import { Pressable, StyleSheet, Text } from "react-native";
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
    <Pressable
      onPress={onPress}
      style={[styles.wrap, active && styles.active]}
    >
      <Text style={[styles.text, active && styles.activeText]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
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
