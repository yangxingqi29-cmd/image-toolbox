# 测试说明

## 自动检查

```powershell
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
# 另开终端运行真实浏览器检查（默认使用系统 Edge）
npm run test:e2e
```

单元测试覆盖文件签名、尺寸与内存保护、输出命名、语言路由、证件照 DPI 换算、人物合成参数、水印绘制、Worker 回退和基础图像管线。

生产构建额外验证：

- 路由和大型依赖可按需分包；
- 24 个中英文路径均生成独立 `index.html`；
- 静态页面含 Title、Description、H1、教程、FAQ 和结构化数据；
- `sitemap.xml`、`robots.txt`、`_headers` 与 `_redirects` 写入 `dist/`。

## 人工检查

每次发布前应使用不同肤色、发型、背景和光照的真实授权人像检查：

- 发丝和肩膀边缘；
- 白边、背景残留和透明孔洞；
- 手机内存和首次模型加载；
- WebGPU 与 WASM 回退；
- 导出尺寸、背景颜色和预览一致性。

未经真实样例人工检查，不宣称达到专业照相馆级抠图效果。

## 本次实际验证

2026-10-17，单元测试 8 文件 / 24 项通过。端到端测试验证 JPEG 签名、ZIP 文件数量、缩放与裁剪 PNG 尺寸、水印输出、两页 PDF 内容、证件照尺寸、AI 取消、真实人像换装、静态正文、中英文切换、手机布局和默认无广告脚本。

AI 真实样例测试独立标注 `@ai`，需要 `tests/e2e/portrait.jpg`。该测试素材不包含在版本控制中，可使用有权处理的照片；验收样例来自 Transformers.js 文档。未提供样例时此项明确跳过。
