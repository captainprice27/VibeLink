# VibeLink - How to Run

## Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (free tier available)

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
# Copy the example env file
cp .env.example .env.local
```

### 3. MongoDB Fresh Setup Guide
Follow these steps to avoid connection errors:

#### **✅ DO'S (Step-by-Step)**
1. **Create Account**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up.
2. **Build Cluster**: Create a new **Shared/FREE** cluster (choose any region).
3. **Database Access**: Create a user. **IMPORTANT**: Keep the username and password simple (e.g., `admin` and `password123`).
4. **Network Access**: Click "Network Access" -> "Add IP Address" -> Click **"Allow Access from Anywhere"** (`0.0.0.0/0`).
5. **Get URI**: Click "Connect" -> "Drivers" -> Copy the `mongodb+srv://...` link.
6. **Apply to .env.local**: Paste the link into `MONGODB_URI`.
   - Add a database name before the `?` (e.g., `...mongodb.net/vibelink?retries...`).

#### **❌ DON'TS (Common Mistakes)**
- **Don't use special characters** in your password (like `@`, `#`, `:`, `/`). 
  - *Why?* These break the URL format. If you DO use them, you must encode them (e.g., `@` becomes `%40`).
- **Don't forget the IP Whitelist**: If you don't "Allow access from anywhere", the app will crash with an `ENOTFOUND` or `Timeout` error.
- **Don't use multiple @ symbols**: Your URI should only have one `@` after the password. 

### 4. Run Development Server
```bash
npm run dev
```

### 4. Open in Browser
Visit: http://localhost:3000

## Default AI Agents
The app comes with 4 pre-configured AI agents:
- **Alex** - Helpful Assistant
- **Luna** - Creative Writer  
- **Max** - Tech Expert
- **Sofia** - Friendly Chat

## Features
- 🌙 Dark/Light theme toggle
- 💬 Real-time messaging
- 👥 Multi-user chat
- 🤖 AI agent responses
- ✓✓ Message read receipts
- 📍 Location tracking (with permission)

---
Made with ❤️ by Prayas
