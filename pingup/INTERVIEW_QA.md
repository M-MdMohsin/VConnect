# PingUp — Interview Questions & Answers

A full-stack social media application (a "LinkedIn + Instagram" style platform) where users can create posts, share stories, follow/connect with others, and chat in real time.

---

## 1. Project Overview & Architecture

**Q: What is PingUp and what does it do?**
A: PingUp is a full-stack social media web application. Users sign up/log in via Clerk, create text/image posts, publish 24-hour stories, discover and follow other users, send connection requests, and message each other in real time. It has a feed page, connections page, discover/search page, profile pages, and a real-time chat system.

**Q: What is the overall architecture?**
A: It's a **client-server (MERN-style) monorepo** with two separate folders:
- `client/` — React 19 SPA built with Vite, using Redux Toolkit, React Router, Tailwind CSS, and Clerk for auth.
- `server/` — Node.js + Express 5 REST API backed by MongoDB (Mongoose), with Clerk Express for auth, ImageKit for media, Nodemailer for email, and Inngest for background jobs.

The client and server communicate over HTTP REST endpoints, plus a Server-Sent Events (SSE) stream for real-time messaging.

**Q: What is the request flow for a typical feature, e.g. fetching the feed?**
A: 1. The user is authenticated by Clerk; the client calls `getToken()` to obtain a JWT. 2. Axios sends a `GET /api/post/feed` request with `Authorization: Bearer <token>`. 3. Express runs `clerkMiddleware()` then the `protect` middleware, which calls `req.auth()` to verify the user. 4. The controller queries MongoDB for posts from the user's connections and followings, populates the user, and returns JSON. 5. The client stores results in local state and renders `PostCard` components.

---

## 2. Tools & Technologies

**Q: What tools/technologies did you use?**
A: **Frontend:** React 19, Redux Toolkit, React Router v7, Tailwind CSS v4, Vite, Axios, Clerk (`@clerk/clerk-react`), react-hot-toast, lucide-react, moment. **Backend:** Node.js, Express 5, MongoDB + Mongoose 9, Clerk Express (`@clerk/express`), ImageKit SDK, Multer, Nodemailer, Inngest. **Deployment/Infra:** Vercel (serverless backend + static client), dotenv, CORS.

**Q: Why did you choose Redux Toolkit?**
A: For predictable, centralized global state management. It handles async logic cleanly via `createAsyncThunk` and `createSlice`, and lets me share data (user, connections, messages) across many components without prop drilling.

**Q: Why use Clerk for authentication instead of building your own?**
A: Clerk provides a secure, production-ready auth solution out of the box — sign-in/sign-up UI, session management, JWT issuance, and social login. It reduces security risk and development time versus implementing password hashing, sessions, and OAuth myself. It also integrates with Express via `clerkMiddleware` and `req.auth()`.

**Q: What is ImageKit and why use it?**
A: ImageKit is a cloud media/asset CDN. It handles uploading, storage, and on-the-fly image transformation (e.g. `?tr=w-512,q-auto,f-webp` for resizing/optimization). I use it to upload post images, story media, profile/cover photos, and message attachments, and to serve optimized URLs. Files are uploaded as base64 buffers directly from memory.

**Q: Why Multer's `memoryStorage` instead of disk storage?**
A: Memory storage keeps uploaded files in RAM as a `Buffer` instead of writing to the server filesystem. This is essential for **serverless deployment on Vercel**, where the filesystem is ephemeral/read-only. It also avoids the `fs.readFileSync` issue we hit when the file wasn't written to disk.

**Q: What is Inngest?**
A: Inngest is a durable, event-driven background job/queue platform. It lets me define functions that trigger on events, cron schedules, or delays (sleeps). It handles retries and state persistence automatically. I expose it via `serve({ client: inngest, functions })` at `/api/inngest`.

**Q: What is Nodemailer used for?**
A: Sending transactional email (SMTP). I use it for connection-request notifications/reminders and daily "you have unseen messages" digests.

---

## 3. Workflow & Background Jobs (Inngest)

**Q: Describe your Inngest background workflows.**
A: I have six Inngest functions:
1. `sync-user-from-clerk` (trigger: `clerk/user.created`) — automatically creates a user record in MongoDB when a new Clerk user signs up.
2. `update-user-from-clerk` (trigger: `clerk/user.updated`) — syncs profile changes.
3. `delete-user-from-clerk` (trigger: `clerk/user.deleted`) — removes the user record.
4. `send-new-connection-request-reminder` (trigger: `app/connection-request`) — emails the recipient about a new connection request, then `sleepUntil` 24h later and sends a reminder if not yet accepted.
5. `story-delete` (trigger: `app/story.delete`) — `sleepUntil` 24h and deletes the story (auto-expiring stories).
6. `send-unseen-messages-notification` (cron: `0 9 * * *` America/New_York) — daily at 9 AM, counts unseen messages per user and emails each user a digest.

**Q: How does a controller trigger an Inngest function?**
A: By calling `inngest.send({ name: 'app/connection-request', data: {...} })`. For example, `sendConnectionRequest` sends event data with `connectionId`, and `addUserStory` sends `app/story.delete` with `storyId`. Inngest then runs the matching function asynchronously.

**Q: How do you achieve delayed/durable execution?**
A: Using `step.sleepUntil("label", date)` for time-based delays and `step.run("label", fn)` for individual steps. Inngest snapshots state and retries, making the workflow durable.

**Q: Why is the user-sync needed if Clerk already stores users?**
A: Clerk is the auth identity provider, but the app needs its own MongoDB `users` collection to store app-specific data like `bio`, `location`, `followers`, `following`, `connections`, and to reference users in posts/stories/messages. The Inngest event sync keeps these two sources consistent.

---

## 4. Messaging Feature (Real-time Chat)

**Q: Explain how the real-time messaging feature works.**
A: I implemented **1-on-1 real-time messaging using Server-Sent Events (SSE)**:
- **SSE endpoint:** `GET /api/message/:userId` → `sseController` sets `Content-Type: text/event-stream` headers, stores the client's `res` object in an in-memory `connections` map keyed by userId, sends an initial event, and cleans up on connection close.
- **Sending:** `POST /api/message/send` → creates a `Message` doc (text and/or image via ImageKit), saves it, then if the recipient is online (`connections[to_user_id]` exists) writes `data: <json>` to that recipient's SSE stream.
- **Receiving/client:** The React app opens `new EventSource(API + '/api/message/' + user.id)`. When a message arrives, if the user is on that chat page it dispatches `addMessage` to Redux; otherwise it shows a toast notification.
- **History:** `POST /api/message/get` returns the conversation (both directions) and marks incoming messages as seen.

**Q: Why did you choose SSE over WebSockets?**
A: SSE is simpler and uses regular HTTP, which works well in serverless/serverless-friendly environments and through proxies. It's perfect for one-way server→client streaming (like incoming messages), auto-reconnects, and doesn't require a separate protocol upgrade. For 1-on-1 chat pushes, SSE is sufficient; WebSockets would be needed for true bidirectional/low-latency scenarios.

**Q: What is the Message schema?**
A: `from_user_id` (ref User), `to_user_id` (ref User), `text`, `message_type` (enum: `text`/`image`), `media_url`, and `seen` (boolean, default false), with timestamps.

**Q: How do you handle image messages?**
A: Multer `memoryStorage` captures the file as `req.file.buffer`. In `sendMessage`, if an image is attached, I upload it to ImageKit as a base64 string and store the returned `media_url`. The message is saved with `message_type: 'image'`. The client renders the image from `message.media_url`.

**Q: How do you mark messages as seen?**
A: In `getChatMessages`, after fetching the conversation, I run `Message.updateMany({ from_user_id: to, to_user_id: me }, { seen: true })` so messages sent to the current user are marked read when they open the chat.

**Q: How does the "Recent Messages" sidebar work?**
A: `GET /api/user/recent-messages` returns messages where the current user is the recipient, populated with sender info. The client groups them by sender, keeps the latest per sender, sorts by date, and polls every 30 seconds via `setInterval`. It also shows an unread badge when `seen` is false, and displays relative time with `moment`.

**Q: How are real-time notifications shown when you're not on the chat page?**
A: In `App.jsx`, the `EventSource.onmessage` handler checks the current path. If the user is on `/messages/:userId`, it adds the message to Redux. Otherwise it renders a custom toast (`Notification` component) showing the sender's name and preview, which navigates to the chat when clicked.

**Q: What are the limitations of the current messaging implementation?**
A: 1. SSE connections are stored **in-memory**, so they break across multiple server instances / serverless invocations and don't survive restarts. 2. There's no "typing" indicator, read receipts per-message, or message editing/deletion. 3. Long-lived SSE connections can be problematic on serverless platforms. 4. The `connections` object has a naming bug (see below).

---

## 5. Security

**Q: How is authentication handled server-side?**
A: Express uses `app.use(clerkMiddleware())`, which validates the Clerk JWT from the `Authorization: Bearer` header on every request. The `protect` middleware then calls `await req.auth()` to get `userId`; if not present, it rejects the request. Controllers use `const { userId } = req.auth()` to identify the current user.

**Q: How do you protect routes?**
A: The `protect` middleware is applied to protected routes (posts, stories, messages, user data). It checks that `req.auth()` returns a valid `userId`; otherwise it returns `{ success: false, message: "not authenticeted" }`.

**Q: How are secrets handled?**
A: Sensitive values (MongoDB URI, ImageKit keys, SMTP credentials, Clerk keys, frontend URL) are stored in `.env` files and loaded via `dotenv`. The `.gitignore` excludes `.env` from version control so secrets are never committed.

**Q: What security measures exist for media uploads?**
A: Files are uploaded directly to ImageKit (a managed CDN) from memory buffers, rather than stored on the app server. This avoids local file storage and lets the CDN handle media delivery/transformation.

**Q: Are there any security concerns in the codebase?**
A: Yes, worth mentioning honestly:
- `PostCard.jsx` uses `dangerouslySetInnerHTML` with `post.content` (for hashtag highlighting). Because content is rendered as HTML, this is an **XSS risk** if content is not sanitized. A safer approach is escaping content first or using a sanitizer / rendering hashtags without raw HTML.
- CORS is set to open (`app.use(cors())`) in all environments, including the SSE header `Access-Control-Allow-Origin: *`.
- The `GET /api/user/profiles` route (`getUserProfiles`) is **not protected** by the `protect` middleware, so profile data can be fetched without authentication.
- The `seen` update and `getUserRecentMessage` rely on trusting the authenticated user id (which is fine), but the `to_user_id` in `getChatMessages` comes from the request body without verification that they are actually connected.

**Q: How do you prevent a user from seeing another user's private chat?**
A: In `getChatMessages`, the query filters by `$or` of `{from_user_id: me, to_user_id}` and `{from_user_id: to, to_user_id: me}`, so only messages where the authenticated user is a participant are returned. This scopes the query to the conversation between the two parties.

---

## 6. Data Models (MongoDB)

**Q: What are your main Mongoose models?**
A: `User`, `Post`, `Story`, `Connection`, and `Message`.
- **User:** `_id` (String, from Clerk), `email`, `full_name`, `user_name` (unique), `bio`, `profile_picture`, `cover_photo`, `location`, `followers[]`, `following[]`, `connections[]`.
- **Post:** `user` (ref), `content`, `image_urls[]`, `post_type` (text/image/text_with_image), `likes_count[]`.
- **Story:** `user`, `content`, `media_url`, `media_type` (text/image/video), `views_count[]`, `background_color`.
- **Connection:** `from_user_id`, `to_user_id`, `status` (pending/accepted).
- **Message:** `from_user_id`, `to_user_id`, `text`, `message_type`, `media_url`, `seen`.

**Q: Why is the User `_id` a String?**
A: Because Clerk provides its own user id. I reuse that Clerk id as the MongoDB `_id` so the frontend/backend can reference the same identity, avoiding a separate mapping table. This is why many other models store user references as `String` rather than `ObjectId`.

**Q: How do you model followers/following/connections?**
A: As arrays of user id strings on the `User` document. `following` = users I follow, `followers` = users following me, `connections` = mutual/bidirectional connections established via accepted connection requests.

**Q: How do you associate a message with a user in the response?**
A: Using Mongoose `.populate('from_user_id')` (and `to_user_id`). This replaces the stored id with the full user document so the client can display profile pictures and names without extra requests.

---

## 7. Key Features & Controllers

**Q: How does the Feed work?**
A: `getFeedPosts` fetches the current user, builds `userIds = [me, ...my connections, ...my following]`, and queries posts where `user` is in that set, sorted by newest first, populated with the author. This shows posts from the user's network.

**Q: How do Stories auto-expire?**
A: When a story is created, `addUserStory` sends the `app/story.delete` Inngest event. The `story-delete` function sleeps for 24 hours (`step.sleepUntil`) then deletes the story from MongoDB, so stories disappear after 24 hours.

**Q: How does the Connection system work?**
A: `sendConnectionRequest` checks a 24-hour limit (max 20 requests), checks for an existing connection, creates a `Connection` (status `pending`), and triggers the reminder email. `acceptConnectionRequest` finds the pending connection, adds both users to each other's `connections` array, and sets status to `accepted`. `getUserConnections` returns connections, followers, following, and pending requests.

**Q: How does the Like feature work?**
A: `likePost` checks if the user's id is already in `post.likes_count`; if so, it removes it (unlike), otherwise it pushes it (like). The client optimistically updates the UI based on the response.

**Q: How does user discovery/search work?**
A: `discoverUser` uses a regex (`$or`) across `user_name`, `email`, `full_name`, and `location` with case-insensitive matching, then filters out the current user. The Discover page triggers this on Enter key.

**Q: How does the Profile work?**
A: `getUserProfiles` looks up a user by id and returns their profile plus their posts (populated). The Profile page shows cover photo, info, and tabs for Posts/Media (posts with images)/Likes.

---

## 8. Deployment

**Q: How is the app deployed?**
A: Both the client and server are deployed on **Vercel**.
- **Client:** `vercel.json` rewrites all routes to `/` so client-side routing (React Router) works, and the SPA is served as static files.
- **Server:** `vercel.json` declares a single serverless function `server.js` that includes all code folders (`config`, `models`, `routes`, `controllers`, `middleware`, `inngest`, `node_modules`), and routes all requests to it. The server only calls `app.listen()` in local development (`NODE_ENV !== 'production'`); on Vercel it exports the Express `app` as the handler.

**Q: How do you handle the fact that the server is serverless?**
A: I avoid writing to the local filesystem (using Multer `memoryStorage`), avoid long-running in-memory state where possible, and export the Express app directly for Vercel. Background/durable work is offloaded to Inngest rather than relying on long-lived server processes.

---

## 9. Known Bugs / Improvements (honest assessment)

**Q: What bugs or areas for improvement did you notice?**
A:
1. **SSE connections bug:** In `messageController.js`, the module declares `const connection = {}` but the SSE controller references `connections[userId]` (and imports `{ connections }` from mongoose). The SSE map should be `connection`, not `connections`, otherwise real-time delivery won't work as intended.
2. **Unfollow typo:** `unfollowUser` references `useruser.following` instead of `user.following` — a runtime error.
3. **Populate syntax:** `getUserRecentMessage` uses `.populate('from_user_id  to_user_id')` (single string with two refs) which may not work as expected; should use an array `['from_user_id','to_user_id']`.
4. **XSS risk:** `dangerouslySetInnerHTML` in `PostCard` without sanitization.
5. **Unprotected route:** `GET /api/user/profiles` lacks the `protect` middleware.
6. **Polling:** Recent messages uses 30-sec polling instead of real-time SSE; could be unified.
7. **In-memory SSE map** doesn't scale horizontally or work reliably on serverless.

---

## 10. Quick "Behavioral" Answers

**Q: How would you scale the messaging feature?**
A: Move from in-memory SSE to a pub/sub approach (e.g., Redis pub/sub, or a managed real-time service), or use WebSockets via a gateway. Also, introduce a proper message thread model, pagination for chat history, typing indicators, and read receipts.

**Q: How would you add end-to-end encryption or secure file sharing?**
A: Use HTTPS everywhere, restrict CORS, protect all routes, validate/sanitize all inputs and file types, scan uploaded files, and for E2EE use client-side encryption keys (e.g., ECDH per conversation) so only participants can decrypt messages.

**Q: How would you test this app?**
A: Unit tests for controllers and utility functions (Jest/Vitest), integration tests for API routes with a test DB, component tests for React with React Testing Library, and E2E tests (Playwright/Cypress). Include tests for auth middleware and SSE messaging.

---

### Summary of Tech Stack
| Layer      | Tools |
|------------|-------|
| Frontend   | React 19, Redux Toolkit, React Router v7, Tailwind CSS v4, Vite, Axios, Clerk, react-hot-toast, lucide-react, moment |
| Backend    | Node.js, Express 5, MongoDB + Mongoose 9, Clerk Express, Multer (memory), ImageKit, Nodemailer, Inngest |
| Auth       | Clerk (JWT, `clerkMiddleware`, `req.auth()`) |
| Realtime   | Server-Sent Events (SSE) via native EventSource |
| Media      | ImageKit CDN |
| Email      | Nodemailer (SMTP) |
| Background | Inngest (events, cron, sleep) |
| Deploy     | Vercel (serverless + static) |
