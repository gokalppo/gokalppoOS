import { describe, it, expect } from 'vitest';
import { utilityReply } from './botUtilities';

const ask = (text, lang = 'en', random = () => 0) => utilityReply(text, lang, random);

describe('sums', () => {
    it('does arithmetic written with symbols or words, in both languages', () => {
        expect(ask('2+2').text).toContain('= 4');
        expect(ask('what is 12 times 7?').text).toContain('84');
        expect(ask('15 * (3 + 2)').text).toContain('75');
        expect(ask('2 + 2 kaç eder', 'tr').text).toContain('= 4');
        expect(ask('10 bölü 4', 'tr').text).toContain('2.5');
        expect(ask('5 çarpı 6', 'tr').text).toContain('30');
        expect(ask('2^10').text).toContain('1024');
        expect(ask('7,5 x 2', 'tr').text).toContain('15');
        expect(ask('-3 + 10').text).toContain('7');
        expect(ask('17 % 5').text).toContain('2');
        expect(ask('1/3').text).toContain('0.333333');
    });

    it('jokes about dividing by zero and huge numbers instead of breaking', () => {
        expect(ask('5/0').text).toMatch(/zero/);
        expect(ask('5/0', 'tr').text).toMatch(/Sıfıra/);
        expect(ask('99999999999^99').text).toMatch(/too big/);
    });

    it('ignores sentences that merely contain numbers, and broken or unsafe input', () => {
        expect(ask('I have 2 cats')).toBeNull();
        expect(ask('call me at 5 pm')).toBeNull();
        expect(ask('2 +')).toBeNull();
        expect(ask('((2+3)')).toBeNull();
        expect(ask('alert(1)+2')).toBeNull();
        expect(ask('2'.repeat(100) + '+1')).toBeNull();
        expect(ask('')).toBeNull();
    });
});

describe('coin, dice and numbers', () => {
    it('flips a coin both ways', () => {
        expect(ask('flip a coin', 'en', () => 0.1).text).toMatch(/heads/i);
        expect(ask('flip a coin', 'en', () => 0.9).text).toMatch(/tails/i);
        expect(ask('yazı mı tura mı', 'tr', () => 0.1).text).toMatch(/yazı/i);
        expect(ask('yazı tura at', 'tr', () => 0.9).text).toMatch(/tura/i);
    });

    it('rolls dice, with custom sides', () => {
        expect(ask('roll a dice', 'en', () => 0.99).text).toContain('6');
        expect(ask('zar at', 'tr', () => 0).text).toContain('1');
        expect(ask('roll a d20', 'en', () => 0.99).text).toContain('20');
        expect(ask('dice', 'en', () => 0.5).text).toMatch(/[1-6]/);
    });

    it('picks a random number, in a range when asked', () => {
        const r = ask('pick a number between 10 and 20', 'en', () => 0).text;
        expect(r).toContain('10');
        expect(ask('1 ile 5 arasında rastgele sayı', 'tr', () => 0.99).text).toContain('5');
        expect(ask('random number').text).toMatch(/\d/);
    });

    it('does not roll dice for sentences that merely contain the word', () => {
        expect(ask('I am playing a long board game with my dice and friends tonight')).toBeNull();
    });
});

describe('pick one for me', () => {
    it('chooses between two or three options', () => {
        expect(ask('pizza mı burger mı', 'tr', () => 0).text).toMatch(/pizza/);
        expect(ask('pizza mı burger mı', 'tr', () => 0.99).text).toMatch(/burger/);
        expect(ask('should I learn Python or Rust?', 'en', () => 0.99).text).toMatch(/Rust/);
        expect(ask('cats or dogs?', 'en', () => 0).text).toMatch(/cats/);
        expect(ask('tea, coffee or juice?', 'en', () => 0.99).text).toMatch(/juice/);
    });

    it('ignores long sentences and identical options', () => {
        expect(ask('I went to the market and bought a lot of apples or maybe pears yesterday')).toBeNull();
        expect(ask('tea or tea?')).toBeNull();
        expect(ask('hello there')).toBeNull();
    });
});
