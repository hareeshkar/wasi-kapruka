/**
 * src/lib/audio-converter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Scalable Audio Format Converter for Gemini API
 *
 * Converts browser-recorded audio (WebM/Opus, MP4/AAC) to WAV format
 * that Gemini 3.1 Flash-Lite natively supports.
 *
 * Architecture:
 *   - Uses child_process.spawn with stdin/stdout piping (no temp files)
 *   - Concurrency limited via semaphore to prevent resource exhaustion
 *   - 30s timeout per conversion to prevent hung processes
 *   - Native ffmpeg binary — fastest possible performance (25x faster than WASM)
 *
 * Supported input:  WebM/Opus, MP4/AAC, OGG/Opus, any ffmpeg-supported format
 * Supported output: WAV (16-bit PCM, 16kHz, mono) — optimal for Gemini speech
 *
 * Dependencies: ffmpeg binary must be installed on the system
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { spawn } from 'node:child_process';

// ── Concurrency limiter ────────────────────────────────────────────────────
// Prevents spawning too many ffmpeg processes simultaneously.
// Each ffmpeg process uses ~10-30MB RAM. 20 concurrent = ~600MB max.
const MAX_CONCURRENT = 20;
let activeCount = 0;
const queue: Array<() => void> = [];

function acquire(): Promise<void> {
  if (activeCount < MAX_CONCURRENT) {
    activeCount++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    queue.push(() => {
      activeCount++;
      resolve();
    });
  });
}

function release() {
  activeCount--;
  if (queue.length > 0) {
    const next = queue.shift()!;
    next();
  }
}

// ── Conversion options ─────────────────────────────────────────────────────
export interface ConvertOptions {
  /** Output sample rate in Hz. Default: 16000 (optimal for Gemini speech) */
  sampleRate?: number;
  /** Output channels. Default: 1 (mono, sufficient for voice) */
  channels?: number;
  /** Timeout in ms. Default: 30000 (30s) */
  timeout?: number;
}

// ── MIME type detection ────────────────────────────────────────────────────
const WEBM_MIMES = new Set(['audio/webm', 'audio/webm;codecs=opus']);
const MP4_MIMES = new Set(['audio/mp4', 'audio/m4a', 'audio/mp4;codecs=mp4a.40.2']);
const OGG_MIMES = new Set(['audio/ogg', 'audio/ogg;codecs=opus']);
const WAV_MIMES = new Set(['audio/wav', 'audio/wave']);
const MP3_MIMES = new Set(['audio/mpeg', 'audio/mp3']);

function isWav(mimeType: string): boolean {
  return WAV_MIMES.has(mimeType.toLowerCase());
}

/**
 * Convert audio buffer to WAV format (16-bit PCM, 16kHz, mono) for Gemini API.
 *
 * Uses stdin/stdout piping — no temp files on disk.
 * Concurrency limited to 20 simultaneous ffmpeg processes.
 *
 * @param inputBuffer - Raw audio bytes (WebM, MP4, OGG, etc.)
 * @param mimeType - MIME type of the input audio
 * @param options - Conversion options
 * @returns WAV buffer (16-bit PCM, 16kHz, mono)
 *
 * @example
 * ```ts
 * const wav = await convertToWav(webmBuffer, 'audio/webm;codecs=opus');
 * // Send wav as base64 to Gemini API
 * ```
 */
export async function convertToWav(
  inputBuffer: Buffer,
  mimeType: string,
  options: ConvertOptions = {},
): Promise<Buffer> {
  // If already WAV, return as-is (no conversion needed)
  if (isWav(mimeType)) {
    return inputBuffer;
  }

  const {
    sampleRate = 16000,
    channels = 1,
    timeout = 30000,
  } = options;

  // Acquire concurrency slot
  await acquire();

  try {
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let killed = false;

      const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',            // Input from stdin
        '-f', 'wav',               // Output format: WAV
        '-acodec', 'pcm_s16le',    // 16-bit signed little-endian PCM
        '-ar', String(sampleRate), // Sample rate: 16kHz
        '-ac', String(channels),   // Channels: mono
        '-y',                      // Overwrite output
        'pipe:1',                  // Output to stdout
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        // Prevent ffmpeg from inheriting parent's environment issues
        env: { ...process.env, LC_ALL: 'C' },
      });

      // Safety timeout — kill if conversion hangs
      const timer = setTimeout(() => {
        killed = true;
        ffmpeg.kill('SIGKILL');
        reject(new Error(`ffmpeg conversion timed out after ${timeout}ms`));
      }, timeout);

      // Collect output data
      ffmpeg.stdout.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      // Discard ffmpeg verbose logs (stderr)
      ffmpeg.stderr.on('data', () => {});

      // Handle completion
      ffmpeg.on('close', (code) => {
        clearTimeout(timer);
        if (killed) return;
        if (code === 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`ffmpeg exited with code ${code}`));
        }
      });

      // Handle spawn errors (ffmpeg not found, etc.)
      ffmpeg.on('error', (err) => {
        clearTimeout(timer);
        reject(new Error(`ffmpeg spawn error: ${err.message}`));
      });

      // Feed input and close stdin
      ffmpeg.stdin.on('error', () => {}); // Ignore EPIPE on broken pipe
      ffmpeg.stdin.write(inputBuffer);
      ffmpeg.stdin.end();
    });
  } finally {
    // Always release concurrency slot
    release();
  }
}

/**
 * Check if the system has ffmpeg installed and accessible.
 * Useful for startup health checks.
 */
export async function checkFfmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    proc.on('close', (code) => {
      resolve(code === 0);
    });
    proc.on('error', () => {
      resolve(false);
    });
  });
}
