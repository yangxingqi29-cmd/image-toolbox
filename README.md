# Image Toolbox

中英文在线图片工具箱。项目采用 Vue 3、Vite 和 TypeScript，图片处理功能将默认在浏览器本地完成。

## 环境

- 推荐 Node.js 24 LTS（也支持 Node.js 22.12+ 的 22.x 版本）
- npm 10 或更高版本

## 本地开发

```bash
npm install
npm run dev
```

## 质量检查

```bash
npm run typecheck
npm run test
npm run lint
npm run build
```

## 仓库文件与恢复

仓库包含完整源码、双语文案、四套服装素材、测试、脚本和开发文档。`node_modules/`、`dist/`、浏览器测试输出、个人测试人像及本地环境变量不纳入版本控制。

在新电脑下载后执行 `npm ci`，再执行 `npm run dev` 或 `npm run build` 即可恢复。AI 运行时会由项目脚本从已安装依赖中自动生成，无需另外上传；人像分割权重在首次使用时按需下载。

生产构建输出到 `dist/`。阶段 1 至阶段 6 已完成，当前可用页面：

- `/zh/image-compressor/`、`/en/image-compressor/`
- `/zh/image-converter/`、`/en/image-converter/`
- `/zh/image-resizer/`、`/en/image-resizer/`
- `/zh/image-cropper/`、`/en/image-cropper/`
- `/zh/id-photo/`、`/en/id-photo/`
- `/zh/image-watermark/`、`/en/image-watermark/`
- `/zh/image-to-pdf/`、`/en/image-to-pdf/`

所有工具均支持真实上传、处理与下载。生产构建会额外生成中英文静态 HTML、结构化数据、站点地图和 robots 文件。

Cloudflare Workers 部署使用仓库根目录的 `wrangler.jsonc`。静态资源目录为 `dist/`，未知前端路由由 Cloudflare 的 SPA 回退处理；`public/_redirects` 只保留根路径到 `/zh/` 的跳转。

## 生产 URL 与广告

复制 `.env.example` 为 `.env.production`，填写真实的 `VITE_SITE_URL` 后执行构建。未填写时不会生成错误的 canonical URL。

AdSense 默认关闭；审核通过前保持 `VITE_ADSENSE_ENABLED=false`。完整说明见 `docs/features.md`，AI 模型和许可证见 `docs/ai-models.md`。
