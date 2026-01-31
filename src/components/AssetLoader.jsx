import { useEffect } from 'react';

// IMAGES
import wallpaper from '../assets/images/image.png';
import startBtn from '../assets/images/windows.png';
import winIcon from '../assets/images/4.png';
import documentsIcon from '../assets/images/documents.png';
import findIcon from '../assets/images/find.png';
import helpIcon from '../assets/images/help.png';
import adminIcon from '../assets/images/admin.png';
import binEmpty from '../assets/images/Bin_Empty95.svg';
import pcIcon from '../assets/images/This_PC_1995.svg';

// SOUNDS
import startupSound from '../assets/windows98startup.mp3';
import shutdownSound from '../assets/windows98shutdown.mp3';
import nudgeSound from '../assets/nudge.mp3';
// Note: We don't preload ALL tracks (heavy), just UI sounds.

const preloadImages = [
    wallpaper,
    startBtn,
    winIcon,
    documentsIcon,
    findIcon,
    helpIcon,
    adminIcon,
    binEmpty,
    pcIcon
];

const preloadAudio = [
    startupSound,
    shutdownSound,
    nudgeSound
];

const AssetLoader = () => {
    useEffect(() => {
        // Preload Images
        preloadImages.forEach((src) => {
            const img = new Image();
            img.src = src;
        });

        // Preload Audio
        preloadAudio.forEach((src) => {
            const audio = new Audio();
            audio.src = src;
            audio.load(); // Forces browser to buffer metadata/start loading
        });

        // console.log("Assets preloading initiated...");
    }, []);

    return null; // Invisible component
};

export default AssetLoader;
