import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CircleHelp,
  Compass,
  Download,
  Focus,
  Layers3,
  LocateFixed,
  Menu,
  Minus,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

import { validateDateTime } from '@/core/input-validation';
import type { LocationResult, ProjectedStar, SkyMap } from '@/core/types';
import { useSkyMap } from '@/hooks/use-sky-map';
import { exportPoster } from '@/platform/export-poster';
import { searchLocations } from '@/services/geocoding';

const SkyStage = lazy(() => import('@/components/sky-stage'));

const STAR_VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4';
const CONSTELLATION_NAMES: Record<string, string> = {
  Ori: '猎户座 / Orion', UMa: '大熊座 / Ursa Major', Sco: '天蝎座 / Scorpius', Cyg: '天鹅座 / Cygnus',
  Cas: '仙后座 / Cassiopeia', Leo: '狮子座 / Leo', Tau: '金牛座 / Taurus', Gem: '双子座 / Gemini',
  Vir: '室女座 / Virgo', Aql: '天鹰座 / Aquila', And: '仙女座 / Andromeda', Peg: '飞马座 / Pegasus',
};

const DEFAULT_LOCATION: LocationResult = {
  id: 'shanghai-cn', name: '上海', admin1: '上海', country: '中国', latitude: 31.2304, longitude: 121.4737, timezone: 'Asia/Shanghai',
};

function displayConstellation(id: string) { return CONSTELLATION_NAMES[id] ?? id; }
function toX(value: number) { return 500 + value * 470; }
function toY(value: number) { return 500 + value * 470; }

function StaticSky({ sky, showLines = true, showLabels = true }: { sky: SkyMap | null; showLines?: boolean; showLabels?: boolean }) {
  return <svg className="static-sky" viewBox="0 0 1000 1000" role="img" aria-label="真实可见星空的静态导出图">
    <defs>
      <radialGradient id="poster-horizon" cx="50%" cy="70%" r="70%"><stop offset="0" stopColor="#484848" stopOpacity=".45" /><stop offset="1" stopColor="#050505" stopOpacity="0" /></radialGradient>
      <filter id="star-glow"><feGaussianBlur stdDeviation="2.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <circle cx="500" cy="500" r="490" fill="url(#poster-horizon)" />
    {showLines ? <g className="static-lines">{sky?.lines.map((line, index) => <line key={`${line.constellationId}-${index}`} x1={toX(line.x1)} y1={toY(line.y1)} x2={toX(line.x2)} y2={toY(line.y2)} />)}</g> : null}
    <g className="static-stars" filter="url(#star-glow)">{sky?.stars.map((star) => <circle key={star.id} cx={toX(star.x)} cy={toY(star.y)} r={Math.max(.6, (6.2 - star.magnitude) * .62)} opacity={star.opacity} />)}</g>
    {showLabels ? <g className="static-labels">{sky?.labels.filter((label) => label.rank <= 2).map((label) => <text key={label.constellationId} x={toX(label.x)} y={toY(label.y)}>{label.text}</text>)}</g> : null}
  </svg>;
}

function ConstellationLabels({ sky, focused, onFocus }: { sky: SkyMap | null; focused: string | null; onFocus: (value: string | null) => void }) {
  return <div className="sky-coordinate-plane" aria-label="可聚焦星座">
    {sky?.labels.filter((label) => label.rank <= 2).map((label) => <button
      type="button"
      key={label.constellationId}
      className={focused && focused !== label.constellationId ? 'constellation-label is-dimmed' : 'constellation-label'}
      style={{ left: `${50 + label.x * 47}%`, top: `${50 + label.y * 47}%` }}
      onClick={() => onFocus(focused === label.constellationId ? null : label.constellationId)}
      aria-pressed={focused === label.constellationId}
    >{label.text}</button>)}
  </div>;
}

function StarDetails({ star, onClose }: { star: ProjectedStar; onClose: () => void }) {
  return <aside className="star-details liquid-glass-strong" aria-label="恒星详情" aria-live="polite">
    <div className="panel-kicker"><Sparkles size={13} /> SELECTED STAR <button type="button" aria-label="关闭恒星详情" onClick={onClose}><X size={16} /></button></div>
    <h2>{star.name ?? `HIP ${star.hip}`}</h2>
    {star.name ? <p className="catalog-id">HIP {star.hip}</p> : <p className="catalog-id">Hipparcos 恒星目录</p>}
    <dl>
      <div><dt>视星等</dt><dd>{star.magnitude.toFixed(2)}</dd></div>
      <div><dt>高度角</dt><dd>{star.altitude.toFixed(1)}°</dd></div>
      <div><dt>方位角</dt><dd>{star.azimuth.toFixed(1)}°</dd></div>
      <div><dt>光谱 / 温度</dt><dd>{star.spectralClass ?? '—'} · {star.temperature ? `约 ${star.temperature.toLocaleString()} K` : '暂无'}</dd></div>
    </dl>
    <p className="data-note">位置与星等来自本地星表；温度依据 B−V 色指数估算。</p>
  </aside>;
}

function PosterMode({ title, setTitle, subtitle, setSubtitle, date, time, location, sky, onClose }: {
  title: string; setTitle: (value: string) => void; subtitle: string; setSubtitle: (value: string) => void;
  date: string; time: string; location: LocationResult; sky: SkyMap | null; onClose: () => void;
}) {
  const posterRef = useRef<HTMLElement>(null);
  const [exportState, setExportState] = useState<'idle' | 'exporting' | 'done' | 'error'>('idle');
  async function download() {
    setExportState('exporting');
    try { await exportPoster(posterRef, `the-sky-then-${date}`); setExportState('done'); } catch { setExportState('error'); }
  }
  return <section className="poster-mode" aria-label="作品模式">
    <header className="poster-toolbar liquid-glass">
      <button type="button" onClick={onClose}><ArrowRight className="icon-reverse" size={16} /> 返回观星</button>
      <span>ARTWORK STUDIO · 真实星位不会被模板改变</span>
      <button type="button" onClick={() => void download()} disabled={exportState === 'exporting'}><Download size={16} /> {exportState === 'exporting' ? '正在导出…' : '下载 PNG'}</button>
    </header>
    <article className="poster-preview" ref={posterRef} aria-label="可导出的星空作品">
      <StaticSky sky={sky} />
      <div className="poster-copy">
        <span>THE SKY THEN · CELESTIAL MEMORY</span>
        <p contentEditable suppressContentEditableWarning onInput={(event) => setTitle(event.currentTarget.textContent ?? '')}>{title}</p>
        <h2 contentEditable suppressContentEditableWarning onInput={(event) => setSubtitle(event.currentTarget.textContent ?? '')}>{subtitle}</h2>
        <small>{location.name.toUpperCase()} · {date.replaceAll('-', '.')} · {time}</small>
      </div>
    </article>
    <p className="poster-help" role="status">{exportState === 'done' ? 'PNG 已开始下载。' : exportState === 'error' ? '导出未完成，请重试。' : '直接编辑画面中的标题与题词；导出只包含真实星图，不包含背景视频。'}</p>
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
  const [showVideo, setShowVideo] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [focusedConstellation, setFocusedConstellation] = useState<string | null>(null);
  const [selectedStar, setSelectedStar] = useState<ProjectedStar | null>(null);
  const [title, setTitle] = useState('那一晚，我们仰望同一片星空');
  const [subtitle, setSubtitle] = useState('THE NIGHT WE MET');
  const originalTime = useRef(time);
  const errors = validateDateTime(date, time);
  const isValid = !errors.date && !errors.time;
  const skyInput = useMemo(() => ({ date, time, latitude: location.latitude, longitude: location.longitude, timezone: location.timezone }), [date, location, time]);
  const { sky, state: skyState } = useSkyMap(skyInput);

  async function findLocation() {
    if (query.trim().length < 2) return;
    setSearchState('loading');
    try { setLocations(await searchLocations(query.trim())); setSearchState('idle'); } catch { setLocations([]); setSearchState('error'); }
  }
  function enterSky() {
    if (!isValid) return;
    originalTime.current = time;
    setSelectedStar(null);
    setEntered(true);
  }
  function updateTime(minutes: number) {
    setSelectedStar(null);
    setTime(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
  }

  if (posterMode) return <PosterMode title={title} setTitle={setTitle} subtitle={subtitle} setSubtitle={setSubtitle} date={date} time={time} location={location} sky={sky} onClose={() => setPosterMode(false)} />;

  return <main className={entered ? 'experience is-focused' : 'experience'}>
    {showVideo ? <video className="sky-video" data-testid="sky-video" autoPlay loop muted playsInline preload="metadata" src={STAR_VIDEO_URL} aria-hidden="true" /> : null}
    <div className="video-fallback" aria-hidden="true" />
    <div className="atmosphere-layer" aria-hidden="true" />
    <Suspense fallback={<div className="sky-loading" aria-hidden="true" />}>
      <SkyStage sky={sky} showLines={showLines} focusedConstellation={focusedConstellation} immersive={entered} onSelectStar={setSelectedStar} />
    </Suspense>
    {entered && showLabels ? <ConstellationLabels sky={sky} focused={focusedConstellation} onFocus={setFocusedConstellation} /> : null}

    <header className="site-header">
      <a className="brand" href="#top" aria-label="此刻星空首页"><span className="brand-mark"><Sparkles size={16} /></span><span>此刻星空 <small>THE SKY THEN</small></span></a>
      <nav aria-label="主导航">
        <a className="site-link" href="/historical-night-sky/">任务指南</a>
        <a className="site-link" href="https://bulidoge.site/products/the-sky-then">DBL-TOOLS</a>
        <button type="button" onClick={() => setPosterMode(true)}><Download size={15} /> 作品模式</button>
        <button type="button" onClick={() => setShowInfo((value) => !value)}><CircleHelp size={15} /> 关于数据</button>
        <button className="menu-button liquid-glass" type="button" onClick={() => setShowVideo((value) => !value)} aria-label={showVideo ? '关闭环境视频' : '开启环境视频'} aria-pressed={showVideo}>{showVideo ? <Menu size={16} /> : <Minus size={16} />}</button>
      </nav>
    </header>

    {showInfo ? <aside className="info-drawer liquid-glass-strong" aria-label="数据与隐私说明">
      <div className="panel-kicker">HOW IT WORKS <button type="button" aria-label="关闭说明" onClick={() => setShowInfo(false)}><X size={16} /></button></div>
      <h2>服务器给地点，<em>浏览器画星空。</em></h2>
      <p>地点接口只返回城市、坐标和时区。恒星位置由此设备上的天文引擎计算，再交给 GPU 绘制；日期、题词和星图不会上传。</p>
      <div className="pipeline"><span>地点 API</span><ArrowRight size={14} /><span>Web Worker</span><ArrowRight size={14} /><span>GPU</span></div>
    </aside> : null}

    {!entered ? <section className="landing" id="top">
      <div className="hero-copy">
        <p className="hero-intro"><span>01</span> A MOMENT, RECONSTRUCTED IN LIGHT</p>
        <h1>回到那一刻，<br />仰望<em>同一片星空。</em></h1>
        <p className="hero-description">选择日期、当地时间与地点。真实星位将在你的设备上重新计算，让重要的夜晚以光的尺度再次展开。</p>
        <div className="hero-pills" aria-label="产品特性"><span className="liquid-glass">REAL POSITION</span><span className="liquid-glass">LOCAL COMPUTE</span><span className="liquid-glass">PRIVATE</span></div>
      </div>

      <form className="moment-form liquid-glass-strong" onSubmit={(event) => { event.preventDefault(); enterSky(); }}>
        <div className="form-heading"><div><span>ENTER THIS SKY</span><h2>定位你的夜晚</h2></div><LocateFixed size={20} /></div>
        <div className="moment-grid">
          <label><span>日期</span><input aria-label="日期" inputMode="numeric" placeholder="YYYY-MM-DD" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label><span>当地时间</span><input aria-label="当地时间" inputMode="numeric" placeholder="HH:mm" value={time} onChange={(event) => setTime(event.target.value)} /></label>
        </div>
        <label className="place-field"><span>城市或地点</span><input aria-label="城市或地点" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void findLocation(); } }} /><button type="button" onClick={() => void findLocation()} aria-label="搜索地点"><Search size={18} /></button></label>
        {locations.length > 0 ? <div className="location-results" role="listbox">{locations.map((item) => <button key={item.id} type="button" aria-label={`选择 ${item.name}`} onClick={() => { setLocation(item); setQuery(item.name); setLocations([]); }}><strong>{item.name}</strong><span>{[item.admin1, item.country].filter(Boolean).join(' · ')}</span></button>)}</div> : null}
        {searchState === 'loading' ? <p className="form-note">正在查找地点…</p> : null}
        {searchState === 'error' ? <p className="form-note form-error">地点服务暂时不可用，请稍后重试。</p> : null}
        {errors.date || errors.time ? <p className="form-note form-error">{errors.date || errors.time}</p> : null}
        <button className="enter-button liquid-glass-strong" type="submit" disabled={!isValid}>进入这片星空 <span><ArrowRight size={18} /></span></button>
        <p className="privacy-note">真实星位 · 本地计算 · 输入仅保存在此设备</p>
      </form>

      <div className="hero-quote"><span>CELESTIAL MEMORY</span><p>“We imagined a realm <em>with no ending.</em>”</p></div>
      <aside className="sky-preview-note liquid-glass"><Compass size={17} /><div><span>{skyState === 'ready' ? `${sky?.stars.length.toLocaleString()} 颗可见恒星` : '正在计算星位'}</span><small>点击进入后可探索星座与恒星</small></div></aside>
    </section> : <section className="explorer" aria-label="观星控制">
      <div className="explorer-title"><p>THE SKY AT THAT MOMENT</p><h1>{title}</h1><span>{subtitle}</span></div>
      <aside className="explorer-controls liquid-glass-strong">
        <div className="control-heading"><div><span>OBSERVATION</span><strong>{time}</strong></div><button type="button" aria-label="退出观星" onClick={() => setEntered(false)}><X size={18} /></button></div>
        <label className="time-control"><span>一天中的时间</span><input aria-label="时间轴" type="range" min="0" max="1439" value={Number(time.slice(0, 2)) * 60 + Number(time.slice(3))} onChange={(event) => updateTime(Number(event.target.value))} /></label>
        <div className="control-row">
          <button type="button" aria-pressed={showLines} onClick={() => setShowLines((value) => !value)}><Layers3 size={15} />星座线</button>
          <button type="button" aria-pressed={showLabels} onClick={() => setShowLabels((value) => !value)}><Focus size={15} />名称</button>
          <button type="button" onClick={() => { setTime(originalTime.current); setFocusedConstellation(null); setSelectedStar(null); }}><RotateCcw size={15} />回到这一刻</button>
        </div>
        <div className="constellation-focus">
          <span>聚焦星座</span>
          <div>{sky?.labels.filter((label) => label.rank <= 2).slice(0, 5).map((label) => <button type="button" key={label.constellationId} aria-pressed={focusedConstellation === label.constellationId} onClick={() => setFocusedConstellation(focusedConstellation === label.constellationId ? null : label.constellationId)}>{displayConstellation(label.constellationId).split(' / ')[0]}</button>)}</div>
        </div>
      </aside>
    </section>}

    {selectedStar && entered ? <StarDetails star={selectedStar} onClose={() => setSelectedStar(null)} /> : null}
    <aside className="sky-status liquid-glass" aria-live="polite"><span className={skyState === 'calculating' ? 'status-dot is-calculating' : 'status-dot'} /><div><strong>{location.name} · {date.replaceAll('-', '.')} · {time}</strong><small>{location.latitude.toFixed(2)}°，{location.longitude.toFixed(2)}° · {location.timezone}</small></div><span className="star-count">{sky?.stars.length.toLocaleString() ?? '—'} STARS</span></aside>
    <span className="app-ready" data-testid="app-ready">应用已就绪</span>
  </main>;
}
