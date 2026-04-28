import { forwardRef } from "react";
import {
  Pressable,
  type PressableProps,
  type View,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type TouchableScaleProps = Omit<PressableProps, "style"> & {
  /** target scale on press in. Default 0.96 */
  scaleTo?: number;
  /** target opacity on press in. Default 0.85 */
  opacityTo?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Drop-in replacement for Pressable that adds a smooth spring scale + opacity
 * animation on press. Use anywhere a tappable surface should feel responsive.
 */
export const TouchableScale = forwardRef<View, TouchableScaleProps>(
  function TouchableScale(
    { scaleTo = 0.96, opacityTo = 0.85, style, onPressIn, onPressOut, ...rest },
    ref,
  ) {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    return (
      <AnimatedPressable
        ref={ref}
        style={[style, animatedStyle]}
        onPressIn={(e) => {
          scale.value = withSpring(scaleTo, {
            mass: 0.6,
            damping: 14,
            stiffness: 240,
          });
          opacity.value = withTiming(opacityTo, { duration: 90 });
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.value = withSpring(1, {
            mass: 0.6,
            damping: 14,
            stiffness: 240,
          });
          opacity.value = withTiming(1, { duration: 140 });
          onPressOut?.(e);
        }}
        {...rest}
      />
    );
  },
);
