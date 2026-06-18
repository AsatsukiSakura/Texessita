import { createServer } from './network/server.js'
import { GameConfig } from './engine/types.js'

// ============================================================
// 德州扑克服务端入口
// ============================================================

const config: GameConfig = {
  maxPlayers: 9,
  startingChips: 1000,
  smallBlind: 5,
  bigBlind: 10,
}

const port = parseInt(process.env.PORT || '3000', 10)

createServer({
  config,
  port,
  actionTimeoutMs: 30_000,
  heartbeatIntervalMs: 15_000,
})

console.log(`♠ 德州扑克服务器已启动 → ws://localhost:${port}`)
console.log('  等待玩家连接...')
