import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveRunCommand, normalizeRunInput } from './runCommand';
import { queueTerminalCommand, subscribeTerminal, _resetTerminalBus } from './apps/terminalBus';

const IDS = ['computer', 'recycle', 'notepad', 'resume', 'terminal', 'gallery', 'contact', 'minesweeper',
    'musicplayer', 'paint', 'internetexplorer', 'guestbook', 'solitaire', 'messenger', 'displayproperties', 'systemproperties'];

describe('normalizeRunInput', () => {
    it('trims, lowercases and drops .exe-style extensions', () => {
        expect(normalizeRunInput('  Paint.EXE ')).toBe('paint');
        expect(normalizeRunInput('desk.cpl')).toBe('desk.cpl');
        expect(normalizeRunInput(undefined)).toBe('');
    });
});

describe('resolveRunCommand', () => {
    it('ignores empty input', () => {
        expect(resolveRunCommand('   ', IDS)).toEqual({ type: 'empty' });
    });

    it('opens programs by id, with or without .exe and spacing', () => {
        expect(resolveRunCommand('paint', IDS)).toEqual({ type: 'program', id: 'paint' });
        expect(resolveRunCommand('Paint.exe', IDS)).toEqual({ type: 'program', id: 'paint' });
        expect(resolveRunCommand('Internet Explorer', IDS)).toEqual({ type: 'program', id: 'internetexplorer' });
        expect(resolveRunCommand('music player', IDS)).toEqual({ type: 'program', id: 'musicplayer' });
    });

    it('understands classic Windows names', () => {
        expect(resolveRunCommand('cmd', IDS)).toEqual({ type: 'program', id: 'terminal' });
        expect(resolveRunCommand('iexplore.exe', IDS)).toEqual({ type: 'program', id: 'internetexplorer' });
        expect(resolveRunCommand('winmine', IDS)).toEqual({ type: 'program', id: 'minesweeper' });
        expect(resolveRunCommand('sol.exe', IDS)).toEqual({ type: 'program', id: 'solitaire' });
        expect(resolveRunCommand('desk.cpl', IDS)).toEqual({ type: 'program', id: 'displayproperties' });
        expect(resolveRunCommand('sysdm.cpl', IDS)).toEqual({ type: 'program', id: 'systemproperties' });
    });

    it('opens web addresses in a new tab', () => {
        expect(resolveRunCommand('https://github.com/gokalppo', IDS)).toEqual({ type: 'url', url: 'https://github.com/gokalppo' });
    });

    it('never treats javascript:/other schemes as URLs', () => {
        expect(resolveRunCommand('javascript:alert(1)', IDS).type).toBe('terminal');
    });

    it('hands everything else to the Terminal', () => {
        expect(resolveRunCommand('neofetch', IDS)).toEqual({ type: 'terminal', command: 'neofetch' });
        expect(resolveRunCommand('  help ', IDS)).toEqual({ type: 'terminal', command: 'help' });
    });

    it('does not open a program that does not exist in this build', () => {
        expect(resolveRunCommand('solitaire', ['paint'])).toEqual({ type: 'terminal', command: 'solitaire' });
    });
});

describe('terminal bus', () => {
    beforeEach(() => _resetTerminalBus());

    it('delivers commands straight to a subscribed terminal', () => {
        const listener = vi.fn();
        subscribeTerminal(listener);
        queueTerminalCommand('help');
        expect(listener).toHaveBeenCalledWith('help');
    });

    it('holds commands until the terminal mounts, then delivers them in order once', () => {
        queueTerminalCommand('help');
        queueTerminalCommand('date');
        const listener = vi.fn();
        subscribeTerminal(listener);
        expect(listener.mock.calls.map((c) => c[0])).toEqual(['help', 'date']);

        const second = vi.fn();
        subscribeTerminal(second);
        expect(second).not.toHaveBeenCalled();
    });

    it('stops delivering after unsubscribe', () => {
        const listener = vi.fn();
        const unsubscribe = subscribeTerminal(listener);
        unsubscribe();
        queueTerminalCommand('help');
        expect(listener).not.toHaveBeenCalled();
    });
});
