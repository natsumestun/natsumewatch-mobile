import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import * as NavigationBar from "expo-navigation-bar";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { apiFetch } from "../api/client";
import { useAuth } from "../store/auth";
import { colors, radius } from "../theme/colors";
import { formatTime } from "../utils/format";
import {
  getPosition,
  savePosition,
} from "../utils/playbackPositions";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Player">;

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const SKIP_OPENING_SECONDS = 85;

type ContentFit = "contain" | "cover";

export function PlayerScreen({ route, navigation }: Props) {
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

  const [overlay, setOverlay] = useState(true);
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fit, setFit] = useState<ContentFit>("contain");
  const [speed, setSpeed] = useState<number>(1);
  const [speedOpen, setSpeedOpen] = useState(false);

  const showOverlay = () => {
    setOverlay(true);
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };
  const hideOverlay = () => {
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setOverlay(false);
    });
  };
  const scheduleHide = (ms: number = 3500) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(hideOverlay, ms);
  };
  const bumpOverlay = () => {
    showOverlay();
    scheduleHide();
  };

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const player = useVideoPlayer({ uri: hls }, (p) => {
    p.loop = false;
    p.muted = false;
    p.timeUpdateEventInterval = 1;
    if (initialPosition && initialPosition > 0) {
      p.currentTime = initialPosition;
    }
    p.play();
  });

  // Restore from local storage if no explicit initialPosition
  useEffect(() => {
    if (initialPosition && initialPosition > 0) return;
    let cancelled = false;
    void (async () => {
      const rec = await getPosition({
        releaseId,
        episodeOrdinal,
        sourceProvider,
        sourceStudio,
      });
      if (cancelled || !rec) return;
      if (rec.position > 5 && (!rec.duration || rec.position < rec.duration - 15)) {
        try {
          player.currentTime = rec.position;
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [player, initialPosition, releaseId, episodeOrdinal, sourceProvider, sourceStudio]);

  const statusEvent = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });
  const isPlaying = statusEvent?.isPlaying ?? false;

  const timeEvent = useEvent(player, "timeUpdate", {
    currentTime: 0,
    currentOffsetFromLive: 0,
    currentLiveTimestamp: null,
    bufferedPosition: 0,
  });
  const current = timeEvent?.currentTime ?? 0;
  const duration = player.duration || 0;

  // Save position periodically and on unmount
  const savedRef = useRef<number>(0);
  useEffect(() => {
    if (!releaseId || !episodeOrdinal) return;
    if (current - savedRef.current >= 5 || (duration && current >= duration - 2)) {
      savedRef.current = current;
      void savePosition(
        { releaseId, episodeOrdinal, sourceProvider, sourceStudio },
        current,
        duration,
      );
    }
  }, [current, duration, releaseId, episodeOrdinal, sourceProvider, sourceStudio]);

  useEffect(() => {
    return () => {
      if (!releaseId || !episodeOrdinal) return;
      const p = Number(player.currentTime) || 0;
      const d = Number(player.duration) || 0;
      void savePosition(
        { releaseId, episodeOrdinal, sourceProvider, sourceStudio },
        p,
        d,
      );
    };
  }, [player, releaseId, episodeOrdinal, sourceProvider, sourceStudio]);

  useEffect(() => {
    try {
      player.playbackRate = speed;
    } catch {
      /* ignore */
    }
  }, [player, speed]);

  // Orientation + immersive
  useEffect(() => {
    void (async () => {
      try {
        await ScreenOrientation.unlockAsync();
      } catch {}
      if (Platform.OS === "android") {
        void NavigationBar.setVisibilityAsync("hidden").catch(() => undefined);
      }
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

  // Send history row
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

  const togglePlay = () => {
    if (isPlaying) player.pause();
    else player.play();
    bumpOverlay();
  };

  const seekBy = (delta: number) => {
    const next = Math.max(
      0,
      Math.min((player.currentTime ?? 0) + delta, duration || Infinity),
    );
    player.currentTime = next;
    bumpOverlay();
  };

  const seekRatio = (ratio: number) => {
    if (!duration) return;
    player.currentTime = Math.max(0, Math.min(duration * ratio, duration));
    bumpOverlay();
  };

  const progressWidthRef = useRef(1);
  const progress = duration ? current / duration : 0;

  return (
    <View style={styles.container}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => (overlay ? hideOverlay() : bumpOverlay())}
      >
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit={fit}
          allowsFullscreen
          allowsPictureInPicture
          nativeControls={false}
        />
      </Pressable>

      {overlay ? (
        <Animated.View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }]}
        >
          <View style={styles.scrim} pointerEvents="none" />

          <View style={styles.topBar}>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={styles.iconBtn}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {episodeOrdinal ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {episodeOrdinal} серия
                  {sourceStudio ? ` · ${sourceStudio}` : ""}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => {
                setSpeedOpen(true);
                if (hideTimer.current) clearTimeout(hideTimer.current);
              }}
              style={styles.speedBtn}
              hitSlop={6}
            >
              <Ionicons name="speedometer-outline" size={14} color="#fff" />
              <Text style={styles.speedBtnText}>{speed}x</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setFit((f) => (f === "contain" ? "cover" : "contain"));
                bumpOverlay();
              }}
              style={styles.iconBtn}
              hitSlop={6}
            >
              <Ionicons
                name={fit === "contain" ? "resize-outline" : "contract-outline"}
                size={18}
                color="#fff"
              />
            </Pressable>
          </View>

          <View style={styles.centerRow} pointerEvents="box-none">
            <Pressable onPress={() => seekBy(-10)} style={styles.centerBtn}>
              <Ionicons name="play-back" size={28} color="#fff" />
              <Text style={styles.centerBtnLabel}>10</Text>
            </Pressable>
            <Pressable onPress={togglePlay} style={styles.playBtn}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={34} color="#fff" />
            </Pressable>
            <Pressable onPress={() => seekBy(10)} style={styles.centerBtn}>
              <Ionicons name="play-forward" size={28} color="#fff" />
              <Text style={styles.centerBtnLabel}>10</Text>
            </Pressable>
          </View>

          <View style={styles.bottomBar}>
            <View style={styles.bottomRow}>
              <Text style={styles.time}>{formatTime(current)}</Text>
              <View
                style={styles.progressTrack}
                onLayout={(e) => {
                  progressWidthRef.current = e.nativeEvent.layout.width || 1;
                }}
                onStartShouldSetResponder={() => true}
                onResponderGrant={(e) => {
                  seekRatio(
                    Math.max(
                      0,
                      Math.min(
                        1,
                        e.nativeEvent.locationX / progressWidthRef.current,
                      ),
                    ),
                  );
                }}
                onResponderMove={(e) => {
                  seekRatio(
                    Math.max(
                      0,
                      Math.min(
                        1,
                        e.nativeEvent.locationX / progressWidthRef.current,
                      ),
                    ),
                  );
                }}
              >
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                <View
                  style={[
                    styles.progressThumb,
                    { left: `${progress * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.time}>{formatTime(duration)}</Text>
            </View>
            <View style={styles.bottomControls}>
              <Pressable
                onPress={() => seekBy(SKIP_OPENING_SECONDS)}
                style={styles.skipBtn}
              >
                <Ionicons name="play-skip-forward" size={14} color="#fff" />
                <Text style={styles.skipBtnText}>Скип опенинга</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      ) : null}

      <Modal
        visible={speedOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSpeedOpen(false);
          bumpOverlay();
        }}
      >
        <Pressable
          style={styles.speedBack}
          onPress={() => {
            setSpeedOpen(false);
            bumpOverlay();
          }}
        >
          <Pressable style={styles.speedCard} onPress={() => undefined}>
            <Text style={styles.speedTitle}>Скорость воспроизведения</Text>
            {SPEEDS.map((s) => (
              <Pressable
                key={s}
                style={[
                  styles.speedItem,
                  s === speed && styles.speedItemActive,
                ]}
                onPress={() => {
                  setSpeed(s);
                  setSpeedOpen(false);
                  bumpOverlay();
                }}
              >
                <Text style={[styles.speedItemText, s === speed && { color: "#fff" }]}>
                  {s}x
                </Text>
                {s === speed ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  title: { color: "#fff", fontSize: 15, fontWeight: "700" },
  subtitle: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  speedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  speedBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  centerRow: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 48,
  },
  centerBtn: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  centerBtnLabel: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  time: {
    color: "#fff",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    minWidth: 42,
    textAlign: "center",
  },
  progressTrack: {
    flex: 1,
    height: 24,
    justifyContent: "center",
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.brand[500],
    borderRadius: 2,
  },
  progressThumb: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    marginLeft: -6,
    top: 6,
  },
  bottomControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  skipBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  speedBack: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  speedCard: {
    width: 260,
    backgroundColor: colors.bg.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.bg.border,
    padding: 14,
    gap: 6,
  },
  speedTitle: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  speedItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  speedItemActive: {
    backgroundColor: colors.brand[500],
  },
  speedItemText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "700",
  },
});

