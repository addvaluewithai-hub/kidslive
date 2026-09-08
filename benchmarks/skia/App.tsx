import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  StatusBar,
  Text as RNText,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Atlas,
  Canvas,
  Circle,
  Fill,
  Group,
  Line,
  Oval,
  Rect,
  Text as SkiaText,
  matchFont,
  rect,
  useRSXformBuffer,
  useTexture,
  vec,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  useTimestamp,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const STEADY_MOTES = 36;
const BUSY_MOTES = 72;
const PARTICLES = 96;
const WORLD_ZOOM = 0.84;

const PLACES = [
  { id: 'english', name: 'English Grove', subtitle: 'Stories & words', x: 220, y: 210, accent: '#73ddff' },
  { id: 'german', name: 'German Harbor', subtitle: 'Tiny missions', x: 600, y: 165, accent: '#8fa7ff' },
  { id: 'chess', name: 'Chess Citadel', subtitle: 'Think ahead', x: 950, y: 300, accent: '#ffd166' },
  { id: 'knowledge', name: 'Knowledge Observatory', subtitle: 'How do we know?', x: 860, y: 650, accent: '#d493ff' },
  { id: 'habits', name: 'Habits Garden', subtitle: 'Tiny wins', x: 505, y: 720, accent: '#7ff0b8' },
  { id: 'lab', name: 'Curiosity Lab', subtitle: 'Try & discover', x: 160, y: 590, accent: '#ff8fb9' },
];

type Place = (typeof PLACES)[number];

type Metrics = {
  avg: number;
  low: number;
  worst: number;
  long: number;
};

const titleFont = matchFont({
  fontFamily: 'sans-serif',
  fontSize: 22,
  fontWeight: 'bold',
});
const subtitleFont = matchFont({
  fontFamily: 'sans-serif',
  fontSize: 13,
  fontWeight: 'normal',
});

const STARS = Array.from({ length: 120 }, (_, i) => ({
  x: ((i * 83 + 31) % 1320) - 80,
  y: ((i * 47 + 19) % 980) - 70,
  r: 0.8 + (i % 4) * 0.55,
  alpha: 0.14 + (i % 5) * 0.07,
}));

function WorldIsland({ place, index, timestamp }: { place: Place; index: number; timestamp: SharedValue<number> }) {
  const portalScale = useDerivedValue(() => {
    const t = timestamp.value / 1000;
    const scale = 0.98 + Math.sin(t * 1.6 + index * 0.83) * 0.045;
    return [{ scale }];
  });
  const orbiterX = useDerivedValue(() => Math.cos(timestamp.value / 1000 * (0.82 + index * 0.012) + index * 0.83) * 51);
  const orbiterY = useDerivedValue(() => -53 + Math.sin(timestamp.value / 1000 * (0.82 + index * 0.012) + index * 0.83) * 51);
  const titleWidth = titleFont.measureText(place.name).width;
  const subtitleWidth = subtitleFont.measureText(place.subtitle).width;

  return (
    <Group transform={[{ translateX: place.x }, { translateY: place.y }]}>
      <Oval x={-108} y={38} width={216} height={54} color="rgba(2,4,16,0.42)" />
      <Oval x={-95} y={-12} width={190} height={98} color="#151a3b" />
      <Oval x={-108} y={-43} width={216} height={96} color="#202854" />
      <Oval x={-108} y={-43} width={216} height={96} color={place.accent} opacity={0.08} />

      {[-58, -29, 28, 58].map((x, j) => {
        const h = 22 + ((index + j) % 3) * 9;
        return (
          <Group key={`${place.id}-decor-${j}`}>
            <Rect x={x - 4} y={4 - h} width={8} height={h} color="#3a4372" />
            <Circle cx={x} cy={2 - h} r={9 + ((j + index) % 2) * 4} color={place.accent} opacity={0.72} />
          </Group>
        );
      })}

      <Group transform={[{ translateY: -53 }]}>
        <Group transform={portalScale}>
          <Circle cx={0} cy={0} r={56} color={place.accent} opacity={0.08} />
          <Circle cx={0} cy={0} r={38} color="#0e1535" />
          <Circle cx={0} cy={0} r={38} color={place.accent} style="stroke" strokeWidth={4} />
          <Circle cx={0} cy={0} r={24} color={place.accent} opacity={0.2} />
        </Group>
      </Group>

      <Circle cx={orbiterX} cy={orbiterY} r={6} color={place.accent} />
      <SkiaText x={-titleWidth / 2} y={118} text={place.name} font={titleFont} color="white" />
      <SkiaText x={-subtitleWidth / 2} y={142} text={place.subtitle} font={subtitleFont} color="#aeb8df" />
    </Group>
  );
}

function Actor({ x, y, timestamp, busy }: { x: SharedValue<number>; y: SharedValue<number>; timestamp: SharedValue<number>; busy: SharedValue<number> }) {
  const transform = useDerivedValue(() => [
    { translateX: x.value },
    { translateY: y.value - 8 + Math.sin(timestamp.value / 1000 * 2.2) * 6 },
  ]);
  const thrusterScale = useDerivedValue(() => 0.88 + (Math.sin(timestamp.value / 1000 * 4.3) + 1) * 0.06);
  const thrusterOpacity = useDerivedValue(() => 0.17 + (Math.sin(timestamp.value / 1000 * 5.1) + 1) * 0.08);
  const mouthScale = useDerivedValue(() => busy.value > 0.5 ? 0.65 + Math.abs(Math.sin(timestamp.value / 1000 * 12.5)) * 1.7 : 0.65);
  const thrusterTransform = useDerivedValue(() => [{ scale: thrusterScale.value }]);
  const mouthTransform = useDerivedValue(() => [{ scaleY: mouthScale.value }]);

  return (
    <Group transform={transform}>
      <Group transform={thrusterTransform} opacity={thrusterOpacity}>
        <Oval x={-22} y={29} width={44} height={32} color="#5ce4ff" opacity={0.42} />
      </Group>
      <Oval x={-42} y={-49} width={84} height={98} color="#6959e8" />
      <Oval x={-31} y={-37} width={62} height={50} color="#101733" />
      <Circle cx={-14} cy={-15} r={5.5} color="#d7fbff" />
      <Circle cx={14} cy={-15} r={5.5} color="#d7fbff" />
      <Group transform={mouthTransform}>
        <Rect x={-8} y={1} width={16} height={4} color="#89f3ff" />
      </Group>
      <Line p1={vec(0, -49)} p2={vec(0, -70)} color="#b0a6ff" strokeWidth={4} />
      <Circle cx={0} cy={-78} r={7} color="#6eeaf5" />
    </Group>
  );
}

export default function App() {
  const { width, height } = useWindowDimensions();
  const timestamp = useTimestamp();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [busyMode, setBusyMode] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({ avg: 0, low: 0, worst: 0, long: 0 });

  const cameraX = useSharedValue<number>(PLACES[0].x);
  const cameraY = useSharedValue<number>(PLACES[0].y);
  const actorX = useSharedValue<number>(PLACES[0].x + 126);
  const actorY = useSharedValue<number>(PLACES[0].y - 86);
  const selectedX = useSharedValue<number>(PLACES[0].x);
  const selectedY = useSharedValue<number>(PLACES[0].y);
  const busy = useSharedValue<number>(0);

  const worldTransform = useDerivedValue(() => [
    { translateX: width / 2 - cameraX.value * WORLD_ZOOM },
    { translateY: height / 2 - cameraY.value * WORLD_ZOOM },
    { scale: WORLD_ZOOM },
  ]);

  const moteTexture = useTexture(<Circle cx={4} cy={4} r={4} color="white" />, { width: 8, height: 8 });
  const sparkTexture = useTexture(
    <Group>
      <Rect x={5} y={0} width={2} height={12} color="white" />
      <Rect x={0} y={5} width={12} height={2} color="white" />
    </Group>,
    { width: 12, height: 12 },
  );
  const moteSprites = useMemo(() => Array.from({ length: BUSY_MOTES }, () => rect(0, 0, 8, 8)), []);
  const particleSprites = useMemo(() => Array.from({ length: PARTICLES }, () => rect(0, 0, 12, 12)), []);

  const moteTransforms = useRSXformBuffer(BUSY_MOTES, (value, i) => {
    'worklet';
    const enabled = busy.value > 0.5 || i < STEADY_MOTES;
    const angle = i * 2.399963 + selectedX.value * 0.0007;
    const distance = 110 + (i % 12) * 36;
    const ox = selectedX.value + Math.cos(angle) * distance;
    const oy = selectedY.value + Math.sin(angle) * distance * 0.68;
    const t = timestamp.value / 1000;
    const phase = t * (0.38 + (i % 7) * 0.07) + i * 0.71;
    const x = ox + Math.cos(phase) * (5 + (i % 5) * 3);
    const y = oy + Math.sin(phase * 0.82) * (8 + (i % 6) * 3);
    const scale = enabled ? 0.35 + (i % 6) * 0.1 : 0;
    value.set(scale, 0, x, y);
  });

  const particleTransforms = useRSXformBuffer(PARTICLES, (value, i) => {
    'worklet';
    const activeCount = busy.value > 0.5 ? 88 : 40;
    if (i >= activeCount) {
      value.set(0, 0, 0, 0);
      return;
    }
    const cycle = 1100 + (i % 7) * 55;
    const phase = ((timestamp.value + i * 37) % cycle) / cycle;
    const angle = i * 2.399963 + phase * 1.7;
    const energy = busy.value > 0.5 ? 1.0 : 0.78;
    const radius = phase * 98 * energy;
    const x = selectedX.value + Math.cos(angle) * radius;
    const y = selectedY.value - 48 + Math.sin(angle) * radius - phase * 24;
    const fade = Math.sin(Math.PI * phase);
    const scale = Math.max(0, fade) * (0.35 + (i % 4) * 0.09);
    const rotation = phase * 4 + i * 0.2;
    value.set(Math.cos(rotation) * scale, Math.sin(rotation) * scale, x, y);
  });

  const sumMs = useSharedValue<number>(0);
  const frameCount = useSharedValue<number>(0);
  const worstMs = useSharedValue<number>(0);
  const longFrames = useSharedValue<number>(0);
  const lastReport = useSharedValue<number>(0);

  const publishMetrics = useCallback((avgMs: number, worst: number, long: number) => {
    setMetrics({
      avg: Math.round(1000 / Math.max(avgMs, 0.1)),
      low: Math.round(1000 / Math.max(worst, 0.1)),
      worst: Number(worst.toFixed(1)),
      long,
    });
  }, []);

  useFrameCallback((frame) => {
    'worklet';
    const dt = frame.timeSincePreviousFrame;
    if (dt == null) return;
    if (lastReport.value === 0) lastReport.value = frame.timestamp;
    sumMs.value += dt;
    frameCount.value += 1;
    worstMs.value = Math.max(worstMs.value, dt);
    if (dt > 32) longFrames.value += 1;

    if (frame.timestamp - lastReport.value >= 1000 && frameCount.value > 0) {
      const avgMs = sumMs.value / frameCount.value;
      scheduleOnRN(publishMetrics, avgMs, worstMs.value, longFrames.value);
      sumMs.value = 0;
      frameCount.value = 0;
      worstMs.value = 0;
      longFrames.value = 0;
      lastReport.value = frame.timestamp;
    }
  });

  const selected = PLACES[selectedIndex];

  const visit = useCallback((index: number) => {
    const place = PLACES[index];
    setSelectedIndex(index);
    selectedX.value = place.x;
    selectedY.value = place.y;
    cameraX.value = withTiming(place.x, { duration: 900 });
    cameraY.value = withTiming(place.y, { duration: 900 });
    actorX.value = withTiming(place.x + 126, { duration: 900 });
    actorY.value = withTiming(place.y - 86, { duration: 900 });
  }, [actorX, actorY, cameraX, cameraY, selectedX, selectedY]);

  const setLoad = useCallback((nextBusy: boolean) => {
    setBusyMode(nextBusy);
    busy.value = nextBusy ? 1 : 0;
    sumMs.value = 0;
    frameCount.value = 0;
    worstMs.value = 0;
    longFrames.value = 0;
    lastReport.value = 0;
    setMetrics({ avg: 0, low: 0, worst: 0, long: 0 });
  }, [busy, frameCount, lastReport, longFrames, sumMs, worstMs]);

  const reset = useCallback(() => {
    sumMs.value = 0;
    frameCount.value = 0;
    worstMs.value = 0;
    longFrames.value = 0;
    lastReport.value = 0;
    setMetrics({ avg: 0, low: 0, worst: 0, long: 0 });
  }, [frameCount, lastReport, longFrames, sumMs, worstMs]);

  return (
    <View style={{ flex: 1, backgroundColor: '#080b22' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Canvas style={{ flex: 1 }}>
        <Fill color="#080b22" />
        <Group transform={worldTransform}>
          <Circle cx={330} cy={260} r={330} color="#6b55d7" opacity={0.11} />
          <Circle cx={850} cy={590} r={390} color="#24a5c3" opacity={0.09} />
          <Circle cx={760} cy={120} r={260} color="#b14898" opacity={0.07} />
          {STARS.map((star, i) => (
            <Circle key={`star-${i}`} cx={star.x} cy={star.y} r={star.r} color="white" opacity={star.alpha} />
          ))}
          {PLACES.map((place, i) => (
            <Line
              key={`route-${place.id}`}
              p1={vec(place.x, place.y)}
              p2={vec(PLACES[(i + 1) % PLACES.length].x, PLACES[(i + 1) % PLACES.length].y)}
              color="rgba(128,151,255,0.11)"
              strokeWidth={4}
            />
          ))}
          {PLACES.map((place, i) => (
            <WorldIsland key={place.id} place={place} index={i} timestamp={timestamp} />
          ))}
          <Atlas image={moteTexture} sprites={moteSprites} transforms={moteTransforms} blendMode="plus" />
          <Atlas image={sparkTexture} sprites={particleSprites} transforms={particleTransforms} blendMode="plus" />
          <Actor x={actorX} y={actorY} timestamp={timestamp} busy={busy} />
        </Group>
      </Canvas>

      <View pointerEvents="box-none" style={{ position: 'absolute', top: 38, left: 14, right: 14, gap: 8 }}>
        <RNText style={{ color: '#9ba8dc', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }} selectable>
          KIDSLIVE / ARCHITECTURE SHOOTOUT — SKIA
        </RNText>
        <RNText style={{ color: 'white', fontSize: 24, fontWeight: '800' }} selectable>
          React Native Skia Candidate
        </RNText>
        <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(9,13,39,0.86)', borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
          <RNText style={{ color: '#e8ecff', fontSize: 12, fontVariant: ['tabular-nums'] }} selectable>
            {metrics.avg || '—'} avg   {metrics.low || '—'} 1% low   {metrics.worst || '—'} worst ms   {metrics.long} long
          </RNText>
          <RNText style={{ color: busyMode ? '#ffd166' : '#7ff0b8', fontSize: 11, marginTop: 3 }} selectable>
            {busyMode ? 'BUSY LESSON' : 'PRODUCTION STEADY'} / native Skia
          </RNText>
        </View>
        <RNText style={{ color: '#aeb8df', fontSize: 12 }} selectable>
          {selected.name} — {selected.subtitle}
        </RNText>
      </View>

      <View style={{ position: 'absolute', left: 10, right: 10, bottom: 18, flexDirection: 'row', gap: 6 }}>
        {[
          { label: 'Steady', onPress: () => setLoad(false), active: !busyMode },
          { label: 'Busy', onPress: () => setLoad(true), active: busyMode },
          { label: 'Next', onPress: () => visit((selectedIndex + 1) % PLACES.length), active: false },
          { label: 'Reset', onPress: reset, active: false },
        ].map((item) => (
          <Pressable
            key={item.label}
            onPress={item.onPress}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: item.active ? 'rgba(115,221,255,0.65)' : 'rgba(255,255,255,0.14)',
              backgroundColor: item.active ? 'rgba(63,156,221,0.24)' : 'rgba(9,13,39,0.9)',
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <RNText style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>{item.label}</RNText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
