# 🔥 Fire Chat

A real-time business communication platform built with Next.js, Socket.io, and PostgreSQL.

## Features

- 💬 **Real-time Messaging** - Instant message delivery with Socket.io
- 📢 **Channels** - Create public and private channels for team communication
- 👤 **Direct Messages** - One-on-one conversations
- 👥 **User Presence** - See who's online in real-time
- 📎 **File Sharing** - Upload and share files (images, documents, etc.)
- 🔐 **Authentication** - Secure login with NextAuth.js
- 🎨 **Modern UI** - Clean, responsive design with Tailwind CSS

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL with Prisma ORM
- **Real-time:** Socket.io
- **Authentication:** NextAuth.js
- **State Management:** Zustand
- **UI Components:** Radix UI

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/fire-chat.git
   cd fire-chat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/firechat_db"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
   SOCKET_PORT=3001
   ```

5. Set up the database:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

6. Run the development servers:
   ```bash
   # Terminal 1 - Next.js app
   npm run dev
   
   # Terminal 2 - Socket.io server
   npm run socket
   
   # Or run both together
   npm run dev:all
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## Deployment

### ⚠️ Important: Socket.io Server

> **Vercel is serverless and does NOT support WebSocket connections.** The Socket.io server must be hosted separately.

### Recommended Deployment Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     Vercel      │      │ Railway/Render  │      │    Neon/        │
│   (Next.js)     │◄────►│   (Socket.io)   │◄────►│   Supabase      │
│                 │      │                 │      │   (PostgreSQL)  │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

### Step 1: Deploy PostgreSQL Database

Use one of these managed PostgreSQL providers:
- **Neon** (recommended, free tier): [neon.tech](https://neon.tech)
- **Supabase**: [supabase.com](https://supabase.com)
- **Vercel Postgres**: Available in Vercel dashboard

### Step 2: Deploy Socket.io Server (Railway)

1. Create a `Procfile` in your project root:
   ```
   web: npx ts-node src/server/socket.ts
   ```

2. Deploy to Railway:
   - Go to [railway.app](https://railway.app)
   - Create new project → Deploy from GitHub
   - Select this repository
   - Add environment variables:
     - `PORT` = 3001 (or let Railway assign)
   - Note the deployed URL (e.g., `https://fire-chat-socket.up.railway.app`)

### Step 3: Deploy Next.js to Vercel

1. Push code to GitHub

2. Import to Vercel:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables:
     | Variable | Value |
     |----------|-------|
     | `DATABASE_URL` | Your PostgreSQL connection string |
     | `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
     | `NEXTAUTH_URL` | Your Vercel URL (e.g., `https://fire-chat.vercel.app`) |
     | `NEXT_PUBLIC_SOCKET_URL` | Your Railway Socket.io URL |

3. Deploy!

### Alternative: Self-hosted (VPS)

For a single-server deployment (DigitalOcean, AWS, Hetzner):

```bash
# Build and start both servers
npm run build
npm start &
npm run socket &

# Or use PM2 for production
pm2 start npm --name "firechat-web" -- start
pm2 start npm --name "firechat-socket" -- run socket
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js sessions | ✅ |
| `NEXTAUTH_URL` | Full URL of your app | ✅ |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.io server URL | ✅ |
| `SOCKET_PORT` | Port for Socket.io server (default: 3001) | ❌ |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── channels/      # Channel CRUD
│   │   ├── direct-messages/ # DM endpoints
│   │   ├── upload/        # File upload
│   │   └── users/         # User endpoints
│   ├── auth/              # Auth pages (signin/signup)
│   └── chat/              # Main chat page
├── components/            # React components
│   ├── chat/              # Sidebar, ChatArea, etc.
│   └── ui/                # Buttons, Dialogs, etc.
├── lib/                   # Utilities (prisma, auth)
├── server/                # Socket.io server
└── stores/                # Zustand state management
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run socket` | Start Socket.io server |
| `npm run dev:all` | Start both servers |
| `npm run build` | Build for production |
| `npm start` | Start production server |

## License

MIT
