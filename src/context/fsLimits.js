// The virtual disk lives in localStorage, which browsers cap at roughly 5 MB shared by the
// whole site. Stay well under it so saving a picture can never silently fail.
export const STORAGE_LIMIT_CHARS = 3500000;
