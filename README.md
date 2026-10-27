# PULSE: Real-Time Live Polling System

A distributed live polling platform designed for high-concurrency audience voting and immediate results visualization without page reloads. Built using React, Go (Gin), Redis, and MongoDB.

---

## 1. Project Overview

PULSE provides a low-latency polling infrastructure where poll hosts can create questions, share them via direct link or QR code, and observe incoming votes broadcast in real time across all connected client displays.

### Primary Workflow
1. **Poll Creation**: Authenticated users configure questions, options, voting constraints (single or multiple choice), and optional expiration timers.
2. **Distribution**: The system generates a unique poll identifier, shareable URL, and vector QR code.
3. **Audience Participation**: Participants submit votes through any modern web browser without requiring account registration.
4. **Live Results Streaming**: As votes are recorded, updates are broadcast instantly to all active viewers over persistent WebSocket connections powered by Redis Pub/Sub.
5. **Analytical Export**: Completed and active polls can be exported on demand into structured PDF analytical reports.

---

## 2. Technology Stack and System Architecture

The application enforces a strict separation of concerns between presentation, routing, in-memory state management, and persistent storage.

```
+-----------------------------------------------------------------------------------+
|                                  SYSTEM TOPOLOGY                                  |
|                                                                                   |
|  [ Audience / Presenter Clients ]                                                 |
|          │                               ▲                                        |
|          │ HTTP (Vote / Query)           │ WebSocket Stream (Real-Time Updates)   |
|          ▼                               │                                        |
|  [ Go (Gin) API Gateway ] ───────────────┼────────────────────────┐               |
|          │                               │                        │               |
|          ├─► In-Memory Hot Path          │                        │               |
|          │   (Redis Atomic Operations)   │                        │               |
|          │           │                   │                        │               |
|          │           ├─► SADD (Deduplication)                     │               |
|          │           ├─► HINCRBY (Counters)                       │               |
|          │           └─► PUBLISH (Channel Event)                  │               |
|          │                      │                                 │               |
|          │                      ▼                                 │               |
|          │           [ Redis Pub/Sub Broker ] ────────────────────┘               |
|          │                                                                        |
|          └─► Asynchronous Write Path                                              |
|              (Background Goroutine)                                               |
|                      │                                                            |
|                      ▼                                                            |
|              [ MongoDB Atlas ] (Durable Ledger & Accounts)                        |
+-----------------------------------------------------------------------------------+
```

### Technology Breakdown

| Component | Technology | Responsibility |
|---|---|---|
| **Frontend** | React, Vite, Tailwind CSS, React Router | Client-side application, dynamic routing, real-time WebSocket state synchronization, and client-side PDF document compilation. |
| **Backend** | Go (Gin Web Framework) | REST API endpoints, request validation, JWT token issuance and verification, password hashing, and Gorilla WebSocket connection pooling. |
| **Realtime Engine** | Redis | In-memory atomic counters (`HINCRBY`), O(1) duplicate vote prevention (`SADD`), active spectator presence tracking (`INCR`/`DECR`), and distributed message brokering (`PUBLISH`/`SUBSCRIBE`). |
| **Persistent Storage**| MongoDB | Schema-enforced document storage for user profiles, poll metadata, options, and permanent historical vote transaction logs. |

---

## 3. Concurrency and Real-Time Engineering

Live polling applications experience extreme traffic surges during voting windows. The system handles high concurrency through the following mechanisms:

### In-Memory Atomic Counting
Traditional database updates (`UPDATE ... SET votes = votes + 1`) create severe row-locking contention and disk bottlenecks under concurrent load. PULSE routes the critical voting path entirely into Redis RAM using pipeline atomic operations:
- `HINCRBY poll:{id}:counts {option_id} 1` increments option totals in sub-millisecond time.
- `INCR poll:{id}:total` tracks overall turnout atomically.

### O(1) Duplicate Vote Prevention
To prevent multiple votes from the same device without forcing users to authenticate:
1. The backend constructs a SHA-256 fingerprint combining the client voter token, remote IP address, and User-Agent string.
2. The fingerprint is inserted into a Redis Set via `SADD poll:{id}:voters {fingerprint}`.
3. If the value already exists in the set, Redis returns `0`, and the backend immediately rejects the request with an HTTP 409 Conflict status code prior to any database operation.

### Asynchronous Persistence
To prevent disk write latency from slowing down voter responses:
- The persistent record insertion into MongoDB is dispatched to a background Go goroutine.
- The voter receives an immediate HTTP 200 response as soon as the in-memory write succeeds.

### Decoupled Pub/Sub Broadcasting
Instead of having the voting endpoint iterate over active client connections:
1. The vote handler publishes a single JSON event to the Redis channel `poll:{id}:events`.
2. A dedicated subscriber routine in the Go backend receives the message and fans it out across non-blocking WebSocket channels to all listening clients in that poll room.
3. This architecture enables seamless horizontal scaling: multiple backend instances can serve distinct client groups while remaining perfectly synchronized via the central Redis broker.

---

## 4. Input Validation and Security

All client inputs undergo server-side validation before processing:
- **Questions**: Must contain between 5 and 255 non-whitespace characters.
- **Options**: Polls must have between 2 and 8 distinct, non-empty options, each capped at 120 characters. Duplicate options are rejected.
- **Single vs. Multiple Choice**: The voting handler strictly enforces the poll configuration. If a poll is set to single-choice, payloads with more than one option ID are rejected with HTTP 400 Bad Request.
- **Poll State**: Closed or expired polls immediately reject incoming votes.
- **Authentication**: Poll management endpoints require a valid Bearer JWT. Passwords are encrypted using bcrypt with an adaptive cost factor.

---

## 5. Functional Features

- **Dynamic QR Code Generation**: Live results pages render a high-density vector QR code for immediate mobile device scanning.
- **Direct Link Sharing**: One-click URL copying with visual confirmation.
- **Live Spectator Tracking**: Concurrent active connections are registered in Redis to provide an accurate audience headcount.
- **Configurable Expiration**: Polls can be configured to automatically expire after a set time window (5m, 15m, 30m, 1h, 24h).
- **Creator Controls**: Hosts can manually close, reopen, or delete polls from their dashboard.
- **PDF Report Generation**: Direct client-side generation of formal summary reports detailing poll metadata, absolute vote counts, percentage shares, winning selections, and completion timestamps.

---

## 6. API Reference

### Authentication Endpoints
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | None | Register a new creator account. |
| `POST` | `/api/auth/login` | None | Authenticate credentials and receive a JWT token. |
| `GET` | `/api/auth/me` | Bearer | Retrieve authenticated user profile information. |

### Poll Management Endpoints
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/polls` | Bearer | Create a new poll with options and operational rules. |
| `GET` | `/api/polls/my` | Bearer | Retrieve all polls created by the authenticated user. |
| `GET` | `/api/polls/:id` | None | Fetch poll details, options, and current vote counts. |
| `PATCH` | `/api/polls/:id/status` | Bearer | Toggle a poll between open and closed states. |
| `DELETE` | `/api/polls/:id` | Bearer | Delete a poll and purge associated vote records. |
| `GET` | `/api/polls/:id/export` | None | Export raw poll configuration and vote ledger as JSON. |

### Voting and Real-Time Endpoints
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/polls/:id/vote` | None | Submit a vote with option identifiers and voter fingerprint. |
| `GET` | `/api/ws/polls/:id` | None | Establish persistent WebSocket stream for live results. |
| `GET` | `/api/health` | None | Health check returning MongoDB and Redis connection status. |

---

## 7. Project Directory Structure

```
.
├── backend/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go              # Application entry point, router, and graceful shutdown
│   ├── internal/
│   │   ├── config/config.go         # Environment variable configuration loader
│   │   ├── handlers/                # HTTP route controllers and WebSocket upgrader
│   │   ├── middleware/              # JWT verification and CORS middleware
│   │   ├── models/models.go         # Domain structures and BSON/JSON schemas
│   │   ├── services/hub.go          # WebSocket room manager and Redis subscriber
│   │   ├── storage/                 # MongoDB repository and Redis client wrappers
│   │   └── utils/                   # Cryptographic hashing, JWT, and fingerprints
│   ├── Dockerfile                   # Multi-stage production container build
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── components/              # UI components (buttons, cards, badges, QR modal)
│   │   ├── context/                 # Authentication and notification state providers
│   │   ├── pages/                   # Application views (Home, Login, Dashboard, Vote, Live)
│   │   ├── services/                # Axios HTTP client and WebSocket connection manager
│   │   └── utils/                   # Client-side PDF generation utility
│   ├── Dockerfile                   # Containerized frontend build with Nginx
│   ├── nginx.conf                   # Reverse proxy configuration
│   └── tailwind.config.js
├── docker-compose.yml               # Multi-container orchestration (App, MongoDB, Redis)
└── README.md
```

---

## 8. Deployment and Live URLs

The application is deployed across managed production environments:

- **Frontend Application**: `https://pulse-live-polling-five.vercel.app`
- **Backend API Service**: `https://pulse-live-polling-v3nf.onrender.com`
- **Database**: MongoDB Atlas (Cloud Cluster)
- **Cache & Pub/Sub Broker**: Upstash Redis (Cloud TLS Instance)

---

## 9. Local Development Setup

### Prerequisites
- Go 1.22 or higher
- Node.js 18 or higher
- MongoDB instance running on `localhost:27017`
- Redis instance running on `localhost:6379`

### Environment Configuration
Create a `.env` file in the `backend/` directory:
```ini
PORT=8085
MONGODB_URI=mongodb://localhost:27017
DB_NAME=livepoll
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=
JWT_SECRET=your_development_secret_key_here
FRONTEND_URL=http://localhost:5173
APP_ENV=development
```

### Running the Backend
```bash
cd backend
go run ./cmd/server
```
The backend initializes on port `8085`. Verify status via `http://localhost:8085/api/health`.

### Running the Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend starts on `http://localhost:5173`.

### Running via Docker Compose
To spin up all services (MongoDB, Redis, Go Backend, and React Frontend) in isolated containers:
```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8085`
