import { initDatabase, getDatabase } from './index'
import { v4 as uuidv4 } from 'uuid'
import logger from '../utils/logger'

// 预设的AI标签
const presetTags = [
  // 场景标签
  { nameZh: '室内', nameEn: 'Indoor', type: 'scene', category: 'location' },
  { nameZh: '室外', nameEn: 'Outdoor', type: 'scene', category: 'location' },
  { nameZh: '花园', nameEn: 'Garden', type: 'scene', category: 'location' },
  { nameZh: '城堡', nameEn: 'Castle', type: 'scene', category: 'location' },
  { nameZh: '森林', nameEn: 'Forest', type: 'scene', category: 'location' },
  { nameZh: '海边', nameEn: 'Seaside', type: 'scene', category: 'location' },
  { nameZh: '城市', nameEn: 'City', type: 'scene', category: 'location' },
  { nameZh: '夜景', nameEn: 'Night Scene', type: 'scene', category: 'time' },
  { nameZh: '日落', nameEn: 'Sunset', type: 'scene', category: 'time' },

  // 服装标签
  { nameZh: '连衣裙', nameEn: 'Dress', type: 'clothing', category: 'tops' },
  { nameZh: '外套', nameEn: 'Coat', type: 'clothing', category: 'outerwear' },
  { nameZh: '裤子', nameEn: 'Pants', type: 'clothing', category: 'bottoms' },
  { nameZh: '鞋子', nameEn: 'Shoes', type: 'clothing', category: 'footwear' },
  { nameZh: '帽子', nameEn: 'Hat', type: 'clothing', category: 'accessories' },
  { nameZh: '配饰', nameEn: 'Accessories', type: 'clothing', category: 'accessories' },
  { nameZh: '发型', nameEn: 'Hairstyle', type: 'clothing', category: 'hair' },

  // 动作标签
  { nameZh: '站立', nameEn: 'Standing', type: 'action', category: 'pose' },
  { nameZh: '坐着', nameEn: 'Sitting', type: 'action', category: 'pose' },
  { nameZh: '跳跃', nameEn: 'Jumping', type: 'action', category: 'pose' },
  { nameZh: '奔跑', nameEn: 'Running', type: 'action', category: 'pose' },
  { nameZh: '舞蹈', nameEn: 'Dancing', type: 'action', category: 'pose' },
  { nameZh: '拍照', nameEn: 'Taking Photo', type: 'action', category: 'pose' },
]

async function seed() {
  try {
    logger.info('Starting database seed...')

    // 初始化数据库
    await initDatabase()
    const db = getDatabase()

    // 插入预设标签
    for (const tag of presetTags) {
      db.run(`
        INSERT OR IGNORE INTO tags (id, name_zh, name_en, type, category)
        VALUES (?, ?, ?, ?, ?)
      `, [uuidv4(), tag.nameZh, tag.nameEn, tag.type, tag.category])
    }

    // 插入默认系统配置
    db.run(`INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)`, ['app_version', '1.0.0'])
    db.run(`INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)`, ['last_scan_at', ''])
    db.run(`INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)`, ['ai_model_version', '1.0.0'])

    logger.info(`Seeded ${presetTags.length} preset tags`)
    logger.info('Database seed completed successfully')
    process.exit(0)
  } catch (error) {
    logger.error('Database seed failed:', error)
    process.exit(1)
  }
}

seed()
