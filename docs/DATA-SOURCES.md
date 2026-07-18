# 数据与许可

## Astronomy Engine

- 用途：J2000 赤道坐标到指定时空观测者地平坐标的转换。
- 版本：`2.1.19`。
- 许可证：MIT。
- 来源：https://github.com/cosinekitty/astronomy

## d3-celestial 精简数据

- 文件：`stars.6.json`、`constellations.lines.json`、`constellations.json`。
- 用途：视星等不高于 5.5 的恒星、IAU 星座连线和名称位置。
- 代码与仓库许可证：BSD-3-Clause，Copyright (c) 2015 Olaf Frohn。
- 来源：https://github.com/ofrohn/d3-celestial
- 上游目录包括 XHIP、VizieR、IAU 与 Stellarium；详见上游 README。

## Three.js

- 用途：浏览器端 GPU 星点、星座连线、亮度辉光、指针拾取和视差渲染。
- 版本：`0.185.1`。
- 许可证：MIT。
- 来源：https://github.com/mrdoob/three.js

Three.js 只消费 `buildSkyMap()` 的本地投影结果，不修改或补造天文数据。WebGL 不可用时使用同一批结果渲染静态 SVG。

## 恒星温度与光谱估算

- 输入：恒星目录中的 B−V 色指数。
- 温度：使用 Ballesteros 常用近似公式估算，并明确标记为“约”。
- 光谱：依据估算温度映射到 O/B/A/F/G/K/M 大类，只作详情层辅助说明。
- 没有 B−V 数据时不输出温度或光谱，不进行虚构填充。

## Open-Meteo Geocoding

- 用途：把城市名称转换为经纬度和 IANA 时区。
- 认证：无 Key。
- 请求：最多 6 条结果，8 秒超时；Vercel 代理缓存 24 小时。
- 来源：https://open-meteo.com/en/docs/geocoding-api
- 降级：代理失败时客户端直接请求公共端点；仍失败则保留当前地点，不影响已有海报。

## 数据边界

- 星图用于纪念和视觉表达，不代替导航或专业观测软件。
- 不随机移动或添加恒星。
- 用户题词、日期和地点只在当前浏览器会话中处理，不发送到星图服务。

## 分析服务

当前版本不加载分析 SDK，不发送生成、下载、地点、日期、坐标、标题或题词事件。
