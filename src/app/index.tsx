import { useMemo, useState } from 'react';

import { validateDateTime } from '@/core/input-validation';
import { buildSkyMap } from '@/core/sky';
import type { LocationResult } from '@/core/types';
import { searchLocations } from '@/services/geocoding';

const STAR_VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4';

const DEFAULT_LOCATION: LocationResult = {
  id: 'shanghai-cn', name: '上海', admin1: '上海', country: '中国',
  latitude: 31.2304, longitude: 121.4737, timezone: 'Asia/Shanghai',
};

function SkyCanvas({ location, date, time, focused }: { location: LocationResult; date: string; time: string; focused: boolean }) {
  const sky = useMemo(() => {
    try {
      return buildSkyMap({ date, time, latitude: location.latitude, longitude: location.longitude, timezone: location.timezone });
    } catch {
      return null;
    }
  }, [date, location, time]);
  const toX = (value: number) => 500 + value * 470;
  const toY = (value: number) => 500 + value * 470;

  return (
    <svg className="sky-canvas" viewBox="0 0 1000 1000" role="img" aria-label={`${location.name} ${date} ${time} 的真实可见星空`}>
      <defs><radialGradient id="horizon" cx="50%" cy="78%" r="70%"><stop offset="0" stopColor="#343434" stopOpacity=".36" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient></defs>
      <circle cx="500" cy="500" r="490" fill="url(#horizon)" />
      <g className="constellation-lines">{sky?.lines.map((line, index) => <line key={index} x1={toX(line.x1)} y1={toY(line.y1)} x2={toX(line.x2)} y2={toY(line.y2)} />)}</g>
      <g className="sky-stars">{sky?.stars.map((star, index) => <circle key={index} cx={toX(star.x)} cy={toY(star.y)} r={Math.max(.55, (5.8 - star.magnitude) * .55)} opacity={star.opacity} />)}</g>
      {focused && sky ? <g className="sky-labels">{sky.labels.filter((label) => label.rank <= 2).map((label) => <text key={label.text} x={toX(label.x)} y={toY(label.y)}>{label.text}</text>)}</g> : null}
    </svg>
  );
}

export default function SkyExperience() {
  const [date, setDate] = useState('2024-05-20');
  const [time, setTime] = useState('20:30');
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [query, setQuery] = useState(DEFAULT_LOCATION.name);
  const [locations, setLocations] = useState<LocationResult[]>([]);
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [entered, setEntered] = useState(false);
  const [showLines, setShowLines] = useState(true);
  const errors = validateDateTime(date, time);
  const isValid = !errors.date && !errors.time;

  async function findLocation() {
    if (query.trim().length < 2) return;
    setSearchState('loading');
    try {
      setLocations(await searchLocations(query.trim()));
      setSearchState('idle');
    } catch {
      setLocations([]);
      setSearchState('error');
    }
  }

  return (
    <main className={entered ? 'experience is-focused' : 'experience'}>
      <video className="sky-video" data-testid="sky-video" autoPlay loop muted playsInline preload="metadata" src={STAR_VIDEO_URL} aria-hidden="true" />
      <div className="video-fallback" aria-hidden="true" />
      <SkyCanvas location={location} date={date} time={time} focused={entered} />
      <header className="site-header">
        <a className="brand" href="#top" aria-label="此刻星空首页"><span className="brand-orbit" /><span>此刻星空 <small>THE SKY THEN</small></span></a>
        <nav aria-label="主导航"><a href="#about">关于</a><button type="button" onClick={() => setEntered((value) => !value)}>{entered ? '退出观星' : '观星模式'}</button><button className="menu-button" type="button" aria-label="打开菜单"><i /><i /></button></nav>
      </header>

      <section className="landing" id="top">
        <div className="hero-copy">
          <p className="hero-intro">回到那个时刻，仰望同一片星空。</p>
          <h1>让真实星位，<em>留住</em> 重要的夜晚。</h1>
          <p className="hero-description">输入当时的日期、当地时间与地点。星空在你的设备上计算，安静地重现那一刻。</p>
        </div>

        <form className="moment-form liquid-glass-strong" onSubmit={(event) => { event.preventDefault(); if (isValid) setEntered(true); }}>
          <label>日期<input aria-label="日期" inputMode="numeric" placeholder="YYYY-MM-DD" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label>当地时间<input aria-label="当地时间" inputMode="numeric" placeholder="HH:mm" value={time} onChange={(event) => setTime(event.target.value)} /></label>
          <label className="place-field">地点<input aria-label="城市或地点" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void findLocation(); } }} /><button type="button" onClick={() => void findLocation()} aria-label="搜索地点">搜索</button></label>
          {locations.length > 0 ? <div className="location-results" role="listbox">{locations.map((item) => <button key={item.id} type="button" aria-label={`选择 ${item.name}`} onClick={() => { setLocation(item); setQuery(item.name); setLocations([]); }}><strong>{item.name}</strong><span>{[item.admin1, item.country].filter(Boolean).join(' · ')}</span></button>)}</div> : null}
          {searchState === 'loading' ? <p className="form-note">正在查找地点…</p> : null}
          {searchState === 'error' ? <p className="form-note form-error">地点服务暂时不可用，请稍后重试。</p> : null}
          {errors.date || errors.time ? <p className="form-note form-error">{errors.date || errors.time}</p> : null}
          <button className="enter-button" type="submit" disabled={!isValid}>进入这片星空 <span aria-hidden="true">↗</span></button>
        </form>
        <p className="privacy-note">真实星位 · 本地计算 · 输入仅保存在此设备</p>
      </section>

      <aside className="sky-status liquid-glass" aria-live="polite">
        <span className="status-dot" />
        <div><strong>{location.name} · {date.replaceAll('-', '.')} · {time}</strong><small>{location.latitude.toFixed(2)}°，{location.longitude.toFixed(2)}° · {location.timezone}</small></div>
        {entered ? <label className="line-toggle"><input type="checkbox" checked={showLines} onChange={(event) => setShowLines(event.target.checked)} />星座线</label> : null}
      </aside>
      {!showLines ? <style>{'.constellation-lines { display: none; }'}</style> : null}
      <span className="app-ready" data-testid="app-ready">应用已就绪</span>
    </main>
  );
}
