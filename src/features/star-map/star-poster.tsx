import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';

import type { LocationResult, PosterRatio, PosterThemeId, SkyMap } from '@/core/types';

const THEMES = {
  observatory: { background: '#111216', foreground: '#f5f1e7', muted: '#8e98a5', accent: '#6f91ff', line: '#6a7890' },
  atlas: { background: '#f7f7f4', foreground: '#171918', muted: '#6f7470', accent: '#ad3343', line: '#9fa5a0' },
  bloom: { background: '#10251f', foreground: '#f3f3ea', muted: '#9bb2aa', accent: '#ff7b6e', line: '#668d7e' },
} as const;

const SIZES = {
  portrait: { width: 900, height: 1125 },
  square: { width: 900, height: 900 },
  wallpaper: { width: 900, height: 1600 },
} as const;

type Props = {
  sky: SkyMap;
  title: string;
  dedication: string;
  date: string;
  time: string;
  location: LocationResult;
  themeId: PosterThemeId;
  ratio: PosterRatio;
  showLines: boolean;
  showLabels: boolean;
};

export const StarPoster = forwardRef<View, Props>(function StarPoster(props, ref) {
  const { sky, title, dedication, date, time, location, themeId, ratio, showLines, showLabels } = props;
  const theme = THEMES[themeId];
  const size = SIZES[ratio];
  const chartRadius = size.width * (ratio === 'wallpaper' ? 0.39 : 0.37);
  const chartX = size.width / 2;
  const chartY = ratio === 'wallpaper' ? size.height * 0.45 : ratio === 'square' ? size.height * 0.49 : size.height * 0.48;
  const titleY = ratio === 'wallpaper' ? 140 : 78;
  const footerY = size.height - (ratio === 'wallpaper' ? 120 : 66);
  const titleSize = title.length > 30 ? 32 : title.length > 20 ? 39 : 48;
  const scale = (point: number) => point * chartRadius;

  return (
    <View ref={ref} collapsable={false} style={[styles.poster, { aspectRatio: size.width / size.height, backgroundColor: theme.background }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${size.width} ${size.height}`}>
        <Rect width={size.width} height={size.height} fill={theme.background} />
        <SvgText x={chartX} y={titleY} fill={theme.foreground} fontSize={titleSize} fontWeight="600" textAnchor="middle" letterSpacing={2}>
          {(title || 'OUR NIGHT SKY').toUpperCase()}
        </SvgText>
        <SvgText x={chartX} y={titleY + 38} fill={theme.muted} fontSize={15} textAnchor="middle" letterSpacing={2.4}>
          {location.name.toUpperCase()} · {date.replaceAll('-', '.')} · {time}
        </SvgText>

        <Circle cx={chartX} cy={chartY} r={chartRadius} fill="none" stroke={theme.muted} strokeOpacity={0.45} strokeWidth={1.2} />
        <Circle cx={chartX} cy={chartY} r={chartRadius * 0.66} fill="none" stroke={theme.muted} strokeOpacity={0.12} strokeWidth={0.8} />
        <Circle cx={chartX} cy={chartY} r={chartRadius * 0.33} fill="none" stroke={theme.muted} strokeOpacity={0.1} strokeWidth={0.8} />

        {showLines ? <G>{sky.lines.map((line, index) => <Line key={`line-${index}`} x1={chartX + scale(line.x1)} y1={chartY + scale(line.y1)} x2={chartX + scale(line.x2)} y2={chartY + scale(line.y2)} stroke={theme.line} strokeOpacity={0.34} strokeWidth={1.1} />)}</G> : null}
        <G>{sky.stars.map((star, index) => {
          const radius = Math.max(0.75, (5.8 - star.magnitude) * 0.62);
          return <Circle key={`star-${index}`} cx={chartX + scale(star.x)} cy={chartY + scale(star.y)} r={radius} fill={star.magnitude < 1.2 ? theme.accent : theme.foreground} fillOpacity={star.opacity} />;
        })}</G>
        {showLabels ? <G>{sky.labels.filter((label) => label.rank <= 2).map((label) => <SvgText key={label.text} x={chartX + scale(label.x)} y={chartY + scale(label.y) - 6} fill={theme.muted} fillOpacity={0.8} fontSize={10} textAnchor="middle" letterSpacing={1.2}>{label.text}</SvgText>)}</G> : null}

        {(['N', 'E', 'S', 'W'] as const).map((direction, index) => {
          const angle = (index * Math.PI) / 2;
          return <SvgText key={direction} x={chartX + Math.sin(angle) * (chartRadius + 22)} y={chartY - Math.cos(angle) * (chartRadius + 22) + 4} fill={theme.accent} fontSize={11} fontWeight="700" textAnchor="middle">{direction}</SvgText>;
        })}

        <Line x1={chartX - 38} x2={chartX + 38} y1={footerY - 55} y2={footerY - 55} stroke={theme.accent} strokeWidth={2} />
        <SvgText x={chartX} y={footerY - 20} fill={theme.foreground} fontSize={17} textAnchor="middle" letterSpacing={0.5}>{dedication || 'The sky above us, exactly as it was.'}</SvgText>
        <SvgText x={chartX} y={footerY + 22} fill={theme.muted} fontSize={11} textAnchor="middle" letterSpacing={1.6}>{location.latitude.toFixed(4)}° · {location.longitude.toFixed(4)}° · {location.timezone}</SvgText>
        <SvgText x={chartX} y={size.height - 24} fill={theme.muted} fillOpacity={0.65} fontSize={8} textAnchor="middle" letterSpacing={2.2}>THE SKY THEN · TRUE SKY POSITION</SvgText>
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({ poster: { width: '100%', maxWidth: 760, overflow: 'hidden', borderRadius: 2 } });
