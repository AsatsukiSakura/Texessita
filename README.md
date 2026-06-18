# Texessita

基于 TypeScript 的多人德州扑克（Texas Hold'em）在线游戏。自托管架构：一人运行服务端，其他人通过浏览器连接即可同台竞技，所有数据存于服务端内存。

## 技术栈

| 层 | 技术 |
|---|---|
| 后端语言 | TypeScript (ESM) |
| 运行时 | Node.js + tsx |
| 实时通信 | WebSocket (ws) |
| 扑克评估 | poker-evaluator |
| 前端框架 | Vue 3 + Vite |
| 包管理 | npm workspaces (monorepo) |

## 项目结构

```
Texessita/
├── backend/
│   ├── engine/               # 纯扑克引擎（零外部依赖）
│   │   ├── types.ts          # 花色/点数/牌型/游戏阶段/玩家/状态等全部类型定义
│   │   ├── card.ts           # 52 张牌堆创建、Fisher-Yates 洗牌、发牌
│   │   ├── converter.ts      # Card ↔ poker-evaluator 字符串格式双向转换
│   │   └── evaluator.ts      # 手牌评估（C(7,5) 枚举找最优 5 张组合）
│   ├── game/                 # 游戏流程控制（纯函数 + 编排器）
│   │   ├── actions.ts        # 行动校验与执行（fold/check/call/raise/all-in）
│   │   ├── round.ts          # 下注轮管理：盲注收取、阶段推进、发公共牌
│   │   ├── showdown.ts       # 摊牌判定：边池拆分、手牌比较、筹码分配
│   │   └── controller.ts     # GameController 编排器（串联全部流程）
│   ├── network/              # WebSocket 通信层
│   │   ├── protocol.ts       # 消息类型定义（ClientMessage / ServerMessage）
│   │   └── server.ts         # WS 服务：消息路由、行动超时、心跳检测、自动开局
│   ├── types/                # 第三方库类型声明
│   └── index.ts              # 服务端入口（配置 + 启动）
├── frontend/                 # Vue 3 + Vite 前端（骨架已搭建）
│   ├── index.html
│   ├── package.json
│   └── tsconfig.json
└── package.json              # monorepo 根配置（workspaces）
```

## 功能特性

### 扑克引擎

- 标准 52 张牌堆，Fisher-Yates 洗牌算法
- 基于 `poker-evaluator` 的手牌评估，从 7 张牌中枚举 C(7,5)=21 种组合找出最优 5 张
- 支持全部 10 种牌型：皇家同花顺、同花顺、四条、葫芦、同花、顺子、三条、两对、一对、高牌

### 游戏流程

- 完整的 Preflop → Flop → Turn → River → Showdown 阶段流转
- 小盲/大盲自动收取，支持 2 人单挑（Heads-Up）特殊规则
- 加注最小额校验、All-In 自动判定为 raise 或 call
- 弃牌获胜 / 全员 All-In 直入摊牌等边界处理

### 边池系统

- 按玩家贡献额逐层拆分边池
- 每个边池独立比牌，支持多人平局均分（余数归首位赢家）

### 网络服务

- JSON over WebSocket 双向通信
- 心跳检测：15 秒间隔 ping/pong，断线自动清理
- 行动超时：30 秒无操作自动弃牌并踢出
- 自动开局：一局结束 3 秒后自动开始下一局
- 玩家加入/离开/断线广播通知

## 开发进度

- [x] 基础类型定义（牌/牌型/玩家/游戏状态/操作结果）
- [x] 扑克引擎（牌堆/洗牌/发牌/格式转换/手牌评估）
- [x] 游戏流程控制器（盲注→下注轮→摊牌→边池→筹码分配）
- [x] WebSocket 服务器（消息协议/行动超时/心跳检测/自动开局）
- [ ] 前端牌桌 UI（Vue 3 + Vite，骨架已搭建）

## 快速开始

```bash
# 安装依赖（使用 nested 策略避免 hoisting 问题）
npm install --install-strategy=nested

# 启动后端 WebSocket 服务
npm run backend:dev
# → ws://localhost:3000

# 启动前端开发服务器（开发中）
npm run frontend:dev

# 同时启动前后端
npm run dev
```

## 配置

默认游戏参数（可在 `backend/index.ts` 中修改）：

| 参数 | 默认值 | 说明 |
|---|---|---|
| `maxPlayers` | 9 | 最大玩家数 |
| `startingChips` | 1000 | 每人起始筹码 |
| `smallBlind` | 5 | 小盲注 |
| `bigBlind` | 10 | 大盲注 |
| `actionTimeoutMs` | 30000 | 行动超时（毫秒） |
| `heartbeatIntervalMs` | 15000 | 心跳间隔（毫秒） |
| `PORT` | 3000 | 服务端口（环境变量） |

## WebSocket 协议

客户端与服务端通过 JSON over WebSocket 通信。

### 客户端 → 服务端

| 消息 | 说明 |
|---|---|
| `{"type":"join", "name":"Alice"}` | 加入游戏 |
| `{"type":"start_hand"}` | 开始一局 |
| `{"type":"action", "action":"fold"}` | 弃牌 |
| `{"type":"action", "action":"check"}` | 过牌 |
| `{"type":"action", "action":"call"}` | 跟注 |
| `{"type":"action", "action":"raise", "amount":50}` | 加注到指定金额 |
| `{"type":"action", "action":"all-in"}` | 全下 |
| `{"type":"leave"}` | 离开游戏 |

### 服务端 → 客户端

| 消息 | 说明 |
|---|---|
| `{"type":"joined", "playerId":"p1"}` | 加入成功 |
| `{"type":"game_state", "state":{...}}` | 游戏状态同步（广播） |
| `{"type":"your_turn", ...}` | 轮到你行动（含可选操作和超时时间） |
| `{"type":"hand_over", "winners":[...], "state":{...}}` | 本局结束 |
| `{"type":"player_joined", ...}` | 玩家加入通知 |
| `{"type":"player_left", ...}` | 玩家离开通知 |
| `{"type":"waiting", "message":"..."}` | 等待更多玩家 |
| `{"type":"error", "message":"..."}` | 错误信息 |

详见 [protocol.ts](backend/network/protocol.ts)。

## 许可证

MIT
