# Role & Goal

You are an expert full-stack developer and system architect. Your task is to build a complete single-page web application using Next.js (App Router) + Tailwind CSS for a text-based 911 Dispatcher Game titled **"Console 911"**. The application uses a hybrid architecture combining a 220-scenario dataset with sentence-structure variations, dynamic template masking, a strict 10-turn limit per call, an Upstash Redis serverless cache for dialogue, and a Redis Sorted Set global leaderboard to achieve zero/near-zero runtime API costs.

---

## 1. Game Identity & Core Session Loop

- **Title:** **Console 911**
- **Role:** The player acts as a 911 Emergency Dispatcher operating a retro dispatch console terminal.
- **Session Mechanics:**
  - Exactly 5 calls per game session, randomly selected from a dataset of 220 scenarios.
  - No two calls in a session share the same archetype.
- **Turn Limits & Urgency Engine:**
  - Maximum of 10 dialogue turns per individual call event.
  - Turns 8-9: UI displays urgency warnings (`⚠️ LINE TIMEOUT IMMINENT`).
  - Turn 10: Automatic Call Cutoff / Forced Outcome. If the dispatcher fails to make a final decision (dispatch/dismiss) by Turn 10, the call forcibly terminates with a Timeout Penalty (-150 to -300 points).
- **Objective:** Assess emergencies, provide accurate instructions, filter out pranks/frivolous calls, dispatch appropriate emergency services within 10 turns, and maximize overall session score.
- **Scoring Engine:**
  - Base Score starts at 0.
  - Correct advice/dispatch: +100 to +300 points.
  - Minor errors/delays: -50 to -150 points.
  - Critical failure (caller harmed/killed, wasted emergency units, or Turn 10 Timeout): -300 to -500 points.

---

## 2. 220-Scenario Dataset & Advanced Hydration Engine

### A. The 11 Call Archetypes (20 Scenarios Each = 220 Total)

The dataset of 220 scenarios must be evenly distributed across these 11 archetypes:

1. **Life-Threatening Emergency:** Medical CPR, active violent crime, working structure fire, major vehicle crash.
2. **Low-Priority / Non-Emergency:** Minor noise complaint, lost pet, property line dispute.
3. **Prank / Hoax Call:** Kids playing on line, fake emergencies, absurd prank callers.
4. **Ambiguous / Code Call:** Silent line, domestic abuse victim speaking in "code" (e.g., pretending to order pizza), panicking caller.
5. **Psychological / Delusional Call:** Mental health crisis, paranoid conspiracy claims, alien/monster sightings.
6. **Communication Barrier:** Non-English speaker, speech-impaired caller, or touch-tone user (1 tap = Yes, 2 = No).
7. **Animal Chaos:** Exotic or wild animals trapping citizens or causing public traffic hazards.
8. **Pocket Dial / Open Line:** Unaware caller with background audio (screams, crashes, TV noise, rustling).
9. **Automated / Sensor Emergency:** Smartwatch crash detection, automated fire panel telemetry, gas leak sensor alerts.
10. **Suspicious / Probing Call:** Caller probing response times, asking weird legal boundary questions.
11. **Absurd Entitlement Call:** Complaints about wrong fast-food orders, minor parking spats, bad weather.

### B. Advanced Hydration Engine (Sentence Variations + Variable Swapping)

To prevent dialogue from feeling formulaic, scenarios utilize dual-layer randomization upon loading:

1. **Sentence Structure Variation:** Each scenario node provides 3-4 distinct phrasing variations (e.g., frantic scream vs. calm panic vs. direct address).
2. **Slot Variable Masking:** Replaces placeholder slots (`{slot_name}`) with randomized entries:
   - `{caller_name}`: Sarah, Marcus, Officer Davis, Mrs. Gable...
   - `{victim_relation}`: grandfather, daughter, coworker, stranger...
   - `{address_location}`: 742 Evergreen Terrace, Oak Street & 5th, Riverside Park...
   - `{ambient_audio}`: dog barking loudly, heavy rain, clanging pots, radio chatter...
   - `{specific_details}`: red Honda Civic, white pitbull, smell of burning rubber...

---

## 3. Serverless Database & Shared Architecture (Upstash Redis)

### A. Dialogue Engine (3-Tier Hybrid Lookup)

1. Pre-scripted Decision Tree Match: If player action matches a standard scenario node, pick a hydrated sentence variation ($0 API cost).
2. Global Upstash Redis Cache Match: Query Redis for `cache:${scenario_id}:${normalized_intent}`. If hit, return cached response ($0 API cost).
3. LLM Fallback (Cache Miss): Call lightweight LLM API (Gemini 2.0 Flash / Groq Llama 3) -> Save generated response and score delta to Redis -> Return response to player.

### B. Key Normalization & Caching Strategy

- Lowercase all input text, strip punctuation, trim whitespace, and map synonymous phrasing to canonical intent strings (e.g., `"is he breathing?"` and `"check breathing"` both evaluate to `CHECK_BREATHING`).

### C. Native Leaderboard Engine

- Store player scores in an Upstash Redis Sorted Set (`zadd`) under the key `global_leaderboard`.
- Retrieve top player rankings using reverse range queries (`zrange` with `rev: true`) for ultra-fast, real-time leaderboard rendering.

---

## 4. UI Layout & Terminal Aesthetic (Console 911 Branding)

- **Visual Style:** Retro emergency dispatch console (monospaced fonts like `JetBrains Mono` or `Courier New`, dark slate background `bg-zinc-950`, emerald green / amber text, retro monitor glow effects, active line audio wave indicator, top header reading "CONSOLE 911 // DISPATCH SYSTEM v1.0").
- **Header:** Title Branding ("CONSOLE 911"), Session Score, Call Counter (`CALL 3 / 5`), Turn Counter (`TURN 4 / 10`), Current Incident Status.
- **Center Panel:** Scrolling live transcript between Dispatcher (Player) and Caller.
- **Control Panel:**
  - Free-text dialogue input field with canonical intent autocomplete suggestions.
  - Action Dispatch Buttons: `[SEND POLICE]`, `[SEND FIRE]`, `[SEND MEDICAL]`, `[ANIMAL CONTROL]`, `[DISMISS / PRANK]`.
  - `[END CALL]` button to complete the current incident and trigger feedback.
- **Game Summary Screen:** Final breakdown of all 5 calls, score tally, dispatcher rank assignment (e.g., _Chief Dispatcher_ vs. _Rookie Liability_), global leaderboard rankings pulled from Redis via `zrange`, and restart button.

---

## 5. Execution & Code Generation Requirements

Please generate the codebase for **Console 911** in Next.js App Router format in the following order:

1. **Free Batch Scenario Generator Script:** A Node.js script using Google Gemini API (`gemini-2.0-flash`) free tier to generate 220 scenario JSON entries with sentence variations and template slots. Provide 3 fully written scenario objects in your response as concrete schema examples.
2. **Advanced Hydration Engine Utility:** JavaScript/TypeScript utility function to randomly select sentence variations and hydrate `{slots}` upon scenario load.
3. **Upstash Redis API Handler:** Next.js Route Handler / Server Action using `@upstash/redis` to handle Intent Normalization, DB Cache Lookup, LLM Fallback, DB Write back, Turn Tracking (up to 10), and Leaderboard `zadd`/`zrange` operations.
4. **Frontend Dispatch Interface Component:** Responsive React + Tailwind CSS single-page application with complete game loop state management (Call 1 to 5, Turn 1 to 10, score tracking, end summary with global leaderboard).
