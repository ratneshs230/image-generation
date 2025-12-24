# Image Evolution Game

A collaborative, real-time web application for an image editing game powered by the Gemini Nano model via the Banana API. Built with Next.js 14 and deployed on Vercel.

## Features

- **Real-time Collaboration**: Play with friends using Pusher for instant updates
- **AI-Powered Image Editing**: Use natural language prompts to transform images with Gemini Nano
- **Turn-Based Gameplay**: Fair turn management with clear indication of current player
- **OAuth Authentication**: Secure login via Google or GitHub using NextAuth.js
- **Game History**: View and replay completed games with animated playback
- **Content Moderation**: Built-in filtering for inappropriate content
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM (Neon recommended for Vercel)
- **Authentication**: NextAuth.js with OAuth providers
- **Real-time**: Pusher for WebSocket-like functionality
- **Styling**: Tailwind CSS
- **AI**: Banana API with Gemini Nano model
- **Deployment**: Vercel with GitHub CI/CD

## Prerequisites

- Node.js 18+
- PostgreSQL database (Neon, Supabase, or Railway recommended)
- Pusher account (free tier available)
- Banana API key
- OAuth credentials (Google and/or GitHub)

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd image-game
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in your credentials:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Database (use Neon for Vercel deployment)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
DIRECT_URL=postgresql://user:password@host:5432/database?sslmode=require

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OAuth - GitHub
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Pusher
PUSHER_APP_ID=your-pusher-app-id
PUSHER_SECRET=your-pusher-secret
NEXT_PUBLIC_PUSHER_KEY=your-pusher-key
NEXT_PUBLIC_PUSHER_CLUSTER=your-pusher-cluster

# Banana API
BANANA_API_KEY=your-banana-api-key
BANANA_MODEL_KEY=gemini-nano
```

### 3. Set Up Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Deployment to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/image-game)

### Manual Deployment

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/image-game.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables (see below)

3. **Configure Environment Variables in Vercel**

   Go to Project Settings > Environment Variables and add:

   | Variable | Description |
   |----------|-------------|
   | `NEXTAUTH_URL` | Your Vercel deployment URL |
   | `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
   | `DATABASE_URL` | PostgreSQL connection string |
   | `DIRECT_URL` | Direct PostgreSQL connection (for migrations) |
   | `GOOGLE_CLIENT_ID` | Google OAuth client ID |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
   | `GITHUB_CLIENT_ID` | GitHub OAuth client ID |
   | `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret |
   | `PUSHER_APP_ID` | Pusher app ID |
   | `PUSHER_SECRET` | Pusher secret |
   | `NEXT_PUBLIC_PUSHER_KEY` | Pusher public key |
   | `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher cluster |
   | `BANANA_API_KEY` | Banana API key |
   | `BANANA_MODEL_KEY` | `gemini-nano` |

4. **Run Database Migrations**
   ```bash
   npx prisma migrate deploy
   ```

### GitHub Actions CI/CD

The repository includes a GitHub Actions workflow that:

1. Runs linting and type checking on every push/PR
2. Builds the application to verify it compiles
3. Deploys to Vercel automatically on merge to `main`
4. Runs database migrations after deployment

**Required GitHub Secrets:**
- `VERCEL_TOKEN`: Generate at vercel.com/account/tokens
- `VERCEL_ORG_ID`: Find in Vercel project settings
- `VERCEL_PROJECT_ID`: Find in Vercel project settings
- `DATABASE_URL`: For running migrations

## Setting Up External Services

### Neon PostgreSQL (Recommended for Vercel)

1. Create account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string to `DATABASE_URL`
4. Copy the direct connection string to `DIRECT_URL`

### Pusher

1. Create account at [pusher.com](https://pusher.com)
2. Create a new Channels app
3. Copy credentials to environment variables
4. Enable client events if needed

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
4. Copy Client ID and Secret

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App
3. Set callback URL: `https://your-domain.vercel.app/api/auth/callback/github`
4. Copy Client ID and Secret

### Banana API

1. Visit [banana.dev](https://www.banana.dev/)
2. Create an account and get API key
3. Note: Application includes mock mode for testing without API key

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/auth/*` | NextAuth.js authentication |
| GET/POST | `/api/rooms` | List/create rooms |
| GET/POST/DELETE | `/api/rooms/[roomId]` | Get/join/leave room |
| GET | `/api/rooms/code/[code]` | Find room by code |
| GET/POST/PUT/PATCH | `/api/game/[roomId]` | Game state/start/turn/end |
| POST | `/api/pusher/auth` | Pusher channel auth |

## Project Structure

```
image-game/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (Serverless Functions)
│   ├── (components)/      # Shared components
│   ├── dashboard/         # Dashboard page
│   ├── room/[roomId]/     # Game room page
│   ├── history/[roomId]/  # Game history page
│   └── ...
├── lib/                   # Shared utilities
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   ├── pusher.ts         # Pusher configuration
│   ├── banana-api.ts     # AI image generation
│   └── moderation.ts     # Content moderation
├── prisma/               # Database schema
├── .github/workflows/    # GitHub Actions CI/CD
└── vercel.json          # Vercel configuration
```

## Content Moderation

Built-in content moderation includes:
- Blocked word filtering
- Pattern matching for harmful content
- Prompt length validation
- Moderation logging

Customize in `lib/moderation.ts`.

## Troubleshooting

### OAuth Callback Errors
- Verify callback URLs match exactly in OAuth provider settings
- Update URLs after deployment to use production domain

### Database Connection Issues
- Check `DATABASE_URL` format
- Ensure SSL mode is enabled for cloud databases
- Verify IP allowlisting if applicable

### Pusher Connection Issues
- Verify all 4 Pusher environment variables are set
- Check Pusher dashboard for connection logs
- Ensure cluster matches your app settings

### Build Failures
- Run `npx prisma generate` before building
- Check for TypeScript errors with `npx tsc --noEmit`

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npx tsc --noEmit`
5. Submit a Pull Request

---

Built with Next.js, Prisma, Pusher, and Banana API.
