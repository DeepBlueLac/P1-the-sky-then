# 此刻星空 / The Sky Then

输入日期、当地时间和地点，生成那一刻当地真实可见星空的纪念海报。

当前版本提供三套设计、三种画幅、星座连线与名称、本地设置恢复、免费 PNG 导出，以及“印刷级 4K 数字版”的非扣款付费意愿验证。真实支付尚未开放。

## 平台

- Web：Expo 静态导出，Vercel 部署。
- iOS / Android：Expo + EAS Build。
- 轻后端：Vercel Function 代理并缓存地理编码请求。

## 开发

```bash
npm install
npm run web
npm run check
npm test
npm run web:export
npm run test:e2e
```

环境变量：

```text
EXPO_PUBLIC_API_BASE_URL=https://your-production-domain.vercel.app
```

未设置时，Web 先请求同源 `/api/geocode`，原生端直接使用 Open-Meteo。

Playwright 会自行导出 Web 并启动一次性静态服务器，不需要手工常驻开发服务。

## 匿名事件

- Web：通过 Vercel Analytics 记录 `poster_generated`、`poster_downloaded`、`premium_intent_clicked`。
- iOS/Android：只在设备本地累计对应计数，不上传。
- 属性只有主题和画幅枚举，不包含日期、时间、地点、坐标、标题或题词。
- “¥19.9 买断”当前只是价格意愿实验，点击不会扣款或创建订单。

## 构建

```bash
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview
```

iOS 本地签名需要 macOS/Xcode；Windows 使用 EAS 云构建。

当前 iOS/Android 共享代码和 bundle 可导出；签名安装包、TestFlight 和 Google Play 内测仍需要 Expo/EAS 与商店凭据。

## 数据

数据、许可证和隐私边界见 `docs/DATA-SOURCES.md` 与 `docs/PRIVACY.md`。
