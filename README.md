# ✨ Call – The Future of AI-Native Video Meetings

> 🚀 An **open-source AI-native alternative** to Google Meet and Zoom — built for speed, collaboration, and privacy.

---

<p align="center">
  <img src="https://raw.githubusercontent.com/joincalldotco/call/main/apps/web/public/logo.png" alt="Call Logo" width="160" />
</p>

<p align="center">
  <a href="https://joincall.co">🌐 Website</a> •
  <a href="https://github.com/joincalldotco/call">💻 GitHub</a> •
  <a href="https://discord.com/invite/bre4echNxB">💬 Discord</a> •
  <a href="https://x.com/joincalldotco">🐦 Twitter</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/joincalldotco/call?style=for-the-badge" />
  <img src="https://img.shields.io/github/issues/joincalldotco/call?style=for-the-badge" />
  <img src="https://img.shields.io/github/forks/joincalldotco/call?style=for-the-badge" />
  <img src="https://img.shields.io/github/license/joincalldotco/call?style=for-the-badge" />
</p>

---

## 🌟 Why Call?

Say goodbye to bloated, data-hungry apps. Call is lightweight, AI-driven, and privacy-first. Perfect for teams, friends, and communities that value simplicity and performance.

✨ **Highlights:**

* 🚀 Lightning-fast meetings with scalable media servers
* 🤖 AI-powered features (transcription, smart scheduling, insights)
* 🔒 Built-in privacy & security
* 🌍 Cross-platform (Web, PWA, Mobile responsive)
* ⚡ Offline-first for basic features
* 🎨 Beautiful, modern UI

---

## 🎥 Core Features

* **Video Calling** – Crystal-clear audio & video
* **Team Collaboration** – Chat, share, and work together seamlessly
* **Contact Management** – Keep your network smartly organized
* **Meeting Scheduling** – Integrated calendar support
* **AI Enhancements** – Summaries, captions, and intelligent workflows
* **Cross-Platform** – Browser, Mobile, and PWA ready
* **Security & Privacy** – Transparent, open-source architecture

<p align="center">
  <img src="https://raw.githubusercontent.com/joincalldotco/call/main/apps/web/public/screenshots/meeting-ui.png" alt="Meeting UI" width="700" />
</p>

---

## 🛠️ Tech Stack

**Frontend**

* ⚛️ Next.js 15 (React + App Router)
* 📘 TypeScript
* 🎨 Tailwind CSS + shadcn/ui
* 📡 Mediasoup-SFU (scalable video)
* 🔄 React Query + Zustand (state management)

**Backend**

* ⚡ Hono (lightning-fast web framework)
* 🐘 PostgreSQL + Drizzle ORM
* 🔑 Better Auth (secure authentication)

**Infrastructure**

* 📦 Turborepo (monorepo build system)
* 🐳 Docker & Docker Compose
* ▲ Vercel deployment
* 🚦 Built-in rate limiting

---

## ⚡ Quick Start

### Prerequisites

* Node.js v20+
* pnpm
* Docker & Docker Compose
* Git
* (Windows only) Microsoft Visual C++ Redistributable

### Installation

```bash
git clone https://github.com/joincalldotco/call.git
cd call

# Setup dev environment
./setup-dev.sh

# On Windows
./setup_dev_windows.sh
```

Visit:

* 🌐 Web app → [http://localhost:3000](http://localhost:3000)
* 🔌 Server → [http://localhost:1284](http://localhost:1284)

---

## ⚙️ Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/call
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
EMAIL_FROM=your_email@domain.com
RESEND_API_KEY=your_resend_api_key
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:1284
NODE_ENV=development
BETTER_AUTH_SECRET=your_generated_secret
```

---

## 📂 Project Structure

```
call/
├── apps/
│   ├── web/          # Next.js frontend
│   └── server/       # Hono backend
├── packages/         # Shared modules (auth, db, ui, configs)
├── docker-compose.yml
├── setup-dev.sh
└── turbo.json
```

---

## 👩‍💻 Development Workflow

1. **Branch** → `git checkout -b feature/my-feature`
2. **Develop** → Run `pnpm dev`
3. **Lint & Build** → `pnpm lint && pnpm build`
4. **Commit** → Follow [Conventional Commits](https://www.conventionalcommits.org/)
5. **PR** → Push and open a pull request 🎉

---

## 🌌 Fun Stuff

<p align="center">
  <img src="https://raw.githubusercontent.com/joincalldotco/call/main/apps/web/public/screenshots/stars-chart.png" alt="Stars Chart" width="700" />
</p>

* 🌟 Watch the project grow on GitHub stars
* 🪐 Check out contributor stats & graphs
* 🎉 Join our [Discord](https://discord.com/invite/bre4echNxB) for community events

---

## 🤝 Community & Support

* 💬 [Discord Community](https://discord.com/invite/bre4echNxB)
* 🐦 [Follow us on Twitter](https://x.com/joincalldotco)
* 📧 Email: [attiyassr@gmail.com](mailto:attiyassr@gmail.com)

---

<p align="center">Made with ❤️ by the Call team</p>
