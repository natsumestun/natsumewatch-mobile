import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { TouchableScale } from "./TouchableScale";
import {
  isSubscribed,
  subscribe,
  unsubscribe,
} from "../utils/episodeSubscriptions";
import { colors, radius } from "../theme/colors";

export function SubscribeBell({
  releaseId,
  alias,
  title,
  poster,
  topInset = 0,
}: {
  releaseId: number;
  alias: string | null;
  title: string;
  poster: string | null;
  topInset?: number;
}) {
  const [subscribed, setSubscribed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const v = await isSubscribed(releaseId);
      if (!cancelled) setSubscribed(v);
    })();
    return () => {
      cancelled = true;
    };
  }, [releaseId]);

  const toggle = async () => {
    Haptics.selectionAsync().catch(() => undefined);
    if (subscribed) {
      setSubscribed(false);
      await unsubscribe(releaseId);
    } else {
      setSubscribed(true);
      await subscribe({
        id: releaseId,
        alias,
        title,
        poster,
        addedAt: Date.now(),
      });
    }
  };

  return (
    <TouchableScale
      onPress={toggle}
      hitSlop={10}
      scaleTo={0.85}
      style={[styles.btn, { top: topInset + 8 }]}
    >
      <Ionicons
        name={subscribed ? "notifications" : "notifications-outline"}
        size={20}
        color={subscribed ? colors.brand[300] : "#fff"}
      />
    </TouchableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: "absolute",
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
});
