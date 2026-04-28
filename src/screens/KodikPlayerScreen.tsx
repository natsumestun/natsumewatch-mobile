import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { apiFetch } from "../api/client";
import { useAuth } from "../store/auth";
import { spacing } from "../theme/colors";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "KodikPlayer">;

const EMBED_BASE = "https://natsumewatch-backend-wsjmfcnv.fly.dev/";

function buildKodikEmbedHtml(url: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"><style>html,body{margin:0;padding:0;background:#000;height:100%;width:100%;overflow:hidden}iframe{border:0;width:100vw;height:100vh;display:block;background:#000}</style></head><body><iframe src="${url}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></body></html>`;
}

export function KodikPlayerScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const {
    iframeUrl,
    title,
    releaseId,
    episodeOrdinal,
    episodeName,
    sourceProvider,
    sourceStudio,
  } = route.params;
  const me = useAuth((s) => s.user);
  const html = useMemo(() => buildKodikEmbedHtml(iframeUrl), [iframeUrl]);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleHide() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setOverlayVisible(false), 3500);
  }

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
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

  return (
    <View style={styles.container}>
      <WebView
        source={{ html, baseUrl: EMBED_BASE }}
        style={styles.web}
        allowsFullscreenVideo
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        originWhitelist={["*"]}
        mixedContentMode="always"
        scalesPageToFit
        userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
      />
      {overlayVisible ? (
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
      ) : (
        <Pressable
          style={[styles.peekZone, { height: insets.top + 56 }]}
          onPress={() => {
            setOverlayVisible(true);
            scheduleHide();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  web: {
    flex: 1,
    backgroundColor: "#000",
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
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  peekZone: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
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
