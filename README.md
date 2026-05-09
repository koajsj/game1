# Star Ring: Neon Surge

一个无需构建、可直接在浏览器运行的单文件 Canvas 太空生存射击游戏。

## 在线仓库

- GitHub: https://github.com/koajsj/game1
- 主分支: `main`

## 快速开始

1. 克隆仓库

```bash
git clone https://github.com/koajsj/game1.git
cd game1
```

2. 直接打开 `index.html` 开始游戏

说明: 推荐使用本地静态服务打开（避免某些浏览器对本地文件权限或音频策略限制）。

## 操作方式

- 鼠标移动 / 触摸拖动: 控制飞船
- `WASD` / 方向键: 键盘移动
- `空格` / 移动端 `FIRE`: 持续射击
- `Q`: 脉冲清障（范围清怪，含冷却）
- `P`: 暂停 / 继续
- `R`: 立即重开

## 核心玩法

- 碰撞绿色核心可得分并维持连击
- 陨石、敌机与 Boss 会造成伤害
- 道具提供护盾、磁吸、减速、加速等短时增益
- 随分数提升自动升阶，节奏逐渐加快
- 背景音乐和音效通过 Web Audio API 实时生成

## 移动端适配说明（2026-05-09）

- 支持 `100dvh` 与 `visualViewport`，减轻地址栏导致的跳动
- 适配刘海屏安全区（`safe-area-inset-*`）
- 触屏设备自动显示 `FIRE` 按钮，桌面默认隐藏
- 追加 `pointercancel` / 全局 `pointerup` 兜底，避免开火卡住
- 多断点压缩 HUD，改善小屏可读性

## 版本记录

详见 [RELEASE.md](RELEASE.md)
