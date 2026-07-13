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

## Open-Meteo Geocoding

- 用途：把城市名称转换为经纬度和 IANA 时区。
- 认证：无 Key。
- 请求：最多 6 条结果，8 秒超时；Vercel 代理缓存 24 小时。
- 来源：https://open-meteo.com/en/docs/geocoding-api
- 降级：代理失败时客户端直接请求公共端点；仍失败则保留当前地点，不影响已有海报。

## 数据边界

- 星图用于纪念和视觉表达，不代替导航或专业观测软件。
- 不随机移动或添加恒星。
- 用户题词、日期和地点只保存在设备本地。

## Vercel Analytics

- 用途：统计生成、下载与印刷级版本兴趣三个匿名转化事件。
- 事件属性：仅主题 ID 与画幅 ID。
- 禁止字段：日期、时间、地点、坐标、标题、题词和任何个人身份信息。
- Web 使用 `@vercel/analytics`；原生端不调用该服务，只在设备本地累计匿名枚举计数。
