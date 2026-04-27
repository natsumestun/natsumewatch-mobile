import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";

export function Loading() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.brand[500]} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.base,
  },
});
