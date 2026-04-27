import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { apiFetch } from "../api/client";
import { useAuth } from "../store/auth";
import { spacing } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Player">;

export function PlayerScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const {
    hls,
    title,
    initialPosition,
    releaseId,
    episodeOrdinal,
    episodeName,
    sourceProvider,
    sourceStudio,
  } = route.params;
  const me = useAuth((s) => s.user);

  const player = useVideoPlayer({ uri: hls }, (p) => {
    p.loop = false;
    p.muted = false;
    if (initialPosition && initialPosition > 0) {
      p.currentTime = initialPosition;
    }
    p.play();
  });

  useEffect(() => {
    void (async () => {
      try {
        await ScreenOrientation.unlockAsync();
      } catch {}
    })();
    return () => {
      void (async () => {
        try {
          await ScreenOrientation.lockAsync(
            ScreenOrientation.OrientationLock.PORTRAIT_UP,
          );
        } catch {}
      })();
    };
  }, []);

  useEffect(() => {
    if (!me || !releaseId || !episodeOrdinal) return;
    apiFetch("/me/history", {
      method: "POST",
      body: JSON.stringify({
        release_id: releaseId,
        episode_ordinal: episodeOrdinal,
        episode_name: episodeName ?? null,
        source_provider: sourceProvider ?? null,
        source_studio: sourceStudio ?? null,
      }),
    }).catch(() => undefined);
  }, [me, releaseId, episodeOrdinal, episodeName, sourceProvider, sourceStudio]);

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        allowsFullscreen
        allowsPictureInPicture
        nativeControls
      />
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  video: {
    flex: 1,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingBottom: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
