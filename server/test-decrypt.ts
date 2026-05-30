import { ImageDecryptService } from './src/services/ImageDecryptService'
import configService from './src/services/ConfigService'
import ImageModel from './src/models/Image'
import path from 'path'
import fs from 'fs'

import { initDatabase } from './src/database'

async function main() {
  await initDatabase()
  const result = ImageModel.findAll({ page_size: 5 })
  const images = result.images
  if (images.length === 0) {
    console.log('No images found in database')
    return
  }
  
  const image = images[0]
  console.log('Testing image:', image.path)
  
  const gamePath = configService.get('gamePath')
  console.log('Game path:', gamePath)
  
  const uid = ImageDecryptService.findUserUid(gamePath)
  console.log('Found UID:', uid)
  
  try {
    const result = await ImageDecryptService.decryptImage(image.path, uid || undefined)
    console.log('Has encrypted data:', result.hasEncryptedData)
    console.log('Decrypted metadata keys:', result.metadata ? Object.keys(result.metadata) : 'null')
    
    if (result.metadata) {
      console.log('Metadata sample:', JSON.stringify(result.metadata).substring(0, 200))
    }
  } catch (error) {
    console.error('Decryption failed:', error)
  }
}

main().catch(console.error)
