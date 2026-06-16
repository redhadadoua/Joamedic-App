import fs from 'fs/promises';
import path from 'path';

async function convertImages() {
  const sharp = (await import('sharp')).default;
  const dir = './src/assets/images';
  const files = await fs.readdir(dir);

  for (const file of files) {
    if (file.match(/\.(jpg|jpeg|png)$/i)) {
      const filePath = path.join(dir, file);
      const parsed = path.parse(file);
      const newFilePath = path.join(dir, `${parsed.name}.webp`);
      
      console.log(`Converting ${file} to WebP...`);
      await sharp(filePath)
        .webp({ quality: 80 })
        .toFile(newFilePath);
    }
  }
}

convertImages().catch(console.error);
