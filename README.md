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

# Start the development server (runs on port 5000)
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

## ✨ Key Features
* **Google Authentication:** Secure login using Firebase Auth.
* **Real-time Messaging:** Powered by Socket.io for instantaneous 1-on-1 and Group chats.
* **Friend System:** Search users by email, send/accept/reject friend requests.
* **Group Chats:** Create groups, add/remove members (Admins).
* **Presence & Typing:** See who is online and when they are typing.
* **Read Receipts:** Track message delivery and read status.
* **Responsive UI:** Modern, dark-mode native-like interface.

## 👥 Development Workflow

This project is pre-scaffolded based on a strict implementation plan. Check your respective checklist to track your progress:
* [Frontend Developer Checklist (DEV1_CHECKLIST.md)](./DEV1_CHECKLIST.md)
* [Backend Developer Checklist (DEV2_CHECKLIST.md)](./DEV2_CHECKLIST.md)
