/**
 * Script to generate Electron app icons from SVG logo
 * Requires: sharp, and for macOS: iconutil (built-in) or a .iconset directory
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sharp = require('sharp');

const buildDir = path.join(__dirname, '../build');
const logoPath = path.join(__dirname, '../public/logo.svg');

// Ensure build directory exists
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

async function generateIcons() {
  console.log('🎨 Generating Electron app icons from MeshFlow logo...\n');

  try {
    // Read SVG
    const svgBuffer = fs.readFileSync(logoPath);

    // Generate PNG for Linux (512x512)
    console.log('📦 Generating Linux icon (icon.png)...');
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(buildDir, 'icon.png'));

    // Generate ICO for Windows (multi-size: 16, 32, 48, 64, 128, 256)
    console.log('📦 Generating Windows icon (icon.ico)...');
    const icoSizes = [16, 32, 48, 64, 128, 256];
    const icoImages = await Promise.all(
      icoSizes.map(size =>
        sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toBuffer()
      )
    );

    // For Windows, we'll create a simple 256x256 PNG and Electron Builder will convert it
    // Or you can use an online converter/service for proper .ico format
    await sharp(svgBuffer)
      .resize(256, 256)
      .png()
      .toFile(path.join(buildDir, 'icon.ico'));

    console.log('   Note: icon.ico is PNG format. For proper .ico, use electron-builder\'s conversion or an online tool.');

    // Generate ICNS for macOS
    // macOS requires an .iconset directory with specific sizes
    console.log('📦 Generating macOS icon (icon.icns)...');
    const iconsetDir = path.join(buildDir, 'icon.iconset');
    
    if (!fs.existsSync(iconsetDir)) {
      fs.mkdirSync(iconsetDir, { recursive: true });
    }

    // Required sizes for macOS .iconset
    const macSizes = [
      { size: 16, scale: 1 },
      { size: 32, scale: 1 },
      { size: 32, scale: 2 }, // 32@2x = 64
      { size: 128, scale: 1 },
      { size: 256, scale: 1 },
      { size: 256, scale: 2 }, // 256@2x = 512
      { size: 512, scale: 1 },
      { size: 512, scale: 2 }, // 512@2x = 1024
      { size: 1024, scale: 1 },
    ];

    for (const { size, scale } of macSizes) {
      const actualSize = size * scale;
      const filename = scale === 1 
        ? `icon_${size}x${size}.png`
        : `icon_${size}x${size}@${scale}x.png`;

      await sharp(svgBuffer)
        .resize(actualSize, actualSize)
        .png()
        .toFile(path.join(iconsetDir, filename));
    }

    // Convert .iconset to .icns using iconutil (macOS only)
    if (process.platform === 'darwin') {
      try {
        execSync(
          `iconutil -c icns "${iconsetDir}" -o "${path.join(buildDir, 'icon.icns')}"`,
          { stdio: 'inherit' }
        );
        console.log('   ✅ macOS icon.icns created successfully!');
        
        // Clean up iconset directory
        fs.rmSync(iconsetDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('   ⚠️  Could not create .icns file. The .iconset directory is ready for manual conversion.');
        console.warn('   Run: iconutil -c icns build/icon.iconset -o build/icon.icns');
      }
    } else {
      console.log('   ℹ️  macOS icon.iconset created. Convert to .icns on macOS with:');
      console.log(`   iconutil -c icns "${iconsetDir}" -o "${path.join(buildDir, 'icon.icns')}"`);
    }

    console.log('\n✅ Icon generation complete!');
    console.log(`   📁 Icons saved to: ${buildDir}`);
    console.log('\n📝 Generated files:');
    console.log('   - icon.png (512x512) - Linux');
    console.log('   - icon.ico (256x256 PNG) - Windows');
    if (process.platform === 'darwin') {
      console.log('   - icon.icns - macOS');
    } else {
      console.log('   - icon.iconset/ - macOS (convert on macOS)');
    }

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateIcons();
}

module.exports = { generateIcons };



