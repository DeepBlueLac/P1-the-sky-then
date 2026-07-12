import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#111216" />
        <meta name="description" content="输入日期、当地时间和地点，生成那一刻真实可见的星空纪念海报。" />
        <meta property="og:title" content="此刻星空 · The Sky Then" />
        <meta property="og:description" content="把重要时刻的真实星空变成值得保存的纪念海报。" />
        <title>此刻星空 · 真实星图纪念海报</title>
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
