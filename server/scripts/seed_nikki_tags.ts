import { getDatabase, initDatabase, saveDatabase } from '../src/database'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
// 初始化数据库连接
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/database.sqlite')
await initDatabase()

const db = getDatabase()

// --- 基础标签字典 ---

const STYLES = [
  { zh: '典雅', en: 'Elegant' },
  { zh: '甜美', en: 'Sweet' },
  { zh: '酷帅', en: 'Cool' },
  { zh: '清新', en: 'Fresh' },
  { zh: '性感', en: 'Sexy' },
  { zh: '华丽', en: 'Gorgeous' },
  { zh: '简约', en: 'Simple' },
  { zh: '活泼', en: 'Lively' },
  { zh: '成熟', en: 'Mature' },
  { zh: '清纯', en: 'Pure' },
  { zh: '保暖', en: 'Warm' },
  { zh: '清凉', en: 'Cool' }
]

const CLOTHING_TYPES = [
  { zh: '发型', en: 'Hair' },
  { zh: '连衣裙', en: 'Dress' },
  { zh: '上衣', en: 'Top' },
  { zh: '下装', en: 'Bottom' },
  { zh: '外套', en: 'Coat' },
  { zh: '袜套', en: 'Hosiery' },
  { zh: '鞋子', en: 'Shoes' },
  { zh: '饰品', en: 'Accessory' },
  { zh: '妆容', en: 'Makeup' },
  { zh: '头饰', en: 'Headwear' },
  { zh: '耳饰', en: 'Earrings' },
  { zh: '颈饰', en: 'Necklace' },
  { zh: '手饰', en: 'Bracelet' },
  { zh: '手持物', en: 'Handheld' },
  { zh: '腰饰', en: 'Waist' },
  { zh: '特殊', en: 'Special' },
  { zh: '面饰', en: 'Face Accessory' },
  { zh: '翅膀', en: 'Wings' },
  { zh: '尾巴', en: 'Tail' },
  { zh: '前景', en: 'Foreground' },
  { zh: '后景', en: 'Background' },
  { zh: '顶饰', en: 'Top Accessory' },
  { zh: '地面', en: 'Ground' }
]

const ABILITIES = [
  { zh: '钓鱼', en: 'Fishing' },
  { zh: '捕虫', en: 'Bug Catching' },
  { zh: '漂浮', en: 'Floating' },
  { zh: '净化', en: 'Purifying' },
  { zh: '清洁', en: 'Cleaning' },
  { zh: '演奏', en: 'Music' },
  { zh: '骑乘', en: 'Riding' },
  { zh: '滑翔', en: 'Gliding' },
  { zh: '摄影', en: 'Photography' },
  { zh: '采集', en: 'Gathering' },
  { zh: '缩小', en: 'Shrink' },
  { zh: '巨大化', en: 'Enlarge' }
]

const THEMES = [
  { zh: '居家', en: 'Home' },
  { zh: '制服', en: 'Uniform' },
  { zh: '童话', en: 'Fairy Tale' },
  { zh: '复古', en: 'Retro' },
  { zh: '宫廷', en: 'Palace' },
  { zh: '废土', en: 'Wasteland' },
  { zh: '赛博', en: 'Cyberpunk' },
  { zh: '哥特', en: 'Gothic' },
  { zh: '魔法', en: 'Magic' },
  { zh: '星空', en: 'Starry Sky' },
  { zh: '学院', en: 'Academy' },
  { zh: '和风', en: 'Japanese' },
  { zh: '中式古典', en: 'Classical Chinese' },
  { zh: '精灵', en: 'Elf' },
  { zh: '洛丽塔', en: 'Lolita' },
  { zh: '婚纱', en: 'Wedding' },
  { zh: '泳装', en: 'Swimsuit' },
  { zh: '舞会', en: 'Ball' },
  { zh: '晚礼服', en: 'Evening Dress' },
  { zh: '偶像', en: 'Idol' },
  { zh: '摇滚', en: 'Rock' },
  { zh: '蒸汽朋克', en: 'Steampunk' },
  { zh: '废墟', en: 'Ruin' },
  { zh: '森女', en: 'Mori Girl' },
  { zh: '波西米亚', en: 'Bohemian' },
  { zh: '欧式古典', en: 'European Classical' },
  { zh: '民国服饰', en: 'Republic Era' },
  { zh: '侠客', en: 'Swordsman' },
  { zh: '千鸟格', en: 'Houndstooth' },
  { zh: '小动物', en: 'Animal' },
  { zh: '暗黑', en: 'Dark' },
  { zh: '机甲', en: 'Mecha' }
]

const MATERIALS = [
  { zh: '蕾丝', en: 'Lace' },
  { zh: '皮革', en: 'Leather' },
  { zh: '丝绸', en: 'Silk' },
  { zh: '薄纱', en: 'Tulle' },
  { zh: '金属', en: 'Metal' },
  { zh: '珍珠', en: 'Pearl' },
  { zh: '蝴蝶结', en: 'Bowknot' },
  { zh: '花朵', en: 'Floral' },
  { zh: '星辰', en: 'Star' },
  { zh: '羽毛', en: 'Feather' },
  { zh: '亮片', en: 'Sequin' },
  { zh: '绒毛', en: 'Fluff' },
  { zh: '针织', en: 'Knit' },
  { zh: '牛仔', en: 'Denim' },
  { zh: '雪纺', en: 'Chiffon' },
  { zh: '丝绒', en: 'Velvet' },
  { zh: '棉麻', en: 'Cotton Linen' },
  { zh: 'PVC', en: 'PVC' },
  { zh: '宝石', en: 'Gemstone' },
  { zh: '水晶', en: 'Crystal' },
  { zh: '流苏', en: 'Tassel' },
  { zh: '刺绣', en: 'Embroidery' }
]

const COLORS = [
  { zh: '红色', en: 'Red' },
  { zh: '蓝色', en: 'Blue' },
  { zh: '绿色', en: 'Green' },
  { zh: '黄色', en: 'Yellow' },
  { zh: '紫色', en: 'Purple' },
  { zh: '粉色', en: 'Pink' },
  { zh: '黑色', en: 'Black' },
  { zh: '白色', en: 'White' },
  { zh: '灰色', en: 'Gray' },
  { zh: '金色', en: 'Gold' },
  { zh: '银色', en: 'Silver' },
  { zh: '棕色', en: 'Brown' },
  { zh: '橙色', en: 'Orange' },
  { zh: '青色', en: 'Cyan' },
  { zh: '薄荷绿', en: 'Mint Green' },
  { zh: '香芋紫', en: 'Taro Purple' },
  { zh: '酒红', en: 'Wine Red' },
  { zh: '藏青', en: 'Navy Blue' },
  { zh: '渐变色', en: 'Gradient' },
  { zh: '彩虹色', en: 'Rainbow' }
]

const SCENES = [
  { zh: '微风绿野', en: 'Breezy Field' },
  { zh: '花愿镇', en: 'Wishville' },
  { zh: '遗迹', en: 'Ruins' },
  { zh: '城堡', en: 'Castle' },
  { zh: '迷宫', en: 'Maze' },
  { zh: '祈愿树', en: 'Wishing Tree' },
  { zh: '心之领域', en: 'Heart Domain' },
  { zh: '奇想星海', en: 'Starry Sea' },
  { zh: '白露原', en: 'Dewy Plains' },
  { zh: '日落', en: 'Sunset' },
  { zh: '清晨', en: 'Morning' },
  { zh: '夜晚', en: 'Night' },
  { zh: '雨天', en: 'Rainy' },
  { zh: '雪景', en: 'Snow' },
  { zh: '室内', en: 'Indoor' },
  { zh: '街头', en: 'Street' }
]

interface TagData {
  id?: string
  nameZh: string
  nameEn: string
  type: 'ai' | 'user' | 'system' | 'scene' | 'clothing' | 'action'
  category: string
}

const tagsToInsert: TagData[] = []

// 1. 插入原子标签
STYLES.forEach(s => tagsToInsert.push({ nameZh: s.zh, nameEn: s.en, type: 'clothing', category: 'style' }))
CLOTHING_TYPES.forEach(t => tagsToInsert.push({ nameZh: t.zh, nameEn: t.en, type: 'clothing', category: 'clothing_type' }))
ABILITIES.forEach(a => tagsToInsert.push({ nameZh: a.zh, nameEn: a.en, type: 'action', category: 'ability' }))
THEMES.forEach(t => tagsToInsert.push({ nameZh: t.zh, nameEn: t.en, type: 'clothing', category: 'theme' }))
MATERIALS.forEach(m => tagsToInsert.push({ nameZh: m.zh, nameEn: m.en, type: 'clothing', category: 'material' }))
COLORS.forEach(c => tagsToInsert.push({ nameZh: c.zh, nameEn: c.en, type: 'clothing', category: 'color' }))
SCENES.forEach(s => tagsToInsert.push({ nameZh: s.zh, nameEn: s.en, type: 'scene', category: 'scene' }))

// 2. 交叉生成复合标签，以达到“数千个”的规模 (满足无限暖暖海量服装特性的需求)

// (A) 风格 + 服装部件 (例如：典雅连衣裙) = 12 * 23 = 276
STYLES.forEach(s => {
  CLOTHING_TYPES.forEach(t => {
    tagsToInsert.push({
      nameZh: `${s.zh}${t.zh}`,
      nameEn: `${s.en} ${t.en}`,
      type: 'clothing',
      category: 'composite_style_type'
    })
  })
})

// (B) 主题 + 服装部件 (例如：洛丽塔连衣裙) = 32 * 23 = 736
THEMES.forEach(th => {
  CLOTHING_TYPES.forEach(t => {
    tagsToInsert.push({
      nameZh: `${th.zh}${t.zh}`,
      nameEn: `${th.en} ${t.en}`,
      type: 'clothing',
      category: 'composite_theme_type'
    })
  })
})

// (C) 颜色 + 主题 (例如：黑色哥特) = 20 * 32 = 640
COLORS.forEach(c => {
  THEMES.forEach(th => {
    tagsToInsert.push({
      nameZh: `${c.zh}${th.zh}`,
      nameEn: `${c.en} ${th.en}`,
      type: 'clothing',
      category: 'composite_color_theme'
    })
  })
})

// (D) 材质 + 服装部件 (例如：蕾丝连衣裙) = 22 * 23 = 506
MATERIALS.forEach(m => {
  CLOTHING_TYPES.forEach(t => {
    tagsToInsert.push({
      nameZh: `${m.zh}${t.zh}`,
      nameEn: `${m.en} ${t.en}`,
      type: 'clothing',
      category: 'composite_material_type'
    })
  })
})

// 打印预估数量
console.log(`Prepared ${tagsToInsert.length} specialized tags for Infinity Nikki.`)

// 3. 执行数据库插入
let inserted = 0
let skipped = 0

// 开启事务以加速插入
db.run('BEGIN TRANSACTION')
const checkStmt = db.prepare('SELECT id FROM tags WHERE name_zh = ?')
const insertStmt = db.prepare(`
  INSERT INTO tags (id, name_zh, name_en, type, category, usage_count)
  VALUES (?, ?, ?, ?, ?, 0)
`)

for (const tag of tagsToInsert) {
  checkStmt.bind([tag.nameZh])
  if (checkStmt.step()) {
    // 已存在
    skipped++
    checkStmt.reset()
  } else {
    checkStmt.reset()
    const id = uuidv4()
    insertStmt.run([id, tag.nameZh, tag.nameEn, tag.type, tag.category])
    inserted++
  }
}

checkStmt.free()
insertStmt.free()
db.run('COMMIT')

console.log('Inserting into database...')


saveDatabase()
console.log(`Done! Successfully inserted ${inserted} tags. Skipped ${skipped} existing tags. Total available: ${tagsToInsert.length}`)
}

main().catch(console.error)
