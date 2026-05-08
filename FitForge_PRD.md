# FitForge — Product Requirements Document (PRD)
### Version 1.0 | For use with Cursor AI IDE

---

## IMPORTANT INSTRUCTIONS FOR CURSOR — READ FIRST

This is a step-by-step build guide. You must follow these rules throughout the entire project:

1. **Do NOT build the entire project at once.** Build one phase at a time as instructed.
2. **Each phase builds on top of the previous one.** Never break or modify working code from a previous phase unless explicitly told to.
3. **Before starting any phase, read the entire phase instructions first.**
4. **If anything is unclear or ambiguous at any point — STOP and ask a clarifying question before writing any code.**
5. **Every new feature must integrate cleanly with all previously built features.** Test integration before moving on.
6. **Follow the UI design guidelines strictly.** This must not look like a generic AI-generated website.
7. **Mobile-first design is mandatory.** Every screen must work perfectly on a phone browser.

---

## 1. PROJECT OVERVIEW

**Project Name:** FitForge
**Tagline:** "Forge Your Strength."
**Type:** Mobile-first responsive web application
**Purpose:** A free AI-powered personal fitness companion that fills every gap Strava and other fitness apps leave — combining cardio tracking, weight training logs, AI coaching, injury prevention, goal roadmaps, and a fitness chatbot in one place.

### The Core Problem This Solves
- Strava only tracks cardio — zero weight training support
- No free app connects cardio + weight training with AI advice
- No app warns users about overtraining or injury risk for free
- No app generates a personalized goal roadmap (e.g. "learn a handstand in 6 months")
- Personal trainers cost too much money
- Even Strava Premium doesn't solve these problems

### Target Users
- Beginners starting their fitness journey
- Intermediate and advanced gym-goers and runners
- People who do both cardio (running, cycling) AND weight training
- Anyone who cannot afford a personal trainer

---

## 2. TECH STACK

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React (with Vite) | Use functional components and hooks only |
| Styling | Tailwind CSS | Mobile-first, utility classes only |
| Backend | Node.js + Express | Only used for Gemini API calls — keeps API key secure |
| Database | Firebase Firestore | All user data storage |
| Authentication | Firebase Auth | Email/password + Google OAuth |
| AI | Google Gemini API | gemini-1.5-flash model |
| Frontend Hosting | Vercel | Connect via GitHub |
| Backend Hosting | Render | Free tier Node.js server |
| Version Control | GitHub | One repo with /client and /server folders |

---

## 3. BRAND & DESIGN SYSTEM

### Brand Identity
- **Name:** FitForge
- **Tagline:** Forge Your Strength.
- **Logo:** Orange lightning bolt icon + "FitForge" wordmark ("Fit" in white/black, "Forge" in orange)
- **Feel:** Energetic, powerful, motivating — like Strava but for the full fitness experience

### Color Palette

#### Dark Theme (default)
| Element | Hex |
|---|---|
| Background | #0D0D0D |
| Card Background | #1C1C1E |
| Primary (Orange) | #FF5722 |
| Secondary (Amber) | #FF8C42 |
| Text Primary | #FFFFFF |
| Text Secondary | #A1A1AA |
| Success (Green) | #22C55E |
| Alert/Injury (Red) | #EF4444 |
| Border/Divider | #2C2C2E |

#### Light Theme
| Element | Hex |
|---|---|
| Background | #F9F9F9 |
| Card Background | #F1F1F1 |
| Primary (Orange) | #FF5722 |
| Secondary (Amber) | #FF8C42 |
| Text Primary | #111111 |
| Text Secondary | #6B7280 |
| Success (Green) | #22C55E |
| Alert/Injury (Red) | #EF4444 |
| Border/Divider | #E4E4E7 |

### UI Design Philosophy — CRITICAL
This must NOT look like a generic AI-generated website. Follow these principles:

**Inspired by Strava and top fitness apps:**
- Large bold typography for stats and numbers — just like Strava shows pace and distance in huge text
- Full-width cards with subtle borders — not boxy generic layouts
- Stats displayed in large prominent numbers with small labels underneath
- Bottom navigation bar on mobile — like all fitness apps (Strava, Nike TC, Hevy)
- Orange used sparingly as accent — only on buttons, active states, icons, highlights
- Dark cards on dark background with very subtle borders
- Smooth transitions between sections
- Workout cards that look like activity cards in Strava — clean, bold, informative

**Typography:**
- Headings: Bold, large, impactful — Inter or system font
- Stats/Numbers: Extra bold, very large (like Strava's activity stats)
- Body: Clean, readable, medium weight
- Labels: Small, uppercase, letter-spaced (like fitness app metric labels)

**Layout patterns to use:**
- Dashboard: Top greeting + streak banner + quick action buttons + recent activity feed
- Stat cards: Large number on top, small label below, subtle icon
- Workout log cards: Activity type icon + key stats + timestamp — like Strava activity cards
- Bottom navigation: 5 icons — Dashboard, Log, Roadmap, Chat, Profile
- Floating action button (FAB): Orange "+" button for quick workout log
- AI response cards: Distinct styling — dark card with subtle orange left border, AI icon

**What to NEVER do:**
- No generic hero sections with stock photo backgrounds
- No centered text walls
- No basic Bootstrap-looking cards
- No generic chatbot bubble UI that looks like every other chatbot
- No purple/blue color schemes — orange is the only accent color
- No excessive whitespace that makes it feel empty

---

## 4. FOLDER STRUCTURE

```
fitforge/
├── client/                    # React frontend
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── assets/            # Logo, icons, images
│   │   ├── components/        # Reusable UI components
│   │   │   ├── layout/
│   │   │   │   ├── BottomNav.jsx
│   │   │   │   ├── TopBar.jsx
│   │   │   │   └── Layout.jsx
│   │   │   ├── ui/
│   │   │   │   ├── StatCard.jsx
│   │   │   │   ├── WorkoutCard.jsx
│   │   │   │   ├── AIResponseCard.jsx
│   │   │   │   ├── StreakBadge.jsx
│   │   │   │   └── Button.jsx
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Signup.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── WorkoutLogger.jsx
│   │   │   ├── AICoach.jsx
│   │   │   ├── GoalRoadmap.jsx
│   │   │   ├── Chatbot.jsx
│   │   │   └── Profile.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useWorkouts.js
│   │   ├── firebase/
│   │   │   └── config.js
│   │   ├── utils/
│   │   │   └── streakUtils.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env
│   ├── index.html
│   └── package.json
│
├── server/                    # Node.js backend
│   ├── src/
│   │   ├── routes/
│   │   │   └── ai.routes.js
│   │   ├── controllers/
│   │   │   └── ai.controller.js
│   │   └── server.js
│   ├── .env
│   └── package.json
│
└── README.md
```

---

## 5. BUILD PHASES — ONE AT A TIME

**CRITICAL: Complete each phase fully and test it before moving to the next. Never skip ahead.**

---

### PHASE 1 — Project Setup & Infrastructure
**Goal:** Get a working empty project running locally with all tools connected.

**Steps to complete:**
1. Create the folder structure above — both /client and /server
2. Initialize React + Vite in /client with Tailwind CSS configured
3. Initialize Node.js + Express in /server
4. Set up Firebase project (Firestore + Authentication enabled)
5. Add Firebase config to client/.env
6. Add Gemini API key to server/.env
7. Set up GitHub repository with both folders
8. Configure Tailwind with the exact color palette from Section 3
9. Add the custom colors to tailwind.config.js as named colors:
   - primary: #FF5722
   - secondary: #FF8C42
   - dark-bg: #0D0D0D
   - dark-card: #1C1C1E
   - dark-border: #2C2C2E
   - success: #22C55E
   - danger: #EF4444
10. Create the base Layout component with bottom navigation placeholder
11. Set up React Router with placeholder routes for all pages
12. Verify: npm run dev works, empty app loads in browser

**✅ Phase 1 is done when:** Empty app runs locally, Firebase is connected, Tailwind colors are configured.

---

### PHASE 2 — Authentication
**Goal:** Users can sign up, log in, and log out. Protected routes work.

**What to build:**

**Login Page (client/src/pages/auth/Login.jsx):**
- Full screen dark background (#0D0D0D)
- FitForge logo centered at top with lightning bolt icon
- Tagline "Forge Your Strength." below logo
- Email input field — dark card style, orange focus border
- Password input field — same style, show/hide toggle
- "Login" button — full width, solid orange (#FF5722), bold white text
- Divider line with "or" text
- "Continue with Google" button — dark card with Google icon, white text
- "Don't have an account? Sign up" link at bottom
- Error messages shown in red below relevant field

**Signup Page (client/src/pages/auth/Signup.jsx):**
- Same dark layout as Login
- Full Name input
- Email input
- Password input
- Confirm Password input
- "Create Account" button — full width orange
- "Continue with Google" button
- "Already have an account? Login" link

**AuthContext (client/src/context/AuthContext.jsx):**
- Wrap entire app with Firebase auth state listener
- Provide: currentUser, loading, login(), signup(), loginWithGoogle(), logout()

**Protected Routes:**
- All pages except Login and Signup require authentication
- If not logged in, redirect to /login
- If logged in, redirect away from /login and /signup to /dashboard

**Firebase Setup:**
- Enable Email/Password authentication in Firebase console
- Enable Google authentication in Firebase console
- Add authorized domains

**✅ Phase 2 is done when:** User can sign up with email, log in with email, log in with Google, log out, and protected routes redirect correctly.

---

### PHASE 3 — Core Layout & Navigation
**Goal:** The main app shell looks and feels like a fitness app, not a generic website.

**What to build:**

**Bottom Navigation Bar (BottomNav.jsx):**
- Fixed at bottom of screen on mobile
- 5 tabs: Dashboard (home icon), Log (plus icon), Roadmap (map icon), Chat (message icon), Profile (user icon)
- Active tab: orange icon + orange dot indicator below
- Inactive tabs: grey icons
- Background: dark card color (#1C1C1E) with top border
- Safe area padding for iOS home indicator

**Top Bar (TopBar.jsx):**
- FitForge logo/wordmark on left
- Dark/light theme toggle button on right (sun/moon icon)
- Notification bell icon (placeholder for now)

**Layout.jsx:**
- Wraps all authenticated pages
- TopBar at top
- Page content in middle (with bottom padding so content not hidden behind nav)
- BottomNav at bottom fixed

**Theme Toggle:**
- Implement dark/light mode toggle using Tailwind's dark mode class strategy
- Store preference in localStorage
- Default: dark mode
- Smooth transition between themes

**Dashboard Page (placeholder):**
- Show "Welcome back, [Name]!" greeting
- Show current date
- Placeholder cards for streak, recent workouts, AI tip
- This will be fully built in Phase 6 — for now just the layout skeleton

**✅ Phase 3 is done when:** App has working bottom nav, top bar, theme toggle works, layout looks like a fitness app on mobile.

---

### PHASE 4 — Workout Logger
**Goal:** Users can log cardio and weight training workouts. Data saves to Firebase.

**What to build:**

**WorkoutLogger Page (WorkoutLogger.jsx):**

Top of page: Two large toggle buttons — "Cardio" and "Weight Training"
Selected type highlighted in orange. This switches the form below.

**Cardio Log Form:**
- Activity Type dropdown: Running / Cycling / Swimming / Walking / Other
- Distance input (km or miles — toggle unit)
- Duration input (minutes)
- Average Pace (auto-calculated from distance + duration, shown read-only)
- How did it feel? — 3 large buttons: Easy 😊 / Moderate 💪 / Hard 🔥
- Notes (optional textarea)
- Date (defaults to today, can change)
- "Save Workout" button — full width orange

**Weight Training Log Form:**
- Workout Name (e.g. "Chest Day", "Leg Day", "Push Day")
- Muscle Groups worked — multi-select pill buttons:
  Chest / Back / Shoulders / Arms / Legs / Core / Full Body
- Exercise entries — each entry has:
  - Exercise name (text input with autocomplete suggestions)
  - Sets (number)
  - Reps (number)
  - Weight in kg (number, optional)
  - "Add Set" button to add more sets for same exercise
- "Add Another Exercise" button — adds new exercise entry below
- How did it feel? — Easy / Moderate / Hard buttons
- Notes (optional)
- Date (defaults to today)
- "Save Workout" button — full width orange

**Workout History Section (below the form):**
- Show last 7 workouts as cards
- Each card shows:
  - Activity icon (run icon for cardio, dumbbell for weights)
  - Workout name/type in bold
  - Key stats (distance + duration for cardio, muscle groups for weights)
  - Date and "how it felt" indicator
  - Orange dot or colored indicator for intensity

**Firebase Data Structure:**
```
users/{userId}/workouts/{workoutId}
{
  type: "cardio" | "weight_training",
  date: timestamp,
  // Cardio fields:
  activityType: string,
  distance: number,
  duration: number,
  pace: number,
  feeling: "easy" | "moderate" | "hard",
  notes: string,
  // Weight training fields:
  workoutName: string,
  muscleGroups: array,
  exercises: [{ name, sets, reps, weight }],
  feeling: string,
  notes: string,
  createdAt: timestamp
}
```

**✅ Phase 4 is done when:** User can log both cardio and weight training, data appears in Firebase console, workout history shows on page.

---

### PHASE 5 — Backend Server + Gemini API Integration
**Goal:** Node.js server is running and can communicate with Gemini API securely.

**What to build:**

**Server Setup (server/src/server.js):**
- Express server on port 5000
- CORS configured to allow requests from frontend (localhost:5173 in dev, Vercel URL in prod)
- JSON body parser middleware
- /health endpoint that returns { status: "ok" }
- Mount AI routes at /api/ai

**AI Controller (server/src/controllers/ai.controller.js):**
- Function: generateAIResponse(prompt) — sends prompt to Gemini API, returns text response
- Use @google/generative-ai npm package
- Model: gemini-1.5-flash
- Error handling: if Gemini fails, return a friendly error message

**AI Routes (server/src/routes/ai.routes.js):**

POST /api/ai/coach
- Receives: { workouts: [...last 7 days of workouts], userProfile: {...} }
- Builds a detailed prompt from the data
- Returns: { advice: string }

POST /api/ai/roadmap
- Receives: { mode: "skill" | "weekly", goal, currentLevel, deadline, daysPerWeek }
- Returns: { roadmap: string }

POST /api/ai/chat
- Receives: { message: string, chatHistory: [...], workoutContext: {...} }
- Returns: { reply: string }

**Frontend API Service (client/src/utils/apiService.js):**
- Function: getAICoachAdvice(workouts)
- Function: generateRoadmap(goalData)
- Function: sendChatMessage(message, history, context)
- All call the backend server, not Gemini directly

**Environment Variables:**
- server/.env: GEMINI_API_KEY, PORT, CLIENT_URL
- client/.env: VITE_FIREBASE_CONFIG fields, VITE_SERVER_URL

**✅ Phase 5 is done when:** Server runs on port 5000, /health returns ok, Gemini API responds correctly when tested with a simple prompt via Postman or Thunder Client.

---

### PHASE 6 — AI Coach Feature
**Goal:** After logging workouts, users get personalized AI advice.

**What to build:**

**AI Coach Page (AICoach.jsx):**

This page has two sections:

**Section 1 — Today's AI Tip (top of page):**
- Automatically loads when user opens the page
- Shows a card with orange left border — distinct AI styling
- Small "AI Coach" label with sparkle icon at top of card
- The AI advice text in white
- Subtle "Generated based on your last 7 days" note at bottom
- Loading skeleton while fetching
- "Refresh Advice" button

**Section 2 — Weekly Summary (below):**
- Total workouts this week
- Muscle groups trained (shown as filled pill badges)
- Rest days taken
- Total cardio distance
- AI-generated weekly summary paragraph

**How AI Coach Works:**
1. Fetch user's last 7 workouts from Firebase
2. Send to backend POST /api/ai/coach
3. Backend builds this prompt for Gemini:

```
You are FitForge AI Coach — a knowledgeable, motivating personal trainer.
Analyze this athlete's last 7 days of workouts and give specific, actionable advice.

Athlete's recent activity:
{workouts data formatted clearly}

Rules for your response:
- Be specific to THEIR actual workouts, not generic
- Maximum 4 bullet points
- Each point must be actionable (tell them what to DO)
- Mention specific muscle groups, days, or patterns you noticed
- If you see overtraining risk, warn them clearly
- If they haven't trained in 3+ days, acknowledge it
- End with one short motivational sentence
- Keep total response under 150 words
- Do NOT use markdown formatting, just plain text with bullet points using •
```

4. Display the response in the AI response card

**Connect to Workout Logger:**
- After saving a workout in Phase 4, automatically show a small "See what your AI Coach thinks →" link that navigates to AI Coach page

**✅ Phase 6 is done when:** AI Coach page loads real advice based on actual workout data, displays correctly in the styled card, loading state works.

---

### PHASE 7 — Goal Roadmap Generator
**Goal:** Users can generate a personalized fitness roadmap for any goal.

**What to build:**

**GoalRoadmap Page (GoalRoadmap.jsx):**

**Mode Selector at top:**
Two large cards to choose from:
- 🎯 "Specific Skill Goal" — Learn a skill like handstand, first pullup, run 5K
- 📅 "Weekly Workout Plan" — Just need a structured week of training

**Mode 1 — Specific Skill Goal Form:**
- Goal input: text field — "What do you want to achieve?" (e.g. "Learn a handstand")
- Current level: 3 large buttons — Complete Beginner / Some Experience / Intermediate
- Timeline: dropdown — 1 month / 3 months / 6 months / 1 year
- Training days per week: number selector 2-6
- Any injuries or limitations: optional text field
- "Generate My Roadmap" button — full width orange with lightning bolt icon

**Mode 2 — Weekly Plan Form:**
- Available days: multi-select day buttons (Mon Tue Wed Thu Fri Sat Sun)
- Equipment access: Gym / Home with dumbbells / Bodyweight only / Mix
- Fitness level: Beginner / Intermediate / Advanced
- Focus: Strength / Cardio / Both
- "Generate Weekly Plan" button — full width orange

**Roadmap Display (after generation):**
- Loading state: animated "Forging your roadmap..." with FitForge logo pulsing
- For Skill Goal: Display month by month breakdown
  - Each month in a collapsible card
  - Month title + focus area
  - List of exercises with sets/reps
  - YouTube search term suggestions for that phase
  - Milestone checkpoint for that month
- For Weekly Plan: Display day by day
  - Each day as a card (Mon-Sun)
  - Rest days clearly marked
  - Exercise list with sets/reps per training day
  - Muscle groups for the day shown as badges

**Save Roadmap button:** Saves to Firebase so user can view it again later

**Firebase Data Structure:**
```
users/{userId}/roadmaps/{roadmapId}
{
  mode: "skill" | "weekly",
  goal: string,
  generatedAt: timestamp,
  content: string (the full roadmap text from Gemini)
}
```

**Gemini Prompt for Skill Goal:**
```
You are FitForge AI Coach. Create a detailed, realistic fitness roadmap.

Goal: {goal}
Current Level: {currentLevel}
Timeline: {timeline}
Training Days Per Week: {daysPerWeek}
Limitations: {limitations}

Format your response EXACTLY like this:

MONTH 1-2: [Phase Name]
Focus: [what to focus on]
Exercises:
• [Exercise name] — [sets] x [reps], [notes]
• [repeat for 4-6 exercises]
Milestone: [what they should achieve by end of this phase]
YouTube Search: "[search term for best videos on this phase]"

[repeat for each phase]

IMPORTANT RULES:
- Be realistic about timelines — don't overpromise
- Progress logically from easier to harder
- Always include prerequisite exercises before advanced ones
- YouTube search terms must be specific and useful
- Keep each phase description under 100 words
```

**✅ Phase 7 is done when:** Both modes generate real roadmaps from Gemini, display in clean phase-by-phase layout, roadmap can be saved and retrieved.

---

### PHASE 8 — AI Fitness Chatbot
**Goal:** Users can have a natural conversation with an AI that knows their full fitness history.

**What to build:**

**Chatbot Page (Chatbot.jsx):**

This must NOT look like a generic chatbot. Design it like a fitness coach messaging interface:

**Top section:**
- "FitForge Coach" header with lightning bolt avatar
- Small subtitle: "Knows your workouts, goals, and history"
- Online indicator (green dot)

**Chat area:**
- Full height scrollable message area
- User messages: right-aligned, orange background bubble, white text
- AI messages: left-aligned, dark card background, white text, small lightning bolt avatar
- Timestamps shown subtly below each message
- Messages should feel like iMessage/WhatsApp — NOT like ChatGPT

**Suggested prompts (shown when chat is empty):**
Display 4 tappable suggestion chips:
- "What should I train today?"
- "I felt pain in my shoulder today"
- "Am I overtraining this week?"
- "Change my plan, I have knee pain"

**Input area (fixed at bottom above nav):**
- Text input: "Message your coach..."
- Send button: orange, arrow icon
- Input bar has dark card background, subtle border

**How the Chatbot Works:**
1. When user sends message, fetch their last 14 days of workouts from Firebase
2. Fetch their active goal roadmap if any
3. Send to backend POST /api/ai/chat with full context
4. Backend builds this system prompt:

```
You are FitForge AI Coach — a knowledgeable, friendly personal trainer who knows this athlete well.

Athlete's Profile:
- Recent workouts (last 14 days): {workouts}
- Active goal: {goal if exists}
- Current streak: {streak} days

Conversation so far:
{chat history}

Rules:
- Respond like a real personal trainer texting their client
- Be warm, direct, and specific to THEIR data
- Keep responses concise — 2-4 sentences usually enough unless detailed plan needed
- If they report pain or injury, take it seriously and give safe alternatives
- If they ask to change their plan, give a specific modified plan
- Never be generic — always reference their actual workout history
- If you don't know something, say so honestly
```

5. Display AI response with subtle typing animation (3 dots then message appears)

**Chat History:**
- Store chat history in component state (not Firebase — keeps it simple)
- Chat resets when user leaves page (by design — keeps it fresh each session)

**✅ Phase 8 is done when:** Chat works end to end, AI references actual workout data, UI looks like a real messenger not a generic chatbot.

---

### PHASE 9 — Streak Tracker
**Goal:** Daily workout streaks motivate users to stay consistent.

**What to build:**

**Streak Logic (client/src/utils/streakUtils.js):**
- calculateStreak(workouts): Takes array of workouts, returns current streak count
- A streak day = any day where at least one workout was logged
- If today has no workout yet: streak shows as current streak (not broken yet)
- If yesterday had no workout AND today has no workout: streak is 0
- Longest streak: track the highest streak ever achieved

**Firebase Data Structure — add to user profile:**
```
users/{userId}/profile
{
  currentStreak: number,
  longestStreak: number,
  lastWorkoutDate: timestamp,
  totalWorkouts: number
}
```

**Update streak automatically:**
- Every time a workout is saved in Phase 4, recalculate and update streak in Firebase

**Streak Display Components:**

**StreakBadge.jsx (used in Dashboard and top bar):**
- Large flame icon 🔥 in orange
- Streak number in bold large text next to it
- Small "day streak" label below

**Streak Milestones (shown as celebration overlay):**
When user hits 7, 30, 50, 100 days:
- Full screen celebration overlay (dark background)
- Large animated flame emoji
- "🔥 [X] Day Streak!" in huge orange text
- Motivational message specific to milestone:
  - 7 days: "One week strong! You're building real habits."
  - 30 days: "30 days! You're not just working out, you're transforming."
  - 100 days: "100 DAYS. You are unstoppable."
- "Keep Going" button to dismiss

**Dashboard Streak Section:**
- Streak banner near top of dashboard
- Shows flame icon + current streak number prominently
- Shows "Personal best: X days" below current streak
- If streak is 0: shows "Start your streak today!" with CTA to log workout

**✅ Phase 9 is done when:** Streak increments when workout is logged, resets correctly if day is missed, milestone celebrations show at correct numbers.

---

### PHASE 10 — Dashboard (Full Build)
**Goal:** Dashboard feels like a real fitness app home screen — informative, motivating, beautiful.

**What to build:**

**Dashboard Page (Dashboard.jsx) — full layout:**

**Section 1 — Header:**
- "Good morning/afternoon/evening, [First Name]!" (time-based greeting)
- Today's date in subtle text below

**Section 2 — Streak Banner:**
- Full-width card with dark gradient
- Flame icon + streak count large on left
- "Keep your streak alive!" or streak milestone message on right
- Orange accent border on left side of card

**Section 3 — Quick Stats Row (4 cards in 2x2 grid):**
- This Week's Workouts (number)
- Total Workouts (number)
- This Week's Distance (km, from cardio logs)
- Current Streak (with flame icon)
Each card: large number on top, small label below — Strava-style stat display

**Section 4 — Today's AI Tip:**
- Card with orange left border
- Lightning bolt icon + "AI Coach" label
- One key piece of advice from AI Coach (brief version)
- "See full analysis →" link to AI Coach page

**Section 5 — Recent Activity Feed:**
- Last 5 workouts as cards — like Strava's activity feed
- Each card:
  - Left: activity type icon (run/bike/dumbbell) in orange circle
  - Middle: workout name/type in bold, key stat below (e.g. "5.2 km • 28 min" or "Chest + Triceps • 8 exercises")
  - Right: date/time in subtle grey
- "View all workouts →" link at bottom

**Section 6 — Active Goal (if exists):**
- Card showing current goal roadmap
- Goal name + timeline
- Simple progress indicator
- "View roadmap →" link

**Floating Action Button:**
- Fixed orange circle button with "+" icon
- Bottom right, above the nav bar
- Tapping goes directly to Workout Logger

**✅ Phase 10 is done when:** Dashboard shows real data from Firebase, all sections populate correctly, looks like a premium fitness app home screen.

---

### PHASE 11 — Profile Page
**Goal:** Users can view their profile, stats, and settings.

**What to build:**

**Profile Page (Profile.jsx):**

**Top section:**
- User avatar (Google photo if Google auth, initials avatar if email auth)
- Display name
- Email
- "Member since [date]"

**Stats Overview:**
- Total workouts logged
- Longest streak ever
- Most trained muscle group
- Total cardio distance (km)

**Settings Section:**
- Dark/Light mode toggle (synced with top bar toggle)
- Notification preferences (placeholder)
- Units preference: km / miles

**Account Section:**
- "Sign Out" button — red text, no background
- Confirmation dialog before signing out

**✅ Phase 11 is done when:** Profile shows real user data, sign out works, settings save to localStorage.

---

### PHASE 12 — Final Polish & Deployment
**Goal:** App is production-ready, deployed, and shareable.

**Steps:**

**Performance:**
- Add loading skeletons for all data-fetching states
- Add error boundaries for AI failures (show friendly message if Gemini is down)
- Optimize Firebase queries (add indexes where needed)

**Mobile Polish:**
- Test every page on 375px width (iPhone SE) and 390px (iPhone 14)
- Ensure no horizontal scroll anywhere
- Check touch targets are minimum 44px
- Verify keyboard doesn't break layout on input focus

**Empty States:**
- New user with no workouts: friendly empty state with CTA to log first workout
- No roadmap yet: card with CTA to create one
- Empty chat: show suggested prompts prominently

**Deploy Frontend to Vercel:**
1. Push code to GitHub
2. Connect Vercel to GitHub repo
3. Set root directory to /client
4. Add all VITE_ environment variables in Vercel dashboard
5. Deploy

**Deploy Backend to Render:**
1. Connect Render to GitHub repo
2. Set root directory to /server
3. Add GEMINI_API_KEY and CLIENT_URL environment variables
4. Deploy as Web Service (free tier)
5. Update client VITE_SERVER_URL to Render URL

**Final Checks:**
- Google OAuth authorized domains updated with Vercel URL in Firebase console
- Firebase security rules set (users can only read/write their own data)
- Test full user journey: signup → log workout → get AI advice → generate roadmap → chat

**✅ Phase 12 is done when:** App is live on Vercel, backend runs on Render, full flow works end to end on mobile browser.

---

## 6. FIREBASE SECURITY RULES

Add these rules in Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 7. GEMINI API PROMPT PRINCIPLES

For all AI features, follow these prompt rules:
- Always tell Gemini to respond in plain text, no markdown
- Always specify maximum word/bullet count to keep responses concise
- Always include the user's actual data in the prompt — never ask for generic advice
- Always define the persona ("You are FitForge AI Coach")
- Always specify the exact format of the response expected
- Handle empty data gracefully: if user has no workouts, ask Gemini to give motivational onboarding advice

---

## 8. ENVIRONMENT VARIABLES REFERENCE

**client/.env:**
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_SERVER_URL=http://localhost:5000
```

**server/.env:**
```
GEMINI_API_KEY=
PORT=5000
CLIENT_URL=http://localhost:5173
```

---

## 9. FINAL REMINDER FOR CURSOR

- Build ONE phase at a time
- Test each phase completely before starting the next
- Never modify working code from previous phases without good reason
- If something seems unclear or could be done multiple ways — ASK before building
- The UI must feel like a real fitness app — bold, athletic, energetic — not a generic website
- Orange (#FF5722) is the only accent color — use it consistently
- Every screen must work perfectly on a mobile phone browser
- This project is for a resume — it must be fully functional, deployed, and impressive

---

*FitForge PRD v1.0 — Built from real problems, for real athletes.*
