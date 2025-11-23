const { spawn } = require('child_process');
const path = require('path');

/**
 * Execute yt-dlp with streaming logs
 * @param {string[]} args - Command line arguments for yt-dlp
 * @returns {Promise<{stdout: string, stderr: string, error: boolean}>}
 */
function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    // Platform detection for correct binary
    const isWindows = process.platform === 'win32';
    const YT_DLP_FILENAME = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
    const ytDlpPath = path.join(__dirname, '..', 'bin', YT_DLP_FILENAME);
    
    console.log(`[yt-dlp] Platform: ${process.platform}`);
    console.log(`[yt-dlp] Executing: ${ytDlpPath} ${args.join(' ')}`);

    const childProcess = spawn(ytDlpPath, args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`[yt-dlp] ${output.trim()}`);
    });

    childProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error(`[yt-dlp] ${output.trim()}`);
    });

    childProcess.on('close', (code) => {
      console.log(`[yt-dlp] Process exited with code ${code}`);

      if (code === 0) {
        resolve({ stdout, stderr, error: false });
      } else {
        resolve({ stdout, stderr, error: true });
      }
    });

    childProcess.on('error', (error) => {
      console.error(`[yt-dlp] Process error:`, error);
      reject(error);
    });

    // Timeout after 10 minutes
    const timeout = setTimeout(() => {
      console.error('[yt-dlp] Timeout - killing process');
      childProcess.kill();
      reject(new Error('yt-dlp process timed out after 10 minutes'));
    }, 600000);

    childProcess.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

module.exports = { runYtDlp };const { spawn } = require('child_process');
const path = require('path');

/**
 * Execute yt-dlp with streaming logs
 * @param {string[]} args - Command line arguments for yt-dlp
 * @returns {Promise<{stdout: string, stderr: string, error: boolean}>}
 */
function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    // Platform detection for correct binary
    const isWindows = process.platform === 'win32';
    const YT_DLP_FILENAME = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
    const ytDlpPath = path.join(__dirname, '..', 'bin', YT_DLP_FILENAME);
    
    console.log(`[yt-dlp] Platform: ${process.platform}`);
    console.log(`[yt-dlp] Executing: ${ytDlpPath} ${args.join(' ')}`);

    const childProcess = spawn(ytDlpPath, args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`[yt-dlp] ${output.trim()}`);
    });

    childProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error(`[yt-dlp] ${output.trim()}`);
    });

    childProcess.on('close', (code) => {
      console.log(`[yt-dlp] Process exited with code ${code}`);

      if (code === 0) {
        resolve({ stdout, stderr, error: false });
      } else {
        resolve({ stdout, stderr, error: true });
      }
    });

    childProcess.on('error', (error) => {
      console.error(`[yt-dlp] Process error:`, error);
      reject(error);
    });

    // Timeout after 10 minutes
    const timeout = setTimeout(() => {
      console.error('[yt-dlp] Timeout - killing process');
      childProcess.kill();
      reject(new Error('yt-dlp process timed out after 10 minutes'));
    }, 600000);

    childProcess.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

module.exports = { runYtDlp };
