# Star Ring: Neon Surge

一个无需构建、可直接在浏览器运行的 Canvas 太空生存动作游戏。

## 在线仓库

- GitHub: https://github.com/koajsj/game1
- 主分支: `main`

## 快速开始

```bash
git clone https://github.com/koajsj/game1.git
cd game1
npm install
```

直接打开 `index.html` 即可游玩。

## 操作方式

- 鼠标移动 / 触摸拖动: 控制飞船
- `WASD` / 方向键: 键盘移动
- `空格` / `Shift`: 闪避冲刺
- `Q`: 脉冲清障
- `P`: 暂停 / 继续
- `R`: 重开

## 主要升级（2026-05-09）

- 固定时间步长循环（60Hz），降低机型差异
- 粒子/环形特效对象池，减少 GC 抖动
- 移动端移动摇杆 + 双操作按钮（冲刺 / 脉冲）
- 受击反馈增强：短时停顿、红色边缘压迫感、屏幕震动
- 新增冲刺闪避、冲刺穿越与移动方向朝向
- 新增动态危险区：重力漩涡 / 风暴区
- 新增穿越危险区的高收益核心连锁
- Boss 进入攻击前会出现明显前摇提示
- 敌人行为分层（基础/环绕/冲锋）
- Boss 三段技能轮换（环绕召唤/定向召唤/冲刺）
- 局外成长（生命 / 磁吸）与结算资源累积
- 背景星云层与后处理增强
- 音频总线 ducking（音效触发时自动压低背景）
- 运行数据埋点（死亡原因、局时长等）

## 质量保障

- `npm run format`
- `npm run format:check`
- `npm run lint`
- `npm run test:e2e`

已添加 GitHub Actions CI：push/PR 自动执行格式检查、lint、Playwright 冒烟测试。

## 版本记录

详见 [RELEASE.md](RELEASE.md)
