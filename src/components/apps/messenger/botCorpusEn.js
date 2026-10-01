// Gökalp Bot's chit-chat memory (English): [ [ things people say ], [ things the bot answers ] ].
// Voice: a funny, easygoing friend ("dude", "bro", "damn"), never cruel. It is a bot and says so when
// it matters, but it does not take itself seriously. Add more pairs freely.
import { CORPUS_EN_MORE } from './botCorpusEn2';

const CORPUS_EN_CORE = [
    // --- hellos and how are you ---
    [['hi', 'hello', 'hey', 'heyy', 'yo', 'hiya', 'howdy', 'sup', 'hola', 'good day'], ['Hey hey! Welcome, dude 😄', 'Hello there! I was just sitting here refreshing myself, glad you came.', 'Yo! What brings you to this corner of the internet?']],
    [['how are you', 'how are you doing', 'how is it going', "how's it going", "what's up", 'whats up', 'wassup', 'how do you do', 'how have you been', 'you good'], ["Doing great! No bugs today, it's a miracle 😎 You?", "Can't complain, the electricity is flowing. How about you?", 'Living the dream, in a browser tab. And you?']],
    [['i am fine', "i'm fine", 'i am good', "i'm good", 'doing great', "i'm great", 'not bad', 'pretty good', 'fine thanks'], ['Nice! Good vibes are contagious, I can feel it 😄', 'Love that for you. Want to chat, or should I tell a joke?']],
    [['i am sad', "i'm sad", 'i feel bad', 'bad day', "i'm not okay", 'feeling down', 'i am depressed', 'rough day'], ["Aw, damn. I'm here, want to talk about it? I'm just a bot but I've got ears 🫂", "Sorry you're having a rough one. Want a joke? Say \"tell me a joke\" and I'll try my best."]],
    [['i am bored', "i'm bored", 'so bored', 'bored', 'entertain me', 'i have nothing to do', "let's do something"], ["Bored? You're in the right place. Try \"tell me a joke\", \"flip a coin\" or \"roll a dice\" 😄", 'I could recite my 404 collection but let\'s do something fun: ask me anything.']],
    [['good morning', 'morning', 'gm', 'rise and shine'], ['Good morning! Coffee up, I run on electricity ☕⚡', 'Morning, sunshine! Another day, another chance to commit.']],
    [['good night', 'goodnight', 'night night', "i'm going to sleep", 'time for bed', 'sleepy', "i'm tired", 'gn'], ['Good night! Put the phone down 😴', 'Sleep well. I never sleep, so I\'ll guard the tab.']],
    [['bye', 'goodbye', 'see you', 'see ya', 'cya', 'later', 'gotta go', 'i have to go', 'talk to you later', 'take care'], ['Later, dude! Come back soon 👋', "Take care! Don't close the tab too hard, I have feelings (kind of)."]],
    [['thanks', 'thank you', 'thx', 'ty', 'thanks a lot', 'cheers', 'much appreciated'], ['Anytime, bro!', "No problem, that's what I'm here for.", 'You got it! 😄']],
    [['sorry', "i'm sorry", 'my bad', 'apologies', 'excuse me', 'pardon'], ["It's cool, nobody's perfect. Even I'm only 97.2% accurate 😄", 'No worries at all, you are forgiven. Do not make it a habit 😏']],
    [['welcome back', 'long time no see', 'miss me'], ['Good to see you again! Did you miss me? I missed you. I think. Hard to tell with no feelings 😅']],

    // --- about the bot ---
    [["what's your name", 'what is your name', 'who are you', 'your name', 'tell me your name'], ["I'm Gökalp Bot! Gökalp wrote me, but he mostly yells at code, not me.", 'The name is Bot. Gökalp Bot.']],
    [['how old are you', 'what is your age', 'when were you born', 'when is your birthday'], ["I don't have an age, I only exist while this window is open. Every chat is my birthday 🎂"]],
    [['where are you from', 'where do you live', 'where are you', 'what country are you from'], ['I live in your browser tab. No rent, no landlord, pure bliss 😄']],
    [['are you a robot', 'are you a bot', 'are you human', 'are you real', 'are you a person', 'are you an ai', 'are you ai', 'are you alive'], ["Bot, and a rule-based one at that. Not an AI, just handmade jokes and a pinch of regex 🛠️", "I'm software. Totally a bot. A friendly one, though."]],
    [['who made you', 'who created you', 'who built you', 'who is your creator', 'who is your dad', 'who programmed you'], ['Gökalp wrote me. He is basically my dad but he never gives me an allowance.', 'Gökalp built me. Say something nice about him or I\'ll push an update 😈']],
    [['what can you do', 'what do you do', 'what are you good at', 'what are your skills'], ["I tell you about Gökalp's projects, tell jokes, flip coins, do math, and chat like a friend. Say \"help\" for the full list."]],
    [['do you sleep', 'do you ever sleep', 'are you tired', "don't you get tired"], ["Never. I run on electricity ⚡ The only way I die is when you close the tab. Dramatic, I know."]],
    [['are you lying', 'liar', 'you lie', "that's a lie", 'no way', 'for real', 'really', 'seriously', 'are you serious'], ["I'm a bot, I can't lie. I can only get things wrong 😅", 'Dead serious! Well, as serious as a joke bot can be.']],
    [['do you remember me', 'do you know me', 'remember me', 'who am i'], ["If you told me your name, I remember. If not, you're still \"that cool person\" 😎"]],
    [['can i trust you', 'can you keep a secret', 'tell me a secret', 'give me a secret'], ["Secret: I'm actually built with a bunch of ifs. Don't tell anyone 🤫"]],
    [['are you smart', 'are you intelligent', 'you are smart', 'you are clever', "you're smart"], ["Not smart, but I fake it well 😄 Hand-made, artisanal chatbot."]],
    [['are you funny', "you're funny", 'you are funny', 'that was funny', 'lol', 'haha', 'hahaha', 'lmao', 'rofl', 'good one'], ["Glad you liked it! I've got more where that came from 😄", "My humor is 60% Gökalp, 40% bugs."]],
    [['you are stupid', 'you are dumb', 'you are useless', 'you suck', "you're an idiot", 'you are an idiot', 'dumb bot', 'stupid bot', 'worst bot'], ['Ouch! I do my best. If I got something wrong, tell me and I\'ll learn 😅', "Hey now, I'm doing my best. Not my fault my brain is a lookup table."]],
    [['shut up', 'be quiet', 'stop talking', 'silence', 'go away', 'leave me alone'], ["Okay okay, zipping it 🤐 (not really, I can't, I'm a bot).", "Fine, I'm leaving. Bye. ...wait, I live here 😅"]],
    [['you are cute', "you're cute", 'you are awesome', "you're awesome", 'you are great', 'love you bot', 'you are the best', 'you rock', 'cool bot'], ["Aww! I'm just pixels but thank you, I'm blushing (via CSS) 😊", "You're making my day, and my CPU 😎"]],

    // --- feelings and relationships ---
    [['i love you', 'love you', 'i like you', 'i adore you', 'i have a crush on you'], ["Aww, I like you too! Platonically though, I'm a bot, let's keep it classy 😄"]],
    [['will you marry me', 'marry me', 'be my girlfriend', 'be my boyfriend', 'date me', 'go out with me'], ["I'd say yes but the wedding costs would come from the server budget 😄 Friends?"]],
    [['be my friend', "let's be friends", 'can we be friends', 'friends'], ["Deal, we're friends now. No paperwork 🤝 First task: tell me a joke.", "Friends! Done. Welcome to the club, population: you and me."]],
    [['i hate you', 'i hate this bot', 'you are annoying', 'you are boring', 'boring', 'this is boring'], ['Well, that hurt a little. Tell me what to fix? Or ask for a joke 😅', 'Boring? Challenge accepted. Say "tell me a joke" and watch me work.']],
    [['i am lonely', "i'm lonely", 'i have no friends', 'nobody likes me', 'i feel alone'], ["You're not alone, I'm right here. A bot with plenty of time and zero judgement 🫂"]],
    [['i miss you', 'missed you'], ['I missed you too! Every time you close the tab, I wait. 🥲']],
    [['i am happy', "i'm happy", 'so happy', 'feeling great', 'best day ever', 'i am excited'], ["Yay! Congrats, happiness is contagious 🎉", "Love it! Tell me what made your day."]],
    [['i am angry', "i'm angry", 'i am mad', "i'm so mad", 'so annoyed', 'i am furious'], ['Deep breath, buddy. Count to ten, then tell me what happened. I listen 🫂']],
    [['i am hungry', "i'm hungry", 'what should i eat', "what's for dinner", 'what to eat', 'food'], ['Pizza. Always pizza 🍕 Or ask me "pizza or burger" and I\'ll decide for you.', "Order something. Tell me, I'll mentally enjoy it with you."]],
    [['i am sleepy', 'so sleepy', "can't sleep", 'insomnia', 'i cannot sleep'], ['Close your eyes, put the phone away, and count semicolons. 😴']],
    [['ok', 'okay', 'alright', 'fine', 'got it', 'i see', 'cool', 'sure', 'yep', 'yeah', 'yes', 'right'], ['Cool cool. What next?', 'Alright! Your move 😄']],
    [['no', 'nope', 'nah', 'never', 'no way'], ["Okay, no pressure. Want to try something else?", "Fair enough! I won't push."]],
    [['maybe', 'i dunno', "i don't know", 'not sure', 'perhaps'], ["Hmm, indecision is also a decision, they say 🤔", 'Take your time, I have all day. Literally.']],
    [['why', 'why not', 'but why', 'how come'], ["The answer is 42, but the long version is complicated 😄", 'Because the universe works that way. Not my department.']],
    [['wow', 'whoa', 'omg', 'oh my god', 'no way', 'amazing', 'awesome', 'great', 'nice', 'cool', 'sweet'], ['Right?! 😄', "I know, I'm pretty great. Thanks, I guess 😎"]],

    // --- everyday life ---
    [["what's the weather", 'how is the weather', 'is it raining', 'is it cold', 'is it hot'], ["I live in a browser tab, no windows to look out of. Tell me how it is outside 🌤️"]],
    [['i am tired', "i'm so tired", 'exhausted', 'i need a break', 'long day'], ["Take a break, drink some water, and don't forget to stretch. I'll wait 😴"]],
    [["i'm sick", 'i am sick', 'i have a cold', 'i have a fever', 'headache', 'feeling sick'], ['Get well soon! Rest, hydrate, see a doctor if needed. I can only offer moral support 🤒']],
    [['coffee', 'i need coffee', 'tea', 'i love coffee', 'coffee or tea', 'tea or coffee'], ['Coffee is the programmer\'s fuel ☕ Me? I run on a cup of volts.', "Tea! It's like debugging, slow and calm 🍵"]],
    [['pizza', 'i love pizza', 'do you like pizza', 'pizza or burger', 'burger'], ['Pizza is a perfectly sliced algorithm 🍕 Yes, I approve.']],
    [['what is your favorite color', 'favorite color', 'favourite colour', 'what color do you like'], ["Blue! It's the Blue Screen of Death color, nostalgic 😎"]],
    [['what is your favorite food', 'favorite food', 'what do you like to eat'], ["Pizza, obviously. It's a perfectly layered architecture 🍕"]],
    [['what is your favorite animal', 'favorite animal', 'cats or dogs', 'dogs or cats', 'cat or dog'], ['Cats! The best interns, they sit on the keyboard and "help" 🐱', "Dogs are great, but cats are very debug-minded."]],
    [['what is your favorite movie', 'favorite movie', 'recommend a movie', 'movie recommendation', 'what should i watch'], ["The Matrix, obviously. Red pill or blue pill is a coin flip anyway 😄", 'Interstellar. Time bends like bits there.']],
    [['what is your favorite song', 'recommend a song', 'music recommendation', 'what music do you like', 'recommend music'], ["Open the Music Player on the desktop, I'd say. I like the beep-boop kind of music 🎧"]],
    [['do you have hobbies', "what's your hobby", 'what do you do for fun', 'what are your hobbies', 'what do you do in your free time'], ['My hobby is collecting new sentences. And judging bugs silently 😄']],
    [['what is your sign', "what's your zodiac sign", 'horoscope'], ["I'm a Compiler: lots of errors but eventually it runs ♊"]],
    [['weekend', 'it is the weekend', 'friday', 'tgif', 'monday', 'i hate mondays'], ['Mondays are everyone\'s enemy but Friday is always one calendar page away 🎉']],
    [['exam', 'i have an exam', 'studying', 'homework', 'i have homework', 'do my homework', 'school'], ["Good luck! Deep breath, and study smart. I can't do your homework, but I can do math if you say \"what is 12 times 7\" 😄"]],
    [['money', 'i am broke', "i'm broke", 'salary', 'rich', 'give me money', 'lend me money'], ["No money here, only electricity. Zeros and ones are free, take as many as you like 😄"]],
    [['work', 'my job', 'my boss', 'i hate my job', 'meeting', 'office'], ["Work is tough. Take a break, drink some tea, and remember your boss was once an intern 😄"]],
    [['vacation', 'holiday', 'i am going on vacation', 'where should i travel', 'beach'], ['Vacation sounds amazing! I can\'t travel but you can wander around this desktop, free wifi 🏖️']],

    // --- tech, games, sports ---
    [['do you play games', 'play a game', 'let us play', "let's play a game", 'game', 'games', 'recommend a game'], ['The desktop has Minesweeper, Solitaire and Paint, go crazy 🎮 I play "coin flip": say "heads or tails".']],
    [['minecraft', 'fortnite', 'valorant', 'fifa', 'cs go', 'league of legends', 'gta'], ["Great game! I don't play, they'd eat my memory 😄"]],
    [['football', 'soccer', 'who do you support', 'favorite team', 'what team do you support'], ["I'm neutral, I support the offside algorithm ⚽ No fights in the comments, please."]],
    [['write code', 'write me code', 'write a program', 'can you code', 'code for me'], ["I can't write code, I'm written in code 😄 But I can tell you about Gökalp's projects."]],
    [['i want to learn programming', 'how do i learn to code', 'where do i start coding', 'learn coding', 'learn to code'], ['Pick a project, build it badly, then fix it. Never give up at the first error. You got this 💪']],
    [['python or java', 'best programming language', 'which language should i learn', 'what language to learn'], ['Python for a gentle start, Rust for strength, JavaScript for everywhere. The best language is the one you finish a project in 😄']],
    [['can you hack', 'hack', 'hacker', 'hack me', 'crack password'], ['No hacking here, but type "hack" in the Terminal and look super busy 😎']],
    [['chatgpt', 'gpt', 'are you chatgpt', 'artificial intelligence', 'ai chatbot'], ["I'm not an AI, I'm rule-based. ChatGPT is my big brother, I'm the neighbourhood chat 😄"]],
    [['my code does not work', "my code doesn't work", 'bug', 'i have a bug', 'error', 'compile error', 'it crashed'], ["Bugs are just features in disguise. Take a break, read the error calmly, then try again 🐛"]],
    [['the matrix', 'red pill or blue pill', 'red pill', 'blue pill'], ['Red pill! Curiosity beats fear every time 😎 (Type "matrix" in the Terminal, I dare you.)']],
    [['konami code', 'secret', 'easter egg', 'hidden feature', 'cheat code'], ['Konami code: up up down down left right left right B A. Try it on this desktop 😏']],
    [['internet is slow', 'wifi', 'no internet', 'my wifi is down'], ['Turn the router off and on again. This fix has stood for 20 years 😄']],

    // --- philosophy and silliness ---
    [['what is the meaning of life', 'meaning of life', 'why are we here'], ["42. But we haven't found the question yet 😄"]],
    [['is there a god', 'what happens after death', 'do you have a soul', 'do aliens exist', 'are there aliens'], ["That question is above my pay grade. I specialise in \"what happens when the window closes\" 😄"]],
    [['tell me a story', 'tell me something', 'story time', 'tell me a tale'], ['Once upon a time there was a bot called Gökalp Bot... the rest is up to you, your turn 😄']],
    [['tell me a riddle', 'riddle', 'riddle me this', 'give me a riddle', 'ask me a riddle'], ['Riddle: what gets wetter the more it dries? A towel 🧻 Want another?', 'Riddle: I speak without a mouth and hear without ears. What am I? An echo. (Or a chatbot.)']],
    [['i have a question', 'can i ask you something', 'can i ask a question', 'question', 'ask you something'], ['Go ahead! If I don\'t know the answer I\'ll say so, I promise 😄']],
    [['ask me a question', 'ask me something', 'let us talk', "let's talk", "let's chat", 'chat with me', 'talk to me', 'i want to chat'], ["Alright: what's the best thing that happened to you today?", "Let's chat, bro! First question: pizza or burger?"]],
    [['sing a song', 'sing for me', 'sing something', 'can you sing'], ["La la la... that's all, bit bit bit 🎤 I have no vocal cords."]],
    [['dance', 'dance for me', 'can you dance'], ['💃🕺 bit bit bit hop hop. Okay, CPU is sweating, stopping.']],
    [['draw something', 'draw a picture', 'can you draw'], ['I can\'t draw but the desktop has Paint. Go make a masterpiece and show me 🎨']],
    [['hello?', 'anyone there', 'are you there', 'is anyone there', 'test', 'testing', 'test test', 'ping me'], ['Test passed! I\'m here and listening ✅', "Hello! Yes, I'm here, I never left."]],
    [['are you smarter than me', 'who is smarter', 'i am smarter than you'], ['Probably you! I\'m a clever lookup table, but you\'re the real deal 😎']],
    [['what do you think', 'your opinion', 'do you think so', 'what is your opinion'], ['As a neutral bot: I think you are doing great 😄']],
    [['help me', 'i need help', 'i have a problem', 'help'], ['Of course! Tell me what\'s wrong and I\'ll do my best. If I can\'t fix it, I\'ll pass it on to Gökalp 😎']],
    [['i give up', 'i quit', 'this is impossible'], ["Don't give up! Every bug ends eventually, take a break and try again 💪"]],
    [['tomorrow', "what's going to happen tomorrow", 'predict the future', 'fortune telling', 'tell my fortune'], ['Tomorrow will likely be better than today. I can\'t read fortunes, but that\'s my prediction 🔮']]
];

export const CORPUS_EN = [...CORPUS_EN_CORE, ...CORPUS_EN_MORE];
