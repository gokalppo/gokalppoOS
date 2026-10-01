// What Gökalp Bot listens for. Keywords and phrases are written accent-folded (no Turkish letters, no
// punctuation), because the bot folds whatever people type before matching.
//   kw  : single words ("=word" must match exactly; longer words also match with suffixes and small typos)
//   phr : phrases that must appear as whole words (worth more than a keyword)
// Order matters: when two intents score the same, the earlier one wins.
import { DEVICE_GROUPS } from '../../../data/profile';
import { PROJECTS } from '../../../data/projects';
import { normalizeText } from './botNlp';

export const INTENTS = [
    // --- about the bot itself -------------------------------------------------
    { id: 'creator', group: 'chat', phr: ['who made you', 'who built you', 'who created you', 'who wrote you', 'who programmed you', 'who coded you', 'seni kim yapti', 'seni kim yazdi', 'seni kim kodladi', 'kim yapti seni', 'how do you work', 'nasil calisiyorsun', 'are you chatgpt', 'are you gpt', 'are you an llm', 'which model are you', 'who made this', 'who built this', 'who made this site', 'bunu kim yapti', 'siteyi kim yapti', 'chatgpt misin', 'hangi modelsin'] },
    { id: 'whatDoing', group: 'chat', phr: ['what are you doing', 'what are you up to', 'ne yapiyorsun', 'napiyorsun', 'napiyon', 'ne yapiyon'] },
    { id: 'botAge', group: 'chat', phr: ['how old are you', 'kac yasindasin', 'yasin kac', 'kac yasinda sin'] },
    { id: 'whereFrom', group: 'chat', phr: ['where are you from', 'where do you live', 'where are you', 'nerelisin', 'nerede yasiyorsun', 'nerede oturuyorsun'] },
    { id: 'languageAbility', group: 'chat', phr: ['do you speak', 'speak turkish', 'speak english', 'turkce biliyor musun', 'ingilizce biliyor musun', 'turkce konus', 'ingilizce konus', 'can we talk in turkish', 'can we speak turkish', 'can we talk in english', 'hangi dilleri konusuyorsun', 'turkce konusabilir misin', 'ingilizce konusabilir misin'] },
    { id: 'whoAreYou', group: 'chat', phr: ['who are you', 'what are you', 'are you real', 'are you human', 'are you a bot', 'are you a human', 'are you a robot', 'are you an ai', 'are you ai', 'are you a person', 'are you a real person', 'sen kimsin', 'kimsin', 'nesin', 'bot musun', 'robot musun', 'insan misin', 'gercek misin', 'yapay zeka misin', 'ai misin', 'what is your name', 'what s your name', 'whats your name', 'your name', 'adin ne', 'ismin ne', 'adin nedir', 'adini soyler misin', 'who r u', 'about yourself', 'tell me about yourself', 'kendin hakkinda', 'kendini tanit', 'introduce yourself'] },
    { id: 'capabilities', group: 'chat', kw: ['=help', 'yardim', '=menu', '=commands'], phr: ['what can you do', 'can you help', 'how can you help', 'help me', 'yardim eder misin', 'neler yapabilirsin', 'ne yapabilirsin', 'what do you know', 'what do you do', 'ne ise yarasin', 'bana yardim et', 'ne soyleyebilirsin', 'what can i ask'] },

    // --- feelings and small talk ----------------------------------------------
    { id: 'loveYou', group: 'chat', phr: ['i love you', 'seni seviyorum', 'marry me', 'evlen benimle', 'be my friend', 'arkadas olalim', 'be my girlfriend', 'be my boyfriend', 'sevgilim ol'] },
    { id: 'lonely', group: 'chat', kw: ['=bored', '=lonely'], phr: ['i am bored', 'im bored', 'i m bored', 'i am lonely', 'canim sikildi', 'sikildim', 'sikiliyorum', 'im lonely'] },
    { id: 'sad', group: 'chat', kw: ['uzgunum', 'yorgunum'], phr: ['i am sad', 'im sad', 'i m sad', 'im tired', 'i m tired', 'i am tired', 'feel bad', 'kotu hissediyorum', 'moralim bozuk', 'bad day', 'kotu gun'] },
    { id: 'weather', group: 'chat', kw: ['=weather'], phr: ['how is the weather', 'whats the weather', 'what s the weather', 'hava nasil', 'hava durumu'] },
    { id: 'howAreYou', group: 'social', kw: ['nasilsin', 'naber', '=nbr', '=sup'], phr: ['how are you', 'how r u', 'how are u', 'hows it going', 'how s it going', 'what s up', 'whats up', 'ne haber', 'nasil gidiyor', 'iyi misin', 'how do you do', 'how have you been', 'nasil gidiyor hayat'] },
    { id: 'joke', group: 'chat', kw: ['joke', 'jokes', 'fikra', 'espri'], phr: ['tell me a joke', 'make me laugh', 'fikra anlat', 'espri yap', 'guldur beni', 'bir fikra', 'another joke', 'baska fikra', 'one more joke', 'something funny'] },
    { id: 'funFact', group: 'chat', kw: ['trivia', 'ilginc'], phr: ['fun fact', 'tell me something interesting', 'something interesting', 'ilginc bir sey', 'ilginc bilgi', 'surprise me', 'surpriz yap', 'random fact', 'bana bir sey anlat', 'tell me something', 'another fact', 'baska bilgi'] },
    { id: 'time', group: 'chat', phr: ['what time', 'saat kac', 'time is it', 'current time', 'kac saat', 'what is the time', 'whats the time', 'what s the time'] },
    { id: 'date', group: 'chat', phr: ['what day', 'todays date', 'today s date', 'bugun gunlerden', 'bugun ayin kaci', 'tarih ne', 'what is the date', 'hangi gundeyiz', 'what is today', 'bugunun tarihi', 'date today', 'what date'] },
    { id: 'myName', group: 'chat', phr: ['what is my name', 'what s my name', 'whats my name', 'do you know my name', 'adim ne', 'adimi biliyor musun', 'benim adim ne', 'do you remember me', 'beni hatirliyor musun', 'adimi hatirliyor musun', 'who am i'] },
    { id: 'helloWorld', group: 'egg', phr: ['hello world'] },
    { id: 'meaningOfLife', group: 'egg', phr: ['meaning of life', 'hayatin anlami', 'answer to everything', 'answer to life'] },
    { id: 'sudo', group: 'egg', kw: ['=sudo'] },
    { id: 'ping', group: 'egg', kw: ['=ping'] },

    // --- social ---------------------------------------------------------------
    { id: 'thanks', group: 'social', kw: ['thanks', 'thank', '=thx', 'tesekkur', '=sagol', '=eyvallah', '=mersi', '=tsk', '=tskler', '=ty'], phr: ['thank you', 'sag ol', 'cok sagol', 'tesekkur ederim', 'cok tesekkurler'] },
    { id: 'bye', group: 'social', kw: ['=bye', 'byebye', 'gorusuruz', 'hosca', 'cikiyorum', '=cya', '=goodbye'], phr: ['see you', 'hosca kal', 'gule gule', 'good night', 'iyi geceler', 'gorusmek uzere', 'talk later', 'got to go', 'gitmem lazim', 'see ya', 'gorusuruz'] },
    { id: 'greeting', group: 'social', kw: ['=hi', '=hello', '=hey', '=hola', 'selam', '=slm', 'merhaba', '=mrb', 'meraba', '=sa', 'gunaydin', 'tunaydin', '=yo', '=hii', '=heyy'], phr: ['good morning', 'good evening', 'good afternoon', 'iyi aksamlar', 'iyi gunler', 'nice to meet you', 'memnun oldum', 'tanistigimiza sevindim', 'selamun aleykum', 'iyi sabahlar'] },
    { id: 'compliment', group: 'social', kw: ['awesome', 'amazing', 'impressive', 'harika', 'muhtesem', '=super', '=bravo', 'tebrik', '=helal', 'efsane', '=great', '=cool', '=nice', '=wow', '=brilliant', '=perfect', 'mukemmel', '=guzel', 'harikasin', '=sevdim', 'begendim', 'aferin'], phr: ['good job', 'well done', 'nice work', 'great job', 'i like you', 'i love it', 'cok iyi', 'cok guzel', 'eline saglik', 'harika olmus', 'i like this', 'love this'] },
    { id: 'insult', group: 'social', kw: ['stupid', 'idiot', '=dumb', 'useless', '=hate', 'aptal', 'salak', 'gerizekali', 'sacma', 'berbat', 'rezil', '=shut', '=ugly', '=boring', 'sikici'], phr: ['you suck', 'shut up', 'sus lan'] },
    { id: 'laugh', group: 'social', kw: ['haha', 'hehe', '=lol', '=lmao', 'ahaha', '=xd', '=kkk', 'hihi'] },
    { id: 'ack', group: 'social', kw: ['=ok', '=okay', '=okey', 'tamam', '=tmm', 'anladim', '=peki', '=alright', 'anlasildi'], phr: ['got it', 'i see', 'sounds good'] },

    // --- about Gökalp ---------------------------------------------------------
    { id: 'leaveMessage', group: 'content', kw: ['=inbox'], phr: ['leave a message', 'leave message', 'send a message', 'send him a message', 'send message', 'message him', 'message gokalp', 'write to him', 'tell gokalp', 'tell him', 'mesaj birak', 'mesaj gondermek', 'mesaj gonder', 'mesaj iletmek', 'ona mesaj', 'gokalp e mesaj', 'gokalpa mesaj', 'not birak', 'mesajimi ilet', 'mesaj ilet', 'leave him a message', 'pass a message', 'pass on a message', 'ask gokalp', 'gokalp e sor', 'ona sor', 'ona iletebilir misin', 'forward a message', 'get in touch with him', 'ona yazmak istiyorum', 'mesaj yazmak istiyorum', 'i want to write to him', 'i want to message him'] },
    { id: 'resume', group: 'content', kw: ['resume', '=cv', 'ozgecmis', 'curriculum', '=cvsi', '=cvni'], phr: ['download resume', 'cv indir'] },
    { id: 'github', group: 'content', kw: ['github', '=git'], phr: ['git hub'] },
    { id: 'linkedin', group: 'content', kw: ['linkedin'] },
    { id: 'hire', group: 'content', kw: ['hire', 'hiring', 'freelance', 'internship', '=intern', '=staj', 'recruiter', 'recruit', 'musait', '=available', 'availability', 'vacancy', 'opportunity'], phr: ['job offer', 'work with him', 'work with gokalp', 'is he available', 'open to work', 'ise alim', 'is teklifi', 'birlikte calis', 'part time', 'full time', 'looking for a developer', 'looking for an engineer', 'calismak istiyoruz', 'is firsati', 'is arayan'] },
    { id: 'contact', group: 'content', kw: ['contact', 'email', '=mail', 'eposta', 'reach', 'iletisim', 'ulas', 'posta'], phr: ['get in touch', 'how can i reach', 'nasil ulasirim', 'mail adresi', 'e posta', 'email address', 'contact info', 'contact details', 'iletisim bilgisi', 'how do i contact', 'reach him', 'reach gokalp', 'phone number', 'telefon', 'whatsapp', 'call him', 'numarasi'] },
    { id: 'personal', group: 'content', kw: ['hobby', 'hobbies', 'hobi', 'hobiler', '=age', '=salary', 'maas', '=married', 'evli', 'sevgili', 'girlfriend', 'boyfriend', 'religion', 'politics', 'siyaset', '=height', '=weight', 'birthday', 'dogum', '=favorite', '=favourite', 'favori', '=address', 'adres'], phr: ['how old is he', 'kac yasinda', 'yasi kac', 'where does he live', 'where is he based', 'where is he from', 'nerede yasiyor', 'hangi sehir', 'which city', 'nerede oturuyor', 'free time', 'bos zamanlarinda', 'is he single', 'is he married', 'evli mi', 'bekar mi', 'what does he like', 'neleri seviyor', 'en sevdigi', 'what does he do for fun'] },
    { id: 'education', group: 'content', kw: ['university', 'universite', 'okul', '=school', 'bolum', 'department', '=student', 'ogrenci', 'education', 'egitim', 'okuyor', 'mezun', '=degree', 'diploma', '=study', 'studying', '=studies', 'studied'], phr: ['where does he study', 'which university'] },
    { id: 'aboutOwner', group: 'content', phr: ['who is gokalp', 'who is he', 'who is the owner', 'tell me about gokalp', 'about gokalp', 'about him', 'tell me about him', 'gokalp kim', 'gokalp kimdir', 'kimdir', 'gokalp hakkinda', 'gokalp hakkinda bilgi', 'onun hakkinda', 'what does he do', 'ne yapiyor', 'nelerle ilgileniyor', 'what is he into', 'about the owner', 'tell me about the owner', 'who is this gokalp', 'who is he really'] },
    { id: 'skills', group: 'content', kw: ['skill', 'skills', 'tech', 'technolog', 'stack', 'yetenek', 'teknoloji', 'diller', 'uzmanlik', 'expertise', 'languages', 'framework', 'tools'], phr: ['what does he know', 'what can he do', 'neler biliyor', 'ne biliyor', 'what is he good at', 'good at', 'iyi oldugu', 'what does he use', 'neler kullaniyor', 'programming languages', 'programlama dilleri'] },
    { id: 'projects', group: 'content', kw: ['project', 'projects', 'portfolio', 'portfolyo', 'proje', 'projeler', 'projlr', 'galeri', 'gallery', 'showcase'], phr: ['what has he built', 'what did he build', 'what has he made', 'neler yapmis', 'neler yapti', 'what does he make', 'all projects', 'tum projeler', 'his work', 'calismalari', 'isleri', 'islerini', 'his projects', 'show me what he built', 'what have you built', 'neler gelistirmis'] },
    { id: 'site', group: 'content', kw: ['gokalppoos'], phr: ['this site', 'this website', 'this desktop', 'bu site', 'bu masaustu', 'bu web sitesi', 'how was this made', 'how is this built', 'how was this built', 'how was this site', 'what is this site', 'what is this place', 'bu nasil yapildi', 'siteyi nasil', 'bu siteyi'] },
    { id: 'secret', group: 'content', kw: ['secret', 'easter', 'konami', '=sir', 'gizli', 'hidden', '=cheat'], phr: ['easter egg'] }
];

// Words that mean "go on about the project we were just discussing".
export const ASPECTS = {
    demo: { kw: ['demo', 'video', 'canli', 'izle', 'watch'], phr: ['live demo', 'show me a demo'] },
    source: { kw: ['source', 'repo', 'repository', 'kaynak', '=kod', '=code', 'github', '=link', 'sourcecode'], phr: ['source code', 'kaynak kod', 'show code', 'the code'] },
    challenge: { kw: ['hard', 'difficult', 'challenge', 'challenging', 'zor', 'zorluk', 'hardest', 'zorlandi'], phr: ['what was hard', 'en zor', 'neye zorlandi', 'biggest challenge'] },
    learned: { kw: ['learned', 'ogrendi', 'ogrendigi'], phr: ['what did he learn', 'what did you learn', 'neler ogrendi'] },
    tech: { kw: ['tech', 'technologies', 'technology', 'stack', 'teknoloji', 'teknolojiler', '=tool', '=tools', '=arac', 'araclar'], phr: ['built with', 'which tech', 'hangi teknoloji', 'ne ile yapildi', 'what is it built with', 'nasil yapildi', 'how was it built', 'what did he use', 'neyle yapildi'] },
    more: { kw: ['=more', 'detail', 'details', 'detay', 'detaylar', '=daha', 'elaborate', 'ayrinti', 'further', '=explain'], phr: ['tell me more', 'daha fazla', 'daha cok', 'biraz daha', 'more details', 'detaylandir', 'more about it', 'go on', 'devam et', 'anlat bakalim'] }
};
export const ASPECT_ORDER = ['demo', 'source', 'challenge', 'learned', 'tech', 'more'];

export const NAVIGATION = {
    next: { kw: ['next', 'sonraki', '=another', 'baska', 'diger', '=other'], phr: ['next one', 'another one', 'bir sonraki', 'sonraki proje', 'baska proje', 'diger proje', 'other project', 'next project', 'show another', 'one more'] },
    prev: { kw: ['previous', 'onceki'], phr: ['previous one', 'go back', 'bir onceki', 'onceki proje', 'last one', 'previous project'] }
};

// "do you know X?" without naming a known technology.
export const SKILL_QUERY_PHRASES = ['does he know', 'do you know', 'can he', 'is he good at', 'bilir mi', 'biliyor mu', 'tecrubesi var mi', 'deneyimi var mi', 'experience with', 'has he used', 'kullanmis mi', 'hakim mi', 'knows', 'does he use', 'does he work with', 'kullaniyor mu', 'calisiyor mu', 'is he familiar with', 'tanidik mi'];

// Words that point at one specific project.
export const PROJECT_KEYWORDS = {
    'iot-air-quality': ['iot', 'air quality', 'hava kalite', 'esp32', 'dht22', 'mq135', 'mq 135', 'blynk', 'sensor', 'sensor'],
    'totp-token': ['totp', 'token', '2fa', 'two factor', 'authenticator', 'dogrulama'],
    'document-scanner': ['scanner', 'tarayici', 'opencv', 'document', 'belge', 'tarama'],
    'ai-image-detector': ['detector', 'dedektor', 'resnet', 'pytorch', 'ai image', 'yapay zeka', 'cifake'],
    cindranet: ['cindra', 'cindranet', 'p2p', 'x3dh', 'double ratchet', 'kademlia', 'tauri']
};

// What people are into -> projects worth a look.
export const INTERESTS = [
    { kw: ['security', 'secure', 'crypto', 'cryptography', 'encryption', 'privacy', 'guvenlik', 'sifreleme', 'gizlilik', 'kriptografi'], slugs: ['cindranet', 'totp-token'] },
    { kw: ['iot', 'embedded', 'hardware', 'arduino', 'sensor', 'sensors', 'donanim', 'gomulu', 'electronics', 'elektronik'], slugs: ['iot-air-quality', 'totp-token'] },
    { kw: ['ai', 'ml', 'machine', 'learning', 'vision', 'deep', 'yapay', 'makine', 'goruntu', 'image', 'images', 'neural'], slugs: ['ai-image-detector', 'document-scanner'] },
    { kw: ['network', 'networking', 'p2p', 'decentralized', 'merkezi', 'peer', 'messaging', 'mesajlasma'], slugs: ['cindranet'] },
    { kw: ['rust'], slugs: ['cindranet'] },
    { kw: ['python'], slugs: ['ai-image-detector'] },
    { kw: ['cpp', 'opencv'], slugs: ['document-scanner', 'iot-air-quality'] }
];
export const INTEREST_PHRASES = ['i like', 'i love', 'i am into', 'im into', 'i m into', 'im interested', 'i m interested', 'i am interested', 'interested in', 'i enjoy', 'my favorite', 'ilgileniyorum', 'ilgi alanim', 'seviyorum', 'hoslaniyorum', 'merak ediyorum', 'ilgimi cekiyor', 'what should i look at', 'where should i start', 'recommend', 'oner', 'tavsiye', 'which one should', 'hangisine bakmaliyim', 'nereden baslamaliyim', 'i work with', 'i study', 'ilgim var', 'sever misin'];

// "does he know X?" aliases for every skill listed in the portfolio data.
const aliasesFor = (name) => {
    const full = normalizeText(name);
    const parts = name.split(/\s*[+/]\s*/).map(normalizeText).filter(Boolean);
    const aliases = new Set([full, ...parts]);
    [...aliases].forEach((a) => {
        const stripped = a.replace(/\s+\d+$/, '');
        if (stripped) aliases.add(stripped);
        if (a.includes(' ')) aliases.add(a.replace(/ /g, ''));
    });
    // "ssd1306 oled" -> also "ssd1306" and "oled"; "canny edge detection" -> "canny"
    if (full.includes(' ')) full.split(' ').filter((w) => w.length >= 4).forEach((w) => aliases.add(w));
    return [...aliases].filter((a) => a.length >= 2);
};

export const SKILLS = DEVICE_GROUPS.flatMap((group) => group.devices.map((device) => ({
    name: device.name,
    group: group.name,
    usedIn: device.usedIn,
    note: device.note,
    aliases: aliasesFor(device.name)
})));

export const projectTitleFor = (usedInTitle) => PROJECTS.find((p) => p.title === usedInTitle) || null;
