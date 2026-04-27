import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiFetch } from "../api/client";
import type { ReleaseSummary } from "../api/types";
import { colors, radius, spacing } from "../theme/colors";
import { PosterCard } from "../components/PosterCard";
import type { RootStackParamList } from "../navigation/types";

export function RandomScreen() {
  const stackNav =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { data, isFetching, refetch } = useQuery<ReleaseSummary>({
    queryKey: ["random"],
    queryFn: () => apiFetch<ReleaseSummary>("/anime/random"),
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={styles.title}>Случайный тайтл</Text>
      <Text style={styles.subtitle}>
        Нажмите на карточку, чтобы открыть, или «Ещё» для нового.
      </Text>

      <View style={styles.cardWrap}>
        {isFetching && !data ? (
          <ActivityIndicator color={colors.brand[500]} />
        ) : data ? (
          <PosterCard
            release={data}
            width={220}
            onPress={() =>
              stackNav.navigate("Anime", {
                idOrAlias: String(data.alias || data.id),
              })
            }
          />
        ) : null}
      </View>

      {data ? (
        <Text style={styles.name} numberOfLines={2}>
          {data.name.main}
        </Text>
      ) : null}

      <Pressable
        style={styles.btn}
        onPress={() => refetch()}
        disabled={isFetching}
      >
        <Ionicons name="shuffle" size={18} color="#fff" />
        <Text style={styles.btnText}>Ещё одно случайное</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: 16,
  },
  title: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.text.muted,
    textAlign: "center",
    fontSize: 13,
  },
  cardWrap: {
    height: 330,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  name: {
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginHorizontal: 24,
  },
  btn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: colors.brand[500],
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: 16,
  },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
