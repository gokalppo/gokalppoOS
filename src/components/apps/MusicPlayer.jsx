import React, { useState, useRef, useEffect } from 'react';
import { useOS } from '../../context/OSContext';
import './MusicPlayer.css';
import demoTrack1 from '../../assets/isimolmaz.mp3';
import demoTrack2 from '../../assets/ikiyabanci.mp3';
import demoTrack3 from '../../assets/Metallica - Master of Puppets.mp3';
import demoTrack4 from '../../assets/Corona - The Rhythm of the Night.mp3';
import demoTrack5 from '../../assets/Alice Deejay - Better Off Alone.mp3';
import demoTrack6 from '../../assets/Another One Bites the Dust.mp3';
import demoTrack7 from '../../assets/Cakkıdı.mp3';
import demoTrack8 from '../../assets/BombaBomba.com.mp3';

const MusicPlayer = () => {
    const { volume: globalVolume } = useOS(); // Use Audio Driver
    // Static Playlist per user request
    const [playlist] = useState([
        { title: '1. İsim Olmaz', src: demoTrack1 },
        { title: '2. İki Yabancı', src: demoTrack2 },
        { title: '3. Master of Puppets', src: demoTrack3 },
        { title: '4. The Rhythm of the Night', src: demoTrack4 },
        { title: '5. Better Off Alone', src: demoTrack5 },
        { title: '6. Another One Bites the Dust', src: demoTrack6 },
        { title: '7. Cakkıdı', src: demoTrack7 },
        { title: '8. BombaBomba.com', src: demoTrack8 },
    ]);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [volume, setVolume] = useState(50); // Local slider state (0-100)
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const audioRef = useRef(null);

    // Sync audio volume with global volume * local volume
    useEffect(() => {
        if (audioRef.current) {
            // Formula: Element Volume = (Local % / 100) * Global Volume (0-1)
            audioRef.current.volume = (volume / 100) * globalVolume;
        }
    }, [globalVolume, volume]);

    // Handle track change
    const playTrack = (index) => {
        if (playlist.length === 0) return;

        let newIndex = index;
        if (newIndex < 0) newIndex = playlist.length - 1;
        if (newIndex >= playlist.length) newIndex = 0;

        setCurrentTrackIndex(newIndex);
        setIsPlaying(true);

        // Broadcast Track Info
        window.dispatchEvent(new CustomEvent('music-update', {
            detail: { track: playlist[newIndex].title }
        }));

        setTimeout(() => {
            if (audioRef.current) {
                audioRef.current.play().catch(e => console.error(e));
            }
        }, 50);
    };

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().catch(e => console.error("Playback failed", e));
            setIsPlaying(true);
        }
    };

    const stopPlay = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
        }
    };

    const formatTime = (time) => {
        if (!time || isNaN(time)) return "0:00";
        // Duration might be Infinity during load
        if (!isFinite(time)) return "0:00";

        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div className="music-player-container">
            <audio
                ref={audioRef}
                src={playlist[currentTrackIndex].src}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => playTrack(currentTrackIndex + 1)}
            />

            {/* Screen */}
            <div className="mp-screen">
                <div className="mp-info">
                    {(isPlaying ? "▶ " : "‖</ ") + playlist[currentTrackIndex].title}
                </div>
                <div className="mp-info" style={{ textAlign: 'right' }}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                {/* Visualizer */}
                <div className="mp-visualizer">
                    {[...Array(10)].map((_, i) => (
                        <div
                            key={i}
                            className={`mp-bar ${isPlaying ? 'animating' : ''}`}
                            style={{
                                animationDuration: `${0.3 + Math.random() * 0.4}s`
                            }}
                        ></div>
                    ))}
                </div>
            </div>

            {/* Scale / Slider Row (Retro Style) */}
            <div className="mp-volume-row">
                <span className="mp-label">Volume:</span>
                <span className="mp-label-small">Low</span>
                <div className="mp-slider-container">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => setVolume(e.target.value)}
                        className="win98-slider"
                    />
                </div>
                <span className="mp-label-small">High</span>
            </div>

            {/* Controls */}
            <div className="mp-controls-row">
                <div className="mp-btn-group">
                    <button className="mp-btn" title="Previous" onClick={() => playTrack(currentTrackIndex - 1)}>⏮</button>
                    <button className="mp-btn" title="Play/Pause" onClick={togglePlay}>
                        {isPlaying ? '⏸' : '▶'}
                    </button>
                    <button className="mp-btn" title="Stop" onClick={stopPlay}>⏹</button>
                    <button className="mp-btn" title="Next" onClick={() => playTrack(currentTrackIndex + 1)}>⏭</button>
                </div>
            </div>

            {/* Playlist */}
            <div className="mp-playlist">
                {playlist.map((track, i) => (
                    <div
                        key={i}
                        className={`mp-track ${currentTrackIndex === i ? 'active' : ''}`}
                        onClick={() => playTrack(i)}
                    >
                        {track.title}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MusicPlayer;
