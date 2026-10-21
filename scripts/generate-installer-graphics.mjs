import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

function encodeBMP(width, height, rawRGBBuffer) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);

  // BITMAPFILEHEADER (14 bytes)
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt16LE(0, 6);
  buf.writeUInt16LE(0, 8);
  buf.writeUInt32LE(54, 10);

  // BITMAPINFOHEADER (40 bytes)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22); // positive = bottom-up
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30); // BI_RGB
  buf.writeUInt32LE(pixelArraySize, 34);
  buf.writeInt32LE(2835, 38); // ~72 DPI
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y;
    const rowOffset = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const srcIdx = (srcY * width + x) * 3;
      buf[rowOffset + x * 3] = rawRGBBuffer[srcIdx + 2]; // B
      buf[rowOffset + x * 3 + 1] = rawRGBBuffer[srcIdx + 1]; // G
      buf[rowOffset + x * 3 + 2] = rawRGBBuffer[srcIdx]; // R
    }
  }
  return buf;
}

async function main() {
  const sourceImage = path.resolve('assets/installer-sidebar-master.jpg');
  const outDir = path.resolve('public');

  if (!fs.existsSync(sourceImage)) {
    throw new Error(`Master sidebar image not found at: ${sourceImage}`);
  }

  console.log('Generating installer sidebar (164x314)...');
  const sidebarSharp = sharp(sourceImage)
    .resize(164, 314, { fit: 'cover', position: 'center' });

  // Save PNG for preview & docs
  await sidebarSharp.clone().png().toFile(path.join(outDir, 'installerSidebar.png'));

  // Get raw RGB buffer for BMP (uncompressed 24-bit required by NSIS)
  const { data: rawSidebar, info: sidebarInfo } = await sidebarSharp
    .clone()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const sidebarBmp = encodeBMP(sidebarInfo.width, sidebarInfo.height, rawSidebar);
  fs.writeFileSync(path.join(outDir, 'installerSidebar.bmp'), sidebarBmp);
  console.log(`Saved installerSidebar.bmp (${sidebarBmp.length} bytes) and installerSidebar.png`);
}

main().catch(console.error);
