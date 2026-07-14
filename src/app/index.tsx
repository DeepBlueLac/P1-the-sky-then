import AsyncStorage from '@react-native-async-storage/async-storage';
import Head from 'expo-router/head';
import { Check, Crown, Download, MapPin, RotateCcw, Search, SlidersHorizontal, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { validateDateTime } from '@/core/input-validation';
import { buildSkyMap } from '@/core/sky';
import type { LocationResult, PosterRatio, PosterThemeId } from '@/core/types';
import { StarPoster } from '@/features/star-map/star-poster';
import { exportPoster } from '@/platform/export-poster';
import { trackProductEvent } from '@/services/analytics';
import { searchLocations } from '@/services/geocoding';

const STORAGE_KEY = 'the-sky-then:poster:v1';
const STAR_VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4';
const WebVideo = 'video' as unknown as React.ComponentType<{
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: string;
  src: string;
  style?: Record<string, unknown>;
  'aria-hidden'?: boolean;
  'data-testid'?: string;
}>;
const DEFAULT_LOCATION: LocationResult = {
  id: 'shanghai-cn',
  name: 'Shanghai',
  admin1: 'Shanghai',
  country: 'China',
  latitude: 31.2304,
  longitude: 121.4737,
  timezone: 'Asia/Shanghai',
};

type SavedState = {
  title: string;
  dedication: string;
  date: string;
  time: string;
  location: LocationResult;
  theme: PosterThemeId;
  ratio: PosterRatio;
  showLines: boolean;
  showLabels: boolean;
};

const INITIAL_STATE: SavedState = {
  title: 'THE NIGHT WE MET',
  dedication: 'The sky above us, exactly as it was.',
  date: '2024-05-20',
  time: '20:30',
  location: DEFAULT_LOCATION,
  theme: 'observatory',
  ratio: 'portrait',
  showLines: true,
  showLabels: true,
};

const THEMES: { id: PosterThemeId; name: string; color: string }[] = [
  { id: 'observatory', name: 'Observatory', color: '#111216' },
  { id: 'atlas', name: 'Atlas', color: '#f7f7f4' },
  { id: 'bloom', name: 'Midnight Bloom', color: '#10251f' },
];

const RATIOS: { id: PosterRatio; name: string }[] = [
  { id: 'portrait', name: '竖版' },
  { id: 'square', name: '方形' },
  { id: 'wallpaper', name: '壁纸' },
];

export default function PosterStudio() {
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const scrollRef = useRef<ScrollView>(null);
  const posterRef = useRef<View>(null);
  const controlsYRef = useRef(0);
  const searchRequestRef = useRef(0);
  const generatedSignatureRef = useRef('');
  const [state, setState] = useState<SavedState>(INITIAL_STATE);
  const [query, setQuery] = useState('Shanghai');
  const [locations, setLocations] = useState<LocationResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [premiumMessage, setPremiumMessage] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);
  const userInteractedRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved && !userInteractedRef.current) setState({ ...INITIAL_STATE, ...JSON.parse(saved) });
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') document.title = '此刻星空 · 真实星图纪念海报';
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [hydrated, state]);

  const dateTimeErrors = useMemo(() => validateDateTime(state.date, state.time), [state.date, state.time]);
  const sky = useMemo(() => {
    if (dateTimeErrors.date || dateTimeErrors.time) return null;
    try {
      return buildSkyMap({
        date: state.date,
        time: state.time,
        latitude: state.location.latitude,
        longitude: state.location.longitude,
        timezone: state.location.timezone,
      });
    } catch {
      return null;
    }
  }, [dateTimeErrors.date, dateTimeErrors.time, state.date, state.location, state.time]);

  useEffect(() => {
    if (!hydrated || !sky) return;
    const signature = `${state.date}:${state.time}:${state.location.id}:${state.theme}:${state.ratio}`;
    if (generatedSignatureRef.current === signature) return;
    generatedSignatureRef.current = signature;
    trackProductEvent('poster_generated', { theme: state.theme, ratio: state.ratio });
  }, [hydrated, sky, state.date, state.location.id, state.ratio, state.theme, state.time]);

  const update = <K extends keyof SavedState>(key: K, value: SavedState[K]) => {
    userInteractedRef.current = true;
    setResetPending(false);
    setState((current) => ({ ...current, [key]: value }));
  };

  const runSearch = async () => {
    const normalizedQuery = query.trim();
    if (searching) return;
    if (normalizedQuery.length < 2) {
      setLocations([]);
      setSearchError('请至少输入 2 个字符');
      return;
    }
    const requestId = ++searchRequestRef.current;
    setSearching(true);
    setSearchError('');
    setLocations([]);
    try {
      const results = await searchLocations(normalizedQuery);
      if (requestId !== searchRequestRef.current) return;
      setLocations(results);
      if (!results.length) setSearchError('没有找到这个地点');
    } catch {
      if (requestId === searchRequestRef.current) setSearchError('地点服务暂时不可用，请稍后重试');
    } finally {
      if (requestId === searchRequestRef.current) setSearching(false);
    }
  };

  const download = async () => {
    if (!posterRef.current || exporting) return;
    setExporting(true);
    setExportMessage('');
    try {
      await exportPoster(posterRef, `the-sky-then-${state.date}`);
      trackProductEvent('poster_downloaded', { theme: state.theme, ratio: state.ratio });
      setExportMessage(Platform.OS === 'web' ? '高清海报已下载' : '海报已准备分享');
    } catch {
      setExportMessage('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const restoreExample = () => {
    userInteractedRef.current = true;
    searchRequestRef.current += 1;
    setState(INITIAL_STATE);
    setQuery(INITIAL_STATE.location.name);
    setLocations([]);
    setSearching(false);
    setSearchError('');
    setExportMessage('示例内容已恢复');
    setPremiumMessage('');
    setResetPending(false);
  };

  const recordPremiumIntent = () => {
    if (premiumMessage) return;
    trackProductEvent('premium_intent_clicked', { theme: state.theme, ratio: state.ratio });
    setPremiumMessage('兴趣已记录。支付尚未开放，本次没有扣款。');
  };

  return (
    <>
      <Head>
        <title>此刻星空 · 真实星图纪念海报</title>
        <meta name="description" content="输入日期、当地时间和地点，生成那一刻真实可见的星空纪念海报。" />
        <link rel="canonical" href="https://the-sky-then-live.vercel.app" />
      </Head>
      <SafeAreaView testID="app-shell" style={styles.page}>
      {Platform.OS === 'web' ? (
        <WebVideo
          data-testid="sky-video"
          aria-hidden
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          src={STAR_VIDEO_URL}
          style={styles.videoBackground as never}
        />
      ) : <View pointerEvents="none" style={styles.nativeBackdrop} />}
      <View pointerEvents="none" style={styles.videoVeil} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <View testID="glass-header" style={styles.header}>
          <View style={styles.brandMark}><Sparkles size={18} color="#ffffff" strokeWidth={1.8} /></View>
          <View>
            <Text style={styles.brand}>此刻星空</Text>
            <Text style={styles.brandEnglish}>THE SKY THEN</Text>
          </View>
          <View style={styles.headerRule} />
          <Text style={styles.headerMeta}>真实星位 · 私密生成</Text>
        </View>
        {hydrated ? <Text testID="app-ready" style={styles.srOnly}>应用已就绪</Text> : null}

        <View testID="workspace" style={[styles.workspace, isWide && styles.workspaceWide]}>
          <View
            testID="controls"
            onLayout={(event) => { controlsYRef.current = event.nativeEvent.layout.y; }}
            style={[styles.controls, isWide && styles.controlsWide]}>
            <View style={styles.utilityRow}>
              <View style={styles.utilityCopy}>
                <Text style={styles.utilityTitle}>你的设置会自动保存在本机</Text>
                <Text style={styles.utilityText}>恢复示例前会再次确认，不会误触覆盖。</Text>
              </View>
              <Pressable
                accessibilityLabel="恢复示例"
                onPress={() => setResetPending(true)}
                style={({ pressed }) => [styles.secondaryIconButton, pressed && styles.pressed]}>
                <RotateCcw size={17} color="#27302c" />
              </Pressable>
            </View>
            {resetPending ? (
              <View accessibilityLiveRegion="polite" style={styles.resetConfirm}>
                <Text style={styles.resetText}>恢复示例会替换当前海报设置。</Text>
                <View style={styles.confirmActions}>
                  <Pressable onPress={() => setResetPending(false)} style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}>
                    <Text style={styles.textButtonLabel}>取消</Text>
                  </Pressable>
                  <Pressable accessibilityLabel="确认恢复示例" onPress={restoreExample} style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}>
                    <Text style={styles.confirmButtonLabel}>确认恢复</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            <Section number="01" title="时刻">
              <View style={styles.row}>
                <Field accessibilityLabel="日期" error={dateTimeErrors.date} label="日期" value={state.date} onChangeText={(value) => update('date', value)} placeholder="YYYY-MM-DD" />
                <Field accessibilityLabel="当地时间" error={dateTimeErrors.time} label="当地时间" value={state.time} onChangeText={(value) => update('time', value)} placeholder="HH:mm" />
              </View>
            </Section>

            <Section number="02" title="地点">
              <Text style={styles.label}>城市或地点</Text>
              <View style={styles.searchRow}>
                <View style={styles.searchInputWrap}>
                  <MapPin size={17} color="#5b5f5d" />
                  <TextInput
                    accessibilityLabel="城市或地点"
                    value={query}
                    onChangeText={(value) => {
                      searchRequestRef.current += 1;
                      setQuery(value);
                      setLocations([]);
                      setSearchError('');
                      setSearching(false);
                    }}
                    onSubmitEditing={runSearch}
                    returnKeyType="search"
                    placeholder="Shanghai, Paris, New York"
                    placeholderTextColor="#919694"
                    style={styles.searchInput}
                  />
                </View>
                <Pressable accessibilityLabel="搜索地点" disabled={searching} onPress={runSearch} style={({ pressed }) => [styles.iconButton, searching && styles.disabled, pressed && styles.pressed]}>
                  {searching ? <ActivityIndicator color="#fff" /> : <Search size={19} color="#fff" />}
                </Pressable>
              </View>
              {searchError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{searchError}</Text> : null}
              {locations.length ? (
                <View style={styles.results}>
                  {locations.map((location) => (
                    <Pressable
                      key={location.id}
                      accessibilityLabel={`选择 ${location.name}`}
                      onPress={() => {
                        update('location', location);
                        setQuery(location.name);
                        setLocations([]);
                      }}
                      style={({ pressed }) => [styles.resultRow, pressed && styles.resultPressed]}>
                      <Text style={styles.resultName}>{location.name}</Text>
                      <Text numberOfLines={1} style={styles.resultMeta}>{[location.admin1, location.country].filter(Boolean).join(', ')}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Text style={styles.selectedLocation}>
                {state.location.name} · {state.location.latitude.toFixed(2)}°, {state.location.longitude.toFixed(2)}° · {state.location.timezone}
              </Text>
            </Section>

            <Section number="03" title="题词">
              <Field accessibilityLabel="主标题" label="主标题" value={state.title} onChangeText={(value) => update('title', value.slice(0, 42))} placeholder="THE NIGHT WE MET" full />
              <Field accessibilityLabel="纪念文字" label="纪念文字" value={state.dedication} onChangeText={(value) => update('dedication', value.slice(0, 72))} placeholder="The sky above us..." full />
            </Section>

            <Section number="04" title="成品">
              <Text style={styles.label}>设计</Text>
              <View style={styles.themeRow}>
                {THEMES.map((theme) => (
                  <Pressable
                    testID={`theme-${theme.id}`}
                    key={theme.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: state.theme === theme.id }}
                    onPress={() => update('theme', theme.id)}
                    style={({ pressed }) => [styles.themeButton, state.theme === theme.id && styles.selectedControl, pressed && styles.pressed]}>
                    <View style={[styles.swatch, { backgroundColor: theme.color }]} />
                    <Text style={styles.controlText}>{theme.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>画幅</Text>
              <View style={styles.segmented}>
                {RATIOS.map((ratio) => (
                  <Pressable key={ratio.id} accessibilityRole="radio" accessibilityState={{ checked: state.ratio === ratio.id }} onPress={() => update('ratio', ratio.id)} style={({ pressed }) => [styles.segment, state.ratio === ratio.id && styles.segmentActive, pressed && styles.pressed]}>
                    <Text style={[styles.segmentText, state.ratio === ratio.id && styles.segmentTextActive]}>{ratio.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Toggle label="星座连线" value={state.showLines} onValueChange={(value) => update('showLines', value)} />
              <Toggle label="星座名称" value={state.showLabels} onValueChange={(value) => update('showLabels', value)} />
            </Section>

            <Section number="05" title="导出">
              <View style={styles.offerRow}>
                <View style={styles.offerIcon}><Check size={17} color="#2e6d55" /></View>
                <View style={styles.offerCopy}>
                  <Text style={styles.offerTitle}>标准 PNG · 免费</Text>
                  <Text style={styles.offerText}>适合手机保存、分享与社交媒体发布。</Text>
                </View>
              </View>
              <Pressable
                accessibilityLabel="免费下载标准 PNG"
                disabled={!sky || exporting}
                onPress={download}
                style={({ pressed }) => [styles.freeDownloadButton, (!sky || exporting) && styles.disabled, pressed && styles.pressed]}>
                {exporting ? <ActivityIndicator color="#ffffff" /> : <Download size={18} color="#ffffff" />}
                <Text style={styles.freeDownloadText}>{Platform.OS === 'web' ? '免费下载 PNG' : '保存 / 分享'}</Text>
              </Pressable>
              <View style={styles.premiumRule} />
              <View style={styles.offerRow}>
                <View style={[styles.offerIcon, styles.premiumIcon]}><Crown size={17} color="#a04438" /></View>
                <View style={styles.offerCopy}>
                  <View style={styles.priceRow}>
                    <Text style={styles.offerTitle}>印刷级 4K 数字版</Text>
                    <Text style={styles.price}>¥19.9 买断</Text>
                  </View>
                  <Text style={styles.offerText}>用于高分辨率打印，支付功能尚未开放。</Text>
                </View>
              </View>
              <Pressable
                accessibilityLabel="我对印刷级版本感兴趣"
                disabled={Boolean(premiumMessage)}
                onPress={recordPremiumIntent}
                style={({ pressed }) => [styles.intentButton, premiumMessage && styles.disabled, pressed && styles.pressed]}>
                <Crown size={17} color="#a04438" />
                <Text style={styles.intentButtonText}>我对印刷级版本感兴趣</Text>
              </Pressable>
              {premiumMessage ? <Text accessibilityLiveRegion="polite" style={styles.intentMessage}>{premiumMessage}</Text> : null}
            </Section>
          </View>

          <View testID="preview-area" style={[styles.previewArea, isWide && styles.previewAreaWide]}>
            <View style={styles.previewToolbar}>
              <View>
                <Text style={styles.previewLabel}>LIVE POSTER</Text>
                <Text style={styles.previewStatus}>{sky ? `${sky.stars.length.toLocaleString()} 颗可见恒星` : '检查日期与时间'}</Text>
              </View>
              <Pressable testID="mobile-edit" accessibilityLabel="编辑海报" onPress={() => scrollRef.current?.scrollTo({ y: controlsYRef.current, animated: !reduceMotion })} style={({ pressed }) => [styles.toolbarIconButton, Platform.OS !== 'web' && isWide && styles.hideOnWide, pressed && styles.pressed]}>
                <SlidersHorizontal size={18} color="#27302c" />
              </Pressable>
              <Pressable testID="toolbar-download" accessibilityLabel="下载海报" disabled={!sky || exporting} onPress={download} style={({ pressed }) => [styles.downloadButton, Platform.OS !== 'web' && !isWide && styles.toolbarIconButtonDark, (!sky || exporting) && styles.disabled, pressed && styles.pressed]}>
                {exporting ? <ActivityIndicator color="#fff" /> : <Download size={18} color="#fff" />}
                <Text testID="toolbar-download-label" style={[styles.downloadText, Platform.OS !== 'web' && !isWide && styles.srOnly]}>{Platform.OS === 'web' ? '下载 PNG' : '保存 / 分享'}</Text>
              </Pressable>
            </View>
            <View style={styles.posterStage}>
              {sky ? (
                <StarPoster
                  ref={posterRef}
                  sky={sky}
                  title={state.title}
                  dedication={state.dedication}
                  date={state.date}
                  time={state.time}
                  location={state.location}
                  themeId={state.theme}
                  ratio={state.ratio}
                  showLines={state.showLines}
                  showLabels={state.showLabels}
                />
              ) : (
                <View style={styles.invalidPoster}>
                  <Text style={styles.invalidTitle}>日期或时间需要修正</Text>
                  <Text style={styles.invalidText}>修正左侧标记的输入后，真实星图会立即恢复。</Text>
                </View>
              )}
            </View>
            {exportMessage ? <Text accessibilityLiveRegion="polite" style={styles.exportMessage}>{exportMessage}</Text> : null}
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>星位基于 J2000 恒星目录与观测地点计算</Text>
          <Text style={styles.footerText}>输入仅保存在此设备</Text>
        </View>
      </ScrollView>
      </SafeAreaView>
    </>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <View style={styles.section}><View style={styles.sectionHeading}><Text style={styles.sectionNumber}>{number}</Text><Text style={styles.sectionTitle}>{title}</Text></View>{children}</View>;
}

function Field({ label, full, error, ...props }: { label: string; full?: boolean; error?: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={[styles.field, full && styles.fieldFull]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} accessibilityHint={error} placeholderTextColor="#919694" style={[styles.input, error && styles.inputError]} />
      {error ? <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={styles.toggleRow}><Text style={styles.toggleLabel}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#d5d9d6', true: '#1f49c6' }} thumbColor="#ffffff" /></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#070914' },
  videoBackground: { position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -2, pointerEvents: 'none' } as never,
  nativeBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: '#070914', zIndex: -2 },
  videoVeil: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(4, 7, 18, 0.56)', zIndex: -1 },
  srOnly: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  pageContent: { minHeight: '100%', paddingHorizontal: 16, paddingBottom: 28, position: 'relative' },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, maxWidth: 1440, width: '100%', alignSelf: 'center', marginTop: 10, paddingHorizontal: 16, backgroundColor: 'rgba(8, 12, 28, 0.38)', borderRadius: 16 },
  brandMark: { width: 34, height: 34, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  brand: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  brandEnglish: { fontSize: 9, color: 'rgba(255,255,255,0.62)', fontWeight: '700', letterSpacing: 1.2 },
  headerRule: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.2)', marginLeft: 4 },
  headerMeta: { color: 'rgba(255,255,255,0.72)', fontSize: 12, flexShrink: 1 },
  workspace: { width: '100%', maxWidth: 1440, alignSelf: 'center' },
  workspaceWide: { flexDirection: 'row', alignItems: 'flex-start' },
  controls: { width: '100%', order: 2 } as never,
  controlsWide: { width: '52%', order: 1, paddingRight: 28 } as never,
  utilityRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12 },
  utilityCopy: { flex: 1, gap: 3 },
  utilityTitle: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  utilityText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, lineHeight: 15 },
  secondaryIconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
  resetConfirm: { paddingVertical: 12, gap: 10 },
  resetText: { color: '#ffc9c4', fontSize: 12 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  textButton: { minHeight: 38, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  textButtonLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '700' },
  confirmButton: { minHeight: 38, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 19 },
  confirmButtonLabel: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  section: { paddingVertical: 22, gap: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  sectionNumber: { color: 'rgba(255,255,255,0.54)', fontSize: 10, fontWeight: '800' },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, gap: 6 },
  fieldFull: { width: '100%' },
  label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.62)' },
  input: { height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, fontSize: 14, color: '#ffffff' },
  inputError: { backgroundColor: 'rgba(180,50,50,0.25)' },
  fieldError: { color: '#ffb5ae', fontSize: 10, lineHeight: 14 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInputWrap: { height: 42, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14 },
  searchInput: { flex: 1, color: '#ffffff', fontSize: 14, height: 40 },
  iconButton: { width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  error: { color: '#ffb5ae', fontSize: 12 },
  results: { backgroundColor: 'rgba(6,9,22,0.82)', borderRadius: 12, overflow: 'hidden' },
  resultRow: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' },
  resultPressed: { backgroundColor: 'rgba(255,255,255,0.1)' },
  resultName: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  resultMeta: { color: 'rgba(255,255,255,0.58)', fontSize: 11, marginTop: 2 },
  selectedLocation: { color: 'rgba(255,255,255,0.58)', fontSize: 11 },
  themeRow: { gap: 7 },
  themeButton: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
  selectedControl: { backgroundColor: 'rgba(255,255,255,0.18)' },
  swatch: { width: 17, height: 17, borderRadius: 9 },
  controlText: { color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: '600' },
  segmented: { flexDirection: 'row', padding: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16 },
  segment: { flex: 1, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  segmentActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  segmentText: { color: 'rgba(255,255,255,0.58)', fontSize: 12, fontWeight: '600' },
  segmentTextActive: { color: '#ffffff' },
  toggleRow: { height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  toggleLabel: { color: 'rgba(255,255,255,0.86)', fontSize: 13 },
  offerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  offerIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: 'rgba(116, 234, 179, 0.15)' },
  premiumIcon: { backgroundColor: 'rgba(255, 202, 186, 0.16)' },
  offerCopy: { flex: 1, gap: 4 },
  offerTitle: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  offerText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, lineHeight: 17 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  price: { color: '#ffd0c8', fontSize: 12, fontWeight: '800' },
  freeDownloadButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 22 },
  freeDownloadText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  premiumRule: { height: 1, backgroundColor: 'rgba(255,255,255,0.14)', marginVertical: 2 },
  intentButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)' },
  intentButtonText: { color: '#ffd0c8', fontSize: 12, fontWeight: '800' },
  intentMessage: { color: '#c3ffd9', fontSize: 11, lineHeight: 16 },
  previewArea: { paddingTop: 16, paddingBottom: 12, width: '100%', order: 1 } as never,
  previewAreaWide: { width: '48%', order: 2, paddingLeft: 34, paddingTop: 22, position: 'sticky', top: 0 } as never,
  previewToolbar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  previewLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.56)', letterSpacing: 1.5 },
  previewStatus: { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 3 },
  toolbarIconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.1)' },
  hideOnWide: { display: 'none' },
  toolbarIconButtonDark: { minWidth: 42, width: 42, paddingHorizontal: 0 },
  downloadButton: { minWidth: 136, height: 42, paddingHorizontal: 15, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 21 },
  downloadText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  posterStage: { width: '100%', minHeight: 420, alignItems: 'center', justifyContent: 'flex-start' },
  invalidPoster: { width: '100%', height: 420, backgroundColor: 'rgba(6,9,22,0.55)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 8, borderRadius: 24 },
  invalidTitle: { color: '#ffc9c4', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  invalidText: { color: 'rgba(255,255,255,0.62)', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  exportMessage: { textAlign: 'center', marginTop: 10, color: 'rgba(255,255,255,0.82)', fontSize: 12 },
  footer: { width: '100%', maxWidth: 1440, alignSelf: 'center', paddingTop: 20, marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  footerText: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
});
