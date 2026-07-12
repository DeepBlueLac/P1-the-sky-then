import AsyncStorage from '@react-native-async-storage/async-storage';
import { Download, MapPin, Search, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
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

import { buildSkyMap } from '@/core/sky';
import type { LocationResult, PosterRatio, PosterThemeId } from '@/core/types';
import { StarPoster } from '@/features/star-map/star-poster';
import { exportPoster } from '@/platform/export-poster';
import { searchLocations } from '@/services/geocoding';

const STORAGE_KEY = 'the-sky-then:poster:v1';
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
  const posterRef = useRef<View>(null);
  const [state, setState] = useState<SavedState>(INITIAL_STATE);
  const [query, setQuery] = useState('Shanghai');
  const [locations, setLocations] = useState<LocationResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved) setState({ ...INITIAL_STATE, ...JSON.parse(saved) });
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [hydrated, state]);

  const sky = useMemo(() => {
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
  }, [state.date, state.location, state.time]);

  const update = <K extends keyof SavedState>(key: K, value: SavedState[K]) => {
    setState((current) => ({ ...current, [key]: value }));
  };

  const runSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setSearchError('');
    try {
      const results = await searchLocations(query);
      setLocations(results);
      if (!results.length) setSearchError('没有找到这个地点');
    } catch {
      setSearchError('地点服务暂时不可用');
    } finally {
      setSearching(false);
    }
  };

  const download = async () => {
    if (!posterRef.current || exporting) return;
    setExporting(true);
    setExportMessage('');
    try {
      await exportPoster(posterRef, `the-sky-then-${state.date}`);
      setExportMessage(Platform.OS === 'web' ? '高清海报已下载' : '海报已准备分享');
    } catch {
      setExportMessage('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.brandMark}><Sparkles size={18} color="#ffffff" strokeWidth={1.8} /></View>
          <View>
            <Text style={styles.brand}>此刻星空</Text>
            <Text style={styles.brandEnglish}>THE SKY THEN</Text>
          </View>
          <View style={styles.headerRule} />
          <Text style={styles.headerMeta}>真实星位 · 私密生成</Text>
        </View>

        <View testID="workspace" style={[styles.workspace, isWide && styles.workspaceWide]}>
          <View testID="controls" style={[styles.controls, isWide && styles.controlsWide]}>
            <Section number="01" title="时刻">
              <View style={styles.row}>
                <Field label="日期" value={state.date} onChangeText={(value) => update('date', value)} placeholder="YYYY-MM-DD" />
                <Field label="当地时间" value={state.time} onChangeText={(value) => update('time', value)} placeholder="HH:mm" />
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
                    onChangeText={setQuery}
                    onSubmitEditing={runSearch}
                    placeholder="Shanghai, Paris, New York"
                    placeholderTextColor="#919694"
                    style={styles.searchInput}
                  />
                </View>
                <Pressable accessibilityLabel="搜索地点" onPress={runSearch} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                  {searching ? <ActivityIndicator color="#fff" /> : <Search size={19} color="#fff" />}
                </Pressable>
              </View>
              {searchError ? <Text style={styles.error}>{searchError}</Text> : null}
              {locations.length ? (
                <View style={styles.results}>
                  {locations.map((location) => (
                    <Pressable
                      key={location.id}
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
              <Field label="主标题" value={state.title} onChangeText={(value) => update('title', value.slice(0, 42))} placeholder="THE NIGHT WE MET" full />
              <Field label="纪念文字" value={state.dedication} onChangeText={(value) => update('dedication', value.slice(0, 72))} placeholder="The sky above us..." full />
            </Section>

            <Section number="04" title="成品">
              <Text style={styles.label}>设计</Text>
              <View style={styles.themeRow}>
                {THEMES.map((theme) => (
                  <Pressable key={theme.id} onPress={() => update('theme', theme.id)} style={[styles.themeButton, state.theme === theme.id && styles.selectedControl]}>
                    <View style={[styles.swatch, { backgroundColor: theme.color }]} />
                    <Text style={styles.controlText}>{theme.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>画幅</Text>
              <View style={styles.segmented}>
                {RATIOS.map((ratio) => (
                  <Pressable key={ratio.id} onPress={() => update('ratio', ratio.id)} style={[styles.segment, state.ratio === ratio.id && styles.segmentActive]}>
                    <Text style={[styles.segmentText, state.ratio === ratio.id && styles.segmentTextActive]}>{ratio.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Toggle label="星座连线" value={state.showLines} onValueChange={(value) => update('showLines', value)} />
              <Toggle label="星座名称" value={state.showLabels} onValueChange={(value) => update('showLabels', value)} />
            </Section>
          </View>

          <View testID="preview-area" style={[styles.previewArea, isWide && styles.previewAreaWide]}>
            <View style={styles.previewToolbar}>
              <View>
                <Text style={styles.previewLabel}>LIVE POSTER</Text>
                <Text style={styles.previewStatus}>{sky ? `${sky.stars.length.toLocaleString()} 颗可见恒星` : '检查日期与时间'}</Text>
              </View>
              <Pressable accessibilityLabel="下载海报" onPress={download} style={({ pressed }) => [styles.downloadButton, pressed && styles.pressed]}>
                {exporting ? <ActivityIndicator color="#fff" /> : <Download size={18} color="#fff" />}
                <Text style={styles.downloadText}>{Platform.OS === 'web' ? '下载 PNG' : '保存 / 分享'}</Text>
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
                <View style={styles.invalidPoster}><Text style={styles.invalidText}>请输入有效的日期和时间</Text></View>
              )}
            </View>
            {exportMessage ? <Text style={styles.exportMessage}>{exportMessage}</Text> : null}
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>星位基于 J2000 恒星目录与观测地点计算</Text>
          <Text style={styles.footerText}>输入仅保存在此设备</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <View style={styles.section}><View style={styles.sectionHeading}><Text style={styles.sectionNumber}>{number}</Text><Text style={styles.sectionTitle}>{title}</Text></View>{children}</View>;
}

function Field({ label, full, ...props }: { label: string; full?: boolean } & React.ComponentProps<typeof TextInput>) {
  return <View style={[styles.field, full && styles.fieldFull]}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor="#919694" style={styles.input} /></View>;
}

function Toggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={styles.toggleRow}><Text style={styles.toggleLabel}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#d5d9d6', true: '#1f49c6' }} thumbColor="#ffffff" /></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f4f5f2' },
  pageContent: { minHeight: '100%', paddingHorizontal: 20, paddingBottom: 28 },
  header: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#d9ddda', maxWidth: 1440, width: '100%', alignSelf: 'center' },
  brandMark: { width: 34, height: 34, backgroundColor: '#161816', alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  brand: { fontSize: 17, fontWeight: '700', color: '#171a18' },
  brandEnglish: { fontSize: 9, color: '#6e7470', fontWeight: '700' },
  headerRule: { width: 1, height: 26, backgroundColor: '#d4d8d5', marginLeft: 4 },
  headerMeta: { color: '#6d736f', fontSize: 12 },
  workspace: { width: '100%', maxWidth: 1440, alignSelf: 'center' },
  workspaceWide: { flexDirection: 'row', alignItems: 'flex-start' },
  controls: { width: '100%' },
  controlsWide: { width: 410, borderRightWidth: 1, borderRightColor: '#d9ddda', paddingRight: 28 },
  section: { paddingVertical: 22, borderBottomWidth: 1, borderBottomColor: '#d9ddda', gap: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  sectionNumber: { color: '#1f49c6', fontSize: 10, fontWeight: '800' },
  sectionTitle: { color: '#171a18', fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, gap: 6 },
  fieldFull: { width: '100%' },
  label: { fontSize: 11, fontWeight: '700', color: '#636966' },
  input: { height: 42, borderWidth: 1, borderColor: '#cfd4d1', borderRadius: 5, backgroundColor: '#ffffff', paddingHorizontal: 12, fontSize: 14, color: '#171a18' },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInputWrap: { height: 42, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#cfd4d1', borderRadius: 5, backgroundColor: '#fff', paddingHorizontal: 11 },
  searchInput: { flex: 1, color: '#171a18', fontSize: 14, height: 40 },
  iconButton: { width: 42, height: 42, backgroundColor: '#171a18', borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.72 },
  error: { color: '#a62d36', fontSize: 12 },
  results: { borderWidth: 1, borderColor: '#d1d5d2', backgroundColor: '#fff', borderRadius: 5, overflow: 'hidden' },
  resultRow: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#d6dad7' },
  resultPressed: { backgroundColor: '#eef1ef' },
  resultName: { color: '#171a18', fontWeight: '700', fontSize: 13 },
  resultMeta: { color: '#747a76', fontSize: 11, marginTop: 2 },
  selectedLocation: { color: '#737975', fontSize: 11 },
  themeRow: { gap: 7 },
  themeButton: { height: 38, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#d0d5d1', borderRadius: 5, paddingHorizontal: 10, backgroundColor: '#fff' },
  selectedControl: { borderColor: '#1f49c6', backgroundColor: '#eef2ff' },
  swatch: { width: 17, height: 17, borderRadius: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: '#9ca19e' },
  controlText: { color: '#262a27', fontSize: 12, fontWeight: '600' },
  segmented: { flexDirection: 'row', padding: 3, backgroundColor: '#e5e8e6', borderRadius: 6 },
  segment: { flex: 1, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  segmentActive: { backgroundColor: '#fff' },
  segmentText: { color: '#6a706c', fontSize: 12, fontWeight: '600' },
  segmentTextActive: { color: '#171a18' },
  toggleRow: { height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d7dbd8' },
  toggleLabel: { color: '#303431', fontSize: 13 },
  previewArea: { paddingTop: 20, width: '100%' },
  previewAreaWide: { flex: 1, paddingLeft: 34, paddingTop: 22, position: 'sticky' as never, top: 0 },
  previewToolbar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  previewLabel: { fontSize: 10, fontWeight: '800', color: '#1f49c6' },
  previewStatus: { color: '#6e7470', fontSize: 12, marginTop: 3 },
  downloadButton: { minWidth: 136, height: 42, paddingHorizontal: 15, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171a18', borderRadius: 5 },
  downloadText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  posterStage: { width: '100%', minHeight: 480, alignItems: 'center', justifyContent: 'flex-start' },
  invalidPoster: { width: '100%', height: 480, borderWidth: 1, borderColor: '#d4d8d5', alignItems: 'center', justifyContent: 'center' },
  invalidText: { color: '#737975' },
  exportMessage: { textAlign: 'center', marginTop: 10, color: '#4f5652', fontSize: 12 },
  footer: { width: '100%', maxWidth: 1440, alignSelf: 'center', paddingTop: 20, marginTop: 24, borderTopWidth: 1, borderTopColor: '#d9ddda', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  footerText: { color: '#7d837f', fontSize: 10 },
});
