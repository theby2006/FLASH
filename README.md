# ⚡ FLASH — Real-Time Chat App

A WhatsApp-like real-time chat application built with a modern stack, tailored for a two-developer team.

## 🧱 Tech Stack
* **Frontend:** React 18, TypeScript, Vite, Zustand, Socket.io-client, Firebase Auth (Google Sign-In)
* **Backend:** Node.js, Express, TypeScript, Socket.io, PostgreSQL, Prisma, Firebase Admin SDK

## 📁 Repository Structure

* `client/` - Frontend application (Vite + React)
* `server/` - Backend API and WebSocket server (Node + Express)
* `shared/types/` - TypeScript types shared across client and server
* `DEV1_CHECKLIST.md` - Implementation tasks for Developer 1 (Frontend)
* `DEV2_CHECKLIST.md` - Implementation tasks for Developer 2 (Backend)

## 🚀 Getting Started

### 1. Prerequisites
* Node.js (v18 or higher)
* PostgreSQL (or use the provided `docker-compose.yml`)
* A Firebase Project with Google Auth enabled

### 2. Database Setup (Local)
You can quickly spin up a local PostgreSQL database using Docker:
```bash
docker-compose up -d
```
*Database URL:* `postgresql://postgres:postgres@localhost:5432/flash_db?schema=public`

### 3. Server Setup (Dev 2)
```bash
cd server
npm install
# Copy the .env.example to .env and fill in your Firebase credentials
cp .env.example .env

# Run database migrations and generate Prisma client
npx prisma migrate dev --name init

# Start the development server (runs on port 5001)
npm run dev
```

### 4. Client Setup (Dev 1)
```bash
cd client
npm install
# Copy the .env.example to .env and fill in your Firebase Web App config
cp .env.example .env

# Start the Vite development server (runs on port 5173)
npm run dev
```

### 5. Run both apps from repo root (optional)
```bash
npm install
npm run db:up
npm run dev
```

## Google / Firebase authentication

FLASH uses **Firebase Auth** (not raw OAuth env vars in this repo):

1. Create a Firebase project and enable **Google** sign-in.
2. Link your Google OAuth Web client in Firebase Console (Authentication → Google).
3. Add `http://localhost:5173` as an authorized JavaScript origin in Google Cloud Console.
4. Copy the **Firebase Web app** config into `client/.env` (`VITE_FIREBASE_*`).
5. Generate a **Firebase Admin** service account JSON and map it to `server/.env` (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).

Do not commit `.env` files or OAuth client secrets.

## ✨ Key Features
* **Google Authentication:** Secure login using Firebase Auth.
* **Real-time Messaging:** Socket.io with instant delivery, typing, read receipts, and HTTP fallback refresh.
* **Friend System:** Search users by email, send/accept/reject friend requests.
* **Group Chats:** Create groups, add/remove members (Admins).
* **Presence & Typing:** See who is online and when they are typing.
* **Read Receipts:** Track message delivery and read status.
* **Voice & Video Calls:** 1:1 WebRTC calls with Socket.io signaling (DM friends only).
* **Responsive UI:** Modern, dark-mode native-like interface.

## Real-time + database

| Layer | Library | Role |
|-------|---------|------|
| **Persistence** | Prisma + PostgreSQL (Neon) | Messages, users, friendships, call history (`CallSession`) |
| **Live delivery** | Socket.io | `new_message`, presence, typing, call signaling |
| **Pattern** | DB first, then emit | e.g. `saveMessage()` → `emitToUser("new_message")` |

HTTP polling (`useAutoRefresh`) only backs up when the socket is disconnected.

## Voice & video calls (different devices)

Same PC / two browsers on `localhost` often works with **STUN only**. **Phone ↔ laptop** or **Wi‑Fi ↔ mobile data** needs **TURN** (media relay).

FLASH loads ICE servers from **`GET /api/calls/ice-servers`** (server env). Dev defaults include a public TURN relay when `ENABLE_DEV_TURN=true`.

### Test on phone + laptop (LAN)

1. Find your computer’s LAN IP, e.g. `192.168.1.100`.
2. Start server with `HOST=0.0.0.0` and client with Vite `host: true` (already configured).
3. On the **phone**, open `http://192.168.1.100:5173` — **not** `localhost`.
4. Sign in on both devices, open the same DM, try voice then video.
5. Allow mic/camera on both sides.

Optional: add your LAN origin to `CLIENT_URLS` in `server/.env`:
`CLIENT_URLS=http://localhost:5173,http://192.168.1.100:5173`

### Production TURN

Set on the **server** (not only the client):

```env
TURN_URL=turn:your-server.com:3478,turns:your-server.com:5349
TURN_USERNAME=your-user
TURN_CREDENTIAL=your-password
```

Or run local relay: `docker-compose up -d coturn` and point `TURN_*` at that host.

- Use the phone / camera icons in a **direct message** chat header.
- Both users must be **friends** and **online** (socket connected).
- **HTTPS** (or `localhost` / LAN IP) is required for camera/microphone.

## 👥 Development Workflow

This project is pre-scaffolded based on a strict implementation plan. Check your respective checklist to track your progress:
* [Frontend Developer Checklist (DEV1_CHECKLIST.md)](./DEV1_CHECKLIST.md)
* [Backend Developer Checklist (DEV2_CHECKLIST.md)](./DEV2_CHECKLIST.md)
