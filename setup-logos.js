#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupLogos() {
  const publicDir = path.join(__dirname, 'public');
  const logoPath = path.join(publicDir, 'logo.png');
  const logoBwPath = path.join(publicDir, 'logo-bw.png');
  const logoColorPath = path.join(publicDir, 'logo-color.png');

  console.log('Setting up logos...');

  if (!fs.existsSync(logoPath)) {
    console.error('ERROR: logo.png not found in public folder');
    process.exit(1);
  }

  try {
    const sharp = (await import('sharp')).default;

    fs.copyFileSync(logoPath, logoColorPath);
    console.log('Created logo-color.png');

    await sharp(logoPath)
      .grayscale()
      .toFile(logoBwPath);
    console.log('Created logo-bw.png');
    console.log('SUCCESS: Logos setup complete!');

  } catch (err) {
    if (err.message.includes('Cannot find module') || err.message.includes('sharp')) {
      console.log('Installing sharp...');
      try {
        execSync('npm install --save-dev sharp', { stdio: 'inherit' });
        const sharp = (await import('sharp')).default;
        fs.copyFileSync(logoPath, logoColorPath);
        await sharp(logoPath).grayscale().toFile(logoBwPath);
        console.log('SUCCESS: Logos created!');
      } catch (installErr) {
        console.error('ERROR: Failed -', installErr.message);
        process.exit(1);
      }
    } else {
      console.error('ERROR:', err.message);
      process.exit(1);
    }
  }
}

setupLogos();
