# 🧑‍💻 Developer 1 — Frontend Checklist
> **Stack**: React 18 + TypeScript + Vite + Firebase Auth + Socket.io-client + Zustand
> **Directory**: `FLASH/client/`
> **Mark tasks**: `[ ]` → `[x]` when done

---

## ⚙️ Phase 1 — Project Setup

- [ ] Initialize Vite + React + TypeScript project in `client/`
- [ ] Install dependencies: `firebase`, `axios`, `zustand`, `react-router-dom`, `socket.io-client`
- [ ] Set up `client/.env` with Firebase config values
- [ ] Configure `vite.config.ts` with proxy to backend (`/api` → `localhost:5000`)
- [ ] Set up `tsconfig.json` with strict mode and path aliases
- [ ] Clean up default Vite boilerplate files
- [ ] Create `src/index.css` with full design system (CSS variables, fonts, resets)
- [ ] Import Google Font (Inter/Outfit) in `index.html`

---

## 🔐 Phase 2 — Authentication

- [ ] Create Firebase app config in `src/services/firebase.ts`
- [ ] Initialize Firebase Auth with Google provider
- [ ] Create `AuthContext.tsx` with:
  - [ ] `currentUser` state (Firebase User)
  - [ ] `idToken` state (JWT string)
  - [ ] `signInWithGoogle()` function
  - [ ] `signOut()` function
  - [ ] Auto-refresh token on expiry
  - [ ] Call backend `POST /api/auth/login` after sign-in to register user in DB
- [ ] Create `useAuth.ts` hook
- [ ] Build `LoginPage.tsx`:
  - [ ] Full-screen centered layout
  - [ ] App logo / name "FLASH"
  - [ ] "Continue with Google" button (`GoogleSignInButton.tsx`)
  - [ ] Loading spinner during auth
- [ ] Set up `App.tsx` with `<Routes>`:
  - [ ] `/` → redirect based on auth state
  - [ ] `/login` → `LoginPage`
  - [ ] `/chat` → `ChatPage` (protected)
  - [ ] `*` → `NotFoundPage`
- [ ] Create protected route wrapper component

---

## 🌐 Phase 3 — API & Socket Setup

- [ ] Create `src/services/api.ts`:
  - [ ] Axios instance with `baseURL`
  - [ ] Request interceptor to attach `Authorization: Bearer <idToken>` header
  - [ ] Response interceptor for error handling
- [ ] Create `src/services/authService.ts`:
  - [ ] `loginWithBackend(idToken)` → POST `/api/auth/login`
- [ ] Create `src/services/userService.ts`:
  - [ ] `searchUserByEmail(email)` → GET `/api/users/search?email=`
  - [ ] `sendFriendRequest(receiverId)` → POST `/api/users/request`
  - [ ] `getPendingRequests()` → GET `/api/users/requests`
  - [ ] `respondToRequest(requestId, action)` → PATCH `/api/users/request/:id`
  - [ ] `getContacts()` → GET `/api/users/contacts`
- [ ] Create `src/services/chatService.ts`:
  - [ ] `getConversations()` → GET `/api/chats`
  - [ ] `getOrCreateDM(friendId)` → POST `/api/chats/dm`
  - [ ] `getMessages(conversationId, page)` → GET `/api/chats/:id/messages`
- [ ] Create `SocketContext.tsx`:
  - [ ] Connect socket with `auth: { token: idToken }`
  - [ ] Expose `socket` instance
  - [ ] Handle connect/disconnect lifecycle
- [ ] Create `useSocket.ts` hook

---

## 🗂️ Phase 4 — Global State (Zustand)

- [ ] Create `src/store/useChatStore.ts` with:
  - [ ] `conversations: Conversation[]`
  - [ ] `activeConversationId: string | null`
  - [ ] `messages: Record<conversationId, Message[]>`
  - [ ] `contacts: User[]`
  - [ ] `pendingRequests: FriendRequest[]`
  - [ ] `onlineUsers: Set<string>`
  - [ ] `typingUsers: Record<conversationId, string[]>`
  - [ ] Actions: `setActiveConversation`, `addMessage`, `setConversations`, etc.

---

## 👥 Phase 5 — Contacts & Friend Requests

- [ ] Build `SearchBar.tsx`:
  - [ ] Controlled input for email
  - [ ] Debounced search (300ms)
  - [ ] Show user result card or "Not found"
  - [ ] "Send Request" button (disabled if already sent/friends)
- [ ] Build `FriendRequestCard.tsx`:
  - [ ] Shows sender avatar, name, email
  - [ ] Accept ✅ / Reject ❌ buttons
  - [ ] Optimistic UI update on action
- [ ] Build `ContactList.tsx`:
  - [ ] Lists all accepted contacts
  - [ ] Click to open DM conversation
  - [ ] Shows online/offline indicator dot
- [ ] Build `ContactItem.tsx`:
  - [ ] Avatar + name + last message preview + timestamp
  - [ ] Unread message badge count
- [ ] Create `useFriendRequests.ts` hook:
  - [ ] Fetch pending requests on mount
  - [ ] Listen to `friend_request` socket event for real-time notifications

---

## 💬 Phase 6 — Chat UI

- [ ] Build `ChatPage.tsx` (main layout):
  - [ ] Left sidebar (contacts + groups + search)
  - [ ] Right panel (active chat window)
  - [ ] Responsive: sidebar collapses on mobile
- [ ] Build `ChatHeader.tsx`:
  - [ ] Shows conversation name / group name
  - [ ] Shows online status or last seen
  - [ ] Group info icon (opens `GroupInfoPanel`)
- [ ] Build `ChatWindow.tsx`:
  - [ ] Scrollable message list
  - [ ] Auto-scroll to bottom on new messages
  - [ ] Infinite scroll upward to load older messages
  - [ ] "Loading older messages…" indicator at top
  - [ ] Date separators between message groups
- [ ] Build `MessageBubble.tsx`:
  - [ ] Sent messages (right-aligned, accent color)
  - [ ] Received messages (left-aligned, neutral color)
  - [ ] Timestamp display
  - [ ] Read receipt ticks (✓ sent, ✓✓ read)
  - [ ] IMAGE type: display image inline
- [ ] Build `MessageInput.tsx`:
  - [ ] Auto-resizing textarea
  - [ ] Send button (click or Enter key)
  - [ ] Emoji picker placeholder
  - [ ] Emit `typing_start` / `typing_stop` socket events
  - [ ] Disable if no active conversation
- [ ] Create `useMessages.ts` hook:
  - [ ] Fetch message history on conversation change
  - [ ] Listen to `new_message` socket event
  - [ ] Emit `message_read` on message received
  - [ ] Manage `typingUsers` state from socket events

---

## 👥 Phase 7 — Group Chat

- [ ] Build `GroupList.tsx`:
  - [ ] List all group conversations in sidebar
  - [ ] Show group avatar, name, member count
- [ ] Build `CreateGroupModal.tsx`:
  - [ ] Group name input
  - [ ] Search & select members from contacts
  - [ ] Submit → POST `/api/groups`
  - [ ] Close and open new group chat
- [ ] Build `GroupInfoPanel.tsx`:
  - [ ] Slide-in panel from right
  - [ ] List members with role badges (Admin/Member)
  - [ ] Admin can add/remove members
  - [ ] Leave group button

---

## 🎨 Phase 8 — UI Components

- [ ] `Avatar.tsx`:
  - [ ] Profile image with fallback initials
  - [ ] Size variants: `sm`, `md`, `lg`
  - [ ] Online indicator dot overlay
- [ ] `Badge.tsx`:
  - [ ] Unread message count bubble
  - [ ] Auto-hides when count is 0
- [ ] `Modal.tsx`:
  - [ ] Backdrop blur overlay
  - [ ] Slide-up animation
  - [ ] Trap focus inside modal
  - [ ] Close on Escape key
- [ ] `Spinner.tsx`:
  - [ ] Animated loading circle
  - [ ] Size variants
- [ ] `Tooltip.tsx`:
  - [ ] Hover tooltip with arrow

---

## ✨ Phase 9 — Real-time Features

- [ ] Implement typing indicator display in chat header
- [ ] Implement online presence dots on contacts list
- [ ] Implement unread message counts (update on `new_message` event)
- [ ] Implement notification badge on browser tab title
- [ ] Sound notification on new message (optional)

---

## 📱 Phase 10 — Polish & Responsive

- [ ] Dark mode design (default)
- [ ] Fully responsive layout (mobile-first)
- [ ] Smooth transitions and micro-animations:
  - [ ] Message bubble fade-in
  - [ ] Sidebar slide animation
  - [ ] Modal open/close animation
- [ ] Empty states (no conversations, no contacts)
- [ ] Error states (network error toast)
- [ ] Loading skeletons for chat list and messages
- [ ] SEO meta tags in `index.html`
- [ ] Favicon and app title set to "FLASH"

---

## 🧪 Phase 11 — Testing & Integration

- [ ] Verify Google Sign-in works end-to-end
- [ ] Verify friend request flow (search → request → accept)
- [ ] Verify real-time DM messaging
- [ ] Verify group chat messaging
- [ ] Verify read receipts and typing indicators
- [ ] Cross-browser test (Chrome, Firefox, Safari)
- [ ] Mobile browser test

---

## 📦 Dev Commands

```bash
cd client
npm run dev       # Start dev server on http://localhost:5173
npm run build     # Production build
npm run preview   # Preview production build
```
