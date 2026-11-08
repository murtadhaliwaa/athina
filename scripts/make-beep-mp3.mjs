import { writeFileSync, mkdirSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/** Generate a short mono WAV beep, then also copy path expected as mp3 fallback via same bytes won't work — write WAV and a tiny valid MP3. */

function writeWav(path, freq = 880, durationSec = 0.22, sampleRate = 22050) {
  const samples = Math.floor(sampleRate * durationSec);
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, i / 200) * Math.min(1, (samples - i) / 600);
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.45 * env;
    buffer.writeInt16LE(Math.max(-32767, Math.min(32767, Math.floor(sample * 32767))), 44 + i * 2);
  }
  writeFileSync(path, buffer);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "public", "sounds");
mkdirSync(dir, { recursive: true });

const wavPath = join(dir, "new-order.wav");
writeWav(wavPath);
// Many browsers accept WAV; hook will prefer wav. Keep mp3 name as copy of wav for existing refs that hardcode .mp3 — HTMLAudioElement can fail. Better update hook.

console.log("WROTE", wavPath, statSync(wavPath).size);
