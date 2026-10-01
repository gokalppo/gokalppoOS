import starfield from '../assets/images/image.webp';
import starfieldThumb from '../assets/wallpapers/starfield-thumb.webp';
import win98 from '../assets/wallpapers/win98.webp';
import win98Thumb from '../assets/wallpapers/win98-thumb.webp';
import bliss from '../assets/wallpapers/bliss.webp';
import blissThumb from '../assets/wallpapers/bliss-thumb.webp';

// `image: null` means a plain desktop colour (taken from the colour scheme).
export const WALLPAPERS = {
    starfield: { image: starfield, thumb: starfieldThumb },
    win98: { image: win98, thumb: win98Thumb },
    bliss: { image: bliss, thumb: blissThumb },
    teal: { image: null, thumb: null }
};
