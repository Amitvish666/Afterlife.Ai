# Beyond Life AI

<p align="center">
  <img src="frontend/public/logo.svg" alt="Beyond Life AI Logo" width="200" />
</p>

<p align="center">
  <strong>CODEXION's Beyond Life AI</strong> - Multimodal Persona Platform
</p>

<p align="center">
  Create AI-powered digital personas from your loved ones' memories, conversations, and media.
</p>

---

## 🌟 Features

- **Smart Memory Extraction** - AI analyzes texts, chats, and documents to extract personality traits
- **Voice Cloning** - Create realistic voice replicas from audio samples
- **Avatar Generation** - Photorealistic or stylized avatars with lip-sync
- **Natural Conversations** - RAG-powered conversations with memory recall
- **Privacy First** - End-to-end encryption and explicit consent flows

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL
- Redis
- API Keys: OpenAI, ElevenLabs, D-ID, Pinecone

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/codexion/beyond-life-ai.git
   cd beyond-life-ai
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../backend
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

5. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   uvicorn app.main:app --reload

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs

## 📁 Project Structure

```
beyond-life-ai/
├── frontend/                 # Next.js + React + Tailwind
│   ├── src/
│   │   ├── app/            # App router pages
│   │   ├── components/      # React components
│   │   ├── lib/            # Utilities
│   │   ├── store/          # Zustand state
│   │   ├── hooks/           # Custom hooks
│   │   └── types/           # TypeScript types
│   └── public/              # Static assets
│
├── backend/                 # FastAPI + Python
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Config & security
│   │   ├── db/             # Database models
│   │   ├── services/        # AI services
│   │   └── tasks/           # Celery tasks
│   └── tests/               # Test suite
│
└── docker-compose.yml       # Docker setup
```

## 🔧 API Integration

### OpenAI
- GPT-4 for chat completion
- Embeddings for memory retrieval
- Whisper for speech-to-text

### ElevenLabs
- Text-to-speech synthesis
- Voice cloning from samples

### D-ID
- Talking avatar generation
- Lip-sync video creation

### Pinecone
- Vector storage for memories
- Semantic search

## 🛠 Tech Stack

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand
- React Query

### Backend
- FastAPI
- Python 3.11
- SQLAlchemy
- Celery
- Redis

### AI/ML
- OpenAI GPT-4
- LangChain
- Pinecone
- ElevenLabs
- D-ID

## 📝 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/refresh` - Refresh token

### Personas
- `GET /api/v1/personas` - List personas
- `POST /api/v1/personas` - Create persona
- `GET /api/v1/personas/{id}` - Get persona
- `PUT /api/v1/personas/{id}` - Update persona
- `DELETE /api/v1/personas/{id}` - Delete persona

### Chat
- `GET /api/v1/chat/{persona_id}/sessions` - List sessions
- `POST /api/v1/chat/{persona_id}/sessions` - Create session
- `POST /api/v1/chat/{persona_id}/sessions/{id}/messages` - Send message

### Voice & Avatar
- `GET /api/v1/voices/{persona_id}` - List voices
- `POST /api/v1/voices/{persona_id}` - Create voice
- `GET /api/v1/avatars/{persona_id}` - List avatars
- `POST /api/v1/avatars/{persona_id}` - Create avatar

## 🔒 Security

- JWT authentication
- Role-based access control
- Data encryption at rest
- GDPR compliant
- Consent management

## 📄 License

Apache License 2.0 - See [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📧 Support

- Documentation: https://docs.beyondlife.ai
- Issues: GitHub Issues
- Email: support@codexion.io

---

<p align="center">
  Made with ❤️ by CODEXION
</p>
