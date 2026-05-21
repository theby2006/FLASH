# 🧑‍💻 Developer 2 — Backend Checklist
> **Stack**: Node.js + TypeScript + Express + Socket.io + PostgreSQL + Prisma + Firebase Admin
> **Directory**: `FLASH/server/`
> **Mark tasks**: `[ ]` → `[x]` when done

---

## ⚙️ Phase 1 — Project Setup

- [ ] Initialize `server/` with `npm init -y`
- [ ] Install dependencies:
  - `express`, `cors`, `helmet`, `dotenv`, `express-async-errors`
  - `socket.io`
  - `prisma`, `@prisma/client`
  - `firebase-admin`
  - `zod` (validation)
- [ ] Install dev dependencies:
  - `typescript`, `ts-node-dev`, `@types/express`, `@types/cors`, `@types/node`
- [ ] Configure `tsconfig.json` (strict, target ES2020, module CommonJS)
- [ ] Configure `package.json` scripts:
  - `dev`: `ts-node-dev --respawn src/index.ts`
  - `build`: `tsc`
  - `start`: `node dist/index.js`
- [ ] Set up `server/.env` with `DATABASE_URL`, `PORT`, Firebase credentials, `CLIENT_URL`
- [ ] Create main entry `src/index.ts` with Express + Socket.io bootstrap
- [ ] Set up CORS to allow `CLIENT_URL`
- [ ] Set up `helmet()` for security headers
- [ ] Set up global error handler middleware

---

## 🔥 Phase 2 — Firebase Admin Setup

- [ ] Download Firebase service account JSON from Firebase Console
- [ ] Create `src/config/firebase.ts`:
  - [ ] Initialize `firebase-admin` app with service account credentials
  - [ ] Export `adminAuth` instance
- [ ] Create `src/middleware/authMiddleware.ts`:
  - [ ] Extract `Authorization: Bearer <token>` from header
  - [ ] Verify token with `adminAuth.verifyIdToken(token)`
  - [ ] Attach decoded user (`uid`, `email`, `name`, `picture`) to `req.user`
  - [ ] Return `401` if missing or invalid token

---

## 🗄️ Phase 3 — Database & Prisma

- [ ] Install and init Prisma: `npx prisma init`
- [ ] Set `DATABASE_URL` in `.env`
- [ ] Write full schema in `prisma/schema.prisma`:
  - [ ] `User` model (id, email, displayName, photoURL, createdAt)
  - [ ] `FriendRequest` model (id, senderId, receiverId, status, createdAt)
  - [ ] `RequestStatus` enum (PENDING, ACCEPTED, REJECTED)
  - [ ] `Friendship` model (id, userId, friendId)
  - [ ] `Conversation` model (id, isGroup, name, photoURL, createdAt)
  - [ ] `GroupMember` model (userId, conversationId, role, joinedAt)
  - [ ] `GroupRole` enum (ADMIN, MEMBER)
  - [ ] `Message` model (id, conversationId, senderId, content, type, createdAt, readBy)
  - [ ] `MessageType` enum (TEXT, IMAGE, FILE)
  - [ ] All relations correctly defined
- [ ] Run first migration: `npx prisma migrate dev --name init`
- [ ] Create `src/config/db.ts` with singleton Prisma client

---

## 🔐 Phase 4 — Auth Routes

- [ ] Create `src/controllers/authController.ts`:
  - [ ] `loginOrRegister`: find user by `uid` (email), upsert if not exists
  - [ ] Return full `User` object to client
- [ ] Create `src/routes/authRoutes.ts`:
  - [ ] `POST /api/auth/login` → `loginOrRegister` (protected by `authMiddleware`)
- [ ] Mount auth routes in `src/index.ts`

---

## 👤 Phase 5 — User Routes

- [ ] Create `src/controllers/userController.ts`:
  - [ ] `searchByEmail(email)`:
    - [ ] Validate email param is present
    - [ ] Find user by exact email match
    - [ ] Do not return the requesting user themselves
    - [ ] Return user or `null`
  - [ ] `sendFriendRequest(receiverId)`:
    - [ ] Validate receiver exists
    - [ ] Check no existing PENDING request or friendship already exists
    - [ ] Create `FriendRequest` with status PENDING
    - [ ] Emit `friend_request` socket event to receiver
  - [ ] `getPendingRequests()`:
    - [ ] Return all PENDING requests where `receiverId === currentUser.id`
    - [ ] Include `sender` details
  - [ ] `respondToRequest(requestId, action: 'ACCEPT' | 'REJECT')`:
    - [ ] Verify the request belongs to current user as receiver
    - [ ] If ACCEPT: update status, create two `Friendship` rows
    - [ ] If REJECT: update status to REJECTED
  - [ ] `getContacts()`:
    - [ ] Return all `Friendship` rows for current user
    - [ ] Include friend's `User` details
- [ ] Create `src/routes/userRoutes.ts`:
  - [ ] `GET /api/users/search?email=`
  - [ ] `POST /api/users/request`
  - [ ] `GET /api/users/requests`
  - [ ] `PATCH /api/users/request/:id`
  - [ ] `GET /api/users/contacts`
- [ ] All routes protected by `authMiddleware`

---

## 💬 Phase 6 — Chat Routes

- [ ] Create `src/controllers/chatController.ts`:
  - [ ] `getConversations()`:
    - [ ] Find all conversations where user is a `GroupMember`
    - [ ] Include latest message and unread count
    - [ ] Sort by `lastMessage.createdAt` DESC
  - [ ] `getOrCreateDM(friendId)`:
    - [ ] Check if a non-group conversation exists with exactly these two users
    - [ ] If not, create one and add both as members
    - [ ] Return conversation
  - [ ] `getMessages(conversationId, page, limit)`:
    - [ ] Verify user is a member of the conversation
    - [ ] Return paginated messages sorted by `createdAt` DESC
    - [ ] Include `sender` details
    - [ ] Return pagination metadata
- [ ] Create `src/routes/chatRoutes.ts`:
  - [ ] `GET /api/chats`
  - [ ] `POST /api/chats/dm`
  - [ ] `GET /api/chats/:id/messages`
- [ ] All routes protected by `authMiddleware`

---

## 👥 Phase 7 — Group Routes

- [ ] Create `src/controllers/groupController.ts`:
  - [ ] `createGroup(name, memberIds)`:
    - [ ] Validate at least 2 other members
    - [ ] Create `Conversation` with `isGroup: true`
    - [ ] Add creator as ADMIN, others as MEMBER
    - [ ] Return new conversation
  - [ ] `addMember(conversationId, userId)`:
    - [ ] Verify requester is ADMIN
    - [ ] Check user not already a member
    - [ ] Create `GroupMember` row
  - [ ] `removeMember(conversationId, userId)`:
    - [ ] Verify requester is ADMIN (or user removing themselves)
    - [ ] Delete `GroupMember` row
  - [ ] `getGroupInfo(conversationId)`:
    - [ ] Return conversation with all members and their roles
- [ ] Create `src/routes/groupRoutes.ts`:
  - [ ] `POST /api/groups`
  - [ ] `GET /api/groups/:id`
  - [ ] `POST /api/groups/:id/members`
  - [ ] `DELETE /api/groups/:id/members/:userId`
- [ ] All routes protected by `authMiddleware`

---

## ⚡ Phase 8 — Socket.io Server

- [ ] Create `src/socket/index.ts`:
  - [ ] Initialize Socket.io with CORS config
  - [ ] Auth middleware: verify token on `socket.handshake.auth.token`
  - [ ] Store `userId → socketId` mapping (in-memory Map)
  - [ ] On connect: mark user online, broadcast `user_online` to contacts
  - [ ] On disconnect: mark user offline, broadcast `user_offline` to contacts
  - [ ] Register chat handlers and presence handlers
- [ ] Create `src/socket/chatHandlers.ts`:
  - [ ] `join_conversation`:
    - [ ] Verify user is member of conversation
    - [ ] `socket.join(conversationId)`
  - [ ] `send_message`:
    - [ ] Validate payload (conversationId, content, type)
    - [ ] Verify user is member of conversation
    - [ ] Save message to DB via `messageService`
    - [ ] Emit `new_message` to the room (all members)
  - [ ] `message_read`:
    - [ ] Add `userId` to `readBy` array in DB
    - [ ] Emit `message_read` to sender's socket
  - [ ] `typing_start`:
    - [ ] Broadcast `typing_start` to room (excluding sender)
  - [ ] `typing_stop`:
    - [ ] Broadcast `typing_stop` to room (excluding sender)
- [ ] Create `src/socket/presenceHandlers.ts`:
  - [ ] On connect: query user's contacts, emit `user_online` to each online contact
  - [ ] On disconnect: emit `user_offline` to all online contacts

---

## 🛠️ Phase 9 — Services & Utilities

- [ ] Create `src/services/messageService.ts`:
  - [ ] `saveMessage(conversationId, senderId, content, type)` → create DB record, return with sender
  - [ ] `markMessagesRead(conversationId, userId)` → bulk update `readBy`
- [ ] Create `src/types/index.ts`:
  - [ ] `AuthRequest` (extends Express Request with `user` field)
  - [ ] All custom error types
- [ ] Create `src/middleware/errorHandler.ts`:
  - [ ] Catch all unhandled errors
  - [ ] Return consistent `{ success: false, message }` response
  - [ ] Log errors to console
- [ ] Add request validation with `zod` on all POST/PATCH routes
- [ ] Add rate limiting on auth and search endpoints (optional but good practice)

---

## 🧪 Phase 10 — Testing & Integration

- [ ] Test with Postman / Thunder Client:
  - [ ] `POST /api/auth/login` with valid Firebase token
  - [ ] `GET /api/users/search?email=test@gmail.com`
  - [ ] Full friend request flow (send → accept)
  - [ ] `POST /api/chats/dm` + message history
  - [ ] `POST /api/groups` + group messaging
- [ ] Test Socket.io events with two browser tabs
- [ ] Verify typing indicators work bi-directionally
- [ ] Verify read receipts update correctly
- [ ] Verify presence (online/offline) broadcasts correctly
- [ ] Load test with multiple simultaneous connections (optional)

---

## 🗃️ Phase 11 — Database Management

- [ ] Create seed script `prisma/seed.ts` for test users (optional)
- [ ] Set up Docker Compose for local PostgreSQL
- [ ] Document all migration commands in README
- [ ] Ensure indexes on: `email`, `senderId`, `receiverId`, `conversationId`, `createdAt`

---

## 📦 Dev Commands

```bash
cd server
npm run dev         # Start dev server with hot reload on http://localhost:5000
npx prisma studio   # Visual database browser
npx prisma migrate dev --name <migration_name>   # New migration
npx prisma generate                              # Regenerate Prisma client
npm run build       # Compile TypeScript
npm start           # Run compiled JS
```
