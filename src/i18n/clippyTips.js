// Clippy's context-aware tips, per language. Categories match window ids (see Clippy.resolveCategory),
// plus `default` (general tips and facts) and `discover` (a nudge towards something not opened yet,
// shown after a quiet spell). Every category exists in both languages with the same keys.

export const CLIPPY_TIPS = {
    tr: {
        notepad: [
            "Görünüşe göre bir şeyler yazıyorsunuz. Yardımcı olmamı ister misiniz?",
            "İpucu: File > Save As... ile dosyalarınızı My Documents'e kaydedebilirsiniz.",
            "Yazdıklarınızı unutmayın, düzenli kaydetmek iyi bir alışkanlıktır!",
            "Search menüsünde Find ve Replace var: bir kelimeyi tüm metinde tek seferde değiştirebilirsiniz.",
            "Edit > Time/Date ile imlecin olduğu yere şu anki tarih ve saati yazabilirsiniz.",
            "Uzun satırlar taşıyor mu? Edit menüsünden Word Wrap'i açın.",
            "Kaydettiğiniz .txt dosyaları My Computer'da da görünür, Terminal'den 'cat dosya.txt' ile de okunur.",
            "Pencerenin sağ üstünde açık dosyanın adı yazar. Adı yoksa henüz kaydetmediniz demektir."
        ],
        paint: [
            "Sanatçı ruhunuz depreşti galiba! Kova aracını denediniz mi?",
            "İpucu: Şekil çizerken Undo ile son hamlenizi geri alabilirsiniz.",
            "Tuvalin köşelerine kadar özgürce çizebilirsiniz.",
            "Metin aracıyla resmin üstüne yazı yazabilirsiniz. Yazıyı tuvale yerleştirmek için tıklayın.",
            "File menüsünden resminizi PNG olarak My Documents'e kaydedebilirsiniz.",
            "Kaydettiğiniz resimler My Computer'da küçük önizlemeyle görünür, çift tıklayınca tekrar Paint'te açılır.",
            "Terminal'den 'paint resim.png' yazarak da bir resmi doğrudan açabilirsiniz."
        ],
        terminal: [
            "Hacker modundasınız galiba! 'help' yazarak komutları görebilirsiniz.",
            "Gizli bir komut var: 'neofetch' deneyin.",
            "'sudo' yazmayı deneyen çok oldu, sizden önce de denediler...",
            "Terminal gerçek dosyalarla çalışır: 'ls', 'cd', 'cat', 'mkdir', 'touch', 'cp', 'mv' ve 'rm' My Computer'daki dosyaları değiştirir.",
            "Tab tuşu komutları ve dosya adlarını tamamlar, yukarı/aşağı oklar eski komutları getirir.",
            "'echo merhaba > selam.txt' yazarsanız gerçekten bir dosya oluşur. Notepad'de açabilirsiniz!",
            "Komutları zincirleyebilirsiniz: 'ls | grep txt' ya da 'mkdir kutu && cd kutu'.",
            "'start paint', 'notepad notlar.txt' ya da 'apps' yazarak programları Terminal'den açabilirsiniz.",
            "'tasklist' açık pencereleri listeler, 'kill notepad' birini kapatır.",
            "Rengi sıkıldınız mı? 'theme amber' yazın. 'cowsay', 'fortune', 'sl' ve 'ping' de var.",
            "Ctrl+C çalışan komutu durdurur, Ctrl+L ekranı temizler.",
            "'man ls' gibi bir komutla her komutun kısa kılavuzunu görebilirsiniz."
        ],
        messenger: [
            "Birileriyle mi sohbet ediyorsunuz? 'Nudge' özelliğini deneyin!",
            "İpucu: Sağ tık ile bir kullanıcıyı arkadaş olarak ekleyebilirsiniz.",
            "MSN günlerini özleyenlere selam olsun.",
            "Giriş yapmadan da girebilirsiniz: misafir olarak devam edin ya da Gökalp Bot ile sohbet edin.",
            "Gökalp Bot'a 'ben öğreteyim' diyerek ona yeni cevaplar öğretebilirsiniz.",
            "Özel sohbette ✓ gönderildi, ✓✓ okundu demektir.",
            "Gökalp Bot'a 'mesaj bırak' derseniz mesajınız doğrudan Gökalp'e iletilir.",
            "Bot hesap yapar, yazı tura atar ve 'pizza mı burger mı' sorusunu sizin yerinize karara bağlar."
        ],
        minesweeper: [
            "Dikkatli olun, mayınlara basmayın!",
            "İpucu: Sağ tık ile bayrak koyabilirsiniz.",
            "Kazanırsanız süreniz skor tablosuna yazılabilir. Rekor süreniz kaç saniye?",
            "Bir sayının çevresindeki bayrak sayısı sayıya eşitse, kalan kareler güvenlidir.",
            "İlk tıklamanız asla mayına denk gelmez, çekinmeyin."
        ],
        solitaire: [
            "Kartları sürükleyin ya da çift tıklayarak temele gönderin.",
            "Takıldınız mı? Geri Al düğmesi bir hamleyi geri alır.",
            "Bir As görürseniz hemen temele gönderin.",
            "Gizli kartları açmak için önce en uzun sütundan başlamak çoğu zaman iyi bir fikirdir.",
            "Boş sütunları sadece bir Papaz (K) için saklayın."
        ],
        gallery: [
            "Projelerimi mi inceliyorsunuz? Favori hangisi?",
            "CindraNet'e bakmayı unutmayın, en çok emek verdiğim proje.",
            "Her projenin altında kullandığım teknolojiler de yazıyor.",
            "AI Image Detector, gerçek ve yapay zekâ üretimi görselleri %97,2 doğrulukla ayırıyor.",
            "Hardware TOTP Token, sıfırdan yaptığım fiziksel bir iki faktörlü doğrulama cihazı.",
            "Projelerin kaynak kodları GitHub'da. CindraNet özel depoda, isteyene kodu paylaşıyorum."
        ],
        internetexplorer: [
            "Favorites menüsünde projelerime ve profillerime kısayollar var.",
            "Adres çubuğuna 'home' ya da 'projects' yazmayı deneyin.",
            "Her proje için ayrı bir sayfa var: açıklama, teknolojiler ve bağlantılar bir arada.",
            "Geri ve İleri düğmeleri tıpkı gerçek tarayıcıdaki gibi çalışır."
        ],
        guestbook: [
            "Ziyaretçi defterine bir not bırakmaya ne dersiniz? Mesajınız sitede kalır.",
            "Adınızı ve kısa bir mesaj yazmanız yeterli.",
            "Defterdeki notları herkes görebilir, kibar ve kısa tutmak en iyisi."
        ],
        mycomputer: [
            "Dosyalarınızı düzenli tutmayı unutmayın!",
            "İpucu: Sağ tıklayarak yeni klasör veya dosya oluşturabilirsiniz.",
            "Yanlışlıkla bir şey mi sildiniz? Recycle Bin'e bakın.",
            "Resim dosyalarının küçük önizlemesi görünür, çift tıklarsanız Paint'te açılır.",
            ".txt dosyalarına çift tıklarsanız Notepad'de açılır.",
            "Terminal'deki 'ls' ve 'cd' komutları buradaki klasörlerin aynısını gösterir."
        ],
        recyclebin: [
            "Sildiğiniz dosyalar burada bekliyor, geri yükleyebilirsiniz.",
            "İpucu: Bir dosyaya sağ tıklayıp 'Restore' diyebilirsiniz.",
            "Terminal'deki 'rm' komutu da dosyaları buraya taşır, kalıcı olarak silmez."
        ],
        contact: [
            "Benimle iletişime geçmek mi istiyorsunuz? Harika, çekinmeyin!",
            "E-postamı kopyalamak için butona tıklamanız yeterli.",
            "Daha hızlı bir yol: Messenger'dan Gökalp Bot'a 'mesaj bırak' deyin, mesajınız bana ulaşır."
        ],
        myresume: [
            "CV'mi mi inceliyorsunuz? Umarım beğenirsiniz!",
            "Terminal'den 'resume' yazarak da açabilirsiniz.",
            "PDF'i bilgisayarınıza indirebilirsiniz."
        ],
        systemproperties: [
            "Hangi teknolojiyi hangi projede kullandığımı görmek için Aygıt Yöneticisi sekmesine bakın.",
            "Bir aygıta (teknolojiye) tıklayın, nerede kullanıldığı altta yazıyor.",
            "Burada sistem bilgileri var: bu masaüstünü React, Vite ve Firebase ile yaptım."
        ],
        displayproperties: [
            "Duvar kağıdını ve renk şemasını buradan değiştirebilirsiniz, seçimleriniz hatırlanır.",
            "Ekran koruyucuyu da buradan ayarlayabilirsiniz. Bir süre dokunmazsanız kendiliğinden başlar.",
            "Renk şemaları pencere başlıklarının ve menülerin rengini de değiştirir."
        ],
        musicplayer: [
            "Müzik mi dinliyorsunuz? İyi seçim.",
            "İpucu: Ses seviyesini taskbar'daki hoparlör ikonundan da ayarlayabilirsiniz.",
            "Çalan şarkının adı Messenger'daki durum satırında da görünür."
        ],
        aboutme: [
            "Beni biraz tanımak ister misiniz? Burada kısa bir özetim var.",
            "Bağlantılardan GitHub ve LinkedIn profillerime ulaşabilirsiniz.",
            "Özgeçmişimi açan bir düğme de var."
        ],
        welcome: [
            "Hoş geldiniz! Bu pencerede neleri deneyebileceğinizin kısa bir özeti var.",
            "'Açılışta göster' kutusunun işaretini kaldırırsanız bu pencere bir daha açılmaz."
        ],
        discover: {
            terminal: "Henüz Terminal'i açmadınız. Gerçek bir kabuk gibi çalışır: dosyalarla oynayın, programları açın, 'help' yazın!",
            paint: "Paint'i hiç denemediniz. Bir şeyler çizin, metin ekleyin ve My Documents'e kaydedin.",
            notepad: "Notepad'i denediniz mi? Find/Replace'i bile var, yazdıklarınızı My Documents'e kaydedebilirsiniz.",
            messenger: "Messenger'a bir göz atın: misafir olarak girip Gökalp Bot'la sohbet edebilirsiniz, ona yeni şeyler bile öğretebilirsiniz.",
            gallery: "Galeri'de projelerimin hepsi duruyor. Bir göz atmak ister misiniz?",
            guestbook: "Ziyaretçi defterine kısa bir not bırakmaya ne dersiniz?",
            minesweeper: "Bir tur Mayın Tarlası? Kazanırsanız süreniz skor tablosuna yazılır.",
            solitaire: "Bir el Solitaire oynamaya ne dersiniz? Geri Al düğmesi her zaman yanınızda.",
            internetexplorer: "Internet Explorer'da projelerime ve profillerime giden sayfalar var.",
            aboutme: "Beni tanımak isterseniz 'About Me' penceresine bakın.",
            displayproperties: "Duvar kağıdını ve renkleri değiştirebileceğinizi biliyor muydunuz? Başlat > Settings > Display Properties.",
            systemproperties: "Başlat > Settings > System Properties'te hangi teknolojiyi nerede kullandığımı görebilirsiniz.",
            myresume: "Özgeçmişim 'My Resume' simgesinde, PDF olarak da indirilebilir.",
            contact: "Benimle iletişime geçmek için 'Contact' simgesi var.",
            musicplayer: "Müzik çalarda çalan şarkılar var, arka plan müziği için ideal."
        },
        default: [
            "Merhaba! Ben gokalppoOS'un asistanıyım. Bir simgeye çift tıklayarak başlayabilirsiniz.",
            "İpucu: Masaüstüne sağ tıklayıp ikonları düzenleyebilirsiniz.",
            "Gizli bir kod var: yön tuşları + B + A. Denemekten zarar gelmez.",
            "Terminal'i açıp 'help' yazarsanız neler yapabileceğinizi görürsünüz.",
            "Pencereleri kenarlarından boyutlandırabilir, Alt + ` ile pencereler arasında geçebilirsiniz.",
            "Hoparlör ikonuna tıklayıp 'Sistem sesleri' kutusunu işaretlerseniz sistem sesleri açılır.",
            "Saate tıklarsanız takvim açılır. Yanındaki TR/EN düğmesiyle dili değiştirebilirsiniz.",
            "Başlat menüsündeki Programs listesinde bütün uygulamalar var.",
            "Başlat > Run... kutusuna 'paint' ya da 'notepad' yazarak programları, 'neofetch' gibi komutları da çalıştırabilirsiniz.",
            "Bir pencereyi küçültmek için başlığındaki düğmeye ya da görev çubuğundaki düğmesine tıklayabilirsiniz.",
            "Başlat düğmesinin yanındaki küçük masaüstü simgesi bütün pencereleri tek tıkla küçültür.",
            "Bir süre hiçbir şeye dokunmazsanız ekran koruyucu başlar. Ayarları Display Properties'te.",
            "Terminal'e 'crash' yazarsanız eski usul bir mavi ekran görürsünüz. Sadece şaka!",
            "Bu sitenin tamamı React, Vite ve Firebase ile yapıldı. Kaynak kodu Internet Explorer > Links'te.",
            "Tüm dosyalarınız tarayıcınızda saklanır: kapatıp açsanız da My Documents'teki dosyalar yerinde durur.",
            "Sağ üstteki ziyaretçi sayacı gerçek: siteye kaç kişinin geldiğini sayar.",
            "Bazı oyunlarda skorunuz herkesin gördüğü bir tabloya yazılır. Rekor kırabilir misiniz?",
            "Beş projemin hepsi Galeri'de, kısa özetleri Terminal'de 'projects' komutuyla da görünür.",
            "Dil değiştirmek için görev çubuğundaki TR/EN düğmesine tıklayın, Clippy dahil her şey çevrilir.",
            "Alt + ` tuşlarına basılı tutup bırakırsanız açık pencereler arasında hızlıca geçiş yaparsınız.",
            "Bir dosyayı silerseniz önce Recycle Bin'e gider, oradan geri alabilirsiniz.",
            "CindraNet, merkezi olmayan ve uçtan uca şifreli bir mesajlaşma platformu, Rust ile yazıldı.",
            "IoT Smart Air Quality projesi ESP32 üzerinde sıcaklık, nem ve hava kalitesini ölçüyor.",
            "Document Scanner, fotoğrafı çekilmiş belgeleri C++ ve OpenCV ile düzleştirip temizliyor.",
            "Hardware TOTP Token, gerçek bir iki faktörlü doğrulama cihazı: kendi ekranı ve güvenli anahtar saklaması var.",
            "AI Image Detector, ResNet18 ile eğitildi ve %97,2 doğruluğa ulaştı.",
            "Gökalp Bot'a hesap, yazı tura ya da bir fıkra sorabilirsiniz. Cevabını bilmezse ona öğretebilirsiniz.",
            "Mayın Tarlası ve Solitaire'de rekorlar tutulur, Terminal'de 'projects' yazarak projelere de bakabilirsiniz.",
            "Karanlıkta çalışanlar için: Terminal'de 'theme amber' retro bir görünüm verir.",
            "Saatin üstüne gelip tıklayın: takvimde bugünün tarihi işaretli görünür.",
            "Başka bir konuda yardım ister misiniz? Mesaj bırakmak için Messenger'da Gökalp Bot'a 'mesaj bırak' demeniz yeterli."
        ]
    },
    en: {
        notepad: [
            "It looks like you're writing something. Would you like some help?",
            "Tip: use File > Save As... to keep your files in My Documents.",
            "Don't lose your work: saving often is a good habit!",
            "The Search menu has Find and Replace, so you can change a word everywhere in one go.",
            "Edit > Time/Date writes the current date and time where the cursor is.",
            "Long lines running off the edge? Turn on Word Wrap in the Edit menu.",
            "Saved .txt files also show up in My Computer and can be read from the Terminal with 'cat file.txt'.",
            "The open file's name is shown at the top right. No name means you haven't saved it yet."
        ],
        paint: [
            "Feeling artistic? Have you tried the fill bucket?",
            "Tip: Undo takes back your last stroke or shape.",
            "You can draw all the way to the edges of the canvas.",
            "The text tool lets you write on top of your picture. Click the canvas to place the text.",
            "The File menu saves your picture as a PNG in My Documents.",
            "Saved pictures show up with a little preview in My Computer, and double-clicking one opens it in Paint again.",
            "You can also open a picture straight from the Terminal with 'paint picture.png'."
        ],
        terminal: [
            "Hacker mode, huh? Type 'help' to see the commands.",
            "There's a hidden command: try 'neofetch'.",
            "Plenty of people have tried typing 'sudo' before you...",
            "The Terminal works on real files: 'ls', 'cd', 'cat', 'mkdir', 'touch', 'cp', 'mv' and 'rm' change what's in My Computer.",
            "Tab completes commands and file names, and the Up/Down arrows bring back earlier commands.",
            "Type 'echo hello > hi.txt' and a real file appears. You can open it in Notepad!",
            "You can chain commands: 'ls | grep txt' or 'mkdir box && cd box'.",
            "'start paint', 'notepad notes.txt' or 'apps' open programs right from the Terminal.",
            "'tasklist' lists open windows and 'kill notepad' closes one.",
            "Bored of green? Type 'theme amber'. There's also 'cowsay', 'fortune', 'sl' and 'ping'.",
            "Ctrl+C stops a running command and Ctrl+L clears the screen.",
            "Use 'man ls' (or any command) for a short manual page."
        ],
        messenger: [
            "Chatting with someone? Try the 'Nudge' button!",
            "Tip: right-click a name in the chat to add them as a friend.",
            "Greetings to everyone who misses the MSN days.",
            "You don't have to sign in: continue as a guest, or just chat with Gökalp Bot.",
            "Tell Gökalp Bot 'let me teach you' and you can teach it new answers.",
            "In private chats ✓ means sent and ✓✓ means read.",
            "Say 'leave a message' to Gökalp Bot and your note goes straight to Gökalp.",
            "The bot does sums, flips coins and settles 'pizza or burger' for you."
        ],
        minesweeper: [
            "Careful now, don't step on a mine!",
            "Tip: right-click to place a flag.",
            "Win a game and your time can go on the leaderboard. What's your record?",
            "If a number has as many flags around it as its value, the remaining squares are safe.",
            "Your first click is never a mine, so don't be shy."
        ],
        solitaire: [
            "Drag cards around, or double-click one to send it to a foundation.",
            "Stuck? Undo takes back your last move.",
            "If you spot an Ace, send it up to a foundation right away.",
            "Starting with the longest column to reveal hidden cards is often a good idea.",
            "Keep empty columns for a King."
        ],
        gallery: [
            "Browsing my projects? Which one is your favorite?",
            "Don't miss CindraNet, the project I put the most work into.",
            "Each project also lists the technologies I used.",
            "The AI Image Detector tells real and AI-generated pictures apart with 97.2% accuracy.",
            "The Hardware TOTP Token is a physical two-factor authenticator I built from scratch.",
            "Source code lives on GitHub. CindraNet is in a private repository and I share the code on request."
        ],
        internetexplorer: [
            "The Favorites menu has shortcuts to my projects and profiles.",
            "Try typing 'home' or 'projects' in the address bar.",
            "Every project has its own page: description, technologies and links in one place.",
            "Back and Forward work just like in a real browser."
        ],
        guestbook: [
            "How about leaving a note in the guestbook? Your message stays on the site.",
            "Just a name and a short message is enough.",
            "Everyone can read the notes, so short and kind is best."
        ],
        mycomputer: [
            "Remember to keep your files organized!",
            "Tip: right-click to create a new folder or file.",
            "Deleted something by accident? Check the Recycle Bin.",
            "Picture files show a small preview, and double-clicking one opens it in Paint.",
            "Double-click a .txt file to open it in Notepad.",
            "The Terminal's 'ls' and 'cd' show these very same folders."
        ],
        recyclebin: [
            "Deleted files wait here, and you can restore them.",
            "Tip: right-click a file and choose 'Restore'.",
            "The Terminal's 'rm' also moves files here instead of deleting them for good."
        ],
        contact: [
            "Want to get in touch? Great, don't hesitate!",
            "Just click the button to copy my email address.",
            "A faster way: tell Gökalp Bot in Messenger to 'leave a message' and it reaches me."
        ],
        myresume: [
            "Taking a look at my resume? I hope you like it!",
            "You can also open it by typing 'resume' in the Terminal.",
            "You can download the PDF to your computer."
        ],
        systemproperties: [
            "Open the Device Manager tab to see which technology I used in which project.",
            "Click a device (technology) and the details appear below.",
            "The system info here is real: I built this desktop with React, Vite and Firebase."
        ],
        displayproperties: [
            "You can change the wallpaper and the color scheme here, and your choices are remembered.",
            "The screen saver is set up here too. It starts by itself when you leave the desktop alone for a while.",
            "Color schemes change the title bars and menus as well."
        ],
        musicplayer: [
            "Listening to music? Good choice.",
            "Tip: you can also change the volume from the speaker icon in the taskbar.",
            "The track that's playing also shows in your status line in Messenger."
        ],
        aboutme: [
            "Want to get to know me a little? There's a short summary here.",
            "The links take you to my GitHub and LinkedIn profiles.",
            "There's a button that opens my resume, too."
        ],
        welcome: [
            "Welcome! This window sums up what you can try.",
            "Untick 'Show at startup' and this window won't open again."
        ],
        discover: {
            terminal: "You haven't opened the Terminal yet. It works like a real shell: play with files, open programs, type 'help'!",
            paint: "You haven't tried Paint. Draw something, add some text and save it to My Documents.",
            notepad: "Have you tried Notepad? It even has Find/Replace, and you can save to My Documents.",
            messenger: "Take a look at Messenger: sign in as a guest and chat with Gökalp Bot, you can even teach it new things.",
            gallery: "The Gallery holds all my projects. Want to take a look?",
            guestbook: "How about leaving a short note in the guestbook?",
            minesweeper: "A round of Minesweeper? If you win, your time goes on the leaderboard.",
            solitaire: "How about a hand of Solitaire? Undo is always there for you.",
            internetexplorer: "Internet Explorer has pages for my projects and my profiles.",
            aboutme: "If you'd like to know me, open 'About Me'.",
            displayproperties: "Did you know you can change the wallpaper and colors? Start > Settings > Display Properties.",
            systemproperties: "Start > Settings > System Properties shows which technology I used where.",
            myresume: "My resume is in the 'My Resume' icon, and the PDF can be downloaded.",
            contact: "The 'Contact' icon is the way to get in touch with me.",
            musicplayer: "The Music Player has tracks, perfect as background music."
        },
        default: [
            "Hi! I'm the gokalppoOS assistant. Double-click an icon to get started.",
            "Tip: right-click the desktop to arrange your icons.",
            "There's a secret code: arrow keys + B + A. No harm in trying.",
            "Open the Terminal and type 'help' to see what you can do.",
            "You can resize windows from their edges, and press Alt + ` to switch between them.",
            "Click the speaker icon and tick 'System sounds' to turn on system sounds.",
            "Click the clock for a calendar. The EN/TR button next to it switches the language.",
            "The Programs list in the Start menu has every app.",
            "Type 'paint' or 'notepad' (or a Terminal command like 'neofetch') into Start > Run... to open it.",
            "Minimize a window with the button in its title bar or with its taskbar button.",
            "The little desktop icon next to the Start button minimizes every window in one click.",
            "Leave everything alone for a while and the screen saver starts. Settings are in Display Properties.",
            "Type 'crash' in the Terminal for a classic blue screen. Just a joke!",
            "This whole site is built with React, Vite and Firebase. The source is under Internet Explorer > Links.",
            "Your files live in your browser: close the tab and reopen it, and My Documents is still there.",
            "The visitor counter in the top right is real: it counts how many people stopped by.",
            "Some games write your score on a board everyone can see. Can you set a record?",
            "All five projects are in the Gallery, and the 'projects' command in the Terminal sums them up too.",
            "Switch the language with the TR/EN button in the taskbar. Everything is translated, Clippy included.",
            "Hold Alt + ` and let go to jump between open windows quickly.",
            "A deleted file goes to the Recycle Bin first, and you can bring it back from there.",
            "CindraNet is a decentralized, end-to-end encrypted messaging platform written in Rust.",
            "The IoT Smart Air Quality project measures temperature, humidity and air quality on an ESP32.",
            "The Document Scanner flattens and cleans up photographed documents with C++ and OpenCV.",
            "The Hardware TOTP Token is a real two-factor device with its own display and secure key storage.",
            "The AI Image Detector was trained on ResNet18 and reached 97.2% accuracy.",
            "You can ask Gökalp Bot for a sum, a coin flip or a joke. If it doesn't know something, teach it.",
            "Minesweeper and Solitaire keep records, and typing 'projects' in the Terminal lists the projects.",
            "For a retro look try 'theme amber' in the Terminal.",
            "Click the clock: today's date is marked in the calendar.",
            "Want to send me something? Tell Gökalp Bot in Messenger to 'leave a message'."
        ]
    }
};

export const getClippyTips = (lang) => CLIPPY_TIPS[lang] || CLIPPY_TIPS.en;
