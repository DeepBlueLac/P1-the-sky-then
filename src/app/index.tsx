import { useMemo, useRef, useState } from 'react';

import { validateDateTime } from '@/core/input-validation';
import { buildSkyMap } from '@/core/sky';
import type { LocationResult, SkyMap } from '@/core/types';
import { exportPoster } from '@/platform/export-poster';
import { searchLocations } from '@/services/geocoding';

const STAR_VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4';
const CONSTELLATION_NAMES: Record<string, string> = { Ori: '猎户座 / Orion', UMa: '大熊座 / Ursa Major', Sco: '天蝎座 / Scorpius', Cyg: '天鹅座 / Cygnus', Cas: '仙后座 / Cassiopeia', Leo: '狮子座 / Leo', Tau: '金牛座 / Taurus' };

const DEFAULT_LOCATION: LocationResult = {
  id: 'shanghai-cn', name: '上海', admin1: '上海', country: '中国', latitude: 31.2304, longitude: 121.4737, timezone: 'Asia/Shanghai',
};

function displayConstellation(id: string) { return CONSTELLATION_NAMES[id] ?? id; }
function toX(value: number) { return 500 + value * 470; }
function toY(value: number) { return 500 + value * 470; }

function SkyCanvas({ sky, showLines, showLabels, focusedConstellation, onFocus }: {
  sky: SkyMap | null; showLines: boolean; showLabels: boolean; focusedConstellation: string | null; onFocus: (id: string | null) => void;
}) {
  return <svg className={focusedConstellation ? 'sky-canvas constellation-focused' : 'sky-canvas'} viewBox="0 0 1000 1000" role="img" aria-label="真实可见星空">
    <defs><radialGradient id="horizon" cx="50%" cy="78%" r="70%"><stop offset="0" stopColor="#343434" stopOpacity=".36" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient></defs>
    <circle cx="500" cy="500" r="490" fill="url(#horizon)" onClick={() => onFocus(null)} />
    {showLines ? <g className="constellation-lines">{sky?.lines.map((line, index) => <line className={focusedConstellation && line.constellationId !== focusedConstellation ? 'is-dimmed' : ''} key={`${line.constellationId}-${index}`} x1={toX(line.x1)} y1={toY(line.y1)} x2={toX(line.x2)} y2={toY(line.y2)} />)}</g> : null}
    <g className="sky-stars">{sky?.stars.map((star) => <circle key={star.id} cx={toX(star.x)} cy={toY(star.y)} r={Math.max(.55, (5.8 - star.magnitude) * .55)} opacity={star.opacity} />)}</g>
    {showLabels ? <g className="sky-labels">{sky?.labels.filter((label) => label.rank <= 2).map((label) => <text className={focusedConstellation && label.constellationId !== focusedConstellation ? 'is-dimmed' : ''} key={label.constellationId} x={toX(label.x)} y={toY(label.y)} onClick={() => onFocus(label.constellationId)}>{displayConstellation(label.constellationId)}</text>)}</g> : null}
  </svg>;
}

function PosterMode({ title, setTitle, subtitle, setSubtitle, date, time, location, sky, onClose }: {
  title: string; setTitle: (value: string) => void; subtitle: string; setSubtitle: (value: string) => void; date: string; time: string; location: LocationResult; sky: SkyMap | null; onClose: () => void;
}) {
  const posterRef = useRef<HTMLElement>(null);
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'done' | 'error'>('idle');
  async function download() {
    setExportState('exporting');
    try { await exportPoster(posterRef, `the-sky-then-${date}`); setExportState('done'); } catch { setExportState('error'); }
  }
  return <section className="poster-mode" aria-label="作品模式">
    <header className="poster-toolbar liquid-glass"><button type="button" onClick={onClose}>返回观星</button><span>作品编辑</span><button type="button" onClick={() => void download()} disabled={exportState === 'exporting'}>{exportState === 'exporting' ? '正在导出…' : '下载 PNG'}</button></header>
    <article className="poster-preview" ref={posterRef} aria-label="可导出的星空作品">
      <SkyCanvas sky={sky} showLines showLabels focusedConstellation={null} onFocus={() => undefined} />
      <div className="poster-copy"><p contentEditable suppressContentEditableWarning onInput={(event) => setTitle(event.currentTarget.textContent ?? '')}>{title}</p><h2 contentEditable suppressContentEditableWarning onInput={(event) => setSubtitle(event.currentTarget.textContent ?? '')}>{subtitle}</h2><small>{location.name} · {date.replaceAll('-', '.')} · {time}</small></div>
    </article>
    <p className="poster-help" role="status">{exportState === 'done' ? 'PNG 已开始下载。' : exportState === 'error' ? '导出未完成，请重试。' : '直接编辑画面中的标题与题词；下载不包含背景视频。'}</p>
  </section>;
}

export default function SkyExperience() {
  const [date, setDate] = useState('2024-05-20');
  const [time, setTime] = useState('20:30');
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [query, setQuery] = useState(DEFAULT_LOCATION.name);
  const [locations, setLocations] = useState<LocationResult[]>([]);
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [entered, setEntered] = useState(false);
  const [posterMode, setPosterMode] = useState(false);
  const [showLines, setShowLines] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [focusedConstellation, setFocusedConstellation] = useState<string | null>(null);
  const [title, setTitle] = useState('那一晚，我们仰望同一片星空');
  const [subtitle, setSubtitle] = useState('THE NIGHT WE MET');
  const originalTime = useRef(time);
  const errors = validateDateTime(date, time);
  const isValid = !errors.date && !errors.time;
  const sky = useMemo(() => { try { return buildSkyMap({ date, time, latitude: location.latitude, longitude: location.longitude, timezone: location.timezone }); } catch { return null; } }, [date, location, time]);

  async function findLocation() {
    if (query.trim().length < 2) return;
    setSearchState('loading');
    try { setLocations(await searchLocations(query.trim())); setSearchState('idle'); } catch { setLocations([]); setSearchState('error'); }
  }
  function enterSky() { if (isValid) { originalTime.current = time; setEntered(true); } }

  if (posterMode) return <PosterMode title={title} setTitle={setTitle} subtitle={subtitle} setSubtitle={setSubtitle} date={date} time={time} location={location} sky={sky} onClose={() => setPosterMode(false)} />;
  return <main className={entered ? 'experience is-focused' : 'experience'}>
    <video className="sky-video" data-testid="sky-video" autoPlay loop muted playsInline preload="metadata" src={STAR_VIDEO_URL} aria-hidden="true" />
    <div className="video-fallback" aria-hidden="true" />
    <SkyCanvas sky={sky} showLines={showLines} showLabels={entered && showLabels} focusedConstellation={focusedConstellation} onFocus={setFocusedConstellation} />
    <header className="site-header"><a className="brand" href="#top" aria-label="此刻星空首页"><span className="brand-orbit" /><span>此刻星空 <small>THE SKY THEN</small></span></a><nav aria-label="主导航"><button type="button" onClick={() => setPosterMode(true)}>作品模式</button><button type="button" onClick={() => setEntered((value) => !value)}>{entered ? '退出观星' : '观星模式'}</button><button className="menu-button liquid-glass" type="button" aria-label="打开菜单"><i /><i /></button></nav></header>
    {!entered ? <section className="landing" id="top"><div className="hero-copy"><p className="hero-intro">回到那个时刻，仰望同一片星空。</p><h1>让真实星位，<em>留住</em> 重要的夜晚。</h1><p className="hero-description">输入当时的日期、当地时间与地点。星空在你的设备上计算，安静地重现那一刻。</p></div>
      <form className="moment-form liquid-glass-strong" onSubmit={(event) => { event.preventDefault(); enterSky(); }}><label>日期<input aria-label="日期" inputMode="numeric" placeholder="YYYY-MM-DD" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>当地时间<input aria-label="当地时间" inputMode="numeric" placeholder="HH:mm" value={time} onChange={(event) => setTime(event.target.value)} /></label><label className="place-field">地点<input aria-label="城市或地点" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void findLocation(); } }} /><button type="button" onClick={() => void findLocation()} aria-label="搜索地点">搜索</button></label>
      {locations.length > 0 ? <div className="location-results" role="listbox">{locations.map((item) => <button key={item.id} type="button" aria-label={`选择 ${item.name}`} onClick={() => { setLocation(item); setQuery(item.name); setLocations([]); }}><strong>{item.name}</strong><span>{[item.admin1, item.country].filter(Boolean).join(' · ')}</span></button>)}</div> : null}{searchState === 'loading' ? <p className="form-note">正在查找地点…</p> : null}{searchState === 'error' ? <p className="form-note form-error">地点服务暂时不可用，请稍后重试。</p> : null}{errors.date || errors.time ? <p className="form-note form-error">{errors.date || errors.time}</p> : null}<button className="enter-button" type="submit" disabled={!isValid}>进入这片星空 <span aria-hidden="true">↗</span></button></form><p className="privacy-note">真实星位 · 本地计算 · 输入仅保存在此设备</p></section> : <section className="explorer" aria-label="观星控制"><div className="explorer-title"><p>此刻的星空</p><h1>{title}</h1><button type="button" className="text-button" onClick={() => setPosterMode(true)}>编辑作品</button></div><div className="explorer-controls liquid-glass-strong"><label>时间 <input aria-label="时间轴" type="range" min="0" max="1439" value={Number(time.slice(0, 2)) * 60 + Number(time.slice(3))} onChange={(event) => { const minutes = Number(event.target.value); setTime(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`); }} /></label><div className="control-row"><button type="button" aria-pressed={showLines} onClick={() => setShowLines((value) => !value)}>星座线</button><button type="button" aria-pressed={showLabels} onClick={() => setShowLabels((value) => !value)}>名称</button><button type="button" onClick={() => { setTime(originalTime.current); setFocusedConstellation(null); }}>回到这一刻</button></div>{focusedConstellation ? <p className="focus-note">已聚焦 {displayConstellation(focusedConstellation)} <button type="button" onClick={() => setFocusedConstellation(null)}>清除</button></p> : <p className="focus-note">点击星座名称，聚焦它在此刻的位置。</p>}</div></section>}
    <aside className="sky-status liquid-glass" aria-live="polite"><span className="status-dot" /><div><strong>{location.name} · {date.replaceAll('-', '.')} · {time}</strong><small>{location.latitude.toFixed(2)}°，{location.longitude.toFixed(2)}° · {location.timezone}</small></div></aside><span className="app-ready" data-testid="app-ready">应用已就绪</span>
  </main>;
}
