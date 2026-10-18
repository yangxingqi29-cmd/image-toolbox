# Image Toolbox 技术架构

## 分层

1. `app`：应用入口、路由与页面装配。
2. `components`：布局、通用控件、上传、图像预览和广告组件。
3. `features`：每个图片工具的界面、状态与专属逻辑，按路由懒加载。
4. `services`：文件校验、图像解码、Canvas、AI 推理与导出能力。
5. `workers`：压缩、转换、缩放和批量任务；通过统一消息协议支持进度与取消。
6. `data`：工具目录、证件照尺寸和背景色等可配置数据。
7. `i18n`：中英文文案；组件只引用翻译键。

## 关键决策

- Vue Router 使用独立语言前缀，便于后续预渲染、canonical 与 hreflang 生成。
- 首页只加载目录数据和轻量组件；Cropper、jsPDF、JSZip、ONNX Runtime Web 在对应阶段按路由引入。
- 共享图像任务将使用可测试的纯函数描述参数，由 Worker 执行耗时编码。
- AI 模型与运行时分开评估许可证；模型文件放在可配置静态路径并提供 WASM 降级。
- 阶段 6 增加构建时预渲染，确保工具页输出完整静态正文。

## 阶段计划

1. 基础：路由、国际化、设计系统、首页、主题与响应式布局。已完成。
2. 通用处理：上传、真实格式识别、解码、内存保护、下载与任务状态。已完成。
3. 基础工具：压缩、转换、缩放和裁剪。已完成。
4. 证件照：编辑器、模型许可证评估、本地分割、背景合成和导出。已完成。
5. 扩展工具：水印、PDF、批量任务与 ZIP。已完成。
6. SEO 与商业化：预渲染、元数据、站点地图、法律页和广告开关。已完成。
7. 测试与优化：单元、集成、E2E、真实样例、兼容性和性能记录。

## 首批依赖说明

| 依赖                    | 用途               | 许可证           |
| ----------------------- | ------------------ | ---------------- |
| Vue 3                   | 组件框架           | MIT              |
| Vue Router              | 语言与工具路由     | MIT              |
| Vue I18n                | 中英文文案         | MIT              |
| Tailwind CSS            | Token 与响应式样式 | MIT              |
| Lucide Vue Next         | 可访问的矢量图标   | ISC              |
| Vite / TypeScript       | 构建与类型检查     | MIT / Apache-2.0 |
| Vitest / Vue Test Utils | 阶段测试           | MIT              |

版本与许可证以安装锁文件及对应包内 `LICENSE` 为最终依据；新增图像与 AI 依赖时单独补充审查记录。

## 阶段 2 实现

- `services/image/file-format.ts`：通过文件魔数识别 JPG、PNG 与 WebP，同时检查 MIME 和扩展名。
- `services/image/decode.ts`：优先使用 `ImageBitmap`，低兼容浏览器回退到图片元素，并统一释放资源。
- `services/image/dimensions.ts`：限制边长、像素数和预计 RGBA/Canvas 内存。
- `services/image/canvas.ts`：统一 Canvas 编码，结束后立即将画布归零。
- `composables/useImageFiles.ts`：批量队列、双并发限制、取消、错误聚合和生命周期清理。
- `components/upload`：点击、拖放、多文件预览、删除、清空、错误和真实 PNG 导出。

阶段 2 的共享能力已由阶段 3 的四个正式工具页面复用。

## 阶段 3 实现

- `features/shared/BatchImageTool.vue`：图片压缩、格式转换与尺寸调整的批量队列和结果对比。
- `features/cropper`：自由/固定比例裁剪、鼠标与触屏拖动、缩放、旋转和导出。
- `services/image/operations.ts`：格式、尺寸、比例、裁剪范围与体积变化计算。
- `services/image/processor.ts`：优先调用 Worker，初始化或运行失败时安全回退到普通 Canvas。
- `workers/image.worker.ts`：使用 `OffscreenCanvas` 执行编码、缩放、旋转和裁剪，取消时直接终止 Worker。

PNG 由浏览器进行无损重新编码，不保证一定减小；压缩工具默认在结果变大时保留原文件。批量 ZIP 下载已在阶段 5 实现。

## 阶段 4–6 实现

- `features/id-photo` 与 `workers/portrait-segmentation.worker.ts`：证件照编辑与本地 MODNet 推理。
- `features/watermark`：文字/图片水印、位置、平铺和批量结果。
- `features/image-to-pdf`：排序、纸张、方向、边距、排版、预览和 PDF 导出。
- `services/export/zip.ts`、`services/export/pdf.ts`：大型导出依赖按需加载。
- `scripts/generate-static-pages.mjs`：构建后生成双语静态正文、元数据、JSON-LD、sitemap 和 robots。
- `components/ads`：默认关闭的广告位和用户同意组件。
