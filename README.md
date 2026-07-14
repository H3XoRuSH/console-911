# Console 911 // Dispatcher Simulator Terminal

An interactive, retro, text-based emergency dispatch simulator built with **Next.js (App Router)**, **Tailwind CSS**, and **Upstash Redis**. Test your decision-making skills under pressure as you guide callers through life-or-death situations, filter out hoaxes/pranks, and route emergency resources within strict turn limits.

---

## 🎮 Game Concept & Rules

Operating a retro CRT command dispatch console, your goal is to manage incoming emergency lines:

- **The Shift:** Exactly 5 randomized calls selected from an archetype dataset (ensuring no two calls share the same archetype).
- **The 10-Turn Cap:** You have up to 10 dialogue turns to query callers and make a routing decision.
- **Line Timeout Warnings:** Flashing alerts (`⚠️ LINE TIMEOUT IMMINENT`) appear on Turn 8 and 9. At Turn 10, the call forcibly terminates with a heavy Timeout Penalty (-150 to -300 pts).
- **Routing Board:** Dispatch correct units (`[SEND POLICE]`, `[SEND FIRE]`, `[SEND MEDICAL]`, `[ANIMAL CONTROL]`) or clear the line (`[DISMISS / PRANK]`) to secure points.
- **Operator Rating System:** Scores determine your global database dispatcher rank (ranging from _Chief Dispatcher_ to _Terminal Negligence_).

---

## 🛠️ Technology Stack

1. **Frontend**: Next.js App Router (React 19, TypeScript) styled as a retro phosphor CRT monitor (scanlines, text-glow animations, and responsive flex grids).
2. **Dialogue Engine**: A 3-Tier hybrid lookup system designed to minimize API costs:
   - **Tier 1 (Static Intents)**: Direct matching on hydrated canonical synonyms (e.g. asking for breathing, names, or location details) returning pre-scripted variations.
   - **Tier 2 (Global Cache)**: Upstash Redis caching lookup mapped to generalized intent slots.
   - **Tier 3 (LLM Fallback)**: Calls Gemini 2.0 Flash to generate caller responses in character, returning context-aware dialogue and score deltas, then caches them.
3. **Database**: Upstash Redis Sorted Sets (`zadd`/`zrange`) hosting the global dispatcher high scores leaderboard.

---

## 📁 Directory Structure

```
├── app/
│   ├── api/
│   │   ├── chat/route.ts        # 3-Tier Dialogue & LLM Fallback API
│   │   ├── leaderboard/route.ts # Leaderboard GET/POST API
│   │   └── session/route.ts     # Game Session Scenarios Pool API
│   ├── globals.css              # CRT animations & styling overrides
│   ├── layout.tsx               # Next.js page layout config
│   └── page.tsx                 # Core game state manager
├── components/
│   ├── StartScreen.tsx          # CRT Welcome screen & callsign entry
│   ├── PlayingScreen.tsx        # Scrolling chat transcript & dispatch actions
│   ├── FeedbackScreen.tsx       # Post-call outcome reports & score tallies
│   └── SummaryScreen.tsx        # Shift operation logs & high scores list
├── data/
│   ├── seed_scenarios.json      # Hand-crafted out-of-the-box scenario list
│   └── scenarios.json           # Fully generated scenario dataset
├── lib/
│   ├── hydration.ts             # Dialogue variation & slot hydration engine
│   ├── intent.ts                # Synonym intent normalization
│   ├── redis.ts                 # Upstash connection & sorted set routines
│   └── scenarios.json           # Scenario load helpers
├── scripts/
│   └── generate-scenarios.js    # 220-Scenario dataset compiler script
├── types/
│   └── game.ts                  # Shared TypeScript interfaces
├── .env.example                 # Environment variables checklist
├── tsconfig.json                # TypeScript project overrides
└── package.json                 # Node dependencies list
```

---

## 🚀 Getting Started

### 1. Configure Credentials

Copy the example environment configuration into a local file:

```bash
cp .env.example .env.local
```

Open `.env.local` and add your keys:

- **`GEMINI_API_KEY`**: Obtain from [Google AI Studio](https://aistudio.google.com/).
- **`UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`**: Create a database from [Upstash Console](https://upstash.com/).

_Note: If Upstash Redis credentials are omitted, the game automatically falls back to local memory and offline high scores._

### 2. Install Dependencies

```bash
npm install
```

### 3. Generate Scenario Dataset

Compile the full 220 scenario objects (20 scenarios across 11 archetypes) by running the generator script:

```bash
node scripts/generate-scenarios.js
```

_(The script is safely rate-limited and resumable if interrupted)._

### 4. Run Development Server

Start the local server:

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser to play!

---

## 🧹 Code Quality & Formatting

- **Code Formatting**: Run Prettier and ESLint autofixes consecutively:
  ```bash
  npm run format
  ```
- **Type-Checking**: Check TypeScript validity:
  ```bash
  npm run typecheck
  ```
- **Build Verification**: Run production compile verification:
  ```bash
  npm run build
  ```

test