// Synthesized Atmospheric Audio Engine using Web Audio API
let audioCtx = null;
let rainNoise = null;
let rainGain = null;
let radarOsc = null;
let isPlaying = false;

export function toggleAtmosphericAudio(enable) {
  if (enable) {
    startAudio();
  } else {
    stopAudio();
  }
  return isPlaying;
}

export function getAudioState() {
  return isPlaying;
}

function startAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Create White Noise buffer for soft rain sound
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    // Rain noise source
    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to simulate soft distant rain & water flow
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.5;

    // Rain volume gain node
    rainGain = audioCtx.createGain();
    rainGain.gain.setValueAtTime(0.04, audioCtx.currentTime); // Very subtle background volume

    whiteNoise.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(audioCtx.destination);
    whiteNoise.start();

    rainNoise = whiteNoise;
    isPlaying = true;
  } catch (err) {
    console.warn('Audio context initialization error:', err);
    isPlaying = false;
  }
}

function stopAudio() {
  if (rainNoise) {
    try {
      rainNoise.stop();
      rainNoise.disconnect();
    } catch (e) {
      // ignore
    }
    rainNoise = null;
  }
  isPlaying = false;
}

export function playRadarPing() {
  if (!isPlaying || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch radar ping
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.16);
  } catch (e) {
    // ignore
  }
}
