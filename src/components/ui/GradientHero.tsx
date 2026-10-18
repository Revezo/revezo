import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

type Props = {
    height: number;
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
};

const BLOBS = [
    { id: 'b1', color: '#6CBEFF', opacity: 0.8,  cx: 0.87, cy: 0.04,  rx: 0.56, ry: 0.66 },
    { id: 'b2', color: '#2F68EE', opacity: 0.85, cx: 0.08, cy: 0.96,  rx: 0.56, ry: 0.63 }, 
    { id: 'b3', color: '#5C7CFF', opacity: 0.45, cx: 0.85, cy: 0.83,  rx: 0.43, ry: 0.5 },  
    { id: 'b4', color: '#4DA3FF', opacity: 0.65, cx: 0.36, cy: -0.05, rx: 0.41, ry: 0.46 }, 
];

const FALLOFF = Array.from({ length: 10 }, (_, i) => {
    const t = i / 9;
    const k = 4;
    const a = (Math.exp(-k * t * t) - Math.exp(-k)) / (1 - Math.exp(-k));
    return { offset: t, a };
});

export function GradientHero({ height, style, children }: Props) {
    const { width } = useWindowDimensions();

    const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
    const gid = (name: string) => `${name}-${uid}`;

    const bandCx = width / 2;
    const bandCy = height * 0.36 + 35;

    return (
        <View style={[{ height, overflow: 'hidden' }, style]}>
            <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
                <Defs>
                <LinearGradient id={gid('base')} x1="0.18" y1="0" x2="0.82" y2="1">
                    <Stop offset="0" stopColor="#3F8EFF" />
                    <Stop offset="0.42" stopColor="#2B7FFF" />
                    <Stop offset="1" stopColor="#2B73F6" />
                </LinearGradient>

                {BLOBS.map((b) => (
                    <RadialGradient key={b.id} id={gid(b.id)} cx="50%" cy="50%" r="50%">
                        {FALLOFF.map((s) => (
                            <Stop key={s.offset} offset={s.offset} stopColor={b.color} stopOpacity={b.opacity * s.a} />
                        ))}
                    </RadialGradient>
                ))}

                <RadialGradient id={gid('band')} cx="50%" cy="50%" r="50%">
                    {FALLOFF.map((s) => (
                        <Stop key={s.offset} offset={s.offset} stopColor="#FFFFFF" stopOpacity={0.24 * s.a} />
                    ))}
                </RadialGradient>
                </Defs>

                <Rect width={width} height={height} fill={`url(#${gid('base')})`} />

                {BLOBS.map((b) => (
                <Ellipse
                    key={b.id}
                    cx={b.cx * width}
                    cy={b.cy * height}
                    rx={b.rx * width}
                    ry={b.ry * height}
                    fill={`url(#${gid(b.id)})`}
                />
                ))}

                <Ellipse
                    cx={bandCx}
                    cy={bandCy}
                    rx={width * 0.8}
                    ry={140}
                    transform={`rotate(-24 ${bandCx} ${bandCy})`}
                    fill={`url(#${gid('band')})`}
                />
            </Svg>
            {children}
        </View>
    );
}