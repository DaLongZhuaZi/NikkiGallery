import { initDatabase } from './index'
import logger from '../utils/logger'

async function migrate() {
  try {
    logger.info('Starting database migration...')
    initDatabase()
    logger.info('Database migration completed successfully')
    process.exit(0)
  } catch (error) {
    logger.error('Database migration failed:', error)
    process.exit(1)
  }
}

migrate()