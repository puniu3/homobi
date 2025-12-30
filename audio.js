export default class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        // 1. Add BGM Master Node
        this.bgmMaster = null; 
        this.enabled = false;
        
        // BGM State
        this.bgmActive = false;
        this.bgmTimeouts = [];
        this.activeNodes = [];
        
        // Effects
        this.bgmDelay = null;

        // E Minor Pentatonic Scale for Night Sky Theme
        this.scale = {
            bass: [41.20, 49.00, 61.74, 73.42], // E1, G1, B1, D2
            pad:  [82.41, 110.00, 146.83, 164.81], // E2, A2, D3, E3
            star: [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98] // High range
        };
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Global Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.ctx.destination);

        // 2. Initialize BGM Master Gain (Set to 70% volume)
        this.bgmMaster = this.ctx.createGain();
        this.bgmMaster.gain.value = 0.3; 
        this.bgmMaster.connect(this.masterGain);

        this.enabled = true;

        // Initialize BGM Effects (Space Delay)
        this.bgmDelay = this.ctx.createDelay();
        this.bgmDelay.delayTime.value = 0.6; // 600ms
        
        const feedback = this.ctx.createGain();
        feedback.gain.value = 0.45;

        // Lowpass on delay to make echoes "distant"
        const delayFilter = this.ctx.createBiquadFilter();
        delayFilter.type = 'lowpass';
        delayFilter.frequency.value = 800;

        // Connect Delay Chain: Delay -> Filter -> Feedback -> Delay
        this.bgmDelay.connect(delayFilter);
        delayFilter.connect(feedback);
        feedback.connect(this.bgmDelay);
        
        // 3. Connect Delay output to BGM Master instead of Global Master
        // delayFilter.connect(this.masterGain); // OLD
        delayFilter.connect(this.bgmMaster); // NEW

        const hint = document.getElementById('audio-hint');
        if (hint) hint.style.display = 'none';

        // Auto-start BGM
        this.startBGM();
    }

    startBGM() {
        if (!this.enabled || this.bgmActive) return;
        this.bgmActive = true;
        
        // Layer 1: The Void (Deep Background)
        this.loopLayer('void', 6000, 10000); 
        
        // Layer 2: Stars (Twinkling high notes)
        this.loopLayer('star', 800, 3000); 
    }

    stopBGM() {
        this.bgmActive = false;
        this.bgmTimeouts.forEach(id => clearTimeout(id));
        this.bgmTimeouts = [];

        // Gentle fade out for active nodes
        this.activeNodes.forEach(node => {
            try {
                if(node.gainParam) {
                    node.gainParam.cancelScheduledValues(this.ctx.currentTime);
                    node.gainParam.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0);
                }
                setTimeout(() => { try { node.source.stop(); } catch(e){} }, 1100);
            } catch(e) {}
        });
        this.activeNodes = [];
    }

    loopLayer(type, minTime, maxTime) {
        if (!this.bgmActive) return;

        const nextTime = Math.random() * (maxTime - minTime) + minTime;
        
        const id = setTimeout(() => {
            if (type === 'void') this.playVoidPad();
            if (type === 'star') this.playStarTwinkle();
            this.loopLayer(type, minTime, maxTime);
        }, nextTime);
        
        this.bgmTimeouts.push(id);
    }

    playVoidPad() {
        if (!this.bgmActive) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        const panner = this.ctx.createStereoPanner();

        // Pick a low frequency
        const freq = this.scale.bass[Math.floor(Math.random() * this.scale.bass.length)];

        osc.type = 'sine';
        osc.frequency.value = freq;

        // Breathing filter effect
        filter.type = 'lowpass';
        filter.frequency.value = 100;
        filter.frequency.linearRampToValueAtTime(200, this.ctx.currentTime + 3);
        filter.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 8);
        
        panner.pan.value = (Math.random() * 1.0) - 0.5;

        // Long envelope
        const now = this.ctx.currentTime;
        const attack = 3.0;
        const sustain = 4.0;
        const release = 4.0;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + attack);
        gain.gain.setValueAtTime(0.2, now + attack + sustain);
        gain.gain.exponentialRampToValueAtTime(0.001, now + attack + sustain + release);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(panner);
        
        // 4. Connect to BGM Master instead of Global Master
        // panner.connect(this.masterGain); // OLD
        panner.connect(this.bgmMaster); // NEW
        
        // Send to delay
        const sendGain = this.ctx.createGain();
        sendGain.gain.value = 0.3;
        gain.connect(sendGain);
        sendGain.connect(this.bgmDelay);

        osc.start(now);
        osc.stop(now + attack + sustain + release + 1);

        this.activeNodes.push({ source: osc, gainParam: gain.gain });
    }

    playStarTwinkle() {
        if (!this.bgmActive) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();

        const freq = this.scale.star[Math.floor(Math.random() * this.scale.star.length)];

        osc.type = 'sine';
        osc.frequency.value = freq;

        panner.pan.value = (Math.random() * 1.8) - 0.9;

        // Bell-like envelope
        const now = this.ctx.currentTime;
        const attack = 0.02;
        const release = 1.0 + Math.random();

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + attack);
        gain.gain.exponentialRampToValueAtTime(0.001, now + attack + release);

        osc.connect(gain);
        gain.connect(panner);
        
        // 5. Connect to BGM Master instead of Global Master
        // panner.connect(this.masterGain); // OLD
        panner.connect(this.bgmMaster); // NEW
        
        panner.connect(this.bgmDelay);

        osc.start(now);
        osc.stop(now + attack + release + 1);
    }

    // ... (Remaining SE functions playLaunch, playExplosion, playCityHit stay unchanged as they use this.masterGain)
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
        gain.connect(this.masterGain); // SE uses master directly
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
        noiseGain.connect(this.masterGain); // SE uses master directly

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
        thumpGain.connect(this.masterGain); // SE uses master directly

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
        gain.connect(this.masterGain); // SE uses master directly
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
}
