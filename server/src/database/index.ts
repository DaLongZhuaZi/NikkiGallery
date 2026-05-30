import initSqlJs, { Database } from 'sql.js'
import path from 'path'
import fs from 'fs'
import config from '../config'
import logger from '../utils/logger'

let db: Database | null = null
let saveTimer: NodeJS.Timeout | null = null
let pendingSave = false

// 确保数据目录存在
const dbDir = path.dirname(config.database.path)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

// 初始化数据库
export async function initDatabase(): Promise<Database> {
  if (db) {
    return db
  }

  logger.info('Initializing database...')

  const SQL = await initSqlJs()

  // 检查数据库文件是否存在
  if (fs.existsSync(config.database.path)) {
    const fileBuffer = fs.readFileSync(config.database.path)
    db = new SQL.Database(fileBuffer)
    logger.info(`Database loaded from: ${config.database.path} (${fileBuffer.length} bytes)`)
  } else {
    db = new SQL.Database()
    logger.info('New database created - file not found at path')
  }

  // 启用外键约束
  db.run('PRAGMA foreign_keys = ON')

  // 初始化数据库表
  initTables()

  return db
}

function initTables(): void {
  if (!db) {
    throw new Error('Database not initialized')
  }

  logger.info('Initializing database tables...')

  db.run(`
    -- 相册表
    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      account_id TEXT,
      type TEXT NOT NULL DEFAULT 'custom' CHECK(type IN ('game', 'custom')),
      description TEXT,
      cover_image_id TEXT,
      image_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 图片表
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      album_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      path TEXT NOT NULL,
      hash TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      file_size INTEGER,
      mime_type TEXT,
      thumbnail_path TEXT,
      ai_processed INTEGER DEFAULT 0,
      ai_tags TEXT,
      ai_features TEXT,
      user_tags TEXT,
      description TEXT,
      favorite INTEGER DEFAULT 0,
      deleted_at TEXT,
      exif_data TEXT,
      camera_params TEXT,
      game_metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
    );

    -- 标签表
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name_zh TEXT NOT NULL,
      name_en TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('ai', 'user', 'system', 'scene', 'clothing', 'action')),
      category TEXT,
      color TEXT,
      icon TEXT,
      usage_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 图片-标签关联表
    CREATE TABLE IF NOT EXISTS image_tags (
      image_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      confidence REAL,
      source TEXT NOT NULL CHECK(source IN ('ai', 'user')),
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (image_id, tag_id),
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    -- 分享码表
    CREATE TABLE IF NOT EXISTS share_codes (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('dye', 'home', 'camera', 'combo', 'diy')),
      code TEXT NOT NULL,
      name TEXT,
      description TEXT,
      metadata TEXT,
      image_id TEXT,
      role_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE SET NULL
    );

    -- 游戏账号表
    CREATE TABLE IF NOT EXISTS game_accounts (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL UNIQUE,
      nickname TEXT,
      avatar TEXT,
      last_sync_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- 系统配置表
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_images_album_id ON images(album_id);
    CREATE INDEX IF NOT EXISTS idx_images_hash ON images(hash);
    CREATE INDEX IF NOT EXISTS idx_images_ai_processed ON images(ai_processed);
    CREATE INDEX IF NOT EXISTS idx_images_favorite ON images(favorite);
    CREATE INDEX IF NOT EXISTS idx_image_tags_image_id ON image_tags(image_id);
    CREATE INDEX IF NOT EXISTS idx_image_tags_tag_id ON image_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_share_codes_type ON share_codes(type);
    CREATE INDEX IF NOT EXISTS idx_share_codes_code ON share_codes(code);
  `)

  // 数据库迁移：添加 deleted_at 字段（如果不存在）
  migrateDatabase()

  // 在迁移完成后再创建需要迁移字段的索引
  db.run('CREATE INDEX IF NOT EXISTS idx_images_deleted_at ON images(deleted_at)')

  logger.info('Database tables initialized successfully')
}

// 数据库迁移
function migrateDatabase(): void {
  if (!db) return

  try {
    // 检查 images 表的字段
    const columns: string[] = []
    const stmt = db.prepare("PRAGMA table_info(images)")
    while (stmt.step()) {
      const row = stmt.getAsObject()
      columns.push(row.name as string)
    }
    stmt.free()

    // 添加 deleted_at 字段
    if (!columns.includes('deleted_at')) {
      logger.info('Migrating database: adding deleted_at column to images table')
      db.run('ALTER TABLE images ADD COLUMN deleted_at TEXT')
      db.run('CREATE INDEX IF NOT EXISTS idx_images_deleted_at ON images(deleted_at)')
      logger.info('Migration completed: deleted_at column added')
    }

    // 添加元数据字段
    if (!columns.includes('exif_data')) {
      logger.info('Migrating database: adding metadata columns to images table')
      db.run('ALTER TABLE images ADD COLUMN exif_data TEXT')
      db.run('ALTER TABLE images ADD COLUMN camera_params TEXT')
      db.run('ALTER TABLE images ADD COLUMN game_metadata TEXT')
      logger.info('Migration completed: metadata columns added')
    }
  } catch (error) {
    logger.error('Database migration error:', error)
  }
}

// 保存数据库到文件
export function saveDatabase(): void {
  if (!db) {
    return
  }

  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(config.database.path, buffer)
  logger.info('Database saved')
}

// 防抖保存 - 在最后一次调用后 2 秒执行保存
// 适用于批量操作场景（扫描、批量导入等），避免每条记录都写磁盘
export function debouncedSaveDatabase(): void {
  pendingSave = true
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  saveTimer = setTimeout(() => {
    if (pendingSave && db) {
      saveDatabase()
      pendingSave = false
    }
    saveTimer = null
  }, 2000)
}

// 立即保存并取消待定的防抖保存
export function flushDatabase(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (pendingSave) {
    saveDatabase()
    pendingSave = false
  }
}

// 获取数据库实例
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

// 关闭数据库
export function closeDatabase(): void {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  if (db) {
    saveDatabase()
    db.close()
    db = null
    logger.info('Database closed')
  }
}

// Express 中间件：写操作后自动触发防抖保存
export function autoSaveMiddleware(_req: any, res: any, next: any): void {
  // 拦截响应结束事件
  const originalEnd = res.end
  res.end = function (...args: any[]) {
    // 只在成功响应（2xx）时触发保存
    if (res.statusCode >= 200 && res.statusCode < 300) {
      debouncedSaveDatabase()
    }
    return originalEnd.apply(res, args)
  }
  next()
}

export default {
  initDatabase,
  getDatabase,
  saveDatabase,
  debouncedSaveDatabase,
  flushDatabase,
  closeDatabase,
  autoSaveMiddleware,
}
