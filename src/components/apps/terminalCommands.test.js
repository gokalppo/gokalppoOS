import { describe, it, expect } from 'vitest';
import {
    parseCommand,
    executeCommand,
    appsLines,
    HELP_LINES,
    GITHUB_URL,
    LINKEDIN_URL,
    RESUME_URL
} from './terminalCommands';

describe('parseCommand', () => {
    it('trims and lowercases the input', () => {
        expect(parseCommand('  HeLp  ').name).toBe('help');
    });

    it('splits the command name from its arguments', () => {
        const { name, args } = parseCommand('ls   -la  docs');
        expect(name).toBe('ls');
        expect(args).toEqual(['-la', 'docs']);
    });

    it('returns an empty name for blank or nullish input', () => {
        expect(parseCommand('   ').name).toBe('');
        expect(parseCommand(undefined).name).toBe('');
    });
});

describe('executeCommand', () => {
    it('treats blank input as a no-op', () => {
        expect(executeCommand('')).toEqual({ type: 'empty' });
        expect(executeCommand('    ')).toEqual({ type: 'empty' });
    });

    it('is case-insensitive', () => {
        expect(executeCommand('HELP')).toEqual(executeCommand('help'));
    });

    it('reports unknown commands, echoing the normalized input', () => {
        expect(executeCommand('Foo')).toMatchObject({ type: 'text', lines: ['Command not found: foo'] });
    });

    it('refuses anything starting with sudo', () => {
        const result = executeCommand('sudo rm -rf /');
        expect(result.type).toBe('text');
        expect(result.lines[0]).toMatch(/root privileges/);
    });

    it('every command listed by help is actually implemented', () => {
        const listed = HELP_LINES.filter((line) => line.startsWith('  ')).map((line) => line.trim().split(/\s+/)[0]);
        expect(listed.length).toBeGreaterThan(0);
        for (const name of listed) {
            const result = executeCommand(name, new Date(), 'en', { programs: [{ id: 'notepad', title: 'Notepad' }, { id: 'paint', title: 'Paint' }] });
            const isMissing = result.type === 'text' && !!result.lines[0]?.startsWith('Command not found');
            expect(isMissing, `"${name}" is in help but not implemented`).toBe(false);
        }
    });

    it('opens the real profile and resume URLs', () => {
        expect(executeCommand('github')).toMatchObject({ type: 'open', url: GITHUB_URL });
        expect(executeCommand('linkedin')).toMatchObject({ type: 'open', url: LINKEDIN_URL });
        expect(executeCommand('resume')).toMatchObject({ type: 'open', url: RESUME_URL });
    });

    it('treats cv as an alias of resume', () => {
        expect(executeCommand('cv')).toEqual(executeCommand('resume'));
    });

    it('returns UI-level descriptors for commands that need component state', () => {
        expect(executeCommand('clear')).toEqual({ type: 'clear' });
        expect(executeCommand('matrix')).toEqual({ type: 'matrix' });
        expect(executeCommand('neofetch')).toEqual({ type: 'neofetch' });
        expect(executeCommand('ece')).toEqual({ type: 'heart' });
        expect(executeCommand('crash')).toEqual({ type: 'crash' });
    });

    it('formats the date from the injected clock', () => {
        const now = new Date(2024, 0, 15, 9, 30, 0);
        expect(executeCommand('date', now).lines).toEqual([now.toLocaleString('en')]);
    });

    it('keeps the AI detector accuracy consistent with the Gallery (97.2%)', () => {
        const projects = executeCommand('projects').lines.join('\n');
        expect(projects).toContain('97.2%');
        expect(projects).not.toContain('99.97');
    });

    it('prints the contact email', () => {
        expect(executeCommand('contact').lines.join('\n')).toContain('ekergokalp@gmail.com');
    });

    it('answers in Turkish when asked to', () => {
        expect(executeCommand('Foo', new Date(), 'tr').lines[0]).toBe('Komut bulunamadı: foo');
        expect(executeCommand('help', new Date(), 'tr').lines[0]).toMatch(/Komutlar/);
        expect(executeCommand('projects', new Date(), 'tr').lines.join('\n')).toContain('97,2');
        expect(executeCommand('about', new Date(), 'tr').lines.join('\n')).toMatch(/geliştirici/);
    });

    it('builds the project list from the shared project data', () => {
        const lines = executeCommand('projects').lines.join('\n');
        for (const title of ['IoT Smart Air Quality', 'Hardware TOTP Token', 'Document Scanner', 'AI Image Detector', 'CindraNet']) {
            expect(lines).toContain(title);
        }
    });
});

describe('apps', () => {
    const programs = [
        { id: 'mycomputer', title: 'My Computer' },
        { id: 'internetexplorer', title: 'Internet Explorer' },
        { id: 'solitaire', title: 'Solitaire' }
    ];

    it('lists the programs it is given, not a hard-coded copy', () => {
        const { lines } = executeCommand('apps', new Date(), 'en', { programs });
        expect(lines).toEqual([
            'Installed programs:',
            '  My Computer',
            '  InternetExplorer.exe',
            '  Solitaire.exe'
        ]);
    });

    it('prints just the heading when no programs are known yet', () => {
        expect(appsLines()).toEqual(['Installed programs:']);
    });
});
