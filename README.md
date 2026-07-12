# 此刻星空 / The Sky Then

输入日期、当地时间和地点，生成那一刻当地真实可见星空的纪念海报。

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
```

环境变量：

```text
EXPO_PUBLIC_API_BASE_URL=https://your-production-domain.vercel.app
```

未设置时，Web 先请求同源 `/api/geocode`，原生端直接使用 Open-Meteo。

## 构建

```bash
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview
```

iOS 本地签名需要 macOS/Xcode；Windows 使用 EAS 云构建。

## 数据

数据、许可证和隐私边界见 `docs/DATA-SOURCES.md` 与 `docs/PRIVACY.md`。
