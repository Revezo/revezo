import React from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';

interface HouseEntranceIllustrationProps {
  size?: number;
  color?: string;
}

export function HouseEntranceIllustration({
  size = 90,
  color = '#2563EB',
}: HouseEntranceIllustrationProps) {
  // Proportions: 96 width x 88 height
  const width = size;
  const height = size * (88 / 96);

  return (
    <Svg width={width} height={height} viewBox="0 0 96 88" fill="none">
      <G stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer roof chevron */}
        <Path d="M 14 42 L 48 16 L 82 42" />

        {/* Inner roof chevron */}
        <Path d="M 22 42 L 48 23 L 74 42" />

        {/* Eave ends */}
        <Path d="M 12 42 L 22 42" />
        <Path d="M 74 42 L 84 42" />

        {/* Outer walls */}
        <Path d="M 20 42 L 20 76" />
        <Path d="M 76 42 L 76 76" />

        {/* Ground lines (left and right of doorway) */}
        <Path d="M 16 76 L 36 76" />
        <Path d="M 60 76 L 80 76" />

        {/* Doorway frame header */}
        <Path d="M 36 46 L 60 46" />

        {/* Left open door (angled in perspective) */}
        <Path d="M 36 46 L 29 50 L 29 80 L 36 76 Z" />
        <Path d="M 32.5 48 L 32.5 78" />

        {/* Right open door (angled in perspective) */}
        <Path d="M 60 46 L 67 50 L 67 80 L 60 76 Z" />
        <Path d="M 63.5 48 L 63.5 78" />

        {/* Left window (2 panes) */}
        <Rect x="23" y="52" width="10" height="10" rx="0.5" />
        <Path d="M 28 52 L 28 62" />

        {/* Right window (2 panes) */}
        <Rect x="63" y="52" width="10" height="10" rx="0.5" />
        <Path d="M 68 52 L 68 62" />
      </G>

      {/* Blue Arrow pointing up inside doorway */}
      <Path
        d="M 48 54 L 41 63 L 45.5 63 L 45.5 83 L 50.5 83 L 50.5 63 L 55 63 Z"
        fill={color}
      />
    </Svg>
  );
}
