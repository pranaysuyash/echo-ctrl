# EchoCtrl

EchoCtrl is a voice-first personal thinking and memory system that lets you record long-form audio, turns it into structured knowledge, and lets you query your past thoughts conversationally.

## Features

### Core Capabilities
- 🎤 **Live Audio Recording**: Record directly in browser with real-time waveform visualization
- 📤 **Audio Upload**: Support for mp3, m4a, wav, and webm files
- 📝 **Automatic Transcription**: Powered by OpenAI Whisper with timestamp sync
- 🧠 **LLM-Based Structuring**: Auto-organizes into chunks, topics, and tasks
- 🔍 **Hybrid Search**: Combined text and semantic search with pgvector
- 💬 **Conversational AI**: Ask questions, get contextual answers with sources
- 📊 **Topic Timelines**: Visualize how thinking evolves over time
- ✅ **Task Management**: Extract, track, and complete actionable items
- 📱 **Responsive Design**: Perfect on desktop, tablet, and mobile

### Advanced Features
- 🎛️ **Playback Controls**: Variable speed (0.5x - 2x), skip, volume control
- 📥 **Export to Markdown**: Download complete session notes
- 🔄 **Retry Failed Sessions**: One-click retry for processing failures
- 📈 **Daily Insights**: Analytics and summaries of your thinking patterns
- 🎯 **Interactive Transcripts**: Click timestamps to jump in audio
- ✨ **Real-time Visualizer**: Waveform display during recording
- 🔐 **Secure & Private**: All data scoped by user, encrypted storage

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js (Email/Password + Google OAuth)
- **Job Queue**: BullMQ with Redis
- **AI/ML**:
  - OpenAI Whisper (transcription)
  - OpenAI GPT-4 (structuring and Q&A)
  - OpenAI Embeddings (semantic search)
- **Vector Search**: pgvector extension for PostgreSQL

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18+ and npm
- PostgreSQL 14+ with pgvector extension
- Redis 6+
- OpenAI API key

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/echo-ctrl.git
cd echo-ctrl
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up PostgreSQL with pgvector

Install the pgvector extension for PostgreSQL:

```bash
# On macOS with Homebrew
brew install pgvector

# On Ubuntu/Debian
sudo apt-get install postgresql-14-pgvector

# Or follow instructions at: https://github.com/pgvector/pgvector
```

Create a new PostgreSQL database:

```bash
createdb echoctrl
```

Enable the pgvector extension:

```sql
CREATE EXTENSION vector;
```

### 4. Set up environment variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/echoctrl"

# NextAuth
NEXTAUTH_SECRET="your-secret-here-generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI API
OPENAI_API_KEY="your-openai-api-key"

# Redis (for job queue)
REDIS_URL="redis://localhost:6379"

# File Storage
STORAGE_TYPE="local"
STORAGE_PATH="./uploads"

# Vector Database
VECTOR_STORE="pgvector"
```

To generate a secure NEXTAUTH_SECRET:

```bash
openssl rand -base64 32
```

### 5. Set up the database schema

```bash
npm run db:push
```

Or use migrations:

```bash
npm run db:migrate
```

### 6. Start Redis

Make sure Redis is running:

```bash
# On macOS with Homebrew
brew services start redis

# On Ubuntu/Debian
sudo systemctl start redis

# Or run directly
redis-server
```

## Running the Application

### Development Mode

You need to run two processes:

#### Terminal 1: Next.js Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

#### Terminal 2: Background Worker

```bash
npm run worker
```

This runs the background job processor for transcription and structuring.

### Production Mode

```bash
# Build the application
npm run build

# Start the production server
npm start

# In a separate terminal, start the worker
npm run worker
```

## Usage

### 1. Create an Account

Navigate to [http://localhost:3000/signup](http://localhost:3000/signup) and create an account.

### 2. Capture Your First Session

**Option A: Record Live**
1. On dashboard, click "Record Audio"
2. Allow microphone access
3. Record your thoughts (pause/resume supported)
4. Preview, add title, and upload

**Option B: Upload File**
1. On dashboard, click "Upload File"
2. Select audio file (mp3, m4a, wav, webm)
3. Wait for processing
4. View structured session

### 3. Explore Your Sessions

- **Session Detail**: Play audio, read transcript, review chunks and tasks
- **Interactive Transcript**: Click timestamps to jump in audio
- **Playback Speed**: Adjust 0.5x - 2x for comfortable listening
- **Export**: Download complete session as markdown
- **Edit**: Rename sessions, mark tasks complete

### 4. Discover Insights

- **Ask EchoCtrl**: Natural language queries about your thoughts
- **Topics**: See how thinking evolved on specific subjects
- **Insights**: Daily analytics and usage patterns
- **Search**: Find sessions by text or semantic meaning

## Architecture

### Processing Pipeline

When you upload an audio file:

1. **Upload**: File is stored locally or in S3
2. **Queue**: Job is added to the processing queue
3. **Transcription**: OpenAI Whisper transcribes the audio
4. **Structuring**: LLM analyzes transcript and:
   - Splits into logical chunks
   - Extracts topics (tags)
   - Identifies tasks and decisions
   - Generates a markdown session note
5. **Embedding**: Generates vector embeddings for semantic search
6. **Ready**: Session is available for viewing and querying

### Database Schema

Key tables:
- `users`: User accounts and authentication
- `audio_sessions`: Recorded sessions with metadata
- `transcripts`: Full transcriptions with timestamps
- `chunks`: Logical sections of each session
- `topics`: Topics/tags across all sessions
- `tasks`: Extracted actionable items
- `embeddings`: Vector embeddings for semantic search
- `queries`: Query history and results

### API Endpoints

- `POST /api/auth/signup`: Create account
- `POST /api/auth/signin`: Sign in
- `POST /api/sessions/upload`: Upload audio
- `GET /api/sessions`: List sessions
- `GET /api/sessions/:id`: Get session details
- `PATCH /api/sessions/:id`: Update session
- `GET /api/tasks`: List tasks
- `PATCH /api/tasks/:id`: Update task
- `GET /api/topics`: List topics
- `GET /api/topics/:slug`: Get topic timeline
- `GET /api/search`: Search sessions
- `POST /api/conversation/query`: Ask questions
- `GET/PATCH /api/settings`: User settings

## Configuration

### Transcription Languages

Supported languages (set in Settings):
- English (en) - default
- Spanish (es)
- French (fr)
- German (de)
- And all languages supported by Whisper

### Note Verbosity

Control the length of generated session notes:
- **Concise**: Brief, 2-3 paragraphs
- **Normal**: Balanced, 4-6 paragraphs (default)
- **Detailed**: Comprehensive, 8-12 paragraphs

### Storage Options

#### Local Storage (Development)

```env
STORAGE_TYPE="local"
STORAGE_PATH="./uploads"
```

#### S3 Storage (Production)

```env
STORAGE_TYPE="s3"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="your-bucket-name"
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG
```

### Worker Not Processing Jobs

1. Check Redis connection
2. Check worker logs: `npm run worker`
3. Verify OpenAI API key is valid
4. Check job queue: Use Redis Commander or BullMQ Board

### OpenAI API Rate Limits

If you hit rate limits:
1. Reduce concurrent workers in `src/workers/processor.ts`
2. Add delays between API calls
3. Upgrade your OpenAI plan

## Development

### Project Structure

```
echo-ctrl/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── (app)/          # Authenticated app pages
│   │   ├── (auth)/         # Auth pages (login, signup)
│   │   └── api/            # API routes
│   ├── components/         # React components
│   │   ├── layout/         # Layout components
│   │   └── ui/             # UI components
│   ├── lib/                # Utility libraries
│   │   ├── auth.ts         # NextAuth configuration
│   │   ├── db.ts           # Prisma client
│   │   ├── env.ts          # Environment validation
│   │   ├── queue.ts        # Job queue setup
│   │   └── utils.ts        # Helper functions
│   ├── services/           # Business logic services
│   │   ├── embeddings.ts   # Vector embeddings
│   │   ├── llm.ts          # LLM operations
│   │   ├── storage.ts      # File storage
│   │   └── transcription.ts # Audio transcription
│   └── workers/            # Background job processors
├── prisma/
│   └── schema.prisma       # Database schema
└── public/                 # Static files
```

### Running Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

### Database Management

```bash
# View database in Prisma Studio
npm run db:studio

# Create a new migration
npm run db:migrate

# Reset database (caution: deletes all data)
npx prisma migrate reset
```

## Deployment

### Vercel (Recommended for Next.js)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

Note: You'll need external PostgreSQL and Redis (e.g., Railway, Supabase, Upstash)

### Docker

```bash
# Build image
docker build -t echo-ctrl .

# Run with docker-compose
docker-compose up
```

### Manual Server Deployment

1. Set up PostgreSQL, Redis on server
2. Clone repository
3. Install dependencies
4. Set environment variables
5. Build: `npm run build`
6. Start: `npm start` (use PM2 or similar for process management)
7. Start worker: `npm run worker`

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or feature requests:
- Open a GitHub issue
- Email: support@echoctrl.com (if applicable)

## Roadmap

Future enhancements:
- 🎙️ Real-time audio recording with pause/resume
- 🌐 Multi-language UI
- 🔊 Voice-based queries with TTS responses
- 📱 Native mobile apps
- 📤 Export to Obsidian/Notion
- 📅 Calendar integration for task reminders
- 🤝 Collaborative workspaces (multi-user)
- 🔗 Integration with other tools (Zapier, IFTTT)

## Acknowledgments

- OpenAI for Whisper and GPT APIs
- The Next.js and React teams
- All open-source contributors

---

Built with ❤️ by the EchoCtrl team
