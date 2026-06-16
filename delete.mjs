import fs from 'fs/promises';
import path from 'path';

async function deleteOld() {
  const dir = './src/assets/images';
  const files = await fs.readdir(dir);

  for (const file of files) {
    if (file.match(/\.(jpg|jpeg|png)$/i)) {
      const filePath = path.join(dir, file);
      console.log(`Deleting ${file}...`);
      await fs.unlink(filePath);
    }
  }
}

deleteOld().catch(console.error);
