# 🤖 My AI — Real-Time AI Video Meetings

My AI is a next-generation video calling platform where **AI agents join your meetings live** — not just to transcribe or summarize, but to actively participate.

Every meeting is a real-time call with an AI trained for a specific role:  
language tutor, interview coach, startup mentor, sales assistant, or fully custom agents.

Built with modern real-time infrastructure, My AI turns meetings into **interactive, AI-powered work sessions**.

---

# 🚀 What is My AI?

My AI lets you:

- Create meetings just like Zoom or Google Meet  
- Attach a **custom AI agent** to each meeting  
- Talk to that AI **live, in real time**  
- Automatically generate:
  - Structured summaries  
  - Full searchable transcripts  
  - Call recordings  
  - An AI chat interface that understands the meeting  

This is not post-processing AI.  
This is **AI inside the meeting.**

---

# 🧠 Core Features

## 🎥 Real-Time AI Video Calls
- Live meetings powered by **Stream Video SDK**
- AI agents respond instantly using **OpenAI Realtime API**
- Familiar lobby experience (camera, mic, join flow)

## 🧩 Custom AI Agents
- Create agents with custom system instructions  
- Examples:
  - Hustle Coach (startup mentor)
  - Language tutor
  - Interviewer
  - Sales coach

## ⚙️ Automated Meeting Processing
After every call, background workflows automatically:

- Fetch the transcript  
- Generate structured AI summaries  
- Store data in the database  
- Prepare the meeting for search and chat

Powered by **ingest pipelines + agent workflows**

---

## 📄 Meeting Intelligence Dashboard

Each completed meeting includes:

- **AI Summary** – topic-wise breakdown, timestamped  
- **Transcript** – fully searchable with highlights  
- **Recording** – replay the entire call  
- **Meeting Chat** – ask questions about the meeting

Powered by **Stream Chat SDK**

---

# 🧭 How to Use My AI (Step-by-Step SaaS Guide)

## ✅ Step 1 — Sign Up & Log In
- Create an account
- Land on the Meetings Dashboard
- Manage meetings, agents, and plans

---

## ✅ Step 2 — Create Your AI Agent

1. Go to **Agents**
2. Click **Create Agent**
3. Enter:
   - Name
   - Instructions (role, behavior, tone)

Example:
```
Be direct, hyper-driven, and act like a startup founder who just raised a seed round.
```

4. Save the agent

---

## ✅ Step 3 — Create a Meeting

1. Click **New Meeting**
2. Enter meeting name
3. Select AI agent
4. Click **Create Meeting**

Meeting appears as **Upcoming**

---

## ✅ Step 4 — Join the Lobby

- Start meeting  
- Configure camera & mic  
- Join call  

---

## ✅ Step 5 — Talk to the AI Live

- AI joins instantly  
- Speak naturally  
- AI responds in real time  
- Brainstorm, simulate, coach, or learn

Powered by:
- Stream Video SDK  
- OpenAI Realtime API  

---

## ✅ Step 6 — End Call & Automatic Processing

When the call ends:

- Transcript is generated  
- Summary is created  
- Recording is stored  
- Meeting is indexed for chat & search  

---

## ✅ Step 7 — Review the Meeting

Each meeting includes:

- 📌 AI Summary  
- 📜 Searchable Transcript  
- 🎥 Full Recording  
- 💬 Meeting Chat (ask questions about the call)

---

## ✅ Step 8 — Manage Your Plan

- Free plan with limits  
- Upgrade when limits are reached  
- Checkout via **Polar**
- Premium features unlocked instantly

---

# 🏗️ System Architecture (High Level)

```
Frontend (My AI UI)
   |
   |— Stream Video SDK
   |— Stream Chat SDK
   |
Backend API
   |
   |— OpenAI Realtime API
   |— Ingest pipelines
   |— Agent workflows
   |
Database
   |
   |— Meetings
   |— Agents
   |— Transcripts
   |— Summaries
   |— Subscriptions
```

---

# 🧰 Tech Stack

**Frontend**
- React / Next.js  
- Stream Video SDK  
- Stream Chat SDK  

**Backend**
- Node.js / Serverless  
- OpenAI Realtime API  

**Infrastructure**
- Background jobs  
- Database  

**Payments**
- Polar  

**Authentication**
- Secure auth provider  

---

# 📌 Example Use Cases

- Startup coaching  
- Interview practice  
- Language tutoring  
- Sales simulations  
- Standups with AI  
- Customer discovery  
- Technical mentoring  

---

# 🎯 Product Vision

My AI aims to become a full **AI Meeting Operating System**:

- Persistent AI collaborators  
- Cross-meeting memory  
- Organization-level insights  
- Semantic search  
- Automated follow-ups  

---

# 🛠️ Local Development

```bash
npm install
cp .env.example .env
npm run dev
```

Environment variables include:

- OpenAI keys  
- Stream keys  
- Database connection  
- Polar credentials  
- Auth secrets  

---
