const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const { runYtDlp } = require('./utils/runYtDlp');
const { ensureYtDlp } = require('./utils/ensureYtDlp');

const app = express();
const PORT = process.env.PORT || 3000;
const DOWNLOADS_DIR = path.join(__dirname, 'tmp', 'downloads');

// Middleware
app.use(cors());
app.use(express.json());

// Ensure downloads directory exists
async function ensureDownloadsDir() {
  try {
    await fs.mkdir(DOWNLOADS_DIR, { recursive: true });
    console.log(`✓ Downloads directory ready: ${DOWNLOADS_DIR}`);
  } catch (error) {
    console.error('Failed to create downloads directory:', error);
    process.exit(1);
  }
}

// Cleanup utility
async function cleanupFiles(files) {
  for (const file of files) {
    try {
      await fs.unlink(file);
      console.log(`✓ Cleaned up: ${file}`);
    } catch (error) {
      console.error(`Failed to cleanup ${file}:`, error.message);
    }
  }
}

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'YouTube Downloader API',
    version: '1.0.0',
    endpoints: {
      probe: 'GET /probe?url=<youtube_url>',
      download: 'POST /download',
      playlist: 'POST /playlist'
    }
  });
});

// Probe endpoint - Get video metadata and formats
app.get('/probe', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing required parameter: url' });
  }

  try {
    console.log(`\n[PROBE] Fetching metadata for: ${url}`);

    const args = [
      '--dump-json',
      '--no-playlist',
      '--no-check-certificates',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      url
    ];

    const result = await runYtDlp(args);

    if (result.error) {
      throw new Error(result.stderr || 'Failed to probe video');
    }

    // Parse JSON - yt-dlp may output warnings before JSON
    const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in yt-dlp output');
    }
    const metadata = JSON.parse(jsonMatch[0]);

    // Format the response
    const response = {
      title: metadata.title,
      description: metadata.description,
      duration: metadata.duration,
      uploader: metadata.uploader,
      uploadDate: metadata.upload_date,
      thumbnail: metadata.thumbnail,
      viewCount: metadata.view_count,
      likeCount: metadata.like_count,
      formats: metadata.formats.map(fmt => ({
        formatId: fmt.format_id,
        ext: fmt.ext,
        quality: fmt.quality,
        formatNote: fmt.format_note,
        filesize: fmt.filesize,
        resolution: fmt.resolution,
        fps: fmt.fps,
        vcodec: fmt.vcodec,
        acodec: fmt.acodec
      }))
    };

    console.log(`✓ Probe successful: ${metadata.title}`);
    res.json(response);

  } catch (error) {
    console.error('[PROBE ERROR]', error.message);
    res.status(500).json({
      error: 'Failed to probe video',
      message: error.message
    });
  }
});

// Download endpoint - Single video
app.post('/download', async (req, res) => {
  const { url, format = 'best' } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing required field: url' });
  }

  const outputTemplate = path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s');
  let downloadedFile = null;

  try {
    console.log(`\n[DOWNLOAD] Starting download: ${url}`);
    console.log(`Format: ${format}`);

    const args = [
      '-f', format,
      '--no-playlist',
      '--no-check-certificates',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '-o', outputTemplate,
      url
    ];

    const result = await runYtDlp(args);

    if (result.error) {
      throw new Error(result.stderr || 'Download failed');
    }

    // Find the downloaded file
    const files = await fs.readdir(DOWNLOADS_DIR);
    if (files.length === 0) {
      throw new Error('No file was downloaded');
    }

    downloadedFile = path.join(DOWNLOADS_DIR, files[0]);
    const stats = await fs.stat(downloadedFile);

    console.log(`✓ Download complete: ${files[0]} (${stats.size} bytes)`);

    // Stream file to client
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${files[0]}"`);
    res.setHeader('Content-Length', stats.size);

    const fileStream = require('fs').createReadStream(downloadedFile);
    fileStream.pipe(res);

    fileStream.on('end', async () => {
      await cleanupFiles([downloadedFile]);
    });

    fileStream.on('error', async (error) => {
      console.error('Stream error:', error);
      await cleanupFiles([downloadedFile]);
    });

  } catch (error) {
    console.error('[DOWNLOAD ERROR]', error.message);

    if (downloadedFile) {
      await cleanupFiles([downloadedFile]);
    }

    res.status(500).json({
      error: 'Download failed',
      message: error.message
    });
  }
});

// Playlist endpoint - Download entire playlist as ZIP
app.post('/playlist', async (req, res) => {
  const { url, format = 'best' } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing required field: url' });
  }

  const playlistDir = path.join(DOWNLOADS_DIR, `playlist_${Date.now()}`);
  let downloadedFiles = [];

  try {
    console.log(`\n[PLAYLIST] Starting playlist download: ${url}`);
    console.log(`Format: ${format}`);

    await fs.mkdir(playlistDir, { recursive: true });

    const outputTemplate = path.join(playlistDir, '%(playlist_index)s - %(title)s.%(ext)s');

    const args = [
      '-f', format,
      '--yes-playlist',
      '--no-check-certificates',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '-o', outputTemplate,
      url
    ];

    const result = await runYtDlp(args);

    if (result.error) {
      throw new Error(result.stderr || 'Playlist download failed');
    }

    // Get all downloaded files
    const files = await fs.readdir(playlistDir);
    if (files.length === 0) {
      throw new Error('No files were downloaded from playlist');
    }

    downloadedFiles = files.map(f => path.join(playlistDir, f));

    console.log(`✓ Playlist download complete: ${files.length} files`);

    // Create ZIP archive
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="playlist.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      throw err;
    });

    archive.on('end', async () => {
      console.log('✓ ZIP streaming complete');
      await cleanupFiles(downloadedFiles);
      await fs.rmdir(playlistDir);
    });

    archive.pipe(res);

    // Add files to archive
    for (const file of downloadedFiles) {
      archive.file(file, { name: path.basename(file) });
    }

    await archive.finalize();

  } catch (error) {
    console.error('[PLAYLIST ERROR]', error.message);

    if (downloadedFiles.length > 0) {
      await cleanupFiles(downloadedFiles);
      try {
        await fs.rmdir(playlistDir);
      } catch (e) {
        console.error('Failed to remove playlist directory:', e.message);
      }
    }

    res.status(500).json({
      error: 'Playlist download failed',
      message: error.message
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Initialize and start server
async function startServer() {
  try {
    console.log('\n🚀 Initializing YouTube Downloader Backend...\n');

    await ensureDownloadsDir();
    await ensureYtDlp();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ Ready to accept requests\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();