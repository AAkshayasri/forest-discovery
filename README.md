# WildAtlas - AI-Powered Forest and Wildlife Explorer

WildAtlas is an interactive, full-stack satellite exploration and wildlife discovery platform powered by Google Gemini AI, Leaflet maps, and real-time citizen science telemetry.

---

## Features

- 🛰️ **Interactive Global Forest Explorer**: Explore 120+ protected forests, national parks, and wildlife sanctuaries with high-resolution satellite imagery, biomes, boundary polygons, and climate details.
- 🐾 **Species Directory & Taxonomic Profiles**: View native mammals, birds, and reptiles with habitat data, diet, lifespan, conservation statuses, and biological taxonomy.
- 📸 **AI Species Identifier (Gemini Vision)**: Identify animals, birds, and reptiles directly from user-uploaded images or preset photography.
- 💬 **Atlas AI Resident Guide**: Conversational biology assistant with streaming responses, conversation history memory, customizable educational personas (Beginner, Student, Scientific, Research), and Markdown field note exports.
- 📍 **Citizen Science Wildlife Sightings**: Report wildlife sightings with interactive map pin-dropping, photo attachments, and community moderation.
- 🧭 **Geospatial Route & Transit Calculations**: Calculate travel distances, durations (flight vs driving), and geodesic routes from reference cities or GPS to any wildlife habitat or zoo.
- 🛡️ **Explorer Dashboard & Admin Telemetry**: Real-time monitoring metrics, telemetry cards, and management consoles for forests, wildlife, zoos, and sighting approvals.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Leaflet, Framer Motion, Lucide Icons
- **Backend**: Node.js, Express (ES Modules), SQLite (`auth.db`), JWT Authentication, bcryptjs
- **AI / Multimodal**: Google GenAI SDK (`@google/genai`) with Gemini models
- **Database / Fallback**: Supabase client support + in-memory dynamic cache and SQLite

---

## Quick Start

### 1. Prerequisites
- Node.js (v18 or newer)
- npm or yarn

### 2. Environment Configuration
Create `.env` inside the `server/` folder based on `server/.env.example`:

```bash
# server/.env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
```

*(Optional: Set up Supabase and Firebase variables if using cloud sync; otherwise the server operates seamlessly in standalone Demo Mode).*

### 3. Install Dependencies
```bash
# Install root, client, and server dependencies
npm run install:all
```

### 4. Run Development Servers
```bash
# Starts both frontend (port 5173) and backend (port 5000) concurrently
npm run dev
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend API Server**: [http://localhost:5000](http://localhost:5000)

---

## Production Build

```bash
# Build frontend bundle
npm run build --prefix client

# Run backend production server
npm run start --prefix server
```

---

## License
MIT License.
