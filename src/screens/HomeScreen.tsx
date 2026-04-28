import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Hero } from "../components/Hero";
import { PosterRow } from "../components/PosterRow";
import { colors, spacing } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";
import type { ReleaseSummary } from "../api/types";

type Props = NativeStackScreenProps<RootStackParamList, "Tabs">;

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const open = (r: ReleaseSummary) =>
    navigation.navigate("Anime", { idOrAlias: String(r.alias || r.id) });

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <Hero onSelect={open} />
      <View style={styles.rows}>
        <PosterRow
          title="Набирает популярность"
          endpoint="/anime/catalog?limit=12&sorting=RATING_DESC&publish_statuses=IS_ONGOING"
          onSelect={open}
        />
        <PosterRow
          title="Свежие релизы"
          endpoint="/anime/latest?limit=12"
          onSelect={open}
        />
        <PosterRow
          title="Сейчас в эфире"
          endpoint="/anime/catalog?publish_statuses=IS_ONGOING&limit=12&sorting=FRESH_AT_DESC"
          onSelect={open}
        />
        <PosterRow
          title="Топ по рейтингу"
          endpoint="/anime/catalog?limit=12&sorting=RATING_DESC"
          onSelect={open}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    paddingTop: 0,
  },
  rows: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
});
