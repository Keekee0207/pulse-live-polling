# ⚡ PULSE • Live Polling Tool

> **A real-time, zero-refresh live audience polling platform crafted with a bold Neo-Brutalist aesthetic.**
> Built with **React**, **Go (Gin)**, **Redis**, and **MongoDB**.

---

## 🌟 Overview & Flow

```
+---------------+     +--------------+     +------------------+     +--------------------+
|  Create Poll  | --> |  Share Link  | --> |  Audience Votes  | --> |    Live Results    |
| (Host / Auth) |     |  or QR Code  |     |  (Zero friction) |     | (Redis WS updates) |
+---------------+     +--------------+     +------------------+     +--------------------+
```

1. **Create Poll**: Authenticated creators configure questions, options, custom Neo-palette colors, multi-choice toggles, and optional auto-close expiration timers.
2. **Share Link / QR**: Presenters project a high-contrast QR code or copy the shareable link.
3. **Audience Votes**: Audience members scan with their smartphone or open the link on desktop. No account or login required—vote with a single tap.
4. **Live Results**: The presenter screen and all spectator devices update **in real-time with zero page refresh**, powered by Go WebSockets and Redis Pub/Sub.

---

## 🛠️ Required Tech Stack: Architecture & Roles

Every layer of the stack does meaningful work:

| Layer | Technology | Primary Responsibilities |
|---|---|---|
| **Frontend** | **React + Vite + Tailwind CSS** | Neo-Brutalist UI, instant voting interface, interactive QR codes, real-time WebSocket client, confetti celebrations, and projector mode. |
| **Backend** | **Go (Gin Framework)** | REST API, input validation, JWT authentication, bcrypt hashing, WebSocket connection upgrade, and graceful lifecycle management. |
| **Realtime** | **Redis** | **Atomic vote counters** (`HINCRBY`), **O(1) duplicate vote prevention** (`SADD`), **Pub/Sub event broadcasting** (`PUBLISH`/`SUBSCRIBE`), and **active spectator presence tracking** (`INCR`/`DECR`). |
| **Database** | **MongoDB** | Persistent document storage for user accounts, poll configurations, options, and immutable vote audit logs. |

---

## ⚡ How Real-Time Redis Pub/Sub Works

```
[Audience Member]
       │
       ▼  HTTP POST /api/polls/:id/vote
[Go Gin Backend]
       │
       ├─► Redis SADD poll:{id}:voters {fingerprint} (Atomic anti-duplicate check)
       ├─► Redis HINCRBY poll:{id}:counts {opt_id} 1 (Atomic counter)
       ├─► MongoDB Insert (Persistent audit log)
       │
       └─► Redis PUBLISH poll:{id}:events {VOTE_UPDATE payload}
                  │
                  ▼
         [Redis Pub/Sub Channel]
                  │
                  ├────────────────────────┐
                  ▼                        ▼
        [Go Backend Node 1]      [Go Backend Node N]
                  │                        │
       [WebSocket Room Hub]     [WebSocket Room Hub]
                  │                        │
                  ▼                        ▼
         [Presenter Projector]     [Audience Screen]
```

- When any vote is cast, Redis atomically increments the counts and publishes a `VOTE_UPDATE` event.
- Every Go server instance subscribed to the Redis channel receives the message and pushes it through its WebSocket hub to all connected browser clients.
- If multiple backend instances are deployed across regions, **every spectator still receives the live update instantaneously**.

---

## 🎨 Neo-Brutalist UI/UX Features

- **Hard-Edged Borders**: High-contrast `3px` solid black borders across all cards, buttons, and inputs.
- **Geometric Drop Shadows**: `4px` to `8px` hard black drop shadows (`shadow-neo`, `shadow-neo-lg`).
- **Tactile Button Press**: Buttons physically depress on click (`active:translate-x-1 active:translate-y-1 active:shadow-none`).
- **Vibrant Retro Pop Palette**: Canary Yellow (`#FFE500`), Punch Pink (`#FF5C8D`), Mint Green (`#22E5A1`), Cyan Blue (`#38BDF8`), and Purple (`#C084FC`).
- **Sticker Badges**: Angled pill tags for statuses (`LIVE NOW`, `MULTI-CHOICE`, `CLOSED`, `EXPIRES SOON`).
- **Live Progress Bars**: Dynamic striped percentage bars that animate smoothly as votes roll in.

---

## 🚀 Key Features

- **Instant Mobile QR Code**: Generates crisp vector QR codes for presentation on projector screens and slides.
- **Active Spectator Tracking**: Tracks concurrent live viewers via Redis and shows real-time spectator badges.
- **Duplicate Vote Prevention**: Combines client fingerprinting + IP hashing + Redis `SADD` set verification to prevent double-voting.
- **Single & Multi-Choice Modes**: Supports single option radio selection or multi-option checkbox voting.
- **Auto-Close Timers**: Set expiration windows (5m, 15m, 1h, 24h) that automatically close the poll on schedule.
- **Creator Dashboard**: View engagement metrics, toggle poll open/closed status, delete polls, and export raw data.
- **Data Export**: 1-click JSON export containing full poll metadata, breakdown, and timestamped vote records.
- **Projector / Fullscreen Mode**: Clean full-viewport layout optimized for live talks, classrooms, and stream overlays.
- **Confetti Celebration**: Responsive particle blast when audience members submit a vote.

---

## 📂 Project Structure

```
GUVI INTERN/
├── backend/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go              # Server entry point & graceful shutdown
│   ├── internal/
│   │   ├── config/config.go         # Environment configuration
│   │   ├── handlers/                # HTTP & WebSocket route controllers
│   │   │   ├── auth_handler.go
│   │   │   ├── poll_handler.go
│   │   │   ├── vote_handler.go
│   │   │   └── ws_handler.go
│   │   ├── middleware/              # JWT Auth & CORS middleware
│   │   ├── models/                  # BSON/JSON struct definitions
│   │   ├── services/hub.go          # WebSocket room hub + Redis listener
│   │   ├── storage/                 # MongoDB & Redis client wrappers
│   │   └── utils/                   # Password hashing, JWT & fingerprinting
│   ├── Dockerfile
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── components/              # NeoButton, NeoCard, NeoBadge, QRCodeModal
│   │   ├── context/                 # AuthContext & ToastContext
│   │   ├── pages/                   # Home, Login, Register, Dashboard, Create, Vote, Results
│   │   ├── services/                # Axios API client & WebSocket manager
│   │   ├── index.css                # Neo-brutalist styling & custom scrollbars
│   │   └── App.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── tailwind.config.js
├── docker-compose.yml               # Complete 4-service stack composition
└── README.md
```

---

## 💻 Running Locally

### Prerequisites
- **Node.js** (v18+)
- **Go** (v1.22+)
- **MongoDB** running on `localhost:27017`
- **Redis** running on `localhost:6379`

### 1. Start Backend
```bash
cd backend
go run ./cmd/server
# Backend starts on http://localhost:8085
```

### 2. Start Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend starts on http://localhost:5173
```

---

## 🐳 Running with Docker Compose (One-Click)

Run the entire stack (MongoDB, Redis, Go Backend, and React Frontend) with a single command:

```bash
docker compose up --build
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8085
- **Redis**: `localhost:6379`
- **MongoDB**: `localhost:27017`

---

## ☁️ Deployment Guide

### Deploying Free on Cloud Services:
1. **Database**:
   - **MongoDB**: Provision a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) and copy the connection URI.
   - **Redis**: Provision a free Serverless Redis database on [Upstash](https://upstash.com) and copy the `rediss://...` connection URL.
2. **Backend**:
   - Deploy the `/backend` folder to **Render** or **Railway** or **Fly.io** as a Web Service.
   - Set environment variables:
     - `MONGODB_URI`: `<Atlas Connection String>`
     - `REDIS_ADDR`: `<Upstash Connection String>`
     - `JWT_SECRET`: `<Random 32-character Secret>`
     - `PORT`: `8085`
     - `FRONTEND_URL`: `https://your-frontend.vercel.app`
3. **Frontend**:
   - Deploy the `/frontend` folder to **Vercel** or **Netlify**.
   - Set environment variable:
     - `VITE_API_BASE_URL`: `https://your-backend.onrender.com/api`
     - `VITE_WS_BASE_URL`: `wss://your-backend.onrender.com/api`

---

## 📡 API Reference

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/health` | `GET` | Public | Healthcheck with MongoDB & Redis connectivity status |
| `/api/auth/register` | `POST` | Public | Register creator account |
| `/api/auth/login` | `POST` | Public | Sign in & receive JWT token |
| `/api/auth/me` | `GET` | Bearer | Get current user profile |
| `/api/polls` | `POST` | Bearer | Create a new poll with options and settings |
| `/api/polls/my` | `GET` | Bearer | List all polls created by current user |
| `/api/polls/:id` | `GET` | Public | Fetch poll details & current option vote counts |
| `/api/polls/:id/vote` | `POST` | Public | Cast vote (enforces duplicate prevention & multi-choice rules) |
| `/api/polls/:id/status`| `PATCH`| Bearer | Toggle poll open / closed status |
| `/api/polls/:id/export`| `GET` | Public | Export all votes and counts as JSON |
| `/api/polls/:id` | `DELETE`| Bearer | Delete poll and associated records |
| `/api/ws/polls/:id` | `WS` | Public | Real-time WebSocket connection for live counts |

---

## 👥 Demo Account Credentials

For quick evaluation, click the **"1-Click Demo Host Login"** button on the sign-in page, or use:
- **Email**: `host@livepoll.io`
- **Password**: `polling2026`
