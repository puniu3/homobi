/**
 * Sound System
 * Flushes sound buffer to audio manager
 */

/**
 * Play all buffered sounds
 * @param {Array} soundBuffer - Array of sound events
 * @param {Object} audio - AudioManager instance
 */
export function flushSounds(soundBuffer, audio) {
    for (const sound of soundBuffer) {
        switch (sound.type) {
            case 'launch':
                audio.playLaunch();
                break;
            case 'explosion':
                audio.playExplosion(sound.volume);
                break;
            case 'cityHit':
                audio.playCityHit();
                break;
        }
    }
}
