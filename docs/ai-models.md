# 浏览器端 AI 模型说明

## 当前选择

证件照工具采用 `Xenova/modnet`，通过 `@huggingface/transformers` 在浏览器 Worker 中执行人像抠图。

- 原始 MODNet 仓库明确说明代码、模型和演示（指定 GIF 除外）使用 Apache-2.0：<https://github.com/ZHKKKe/MODNet#license>
- Web 版模型仓库标注 Apache-2.0，并提供 Transformers.js 使用方式：<https://huggingface.co/Xenova/modnet>
- `@huggingface/transformers` 安装包许可证为 Apache-2.0。
- ONNX Runtime Web 由 Transformers.js 间接使用，许可证为 MIT。

以上许可证允许商业使用，但仍应保留依赖许可证文本并遵守 Apache-2.0 NOTICE 要求。模型来源或版本升级时必须重新核验。

## 加载与降级

1. 模型只在用户点击“开始 AI 抠图”后加载。
2. 默认使用经过真实人像核验的全精度 WASM。WebGPU/fp16 和 q8 候选路径在人像发丝处出现明显蒙版缺失，未作为默认可用路径交付。
3. fp32 权重约 25.9 MB，固定版本为 `fa2fa546052fba4c08921230a26cc69a333fca12`。WASM 运行时预压缩为约 6.7 MB，Worker 使用 `DecompressionStream` 解压并通过 ONNX Runtime `wasmBinary` 注入，避免超过 Pages 单文件限制。
4. 低内存设备把送入模型的长边限制为 1024 像素，其他设备限制为 1600 像素。
5. 推理在独立 Worker 中执行，取消操作会终止 Worker。
6. 模型加载或推理失败时，编辑器保留原图尺寸裁剪和导出，不会伪装成已经完成抠图。

## 隐私

模型文件从 Hugging Face 下载并由浏览器缓存。照片像素只传入本地 Worker，不发送到 Hugging Face 或其他图片服务。

## 已知限制

- 发丝、半透明物体、运动模糊、低对比背景和多人照片可能产生边缘误差。
- 当前不执行人脸检测、五官修改、美颜、换脸或生成式修复。
- 尚未提供眼睛高度、头顶留白自动判断和六寸冲印排版。
- 证件、考试、护照和签证要求不同，输出不保证通过审核。
- 首次使用需要模型下载；模型托管不可达时可取消并使用原图裁剪导出。当前需要支持 `DecompressionStream` 的现代浏览器。

## 实际验收记录

2026-10-17，Windows Edge 无头浏览器，以 Transformers.js 官方文档的 `portrait-of-woman_small.jpg` 做本地测试。fp32/WASM 路径输出同时包含透明背景与不透明人物区域，人工检查截图确认头发、面部和肩膀基本完整。轻量路径的失败样例已用于淘汰该路径。此结果仅代表该样例，不能概括所有人像质量。
