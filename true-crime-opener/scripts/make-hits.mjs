import { writeFileSync } from "node:fs";

const sampleRate = 44100;
const duration = 25;
const length = sampleRate * duration;
const samples = new Float64Array(length);

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addWhoosh(time, len = 0.26, amp = 0.34) {
  const random = mulberry32(Math.floor(time * 10000) + 17);
  const start = Math.floor(time * sampleRate);
  const end = Math.min(length, start + Math.floor(len * sampleRate));
  let low = 0;
  for (let i = start; i < end; i++) {
    const p = (i - start) / (end - start);
    const env = Math.sin(Math.PI * p) ** 1.2;
    const cutoff = 0.04 + 0.62 * Math.sin(Math.PI * p);
    const noise = random() * 2 - 1;
    low += cutoff * (noise - low);
    samples[i] += low * env * amp;
  }
}

function addHit(time, amp = 0.85) {
  const random = mulberry32(Math.floor(time * 8000) + 3);
  const start = Math.floor(time * sampleRate);
  const span = Math.floor(0.48 * sampleRate);
  let phase = 0;
  for (let i = 0; i < span && start + i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 7.5);
    const click = Math.exp(-t * 90);
    const freq = 190 * Math.exp(-t * 6.5) + 36;
    phase += freq / sampleRate;
    const body =
      Math.sin(2 * Math.PI * phase) + 0.55 * Math.sin(2 * Math.PI * phase * 0.5);
    const noise = random() * 2 - 1;
    samples[start + i] += (body * 0.62 * env + noise * 0.45 * click) * amp;
  }
}

function addRiser(time, len, amp) {
  const random = mulberry32(99);
  const start = Math.floor(time * sampleRate);
  const end = Math.min(length, start + Math.floor(len * sampleRate));
  let low = 0;
  let phase = 0;
  for (let i = start; i < end; i++) {
    const p = (i - start) / (end - start);
    const noise = random() * 2 - 1;
    const cutoff = 0.03 + p * p * 0.7;
    low += cutoff * (noise - low);
    phase += (80 + p * 240) / sampleRate;
    samples[i] += (low * 0.7 + Math.sin(2 * Math.PI * phase) * 0.25) * amp * p;
  }
}

addWhoosh(0.01, 0.22, 0.3);
addWhoosh(1.2, 0.22, 0.3);
addWhoosh(2.28, 0.16, 0.22);
addHit(2.4, 0.95);
addHit(4.0, 0.72);
addHit(220 / 30, 0.74);
addHit(320 / 30, 0.78);
addWhoosh(420 / 30, 0.32, 0.36);
addHit(420 / 30, 0.45);
addWhoosh(510 / 30, 0.42, 0.28);
addRiser(21.15, 0.85, 0.33);
addHit(22.0, 1);

const tone = mulberry32(440);
let bed = 0;
for (let i = 0; i < length; i++) {
  const n = tone() * 2 - 1;
  bed += 0.03 * (n - bed);
  const fadeIn = Math.min(1, i / (sampleRate * 0.15));
  const fadeOut = Math.min(1, (length - i) / (sampleRate * 0.3));
  samples[i] += bed * 0.018 * fadeIn * fadeOut;
}

let peak = 0;
for (let i = 0; i < length; i++) {
  peak = Math.max(peak, Math.abs(samples[i]));
}
const gain = peak > 0 ? 0.86 / peak : 1;
for (let i = 0; i < length; i++) {
  samples[i] *= gain;
}

const dataSize = length * 2;
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
for (let i = 0; i < length; i++) {
  const clamped = Math.max(-1, Math.min(1, samples[i]));
  buffer.writeInt16LE((clamped * 32767) | 0, 44 + i * 2);
}
writeFileSync(new URL("../public/hits.wav", import.meta.url), buffer);
console.log(`wrote hits.wav peak ${peak.toFixed(3)} bytes ${buffer.length}`);
