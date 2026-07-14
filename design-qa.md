# 设计 QA

- 源设计依据：已确认的 [`PRD.md`](PRD.md) 及 `D:\Ai-Project\Obsidian\DBL_obsidian\会话上下文\设计prompt.md`（视频、52/48 分栏、液态玻璃、字体、动效约束）。本次未提供独立的 Figma 或像素级视觉稿，因此以下为按已确认规格的实现验收，而非像素级还原比较。
- 实现截图：[`docs/design-audit/01-desktop-editor.png`](docs/design-audit/01-desktop-editor.png)、[`docs/design-audit/02-mobile-preview-first.png`](docs/design-audit/02-mobile-preview-first.png)、[`docs/design-audit/03-paris-selected.png`](docs/design-audit/03-paris-selected.png)。
- 视口与状态：1440×900 默认桌面、390×844 默认移动端、1440×900 Paris 已选择。

## 验收结果

- 字体与层级：Poppins 与中文后备字体用于界面；海报内容保留自身 SVG 字体语义。标题、标签与辅助文本层级清晰。
- 布局与节奏：桌面编辑器与预览约为 52/48；移动端先显示海报，再进入编辑区；自动化已验证没有横向溢出。
- 色彩与令牌：深空背景、白色文字层级、两级液态玻璃、`1rem` 圆角令牌落实；星图保留原有语义色。
- 图像与资源：远程视频以 `muted / loop / playsInline` 背景加载；不可用时为深色背景。海报仍为可导出的真实 SVG 星图。
- 文案与交互：真实地点查询、错误恢复、免费 PNG 下载和付费意向说明均已保留；焦点、hover、active 和减少动态效果路径存在。

## 已修复

- 外部展示字体会使 `html-to-image` 在部分浏览器环境中抓取跨域字体而阻塞 PNG 导出；导出海报为 SVG，因此明确跳过字体嵌入，恢复稳定下载。

## 证据与测试

- `npm run check`：通过。
- `npm test`：9 项通过。
- `npm run web:export`：通过。
- `npm run test:e2e`：8 项通过；覆盖桌面、平板、移动端、视频存在性、比例、无溢出、主题、PNG、错误恢复、重置、Paris 与付费意向。

## 最终结果

final result: passed
