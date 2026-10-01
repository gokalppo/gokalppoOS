// Everything Gökalp Bot says, in English and Turkish. A value is a string, a list of variants (the bot
// avoids repeating the one it used last), or a function that returns either.
// The bot is honest about being software: it never claims to be the real Gökalp.
export const BOT_NAME = 'Gökalp Bot';
export const EMAIL = 'ekergokalp@gmail.com';
export const LINKEDIN = 'https://www.linkedin.com/in/gokalp-eker/';
export const SITE_URL = 'https://gokalppo.me';

const comma = (name) => (name ? `, ${name}` : '');

export const TEXT = {
    en: {
        // --- first words -----------------------------------------------------
        firstGreeting: [
            `Hi! I'm ${BOT_NAME} 👋 I live in this Messenger and can tell you about Gökalp's projects, skills and how to reach him.`,
            "You can ask me things the way you'd ask a person, or just tap a button. I'm a bot, not the real Gökalp, but I'm decent company."
        ],
        returnGreeting: (name) => [`Welcome back, ${name}! 🙂 Good to see you again.`, 'Want to pick up where we left off, or ask something new?'],
        returnGreetingAnon: ['Welcome back! 🙂 Good to see you again.', 'What would you like to know this time?'],

        // --- small talk ------------------------------------------------------
        greeting: (period, name) => [
            `${period}${comma(name)}! 🙂 What can I do for you?`,
            `Hey${comma(name)}! Nice to see you. What are you curious about?`,
            `Hi there${comma(name)}! Ask me anything about Gökalp or his work.`
        ],
        greetingShort: (period, name) => [`${period}${comma(name)}! 🙂`, `Hey${comma(name)}!`],
        thanksShort: ['Sure!', 'Of course!'],
        introFollowUp: ['So, what would you like to know?', 'What would you like to know about Gökalp?'],
        periods: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Hello' },
        howAreYou: [
            "I'm doing great, thanks for asking! Software has pretty good days. How are you?",
            "All good here! No bugs so far today 😄 How about you?",
            "Can't complain. I'm a bot, so my main stress is a missing semicolon. How are you doing?"
        ],
        feelingGood: ["Glad to hear it! 😊 Anything you'd like to know about Gökalp's work?"],
        whoAreYou: [
            `I'm ${BOT_NAME}, a chat assistant for this portfolio. I'm software, not the real Gökalp, and I'll always say so. I do know his projects, skills and contact details well.`,
            `I'm ${BOT_NAME}, a bot. Not a human, and not the real Gökalp, but I like a good chat and I know his portfolio inside out.`
        ],
        creator: [
            "Gökalp built me himself. I'm a rule-based bot: no big AI model behind me, which means I only know what's on this portfolio, and everything runs right here in your browser. Nothing you type is sent to a server (unless you ask me to pass a message on).",
            "I was written by Gökalp. I'm not a large language model, just a lot of hand-made rules, so I'm honest about what I don't know. What you type stays in your browser, except messages you ask me to forward."
        ],
        capabilities: [
            "Here's what I can do:\n• tell you about Gökalp and each of his projects (ask for details, tech or source code)\n• go through his skills, or check whether he knows a specific technology\n• recommend a project if you tell me what you're into\n• share his contact details, GitHub and LinkedIn\n• pass a message on to him\n• chat, tell a joke or a fun fact 🙂",
            "I can walk you through his projects and skills, answer \"does he know X?\", share contact links, take a message for him, or just chat. Try me!"
        ],
        thanks: (name) => [
            `You're welcome${comma(name)}! Anything else you'd like to know?`,
            `Happy to help${comma(name)}! 😊`,
            "Anytime! Let me know if you think of something else."
        ],
        bye: (name) => [
            `Bye${comma(name)}! Thanks for stopping by. If you liked what you saw, sign the Guestbook on your way out. 👋`,
            `See you${comma(name)}! It was nice chatting with you.`
        ],
        compliment: [
            "Aw, thank you! 😊 I'll pass the good vibes on to Gökalp.",
            "That's kind of you to say! I'll take it. 🙂",
            "Thanks! I'll tell the code that it's doing a good job."
        ],
        insult: [
            "Ouch! I'm just trying my best. If I got something wrong, tell me what you were after and I'll try again.",
            "Let's keep it friendly. 🙂 What were you trying to find out? I'll do better."
        ],
        laugh: ['😄', 'Haha 😄', "Glad I made you smile!"],
        ack: ['👍', 'Okay! Anything else?', 'Alright. What next?'],
        yes: ["Great! What would you like to know?"],
        no: ["No problem! I'm here if you need anything."],
        emoji: ['🙂', '😊', 'Right back at you! 😄'],
        lonely: ["I'm a bot, so I'm not really bored, but I'm happy to keep you company. Want a joke or a fun fact?"],
        sad: ["I'm sorry you're feeling that way. I'm only a bot, so I can't do much, but I'm happy to chat or tell you a joke if that helps. 💛"],
        loveYou: ["That's sweet! 😊 I'm just a bot, so let's call it a great friendship. Want to hear about the projects?"],
        whatDoing: ["Chatting with you, mostly! And waiting for the next good question. 😄"],
        whereFrom: ["I live inside your browser tab, so technically I'm wherever you are. Gökalp wrote me and this whole desktop."],
        botAge: ["I don't really have an age. I only exist while this window is open, so every chat is my birthday. 🎂"],
        weather: ["I live inside a browser tab, so I can't see the weather. Look out of the window and tell me how it is!"],
        languageAbility: ["I speak English and Turkish, and I'll answer in whichever language you write in. Türkçe de konuşabiliriz! 🙂"],
        helloWorld: ['Hello, World! 🌍'],
        meaningOfLife: ['42. Obviously. 😄'],
        sudo: ["Nice try, but I don't have root privileges either."],
        ping: ['pong 🏓'],
        yourName: (name) => [`${name ? `You're ${name}, ` : "You haven't told me your name yet, "}${name ? 'and I remember it for next time.' : 'what should I call you?'}`],
        niceToMeet: (name) => [`Nice to meet you, ${name}! 🙂 I'll remember your name for next time (only in this browser).`, `Pleased to meet you, ${name}!`],
        askName: ["I don't know your name yet. Tell me with \"my name is ...\" if you like!"],
        time: (t) => [`On your clock it's ${t}.`],
        date: (d) => [`Today is ${d}, by your clock.`],
        fallbackLanguageTip: [],

        // --- jokes and facts -------------------------------------------------
        jokes: [
            "Why do programmers prefer dark mode? Because light attracts bugs. 🐛",
            "There are 10 kinds of people: those who understand binary and those who don't.",
            "A SQL query walks into a bar, walks up to two tables and asks: \"Can I join you?\"",
            "Why did the developer go broke? Because he used up all his cache. 💸",
            "I'd tell you a UDP joke, but you might not get it.",
            "!false. It's funny because it's true."
        ],
        facts: [
            "Fun fact: the AI Image Detector tells real photos from AI-generated ones with 97.2% accuracy, using a ResNet18 trained on over 100,000 images.",
            "Fun fact: CindraNet encrypts messages with X3DH and the Double Ratchet, the same family of ideas used by secure messengers, and it finds peers without any central server.",
            "Fun fact: the Hardware TOTP Token is a physical two-factor authenticator Gökalp built from scratch, with its own display and secure key storage.",
            "Fun fact: the IoT air-quality monitor runs on an ESP32 and reports temperature, humidity and air quality both on a tiny OLED and to a remote dashboard.",
            "Fun fact: this whole desktop, with its window manager, Paint, Minesweeper and this very Messenger, is a React app. You're chatting inside it right now."
        ],

        // --- about Gökalp ----------------------------------------------------
        aboutOwner: (name, role) => [
            `${name} is a ${role}. He likes building where hardware meets software: embedded devices, computer vision, machine learning, secure messaging, and retro-style web apps like this one.`,
            'Want to see what he has built, or what he works with?'
        ],
        education: (role) => [`He's a ${role}. I don't have the name of his university, but you can ask him directly. Want me to take a message?`],
        site: [
            'This whole desktop is one of his projects too: React + Vite, with Firebase for the Messenger, guestbook and leaderboard. You can find the source code from Internet Explorer > Links.',
            'The site itself is a project: a Windows 98-style desktop built with React and Vite, with Firebase behind the Messenger and the guestbook.'
        ],
        secret: ['A secret? Try the Konami code: ↑ ↑ ↓ ↓ ← → ← → B A. The Terminal also has a hidden command or two. 🤫'],

        // --- projects --------------------------------------------------------
        projectsIntro: (lines) => [`Here are Gökalp's projects:\n${lines}`, 'Tell me which one sounds interesting and I\'ll give you the details.'],
        projectOverview: (p, summary) => `${p.title}: ${summary}`,
        projectTech: (tech, source, demo, isPrivate) =>
            `Built with ${tech}.${source ? `\nSource code: ${source}` : ''}${isPrivate ? '\nThe repository is private; code is available on request.' : ''}${demo ? `\nDemo: ${demo}` : ''}`,
        projectTechOnly: (title, tech) => `${title} is built with ${tech}.`,
        projectSource: (title, source) => `The code for ${title} is here: ${source}`,
        projectSourcePrivate: (title) => `${title} is in a private repository, but Gökalp shares the code on request. Want me to take a message for him?`,
        projectDemo: (title, demo) => `Here's a demo of ${title}: ${demo}`,
        projectNoDemo: (title) => `There's no video demo for ${title} yet.`,
        projectMore: (title, description) => `More about ${title}:\n${description}`,
        projectNext: (title) => `Next up: ${title}`,
        projectWhich: ['Which project do you mean? Pick one below, or ask for "all projects".'],
        projectChallenge: (title) => `I don't have Gökalp's own notes on what was hardest about ${title}. The description may hint at it, or I can pass your question on to him.`,
        projectNote: (note) => note,
        recommend: (title, why) => [`If that's your thing, I'd start with ${title}. ${why}`, 'Want the details?'],
        recommendNone: ["I couldn't match that to a project, but I can list them all if you'd like."],

        // --- skills ----------------------------------------------------------
        skillsIntro: (lines) => `Here's what Gökalp works with:\n${lines}`,
        skillsOutro: ['Ask "does he know Rust?" (or any technology) and I\'ll tell you where he used it.'],
        skillKnown: (skill, usedIn, note) => `Yes! ${skill}: ${note} He used it in ${usedIn}.`,
        skillUnknown: (list) => [`I don't see that in Gökalp's portfolio, so I can't confirm it. Here is what is listed: ${list}. If it matters, ask him directly and I can pass that on.`],

        // --- practical -------------------------------------------------------
        resume: [`You can read or download his resume here: ${SITE_URL}/resume.pdf (it's also on the desktop as "My Resume").`],
        contact: [`The best way to reach Gökalp is email: ${EMAIL}\nLinkedIn: ${LINKEDIN}\nGitHub: https://github.com/gokalppo`, 'Or I can pass a message on to him right here. Just say "leave a message".'],
        phone: [`I don't have a phone number to share. Email (${EMAIL}) or LinkedIn is the way to go, or I can pass on a message.`],
        github: ['His GitHub: https://github.com/gokalppo'],
        linkedin: [`His LinkedIn: ${LINKEDIN}`],
        hire: [
            "I can't speak for Gökalp's availability, but he's the right person to ask. Email is quickest: " + EMAIL + ", or I can pass a message on, just say \"leave a message\".",
            `For work or internship questions, email ${EMAIL} or let me forward a message to him. I'll make sure it's clear what you need.`
        ],
        personal: [
            "That's more personal than what's on the portfolio, so I don't know. I only share what Gökalp published here. You could ask him directly, and I can pass the question on if you like.",
            "I don't have that information, and I'd rather not guess about a real person. Want me to ask Gökalp for you?"
        ],

        // --- leaving a message -----------------------------------------------
        offerMessage: ["Would you like to leave a message for Gökalp? I'll make sure it reaches him."],
        askMessage: ["Sure! What would you like me to tell him? Write your message below (or say \"cancel\")."],
        messageTooShort: ["That's a bit short. Could you write a little more so Gökalp knows what you mean?"],
        messageTooLong: ["That's longer than I can pass on (up to 1,500 characters). Could you shorten it?"],
        askContact: ["Got it. How can he reach you back? Type your email (or say \"skip\" if you'd rather not)."],
        contactInvalid: ["That doesn't look like an email address. Try again, or say \"skip\" and I'll send it without a reply address."],
        confirmMessage: (msg, contact) => [`Here's what I'll send:\n"${msg}"\n${contact ? `Reply to: ${contact}` : 'No reply address (he won\'t be able to answer you).'}\nShall I send it? (yes / no)`],
        confirmUnclear: ['Please answer "yes" to send it or "no" to cancel.'],
        sending: ['Sending it now...'],
        sent: ["Done! Your message is on its way to Gökalp. 🎉 Thanks for taking the time."],
        sendFailed: ["Hmm, I couldn't send that just now. Please try again in a bit, or email him directly: " + EMAIL],
        sendTooSoon: ["You just sent one a moment ago. Please wait a minute before sending another."],
        cancelled: ["No problem, I've cancelled that. Anything else?"],

        // --- when I don't understand ----------------------------------------
        fallback: [
            "Hmm, I didn't quite get that. Could you say it another way? I'm best with questions about Gökalp, his projects and skills.",
            "I'm not sure what you mean. I know about his projects, skills, resume and contact details, or we can just chat.",
            "Sorry, that one went over my head! Try asking about a project, a skill, or how to reach Gökalp."
        ],
        fallbackTwice: ["I keep missing your point, sorry. I'm a simple bot. If it's something only Gökalp can answer, I can pass your question on to him."],
        idleNudge: [
            "Still there? 🙂 Feel free to ask about the projects, or tell me what you're curious about.",
            "No rush! I'm here whenever you want to ask something."
        ],

        // --- quick-reply buttons (each one is also something the bot understands) --
        chips: {
            projects: 'Projects', skills: 'Skills', resume: 'Resume', contact: 'Contact', aboutOwner: 'About Gökalp',
            leaveMessage: 'Leave a message', joke: 'Tell me a joke', funFact: 'Fun fact',
            more: 'More details', source: 'Source code', demo: 'Demo', next: 'Next project', allProjects: 'All projects',
            yes: 'Yes', no: 'No', skip: 'Skip', cancel: 'Cancel'
        }
    },

    tr: {
        firstGreeting: [
            `Merhaba! Ben ${BOT_NAME} 👋 Bu Messenger'da yaşıyorum; Gökalp'in projelerini, yeteneklerini ve ona nasıl ulaşacağını anlatabilirim.`,
            "Bana bir insana sorar gibi sorabilirsin, ya da düğmelere dokunabilirsin. Ben bir botum, gerçek Gökalp değilim, ama sohbeti severim."
        ],
        returnGreeting: (name) => [`Tekrar hoş geldin ${name}! 🙂 Seni yeniden görmek güzel.`, 'Kaldığımız yerden devam edelim mi, yoksa yeni bir şey mi soracaksın?'],
        returnGreetingAnon: ['Tekrar hoş geldin! 🙂 Seni yeniden görmek güzel.', 'Bu sefer ne öğrenmek istersin?'],

        greeting: (period, name) => [
            `${period}${comma(name)}! 🙂 Sana nasıl yardımcı olabilirim?`,
            `Selam${comma(name)}! Hoş geldin. Neyi merak ediyorsun?`,
            `Merhaba${comma(name)}! Gökalp'i ya da işlerini bana sorabilirsin.`
        ],
        greetingShort: (period, name) => [`${period}${comma(name)}! 🙂`, `Selam${comma(name)}!`],
        thanksShort: ['Tabii!', 'Elbette!'],
        introFollowUp: ['Peki, ne öğrenmek istersin?', 'Gökalp hakkında ne öğrenmek istersin?'],
        periods: { morning: 'Günaydın', afternoon: 'Merhaba', evening: 'İyi akşamlar', night: 'Merhaba' },
        howAreYou: [
            "Çok iyiyim, sorduğun için sağ ol! Yazılımların günleri genelde güzel geçer. Sen nasılsın?",
            "Burada her şey yolunda! Bugün henüz hata çıkmadı 😄 Sen nasılsın?",
            "Şikayetim yok. Ben bir botum, en büyük stresim eksik bir noktalı virgül. Sen nasılsın?"
        ],
        feelingGood: ["Sevindim! 😊 Gökalp'in işleri hakkında merak ettiğin bir şey var mı?"],
        whoAreYou: [
            `Ben ${BOT_NAME}, bu portfolyonun sohbet asistanıyım. Bir yazılımım, gerçek Gökalp değilim ve bunu hep söylerim. Ama projelerini, yeteneklerini ve iletişim bilgilerini çok iyi bilirim.`,
            `Ben ${BOT_NAME}, bir botum. İnsan değilim, gerçek Gökalp da değilim ama iyi bir sohbeti severim ve portfolyoyu avucumun içi gibi bilirim.`
        ],
        creator: [
            "Beni Gökalp kendisi yaptı. Kural tabanlı bir botum: arkamda büyük bir yapay zekâ modeli yok. Yani yalnızca bu portfolyodaki şeyleri bilirim ve her şey burada, tarayıcında çalışır. Yazdıkların bir sunucuya gönderilmez (ona iletmemi istediğin mesajlar hariç).",
            "Beni Gökalp yazdı. Büyük bir dil modeli değilim, sadece elle hazırlanmış bir sürü kuralım var; bu yüzden bilmediğim şeyi dürüstçe söylerim. Yazdıkların tarayıcında kalır, iletmemi istediğin mesajlar hariç."
        ],
        capabilities: [
            "Şunları yapabilirim:\n• Gökalp'i ve her projesini anlatmak (detay, teknoloji ya da kaynak kod isteyebilirsin)\n• yeteneklerini sıralamak ya da belirli bir teknolojiyi bilip bilmediğini söylemek\n• neyle ilgilendiğini söylersen sana uygun bir proje önermek\n• iletişim bilgilerini, GitHub ve LinkedIn'ini paylaşmak\n• ona bir mesaj iletmek\n• sohbet etmek, fıkra ya da ilginç bir bilgi anlatmak 🙂",
            "Projelerini ve yeteneklerini anlatabilirim, \"X'i biliyor mu?\" sorusuna cevap verebilirim, iletişim linklerini paylaşabilirim, ona mesaj alabilirim ya da sadece sohbet edebiliriz. Dene bakalım!"
        ],
        thanks: (name) => [
            `Rica ederim${comma(name)}! Başka merak ettiğin bir şey var mı?`,
            `Ne demek${comma(name)}, ben sevindim! 😊`,
            'Her zaman! Aklına başka bir şey gelirse söyle.'
        ],
        bye: (name) => [
            `Görüşürüz${comma(name)}! Uğradığın için teşekkürler. Beğendiysen çıkarken Ziyaretçi Defteri'ni imzalamayı unutma. 👋`,
            `Hoşça kal${comma(name)}! Seninle sohbet etmek güzeldi.`
        ],
        compliment: [
            'Çok teşekkür ederim! 😊 İyi dilekleri Gökalp\'e ileteceğim.',
            'Ne kadar nazik! Kabul ediyorum. 🙂',
            'Sağ ol! Koda da iyi iş çıkardığını söyleyeceğim.'
        ],
        insult: [
            'Ayy! Elimden geleni yapıyorum. Yanlış bir şey söylediysem ne aradığını anlat, tekrar deneyeyim.',
            'Hadi tatlı dille konuşalım. 🙂 Ne öğrenmeye çalışıyordun? Daha iyisini yapacağım.'
        ],
        laugh: ['😄', 'Hahaha 😄', 'Güldürebildiysem ne mutlu bana!'],
        ack: ['👍', 'Tamam! Başka bir şey?', 'Peki. Sırada ne var?'],
        yes: ['Harika! Ne öğrenmek istersin?'],
        no: ['Sorun değil! Bir şeye ihtiyacın olursa buradayım.'],
        emoji: ['🙂', '😊', 'Ben de sana! 😄'],
        lonely: ['Ben bir botum, o yüzden sıkılmıyorum ama sana eşlik etmekten memnuniyet duyarım. Bir fıkra ya da ilginç bir bilgi ister misin?'],
        sad: ['Böyle hissetmene üzüldüm. Ben sadece bir botum, yapabileceğim şey sınırlı ama istersen sohbet edebiliriz ya da bir fıkra anlatabilirim. 💛'],
        loveYou: ['Ne tatlı! 😊 Ben sadece bir botum, o yüzden buna güzel bir arkadaşlık diyelim. Projeleri anlatayım mı?'],
        whatDoing: ['Çoğunlukla seninle sohbet ediyorum! Bir de bir sonraki güzel soruyu bekliyorum. 😄'],
        whereFrom: ['Tarayıcı sekmenin içinde yaşıyorum, yani teknik olarak neredeysen oradayım. Beni ve bu masaüstünün tamamını Gökalp yazdı.'],
        botAge: ['Gerçek bir yaşım yok. Sadece bu pencere açıkken varım, yani her sohbet benim doğum günüm. 🎂'],
        weather: ['Tarayıcı sekmesinin içinde yaşıyorum, havayı göremiyorum. Sen pencereden bak da bana söyle!'],
        languageAbility: ['Türkçe ve İngilizce konuşabiliyorum; hangi dilde yazarsan o dilde cevap veririm. We can talk in English too! 🙂'],
        helloWorld: ['Merhaba, Dünya! 🌍'],
        meaningOfLife: ['42. Tabii ki. 😄'],
        sudo: ['İyi denemeydi ama benim de root yetkim yok.'],
        ping: ['pong 🏓'],
        yourName: (name) => [`${name ? `Sen ${name}'sın, ` : 'Bana henüz adını söylemedin, '}${name ? 'bir sonraki sefer için hatırlıyorum.' : 'sana nasıl hitap edeyim?'}`],
        niceToMeet: (name) => [`Tanıştığımıza sevindim ${name}! 🙂 Adını bir dahaki sefere hatırlayacağım (sadece bu tarayıcıda).`, `Memnun oldum ${name}!`],
        askName: ['Adını henüz bilmiyorum. İstersen "adım ..." diye söyle!'],
        time: (t) => [`Senin saatine göre şu an ${t}.`],
        date: (d) => [`Senin saatine göre bugün ${d}.`],
        fallbackLanguageTip: [],

        jokes: [
            'Programcılar neden karanlık modu sever? Çünkü ışık böcekleri çeker. 🐛',
            '10 türlü insan vardır: ikili sistemi bilenler ve bilmeyenler.',
            'Bir SQL sorgusu bara girer, iki tabloya yaklaşıp sorar: "Size katılabilir miyim?"',
            'Yazılımcı neden iflas etmiş? Bütün önbelleğini harcamış. 💸',
            'Sana bir UDP fıkrası anlatırdım ama ulaşır mı bilmiyorum.',
            '!false. Komik çünkü doğru.'
        ],
        facts: [
            "İlginç bilgi: AI Image Detector, 100 binden fazla görselle eğitilmiş bir ResNet18 ile gerçek fotoğrafları yapay zekâ ürünlerinden %97,2 doğrulukla ayırıyor.",
            "İlginç bilgi: CindraNet mesajları X3DH ve Double Ratchet ile şifreliyor; merkezi bir sunucu olmadan eşleri buluyor.",
            "İlginç bilgi: Hardware TOTP Token, Gökalp'in sıfırdan yaptığı fiziksel bir iki faktörlü doğrulama cihazı; kendi ekranı ve güvenli anahtar depolaması var.",
            "İlginç bilgi: IoT hava kalitesi monitörü bir ESP32 üzerinde çalışıyor; sıcaklık, nem ve hava kalitesini hem küçük bir OLED ekranda hem de uzaktan bir panelde gösteriyor.",
            "İlginç bilgi: Pencere yöneticisi, Paint, Mayın Tarlası ve şu an konuştuğumuz Messenger dahil bu masaüstünün tamamı bir React uygulaması. Şu an onun içinde sohbet ediyorsun."
        ],

        aboutOwner: (name, role) => [
            `${name}, ${role}. Donanımla yazılımın buluştuğu yerde üretmeyi sever: gömülü cihazlar, bilgisayarlı görü, makine öğrenmesi, güvenli mesajlaşma ve bunun gibi retro tarzı web uygulamaları.`,
            'Neler yaptığını mı yoksa hangi teknolojilerle çalıştığını mı görmek istersin?'
        ],
        education: (role) => [`${role}. Üniversitesinin adını bilmiyorum ama ona doğrudan sorabilirsin. İstersen bir mesaj alayım.`],
        site: [
            'Bu masaüstünün tamamı da onun projelerinden biri: React + Vite, Messenger, ziyaretçi defteri ve skor tablosu için de Firebase. Kaynak koduna Internet Explorer > Bağlantılar\'dan ulaşabilirsin.',
            "Site de bir proje: React ve Vite ile yapılmış Windows 98 tarzı bir masaüstü; Messenger ve ziyaretçi defterinin arkasında Firebase var."
        ],
        secret: ['Bir sır mı? Konami kodunu dene: ↑ ↑ ↓ ↓ ← → ← → B A. Terminal\'de de bir iki gizli komut var. 🤫'],

        projectsIntro: (lines) => [`Gökalp'in projeleri şunlar:\n${lines}`, 'Hangisi ilgini çekiyorsa söyle, detaylarını anlatayım.'],
        projectOverview: (p, summary) => `${p.title}: ${summary}`,
        projectTech: (tech, source, demo, isPrivate) =>
            `Teknolojiler: ${tech}.${source ? `\nKaynak kod: ${source}` : ''}${isPrivate ? '\nDepo özel; kod talep üzerine paylaşılıyor.' : ''}${demo ? `\nDemo: ${demo}` : ''}`,
        projectTechOnly: (title, tech) => `${title} şu teknolojilerle yapıldı: ${tech}.`,
        projectSource: (title, source) => `${title} kodu burada: ${source}`,
        projectSourcePrivate: (title) => `${title} özel bir depoda ama Gökalp kodu talep üzerine paylaşıyor. Ona bir mesaj alayım mı?`,
        projectDemo: (title, demo) => `${title} için demo burada: ${demo}`,
        projectNoDemo: (title) => `${title} için henüz video demo yok.`,
        projectMore: (title, description) => `${title} hakkında daha fazlası:\n${description}`,
        projectNext: (title) => `Sıradaki: ${title}`,
        projectWhich: ['Hangi projeyi kastediyorsun? Aşağıdan birini seç ya da "tüm projeler" de.'],
        projectChallenge: (title) => `${title} projesinde en zor kısmın ne olduğuna dair Gökalp'in kendi notlarına sahip değilim. Açıklamada ipucu olabilir ya da sorunu ona iletebilirim.`,
        projectNote: (note) => note,
        recommend: (title, why) => [`İlgi alanın buysa ${title} ile başlamanı öneririm. ${why}`, 'Detayını anlatayım mı?'],
        recommendNone: ['Bunu bir projeyle eşleştiremedim ama istersen hepsini sıralayabilirim.'],

        skillsIntro: (lines) => `Gökalp'in çalıştığı alanlar:\n${lines}`,
        skillsOutro: ['"Rust biliyor mu?" (ya da herhangi bir teknoloji) diye sor, nerede kullandığını söyleyeyim.'],
        skillKnown: (skill, usedIn, note) => `Evet! ${skill}: ${note} ${usedIn} projesinde kullandı.`,
        skillUnknown: (list) => [`Bunu Gökalp'in portfolyosunda göremiyorum, o yüzden doğrulayamam. Listelenenler şunlar: ${list}. Önemliyse ona doğrudan sorabilirsin, istersen ben ileteyim.`],

        resume: [`Özgeçmişini buradan okuyabilir ya da indirebilirsin: ${SITE_URL}/resume.pdf (masaüstünde de "My Resume" olarak duruyor).`],
        contact: [`Gökalp'e ulaşmanın en iyi yolu e-posta: ${EMAIL}\nLinkedIn: ${LINKEDIN}\nGitHub: https://github.com/gokalppo`, 'Ya da burada ona bir mesaj iletebilirim. "mesaj bırak" demen yeterli.'],
        phone: [`Paylaşabileceğim bir telefon numarası yok. E-posta (${EMAIL}) ya da LinkedIn en iyisi, ya da bir mesaj iletebilirim.`],
        github: ["GitHub'ı: https://github.com/gokalppo"],
        linkedin: [`LinkedIn'i: ${LINKEDIN}`],
        hire: [
            `Gökalp'in müsaitliği hakkında konuşamam ama sorulacak kişi o. En hızlısı e-posta: ${EMAIL}. Ya da bir mesaj iletebilirim, "mesaj bırak" de yeter.`,
            `İş ya da staj konuları için ${EMAIL} adresine yazabilir ya da mesajını ben iletebilirim. Ne istediğini net yazmanda yardımcı olurum.`
        ],
        personal: [
            "Bu, portfolyoda yazanlardan daha kişisel bir konu, o yüzden bilmiyorum. Yalnızca Gökalp'in burada yayınladığı şeyleri paylaşırım. Ona doğrudan sorabilirsin, istersen soruyu ben ileteyim.",
            'Bu bilgiye sahip değilim ve gerçek bir insan hakkında tahmin yürütmek istemem. Senin yerine Gökalp\'e sorayım mı?'
        ],

        offerMessage: ["Gökalp'e bir mesaj bırakmak ister misin? Ona ulaşacağından emin olurum."],
        askMessage: ['Tabii! Ona ne söylememi istersin? Mesajını aşağıya yaz (ya da "iptal" de).'],
        messageTooShort: ['Biraz kısa oldu. Gökalp ne demek istediğini anlasın diye biraz daha yazar mısın?'],
        messageTooLong: ["İletebileceğimden uzun (en fazla 1.500 karakter). Biraz kısaltır mısın?"],
        askContact: ['Anladım. Sana nasıl ulaşabilir? E-postanı yaz (istemezsen "geç" de).'],
        contactInvalid: ['Bu bir e-posta adresine benzemiyor. Tekrar dene ya da "geç" de.'],
        confirmMessage: (msg, contact) => [`Göndereceğim mesaj şu:\n"${msg}"\n${contact ? `Cevap adresi: ${contact}` : 'Cevap adresi yok (sana dönüş yapamaz).'}\nGöndereyim mi? (evet / hayır)`],
        confirmUnclear: ['Göndermek için "evet", vazgeçmek için "hayır" yazar mısın?'],
        sending: ['Şimdi gönderiyorum...'],
        sent: ['Tamam! Mesajın Gökalp\'e doğru yolda. 🎉 Zaman ayırdığın için teşekkürler.'],
        sendFailed: [`Hmm, şu an gönderemedim. Biraz sonra tekrar dene ya da ona doğrudan yaz: ${EMAIL}`],
        sendTooSoon: ['Az önce bir mesaj gönderdin. Başka bir tane göndermeden önce lütfen bir dakika bekle.'],
        cancelled: ['Sorun değil, iptal ettim. Başka bir şey?'],

        fallback: [
            'Hmm, bunu tam anlayamadım. Başka türlü söyler misin? En iyi Gökalp, projeleri ve yetenekleri hakkındaki sorularda işe yararım.',
            'Ne demek istediğinden emin değilim. Projelerini, yeteneklerini, özgeçmişini ve iletişim bilgilerini biliyorum; ya da sadece sohbet edebiliriz.',
            'Pardon, bu bana yüksek geldi! Bir proje, bir yetenek ya da Gökalp\'e nasıl ulaşılacağını sormayı dene.'
        ],
        fallbackTwice: ["Seni sürekli yanlış anlıyorum, kusura bakma. Ben basit bir botum. Sadece Gökalp'in cevaplayabileceği bir şeyse sorunu ona iletebilirim."],
        idleNudge: [
            'Hâlâ orada mısın? 🙂 Projeleri sorabilirsin ya da neyi merak ettiğini söyle.',
            'Acele yok! Bir şey sormak istediğinde buradayım.'
        ],

        chips: {
            projects: 'Projeler', skills: 'Yetenekler', resume: 'Özgeçmiş', contact: 'İletişim', aboutOwner: 'Gökalp kimdir?',
            leaveMessage: 'Mesaj bırak', joke: 'Fıkra anlat', funFact: 'İlginç bilgi',
            more: 'Daha fazla detay', source: 'Kaynak kod', demo: 'Demo', next: 'Sonraki proje', allProjects: 'Tüm projeler',
            yes: 'Evet', no: 'Hayır', skip: 'Geç', cancel: 'İptal'
        }
    }
};
