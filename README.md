# gokalppoOS

> A fully interactive Windows 98 desktop that doubles as my developer portfolio.
> Boot it, double-click around, open a terminal, draw in Paint, chat in a real-time Messenger.

**Live:** [gokalppo.me](https://gokalppo.me)

![gokalppoOS desktop with the Terminal open](docs/screenshots/terminal.jpg)

## What is this?

Instead of a static page of cards, my portfolio is a tiny operating system running in the browser. You get a BIOS boot screen, a desktop with draggable icons, a Start menu and taskbar, and overlapping windows you can move, maximize, and close. The portfolio content (resume, projects, contact) lives inside the apps, and everything else is there because building it was fun and a good way to practice real front-end and real-time engineering.

## Features

### The OS shell
- **BIOS boot sequence**, Windows 98 startup and shutdown sounds, taskbar with a live clock and volume control
- **Window manager**: drag, maximize on title-bar double-click, focus and z-order handling, taskbar entries per window
- **Desktop icons** you can drag, multi-select with a selection box, and rearrange. Positions persist in `localStorage`, and right-click > **Arrange Icons** animates them back to their defaults
- **Virtual file system** shared by My Computer, the Recycle Bin, and Notepad: create folders and files, rename, delete to the bin, restore, or delete permanently. Stored in `localStorage`
- **Clippy-style assistant** that gives context-aware tips depending on which app you have focused (and follows your cursor with its eyes)
- **Warp-speed screensaver** after two minutes of inactivity
- **Hidden easter egg**: try the Konami Code

### Apps
| App | What it does |
| --- | --- |
| **My Resume** | Embedded PDF resume |
| **Gallery** | Project showcase with tech-stack badges |
| **Terminal** | Real commands: `help`, `about`, `projects`, `github`, `linkedin`, `resume`, `contact`, `neofetch`, `matrix`, `ls`, `date`, `clear` |
| **Messenger** | MSN-style real-time chat (details below) |
| **Notepad** | Text editor with New / Open / Save / Save As and `.txt` download, backed by the virtual file system |
| **Paint** | Pencil, eraser, line, rectangle and ellipse (outlined or filled), bucket fill, color palette, undo, and PNG export |
| **Minesweeper** | The classic, with flags and a timer |
| **Music Player** | Playlist player |
| **My Computer / Recycle Bin** | File Explorer over the virtual file system |
| **Contact** | Contact card with copy-to-clipboard email |
| **Visitor counter** | Real, atomic counter stored in Firebase |

### Messenger (the big one)
- Email/password accounts via Firebase Authentication
- Global chat rooms and **private one-to-one chats**
- Friend requests (send, accept, decline) with unread-message badges
- Online / away / busy / offline presence, with automatic *away* after inactivity and `onDisconnect` cleanup
- **Nudge** (shakes the other person's window), notification sounds
- **Live typing indicator** ("... is typing") in private chats
- Admin role with message moderation and user bans, enforced in the database rules, not just the UI

## Tech stack

- **React 19** + **Vite 7**
- **Firebase** Authentication and Realtime Database
- **react-draggable** for window and icon dragging
- **EmailJS** for the contact form
- Hosted on **Netlify**, deployed automatically from `main`

## Architecture

```
src/
├── App.jsx                  # Boot flow, window state, focus/z-index, global overlays
├── firebase.js              # Firebase app, auth and database instances
├── context/
│   ├── OSContext.jsx        # Volume and the close-window event bridge
│   └── FileSystemContext.jsx# localStorage-backed virtual file system
└── components/
    ├── Desktop.jsx          # Icons, selection, context menu, window rendering
    ├── Window.jsx           # Draggable / maximizable window chrome
    ├── Taskbar.jsx, StartMenu.jsx
    ├── BootScreen.jsx, BSOD.jsx, ScreenSaver.jsx, Clippy.jsx, VisitorCounter.jsx
    └── apps/                # Terminal, Paint, Notepad, FileExplorer, Gallery, Minesweeper, ...
        └── messenger/       # Login, container and the chat interface
```

A few design decisions worth mentioning:

- **Code splitting.** Every app is loaded with `React.lazy`, and the Firebase SDK is deferred until it is needed. The initial JavaScript bundle went from ~582 KB to ~271 KB, and each app (2-30 KB) is fetched the first time you open it.
- **State kept out of stale closures.** Rapid-fire interactions (double-clicks, fast window focus changes, multi-icon drags) read from refs that are updated synchronously next to React state, which fixed several race conditions with `z-index` and drag selection.
- **Security lives in the database rules.** The client is never trusted: `role` and `isBanned` can only be changed by admins, private messages and typing state are readable only by the two participants, friend lists cannot be forged, and email addresses are kept in a separate `userPrivate` node. Rules are in [`database.rules.json`](database.rules.json).

## Running it locally

Requires Node.js 18+.

```bash
git clone https://github.com/gokalppo/gokalppoOS.git
cd gokalppoOS
npm install
npm run dev
```

Open <http://localhost:5173>, wait for the BIOS text, and press **Enter**.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

### Using your own Firebase project

The app talks to my Firebase project by default. The Firebase web config in [`src/firebase.js`](src/firebase.js) is public by design (it only identifies the project; access is controlled by the security rules). To run your own backend:

1. Create a Firebase project and enable **Authentication** (Email/Password) and **Realtime Database**.
2. Replace the config object in `src/firebase.js`.
3. Publish the rules from `database.rules.json` in the Realtime Database console.
4. Set up your own EmailJS keys in `src/components/apps/OutlookExpress.jsx` if you want the contact form to send mail.

## Screenshots

| | |
| --- | --- |
| ![Gallery](docs/screenshots/gallery.jpg) | ![Paint](docs/screenshots/paint.jpg) |
| ![My Computer](docs/screenshots/my-computer.jpg) | ![Minesweeper](docs/screenshots/minesweeper.jpg) |

## Roadmap

- Mobile / touch-friendly layout
- Welcome window and an About Me app
- Messenger demo bot for visitors who are not signed in
- Keyboard navigation and screen reader support
- Tests for the file system and terminal commands

## Author

**Gokalp Eker**, computer engineering student.
[GitHub](https://github.com/gokalppo) · [LinkedIn](https://www.linkedin.com/in/gokalp-eker/) · [gokalppo.me](https://gokalppo.me)
