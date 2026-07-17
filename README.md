# 此刻星空 / The Sky Then

输入日期、当地时间与地点，在浏览器中重现那一刻真实可见的星空，并生成可下载的纪念作品。

## 当前架构

- Web：Vite + React + TypeScript，部署到 Vercel。
- 地点：`GET /api/geocode?q=Paris` 仅返回标准化城市、坐标与 IANA 时区。
- 计算：`astronomy-engine` 在 Web Worker 中完成赤道坐标到地平坐标的转换，主线程保持响应。
- 渲染：Three.js `Points + ShaderMaterial` 交给浏览器 GPU 绘制星等、辉光、闪烁、星座线、视差与点选；无 WebGL 时退化为静态 SVG。
- 导出：独立 SVG 作品画布经 `html-to-image` 输出 PNG，不截取背景视频。
- 隐私：日期、地点、坐标、标题和题词不上传；服务器不生成星图。

## 体验

- 全屏灰阶星空视频与 1,300+ 颗本地计算恒星叠加。
- 52/48 首屏节奏、两级液态玻璃、Poppins / Source Serif 4、Lucide 图标。
- 观星模式支持时间轴、恢复原时刻、星座线/名称、星座聚焦和亮星详情。
- 恒星详情包含 HIP 编号、视星等、高度角、方位角、B−V 推算温度与光谱分类。
- 独立作品模式支持直接编辑标题/题词和免费 PNG 下载。
- 桌面、平板、移动端响应式；支持键盘焦点、`prefers-reduced-motion` 和视频关闭。

## 本地开发

```bash
npm install
npm run web
npm run check
npm test
npm run web:export
npm run test:e2e
```

无需 API Key。同源 `/api/geocode` 不可用时，客户端地点服务会按既有规则降级；已有星图计算与作品导出不依赖远程视频。

## 文档

- 产品与视觉规范：[`docs/WEB-REDESIGN-SPEC.md`](docs/WEB-REDESIGN-SPEC.md)
- 数据来源与许可：[`docs/DATA-SOURCES.md`](docs/DATA-SOURCES.md)
- 隐私边界：[`docs/PRIVACY.md`](docs/PRIVACY.md)
- 最终设计 QA：[`design-qa.md`](design-qa.md)
- 体验审计：[`docs/design-audit/AUDIT.md`](docs/design-audit/AUDIT.md)
