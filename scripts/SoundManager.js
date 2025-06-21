class SoundManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGainNode = this.audioContext.createGain();
        this.masterGainNode.connect(this.audioContext.destination);

        this.sounds = {};
        this.soundBuffers = {};
        this.maxSimultaneousSounds = 10;
        this.backgroundMusicId = null;
    }

    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.soundBuffers[name] = audioBuffer;
            console.log(`Sound ${name} loaded successfully`);
        } catch (error) {
            console.error(`Error loading sound ${name}:`, error);
        }
    }

    playSound(name, options = {}) {
        const { volume = 1, loop = false } = options;

        if (!this.soundBuffers[name]) {
            console.warn(`Sound ${name} not loaded`);
            return;
        }

        const activeSounds = Object.values(this.sounds).filter(sound => !sound.ended).length;

        if (activeSounds >= this.maxSimultaneousSounds) {
            console.log(`Max simultaneous sounds (${this.maxSimultaneousSounds}) reached`);
            return;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = this.soundBuffers[name];
        source.loop = loop;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

        source.connect(gainNode);
        gainNode.connect(this.masterGainNode);

        source.start(0);

        const id = Date.now();
        this.sounds[id] = source;

        source.onended = () => {
            delete this.sounds[id];
        };

        return id;
    }

    playBackgroundMusic(name, options = {}) {
        if (this.backgroundMusicId !== null) {
            this.stopSound(this.backgroundMusicId);
        }
        this.backgroundMusicId = this.playSound(name, { ...options, loop: true });
    }

    stopBackgroundMusic() {
        if (this.backgroundMusicId !== null) {
            this.stopSound(this.backgroundMusicId);
            this.backgroundMusicId = null;
        }
    }

    stopSound(id) {
        if (this.sounds[id] && !this.sounds[id].ended) {
            this.sounds[id].stop();
        }
    }

    stopAllSounds() {
        Object.values(this.sounds).forEach(sound => {
            if (!sound.ended) {
                sound.stop();
            }
        });
        this.sounds = {};
        this.backgroundMusicId = null;
    }

    isPlaying(name) {
        return Object.values(this.sounds).some(sound => sound.buffer && sound.buffer === this.soundBuffers[name] && !sound.ended);
    }

    setMasterVolume(volume) {
        this.masterGainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    }

    async loadAllSounds() {
        const soundFiles = {
            backgroundMusic: './sounds/background-music.mp3',
            shoot: './sounds/shoot.mp3',
            enemyHit: './sounds/enemy-hit.mp3',
            playerHit: './sounds/player-hit.mp3',
            gameOver: './sounds/game-over.mp3',
            gameWin: './sounds/game-win.mp3'
        };

        const loadPromises = Object.entries(soundFiles).map(([name, url]) => this.loadSound(name, url));
        await Promise.all(loadPromises);
        console.log('All sounds loaded successfully');
    }
}

console.log('SoundManager.js loaded');