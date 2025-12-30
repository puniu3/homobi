/**
 * AudioManager - Handles all game sound effects using Web Audio API
 */
export default class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.enabled = false;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.ctx.destination);
        this.enabled = true;
        const hint = document.getElementById('audio-hint');
        if (hint) hint.style.display = 'none';
    }

    playLaunch() {
        if (!this.enabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        // Add frequency variation (±15%)
        const baseFreqStart = 400 * (0.85 + Math.random() * 0.3);
        const baseFreqEnd = 1200 * (0.85 + Math.random() * 0.3);
        const duration = 0.35 + Math.random() * 0.1;
        osc.frequency.setValueAtTime(baseFreqStart, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreqEnd, this.ctx.currentTime + duration);
        gain.gain.setValueAtTime(0.18 + Math.random() * 0.04, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playExplosion(volume = 0.15) {
        if (!this.enabled) return;
        // Randomize duration slightly
        const dur = 0.7 + Math.random() * 0.2;
        const bufferSize = this.ctx.sampleRate * dur;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(volume * (0.9 + Math.random() * 0.2), this.ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        // Add frequency variation (±20%)
        const filterStart = 1000 * (0.8 + Math.random() * 0.4);
        const filterEnd = 400 * (0.8 + Math.random() * 0.4);
        filter.frequency.setValueAtTime(filterStart, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(filterEnd, this.ctx.currentTime + dur);
        // Randomize Q for different texture
        filter.Q.setValueAtTime(0.5 + Math.random() * 1.5, this.ctx.currentTime);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        const thump = this.ctx.createOscillator();
        const thumpGain = this.ctx.createGain();
        thump.type = 'sine';
        // Add thump frequency variation (±20%)
        const thumpStart = 100 * (0.8 + Math.random() * 0.4);
        const thumpEnd = 40 * (0.8 + Math.random() * 0.4);
        const thumpDur = 0.25 + Math.random() * 0.1;
        thump.frequency.setValueAtTime(thumpStart, this.ctx.currentTime);
        thump.frequency.exponentialRampToValueAtTime(thumpEnd, this.ctx.currentTime + thumpDur);
        thumpGain.gain.setValueAtTime(volume * 2 * (0.9 + Math.random() * 0.2), this.ctx.currentTime);
        thumpGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + thumpDur);
        thump.connect(thumpGain);
        thumpGain.connect(this.masterGain);

        noise.start();
        thump.start();
        thump.stop(this.ctx.currentTime + thumpDur);
    }

    playCityHit() {
        if (!this.enabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        // Randomly choose waveform for variety
        const waveforms = ['sawtooth', 'square', 'sawtooth'];
        osc.type = waveforms[Math.floor(Math.random() * waveforms.length)];
        // Add frequency variation (±20%)
        const freqStart = 150 * (0.8 + Math.random() * 0.4);
        const freqEnd = 40 * (0.8 + Math.random() * 0.4);
        const duration = 0.45 + Math.random() * 0.1;
        osc.frequency.setValueAtTime(freqStart, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);
        gain.gain.setValueAtTime(0.27 + Math.random() * 0.06, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
}
