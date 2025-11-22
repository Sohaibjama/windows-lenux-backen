const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const BIN_DIR = path.join(__dirname, '..', 'bin');
const isWindows = process.platform === 'win32';
const YT_DLP_FILENAME = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
const YT_DLP_PATH = path.join(BIN_DIR, YT_DLP_FILENAME);
const YT_DLP_URL = isWindows 
  ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
  : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

/**
 * Download file from URL
 */
function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(destination);

    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        file.close();
        require('fs').unlinkSync(destination);
        return downloadFile(response.headers.location, destination)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        require('fs').unlinkSync(destination);
        return reject(new Error(`Failed to download: ${response.statusCode}`));
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        file.close();
        require('fs').unlinkSync(destination);
        reject(err);
      });
    }).on('error', (err) => {
      file.close();
      try {
        require('fs').unlinkSync(destination);
      } catch (e) {
        // Ignore
      }
      reject(err);
    });
  });
}

/**
 * Make file executable (Linux/Mac)
 */
async function makeExecutable(filePath) {
  if (process.platform !== 'win32') {
    try {
      await fs.chmod(filePath, 0o755);
      console.log('✓ Made yt-dlp executable');
    } catch (error) {
      console.error('Failed to chmod:', error);
      throw error;
    }
  }
}

/**
 * Test if yt-dlp works
 */
async function testYtDlp() {
  try {
    // On Windows, don't use quotes around the path
    const command = isWindows ? YT_DLP_PATH : `"${YT_DLP_PATH}"`;
    const result = execSync(`${command} --version`, {
      encoding: 'utf-8',
      timeout: 5000
    });
    console.log(`✓ yt-dlp version: ${result.trim()}`);
    return true;
  } catch (error) {
    console.error('yt-dlp test failed:', error.message);
    return false;
  }
}

/**
 * Ensure yt-dlp binary exists and is executable
 */
async function ensureYtDlp() {
  try {
    console.log(`Platform: ${process.platform}`);
    console.log(`Looking for: ${YT_DLP_PATH}`);
    
    // Create bin directory
    await fs.mkdir(BIN_DIR, { recursive: true });

    // Check if yt-dlp already exists
    try {
      await fs.access(YT_DLP_PATH);
      console.log('✓ yt-dlp binary found');

      // Make sure it's executable (Linux/Mac only)
      await makeExecutable(YT_DLP_PATH);

      // Test if it works
      const works = await testYtDlp();
      if (works) {
        return;
      }

      console.log('⚠ Existing yt-dlp binary not working, re-downloading...');
      await fs.unlink(YT_DLP_PATH);
    } catch (error) {
      // File doesn't exist, will download
      console.log('⚠ yt-dlp not found, downloading...');
    }

    // Download yt-dlp
    console.log(`Downloading from: ${YT_DLP_URL}`);
    await downloadFile(YT_DLP_URL, YT_DLP_PATH);
    console.log('✓ yt-dlp downloaded');

    // Make executable (Linux/Mac only)
    await makeExecutable(YT_DLP_PATH);

    // Test
    const works = await testYtDlp();
    if (!works) {
      throw new Error('Downloaded yt-dlp binary is not working');
    }

    console.log('✓ yt-dlp ready to use');
  } catch (error) {
    console.error('Failed to ensure yt-dlp:', error);
    throw error;
  }
}

module.exports = { ensureYtDlp };