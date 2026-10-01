// Colour schemes for the Terminal (`theme amber`). The background stays black; only the ink changes.
export const THEMES = {
    green: { fg: '#00ff00', dim: '#003300' },
    amber: { fg: '#ffb000', dim: '#3d2a00' },
    white: { fg: '#e6e6e6', dim: '#333333' },
    cyan: { fg: '#00e5ff', dim: '#003640' },
    pink: { fg: '#ff69b4', dim: '#40142b' }
};

export const DEFAULT_THEME = 'green';
export const THEME_NAMES = Object.keys(THEMES);

export const isTheme = (name) => Object.prototype.hasOwnProperty.call(THEMES, name);
