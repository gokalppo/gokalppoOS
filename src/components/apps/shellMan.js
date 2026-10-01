// Manual pages for `man <command>` and `help <command>`. Pure data + a small formatter.
const PAGES = {
    help: { usage: 'help [command]', en: 'Show every command, or the manual page of one.', tr: 'Tüm komutları ya da birinin kılavuzunu göster.', example: 'help ls' },
    man: { usage: 'man <command>', en: 'Show the manual page of a command.', tr: 'Bir komutun kılavuz sayfasını göster.', example: 'man grep' },
    about: { usage: 'about', en: 'Who made this?', tr: 'Bunu kim yaptı?', example: 'about' },
    clear: { usage: 'clear', en: 'Clear the screen (Ctrl+L does the same).', tr: 'Ekranı temizle (Ctrl+L de aynısını yapar).', example: 'clear' },
    date: { usage: 'date', en: 'Show the current date and time.', tr: 'Şu anki tarih ve saati göster.', example: 'date' },
    echo: { usage: 'echo <text>', en: 'Print text. With > or >> it writes the text into a file.', tr: 'Metni yazdırır. > veya >> ile dosyaya yazar.', example: 'echo hello > hi.txt' },
    history: { usage: 'history', en: 'List the commands you typed (Up/Down recalls them).', tr: 'Yazdığın komutları listele (Yukarı/Aşağı ile geri çağırırsın).', example: 'history | tail -n 5' },
    matrix: { usage: 'matrix', en: 'Toggle the falling-code effect (Ctrl+C stops it).', tr: 'Yağan kod efektini aç/kapat (Ctrl+C durdurur).', example: 'matrix' },
    neofetch: { usage: 'neofetch', en: 'Show system information about this very desktop.', tr: 'Bu masaüstü hakkında sistem bilgisi göster.', example: 'neofetch' },
    github: { usage: 'github', en: 'Open my GitHub profile in a new tab.', tr: 'GitHub profilimi yeni sekmede aç.', example: 'github' },
    linkedin: { usage: 'linkedin', en: 'Open my LinkedIn profile in a new tab.', tr: 'LinkedIn profilimi yeni sekmede aç.', example: 'linkedin' },
    projects: { usage: 'projects', en: 'List my projects.', tr: 'Projelerimi listele.', example: 'projects | grep -i air' },
    contact: { usage: 'contact', en: 'Show how to reach me.', tr: 'Bana nasıl ulaşacağını göster.', example: 'contact' },
    resume: { usage: 'resume', en: 'Open my resume (PDF).', tr: 'Özgeçmişimi (PDF) aç.', example: 'resume' },
    ls: { usage: 'ls [-l] [path]', en: 'List a folder. -l adds sizes and dates. Folders end with a backslash.', tr: 'Klasörün içini listele. -l boyut ve tarih ekler. Klasörler ters eğik çizgiyle biter.', example: 'ls -l "My Documents"' },
    pwd: { usage: 'pwd', en: 'Print the current folder.', tr: 'Bulunduğun klasörü yazdır.', example: 'pwd' },
    cd: { usage: 'cd [path]', en: 'Change folder. ".." goes up, "~" is My Documents, no argument goes home.', tr: 'Klasör değiştir. ".." yukarı çıkar, "~" My Documents, argümansız ev klasörüne gider.', example: 'cd "My Documents"' },
    tree: { usage: 'tree [path]', en: 'Draw a folder and everything in it as a tree.', tr: 'Bir klasörü ve içindekileri ağaç olarak çiz.', example: 'tree' },
    cat: { usage: 'cat <file>...', en: 'Print the text inside files.', tr: 'Dosyaların içindeki metni yazdır.', example: 'cat Welcome.txt' },
    mkdir: { usage: 'mkdir <name>...', en: 'Create folders.', tr: 'Klasör oluştur.', example: 'mkdir projects' },
    touch: { usage: 'touch <name>...', en: 'Create empty text files (".txt" is added if you give no extension).', tr: 'Boş metin dosyası oluştur (uzantı vermezsen ".txt" eklenir).', example: 'touch notes' },
    cp: { usage: 'cp <file> <target>', en: 'Copy a file to a new name or into a folder.', tr: 'Dosyayı yeni bir adla ya da klasöre kopyala.', example: 'cp a.txt backup.txt' },
    mv: { usage: 'mv <source>... <target>', en: 'Move files or folders, or rename one.', tr: 'Dosya/klasör taşı ya da yeniden adlandır.', example: 'mv old.txt new.txt' },
    rm: { usage: 'rm [-r] <name>...', en: 'Send files to the Recycle Bin. Folders need -r. Nothing is destroyed for good.', tr: 'Dosyaları Geri Dönüşüm Kutusu\'na gönder. Klasörler için -r gerekir. Hiçbir şey kalıcı silinmez.', example: 'rm -r old-folder' },
    apps: { usage: 'apps', en: 'List the installed programs.', tr: 'Yüklü programları listele.', example: 'apps' },
    start: { usage: 'start <program or file>', en: 'Open a program (start paint) or a file with its program (start notes.txt).', tr: 'Bir programı (start paint) ya da dosyayı kendi programıyla (start notlar.txt) aç.', example: 'start "internet explorer"' },
    notepad: { usage: 'notepad [file]', en: 'Open Notepad, optionally with a text file (it is created if missing).', tr: 'Notepad\'i aç, istersen bir metin dosyasıyla (yoksa oluşturulur).', example: 'notepad todo.txt' },
    paint: { usage: 'paint [file]', en: 'Open Paint, optionally with a picture from the file system.', tr: 'Paint\'i aç, istersen dosya sisteminden bir resimle.', example: 'paint drawing.png' },
    tasklist: { usage: 'tasklist', en: 'List the open windows with a PID each.', tr: 'Açık pencereleri birer PID ile listele.', example: 'tasklist' },
    kill: { usage: 'kill <window name or PID>', en: 'Close an open window.', tr: 'Açık bir pencereyi kapat.', example: 'kill notepad' },
    grep: { usage: 'grep [-i -v -c -n] <pattern> [file]', en: 'Keep the lines that match. Works after a pipe or on a file.', tr: 'Eşleşen satırları tut. Boru sonrasında ya da dosya üzerinde çalışır.', example: 'ls | grep -i txt' },
    head: { usage: 'head [-n N] [file]', en: 'Show the first lines (10 by default).', tr: 'İlk satırları göster (varsayılan 10).', example: 'cat notes.txt | head -n 3' },
    tail: { usage: 'tail [-n N] [file]', en: 'Show the last lines (10 by default).', tr: 'Son satırları göster (varsayılan 10).', example: 'history | tail -n 5' },
    sort: { usage: 'sort [-r] [file]', en: 'Sort lines alphabetically (-r reverses).', tr: 'Satırları alfabetik sırala (-r tersine çevirir).', example: 'ls | sort -r' },
    wc: { usage: 'wc [-l|-w|-c] [file]', en: 'Count lines, words and characters.', tr: 'Satır, kelime ve karakter say.', example: 'cat notes.txt | wc -w' },
    whoami: { usage: 'whoami', en: 'Print the current user.', tr: 'Geçerli kullanıcıyı yazdır.', example: 'whoami' },
    hostname: { usage: 'hostname', en: 'Print the machine name.', tr: 'Makine adını yazdır.', example: 'hostname' },
    uname: { usage: 'uname [-a]', en: 'Print the system name (-a for everything).', tr: 'Sistem adını yazdır (-a hepsi için).', example: 'uname -a' },
    ver: { usage: 'ver', en: 'Print the gokalppoOS version.', tr: 'gokalppoOS sürümünü yazdır.', example: 'ver' },
    uptime: { usage: 'uptime', en: 'How long this desktop has been running.', tr: 'Bu masaüstü ne zamandır açık.', example: 'uptime' },
    ping: { usage: 'ping <host>', en: 'Pretend to ping a host. It is a simulation: nothing leaves your browser.', tr: 'Bir adrese ping atıyormuş gibi yap. Simülasyondur: tarayıcından dışarı bir şey çıkmaz.', example: 'ping gokalppo.me' },
    cowsay: { usage: 'cowsay [text]', en: 'A cow says your text. Works after a pipe too.', tr: 'Bir inek yazdığın metni söyler. Boru sonrasında da çalışır.', example: 'fortune | cowsay' },
    fortune: { usage: 'fortune', en: 'Print a random programmer fortune.', tr: 'Rastgele bir yazılımcı falı yazdır.', example: 'fortune | cowsay' },
    weather: { usage: 'weather [city]', en: 'A (simulated) weather report.', tr: '(Simüle edilmiş) bir hava durumu raporu.', example: 'weather Ankara' },
    sl: { usage: 'sl', en: 'A steam locomotive, for when you meant to type ls.', tr: 'ls yazacakken sl yazanlar için bir buharlı lokomotif.', example: 'sl' },
    theme: { usage: 'theme [name]', en: 'Change the terminal colors: green, amber, white, cyan or pink.', tr: 'Terminal renklerini değiştir: green, amber, white, cyan veya pink.', example: 'theme amber' },
    hack: { usage: 'hack', en: 'Look very busy while "hacking" something.', tr: 'Bir şeyi "hackliyormuş" gibi çok meşgul görün.', example: 'hack' },
    fakeinstall: { usage: 'fakeinstall', en: 'A fake installer with a progress bar. Installs nothing.', tr: 'İlerleme çubuklu sahte bir yükleyici. Hiçbir şey yüklemez.', example: 'fakeinstall' },
    exit: { usage: 'exit', en: 'Close this Terminal window.', tr: 'Bu Terminal penceresini kapat.', example: 'exit' },
    sudo: { usage: 'sudo <command>', en: 'Ask for superuser powers. Good luck.', tr: 'Süper kullanıcı yetkisi iste. Bol şans.', example: 'sudo make me a sandwich' }
};

const ALIASES = {
    dir: 'ls', type: 'cat', md: 'mkdir', copy: 'cp', move: 'mv', ren: 'mv', rename: 'mv', del: 'rm', erase: 'rm', rmdir: 'rm',
    cls: 'clear', cv: 'resume', programs: 'apps', open: 'start', taskkill: 'kill'
};

export const MAN_TOPICS = Object.keys(PAGES);

const MSG = {
    en: { name: 'NAME', usage: 'USAGE', example: 'EXAMPLE', alias: (a, c) => `("${a}" is another name for "${c}")`, none: (c) => `No manual entry for ${c}`, ask: 'Which manual page? For example: man ls' },
    tr: { name: 'AD', usage: 'KULLANIM', example: 'ÖRNEK', alias: (a, c) => `("${a}", "${c}" komutunun başka adıdır)`, none: (c) => `${c} için kılavuz sayfası yok`, ask: 'Hangi kılavuz sayfası? Örneğin: man ls' }
};

// Returns the lines of a manual page, or an error result when there is none.
export const manPage = (topic, lang = 'en') => {
    const m = MSG[lang] || MSG.en;
    if (!topic) return { type: 'text', lines: [m.ask], error: true };
    const key = String(topic).toLowerCase();
    const canonical = ALIASES[key] || key;
    const page = PAGES[canonical];
    if (!page) return { type: 'text', lines: [m.none(topic)], error: true };
    const lines = [
        `${canonical.toUpperCase()}(1)`,
        '',
        `${m.name}     ${canonical} - ${page[lang] || page.en}`,
        `${m.usage}    ${page.usage}`,
        `${m.example}  ${page.example}`
    ];
    if (canonical !== key) lines.push('', m.alias(key, canonical));
    return { type: 'text', lines };
};
