# 📖 拼音小达人

给即将上小学的孩子做的汉语拼音学习工具（iPad / 平板 / 手机浏览器均可运行）。

## ✨ 功能

- **📚 学习**：声母(23)、韵母(24)、整体认读(16)卡片学习，点击发音
- **🎮 练习**：4 种游戏化练习
  - 👂 听音选拼音
  - 🔤 看拼音选字
  - 🔨 看字拼拼音（选声调）
  - 🎚️ 声调判断
- **📅 打卡**：每日达标打卡、连续天数、进度条
- **👨👩👦 家长模式**：学习报告、错题本、设置每日目标、导出数据

## 🚀 运行

```bash
# 本地预览
cd pinyin_tool
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```

## 📱 部署到 iPad

1. 将 `pinyin_tool` 上传到你自己的静态托管（如 GitHub Pages / Netlify），获得 https 地址
2. iPad Safari 打开该地址
3. 点击 Safari「分享」→「添加到主屏幕」
4. 桌面出现「拼音小达人」图标，点击全屏运行（离线可用）

## 🔊 发音说明

- 使用 iPad 自带中文 TTS（Web Speech API），联网/离线均可发音
- 发音文本用 `数字声调`（如 `ba1`→bā），绕过 iOS 对带调字符的误读
- 若 TTS 发音不理想，可替换为真人录音（详见 `js/tts.js` 注释，预留了扩展点）

## 🗂️ 目录结构

```
pinyin_tool/
├── index.html          # 入口
├── manifest.json       # PWA 配置
├── sw.js               # 离线缓存
├── css/style.css       # 样式
├── js/
│   ├── pinyin-data.js  # 拼音知识库
│   ├── tts.js          # 发音
│   ├── app.js          # 状态/打卡
│   ├── learn.js        # 学习
│   ├── practice.js     # 练习
│   ├── checkin.js      # 打卡
│   └── parents.js      # 家长模式
├── icons/              # App 图标
└── 方案.md             # 完整技术方案
```

## 🔒 家长模式

默认密码：`0426`（可在家长模式内修改）
