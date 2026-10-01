import { describe, it, expect } from 'vitest';
import { executeCommand, executeLine, COMMAND_NAMES } from './terminalCommands';
import { describeBrowser, formatUptime, suggestCommand, sudoReply } from './shellSystem';
import { manPage, MAN_TOPICS } from './shellMan';

const run = (cmd, env = {}, lang = 'en') => executeCommand(cmd, new Date(2026, 5, 1), lang, env);

describe('system commands', () => {
    it('answers who, where and what', () => {
        expect(run('whoami').lines).toEqual(['guest']);
        expect(run('hostname').lines).toEqual(['gokalppo-pc']);
        expect(run('ver').lines[0]).toMatch(/^gokalppoOS \[Version \d/);
        expect(run('uname').lines).toEqual(['GokalpOS']);
        expect(run('uname -a').lines[0]).toMatch(/GokalpOS gokalppo-pc/);
    });

    it('formats the uptime and answers in Turkish', () => {
        expect(run('uptime', { uptimeMs: 3725000 }).lines).toEqual(['System up time: 0 day(s), 1:02:05']);
        expect(formatUptime(90061000, 'tr')).toBe('Sistem çalışma süresi: 1 gün, 1:01:01');
    });

    it('exit asks the desktop to close the Terminal window', () => {
        expect(run('exit').closeIds).toEqual(['terminal']);
    });

    it('sl is a UI animation', () => {
        expect(run('sl')).toEqual({ type: 'train' });
    });

    it('reads the browser and OS from the user agent', () => {
        expect(describeBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'))
            .toEqual({ browser: 'Safari', os: 'macOS' });
        expect(describeBrowser('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36 Edg/120'))
            .toEqual({ browser: 'Edge', os: 'Windows' });
        expect(describeBrowser('')).toEqual({ browser: 'a browser', os: 'an unknown OS' });
    });
});

describe('ping', () => {
    it('plays a believable, stable, clearly simulated reply', () => {
        const first = run('ping gokalppo.me');
        expect(first.stream).toEqual({ delay: 450 });
        expect(first.lines[0]).toMatch(/^Pinging gokalppo\.me \[\d+\.\d+\.\d+\.\d+\] with 32 bytes/);
        expect(first.lines.filter((l) => l.startsWith('Reply from'))).toHaveLength(4);
        expect(first.lines.at(-1)).toMatch(/simulation/);
        expect(run('ping gokalppo.me').lines).toEqual(first.lines);
        expect(run('ping other.example.com').lines[0]).not.toBe(first.lines[0]);
    });

    it('handles localhost, bad hosts and a missing host', () => {
        expect(run('ping localhost').lines[0]).toContain('127.0.0.1');
        expect(run('ping nonsense')).toMatchObject({ error: true });
        expect(run('ping nonsense').lines[0]).toMatch(/could not find host/);
        expect(run('ping')).toMatchObject({ error: true });
        expect(run('ping gokalppo.me', {}, 'tr').lines[0]).toMatch(/ping atılıyor/);
    });
});

describe('fun commands', () => {
    it('fortune picks from the list using the injected random', () => {
        const a = run('fortune', { random: () => 0 }).lines[0];
        const b = run('fortune', { random: () => 0.99 }).lines[0];
        expect(a).not.toBe(b);
        expect(run('fortune', { random: () => 0 }, 'tr').lines[0]).toBe('Bende çalışıyor.');
    });

    it('cowsay draws a bubble around short and long text', () => {
        const short = run('cowsay moo').lines;
        expect(short[1]).toBe('< moo >');
        expect(short.join('\n')).toContain('(oo)');
        const long = run('cowsay this sentence is far too long to fit on a single line of the bubble').lines;
        expect(long[1].startsWith('/')).toBe(true);
        expect(long.some((l) => l.startsWith('\\ '))).toBe(true);
        expect(run('cowsay').lines[1]).toBe('< Moo! >');
    });

    it('fortune | cowsay pipes the saying into the cow', () => {
        const [result] = executeLine('fortune | cowsay', new Date(), 'en', { random: () => 0 });
        expect(result.lines.join('\n')).toContain('It works on my machine.');
    });

    it('weather is a stable, labelled simulation', () => {
        const a = run('weather ankara').lines;
        expect(a[0]).toBe('Weather report: Ankara');
        expect(a.at(-1)).toMatch(/simulated/);
        expect(run('weather ankara').lines).toEqual(a);
        expect(run('weather').lines[0]).toBe('Weather report: Istanbul');
    });

    it('theme lists, sets and rejects', () => {
        expect(run('theme', { theme: 'amber' }).lines[0]).toBe('Current theme: amber');
        expect(run('theme AMBER')).toMatchObject({ theme: 'amber' });
        expect(run('theme neon')).toMatchObject({ error: true });
    });

    it('hack and fakeinstall stream, with progress lines that rewrite themselves', () => {
        for (const cmd of ['hack', 'fakeinstall']) {
            const r = run(cmd);
            expect(r.stream.delay).toBeGreaterThan(0);
            const live = r.lines.filter((l) => typeof l === 'object');
            expect(live).toHaveLength(11);
            expect(live[0].live).toBe('[..........] 0%');
            expect(live.at(-1).live).toBe('[##########] 100%');
        }
    });

    it('streamed output can still be redirected, minus the live lines', () => {
        const r = run('hack > log.txt', { nodes: { root: { id: 'root', type: 'folder', children: [] } }, cwd: 'root', canStore: () => true });
        expect(r.ops[0].content).toContain('Connecting to the mainframe');
        expect(r.ops[0].content).not.toContain('[');
    });
});

describe('sudo', () => {
    it('rejects the first two attempts and finishes on the third', () => {
        expect(sudoReply(1)).toEqual({ lines: ['Sorry, try again.'], done: false });
        expect(sudoReply(2).done).toBe(false);
        const last = sudoReply(3);
        expect(last.done).toBe(true);
        expect(last.lines.join(' ')).toMatch(/root privileges/);
        expect(sudoReply(3, 'tr').lines[1]).toMatch(/root yetkin/);
    });
});

describe('man pages', () => {
    it('has a page for every command, including aliases', () => {
        for (const name of COMMAND_NAMES) {
            const page = manPage(name);
            expect(page.error, `no manual for "${name}"`).toBeUndefined();
        }
        expect(MAN_TOPICS.length).toBeGreaterThan(40);
    });

    it('shows name, usage and an example, and notes aliases', () => {
        const page = manPage('ls').lines.join('\n');
        expect(page).toContain('LS(1)');
        expect(page).toContain('ls [-l] [path]');
        expect(page).toContain('EXAMPLE');
        expect(manPage('dir').lines.join('\n')).toContain('another name for "ls"');
        expect(manPage('ls', 'tr').lines.join('\n')).toContain('KULLANIM');
    });

    it('man and help <command> both open a page; unknown ones say so', () => {
        expect(run('man grep').lines[0]).toBe('GREP(1)');
        expect(run('help grep').lines[0]).toBe('GREP(1)');
        expect(run('man nonsense')).toMatchObject({ error: true });
        expect(run('man')).toMatchObject({ error: true });
        expect(run('help').lines[0]).toBe('Available Commands:');
    });
});

describe('did you mean', () => {
    it('suggests the closest command for a typo', () => {
        expect(run('lss').lines).toEqual(['Command not found: lss', 'Did you mean: ls?']);
        expect(run('neofech').lines[1]).toBe('Did you mean: neofetch?');
        expect(run('lss', {}, 'tr').lines[1]).toBe('Şunu mu demek istedin: ls?');
    });

    it('also knows the installed programs', () => {
        const programs = [{ id: 'minesweeper', title: 'Minesweeper' }];
        expect(run('minesweper', { programs }).lines[1]).toBe('Did you mean: minesweeper?');
    });

    it('stays quiet when nothing is close', () => {
        expect(run('qwertyuiop').lines).toEqual(['Command not found: qwertyuiop']);
        expect(suggestCommand('ls', ['ls'])).toBeNull();
        expect(suggestCommand('', ['ls'])).toBeNull();
    });
});
