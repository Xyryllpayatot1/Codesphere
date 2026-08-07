// ---------------------------------------------------------------------------
// Seed data for CodeSphere. Idempotent (upserts keyed by slug/key) — safe to
// re-run. Run with: npx prisma db seed  (or `tsx prisma/seed.ts`)
//
// Uses the generated client directly (NOT src/lib/prisma — that pulls in
// server-only modules that fail outside the Next runtime).
// ---------------------------------------------------------------------------

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import bcrypt from "bcryptjs";
import type { ContentBlock } from "@/lib/content/types";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");
const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function block(blocks: ContentBlock[]): unknown {
  return blocks as unknown as Prisma.InputJsonValue;
}

function p(markdown: string): ContentBlock[] {
  return [{ type: "paragraph", text: markdown }];
}

const identity = (n: number) => Array.from({ length: n }, (_, i) => i);

async function upsertUser() {
  const passwordHash = await bcrypt.hash("admin1234", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@codesphere.dev" },
    create: {
      email: "admin@codesphere.dev",
      username: "admin",
      name: "CodeSphere Admin",
      passwordHash,
      role: "ADMIN",
    },
    update: {},
  });
  const studentHash = await bcrypt.hash("demo1234", 10);
  const demo = await prisma.user.upsert({
    where: { email: "demo@codesphere.dev" },
    create: {
      email: "demo@codesphere.dev",
      username: "demo",
      name: "Demo Learner",
      passwordHash: studentHash,
      role: "STUDENT",
    },
    update: {},
  });
  return { admin, demo };
}

async function upsertAchievements() {
  const items = [
    { key: "first-steps", name: "First Steps", description: "Complete your first lesson", icon: "👣", category: "MILESTONE", rarity: "COMMON", xpReward: 20, criteria: { kind: "lessonsCompleted", count: 1 }, order: 1 },
    { key: "ten-lessons", name: "Ten Lessons", description: "Complete 10 lessons", icon: "🎓", category: "MILESTONE", rarity: "RARE", xpReward: 50, criteria: { kind: "lessonsCompleted", count: 10 }, order: 2 },
    { key: "first-exercise", name: "Solved It", description: "Pass your first exercise", icon: "✅", category: "MILESTONE", rarity: "COMMON", xpReward: 15, criteria: { kind: "exercisesPassed", count: 1 }, order: 3 },
    { key: "exercise-master", name: "Exercise Master", description: "Pass 25 exercises", icon: "💪", category: "MILESTONE", rarity: "RARE", xpReward: 60, criteria: { kind: "exercisesPassed", count: 25 }, order: 4 },
    { key: "quiz-taker", name: "Quiz Taker", description: "Pass your first quiz", icon: "📝", category: "QUIZ", rarity: "COMMON", xpReward: 20, criteria: { kind: "quizzesPassed", count: 1 }, order: 5 },
    { key: "perfect-score", name: "Perfect Score", description: "Get 100% on a quiz", icon: "🎯", category: "QUIZ", rarity: "RARE", xpReward: 40, criteria: { kind: "quizPerfect", count: 1 }, order: 6 },
    { key: "streak-3", name: "Warming Up", description: "Reach a 3-day streak", icon: "🔥", category: "STREAK", rarity: "COMMON", xpReward: 20, criteria: { kind: "streakReached", days: 3 }, order: 7 },
    { key: "streak-7", name: "On Fire", description: "Reach a 7-day streak", icon: "🚀", category: "STREAK", rarity: "RARE", xpReward: 40, criteria: { kind: "streakReached", days: 7 }, order: 8 },
    { key: "streak-30", name: "Unstoppable", description: "Reach a 30-day streak", icon: "👑", category: "STREAK", rarity: "LEGENDARY", xpReward: 100, criteria: { kind: "streakReached", days: 30 }, order: 9, secret: true },
    { key: "level-5", name: "Rising Star", description: "Reach level 5", icon: "⭐", category: "MILESTONE", rarity: "COMMON", xpReward: 30, criteria: { kind: "levelReached", level: 5 }, order: 10 },
    { key: "level-10", name: "Elite Coder", description: "Reach level 10", icon: "💎", category: "MILESTONE", rarity: "RARE", xpReward: 60, criteria: { kind: "levelReached", level: 10 }, order: 11 },
    { key: "xp-500", name: "500 XP", description: "Earn 500 total XP", icon: "⚡", category: "MILESTONE", rarity: "COMMON", xpReward: 25, criteria: { kind: "xpReached", xp: 500 }, order: 12 },
    { key: "xp-2000", name: "XP Collector", description: "Earn 2000 total XP", icon: "💰", category: "MILESTONE", rarity: "RARE", xpReward: 60, criteria: { kind: "xpReached", xp: 2000 }, order: 13 },
    { key: "first-project", name: "Builder", description: "Submit your first project", icon: "🛠️", category: "PROJECT", rarity: "COMMON", xpReward: 40, criteria: { kind: "projectsSubmitted", count: 1 }, order: 14 },
    { key: "approved-project", name: "Shipped", description: "Get a project approved", icon: "📦", category: "PROJECT", rarity: "RARE", xpReward: 50, criteria: { kind: "projectsApproved", count: 1 }, order: 15 },
    { key: "html-101", name: "HTML Explorer", description: "Complete the HTML Fundamentals course", icon: "🌐", category: "COURSE", rarity: "RARE", xpReward: 80, criteria: { kind: "courseCompleted", slug: "html-fundamentals" }, order: 16 },
    { key: "css-101", name: "Style Guru", description: "Complete the CSS Styling course", icon: "🎨", category: "COURSE", rarity: "RARE", xpReward: 80, criteria: { kind: "courseCompleted", slug: "css-styling" }, order: 17 },
    { key: "js-101", name: "Logic Weaver", description: "Complete the JavaScript Basics course", icon: "🧠", category: "COURSE", rarity: "RARE", xpReward: 80, criteria: { kind: "courseCompleted", slug: "javascript-basics" }, order: 18 },
    { key: "first-cert", name: "Certified", description: "Earn your first certificate", icon: "🏅", category: "COURSE", rarity: "RARE", xpReward: 50, criteria: { kind: "certificatesEarned", count: 1 }, order: 19 },
    { key: "studious", name: "Studious", description: "Study on 7 different days", icon: "📚", category: "ACTIVITY", rarity: "COMMON", xpReward: 30, criteria: { kind: "studyDays", count: 7 }, order: 20 },
    { key: "game-on", name: "Game On", description: "Beat your first learning game level", icon: "🎮", category: "GAME", rarity: "COMMON", xpReward: 25, criteria: { kind: "gameLevelsBeaten", count: 1 }, order: 21 },
    { key: "game-flawless", name: "Flawless", description: "Get a perfect score on a game level", icon: "💯", category: "GAME", rarity: "RARE", xpReward: 30, criteria: { kind: "gamePerfectLevels", count: 1 }, order: 22 },
    { key: "game-beaten-1", name: "Game Player", description: "Beat every level of one game", icon: "🕹️", category: "GAME", rarity: "RARE", xpReward: 50, criteria: { kind: "gamesBeaten", count: 1 }, order: 23 },
    { key: "game-beaten-3", name: "Game Master", description: "Beat every level of three games", icon: "🏆", category: "GAME", rarity: "EPIC", xpReward: 100, criteria: { kind: "gamesBeaten", count: 3 }, order: 24, secret: true },
    // ── Level / XP milestones ────────────────────────────────────────────────
    { key: "level-20", name: "Two Decades", description: "Reach level 20", icon: "🎖️", category: "MILESTONE", rarity: "EPIC", xpReward: 120, criteria: { kind: "levelReached", level: 20 }, order: 25 },
    { key: "level-50", name: "Halfway to Godhood", description: "Reach level 50", icon: "👑", category: "MILESTONE", rarity: "LEGENDARY", xpReward: 300, criteria: { kind: "levelReached", level: 50 }, order: 26, secret: true },
    { key: "level-100", name: "Absolute Unit", description: "Reach level 100", icon: "🏆", category: "MILESTONE", rarity: "MYTHIC", xpReward: 1000, criteria: { kind: "levelReached", level: 100 }, order: 27, secret: true },
    { key: "xp-1000", name: "Centurion", description: "Earn 1000 total XP", icon: "⚡", category: "MILESTONE", rarity: "RARE", xpReward: 40, criteria: { kind: "xpReached", xp: 1000 }, order: 28 },
    { key: "xp-5000", name: "Five Thousand", description: "Earn 5000 total XP", icon: "🚀", category: "MILESTONE", rarity: "EPIC", xpReward: 100, criteria: { kind: "xpReached", xp: 5000 }, order: 29 },
    { key: "xp-10000", name: "Ten Grand", description: "Earn 10,000 total XP", icon: "💎", category: "MILESTONE", rarity: "LEGENDARY", xpReward: 200, criteria: { kind: "xpReached", xp: 10000 }, order: 30 },
    // ── Quiz / exercise depth ────────────────────────────────────────────────
    { key: "quiz-10", name: "Quiz Whiz", description: "Pass 10 quizzes", icon: "🧠", category: "QUIZ", rarity: "RARE", xpReward: 50, criteria: { kind: "quizzesPassed", count: 10 }, order: 31 },
    { key: "quiz-50", name: "Trivia Terminator", description: "Pass 50 quizzes", icon: "🧠", category: "QUIZ", rarity: "EPIC", xpReward: 120, criteria: { kind: "quizzesPassed", count: 50 }, order: 32 },
    { key: "quiz-perfect-5", name: "Flawless Mind", description: "Get a perfect score on 5 quizzes", icon: "🎯", category: "QUIZ", rarity: "EPIC", xpReward: 100, criteria: { kind: "quizPerfect", count: 5 }, order: 33 },
    { key: "quiz-attempts-50", name: "Question Overload", description: "Take 50 quizzes", icon: "📚", category: "QUIZ", rarity: "RARE", xpReward: 50, criteria: { kind: "quizAttempts", count: 50 }, order: 34 },
    { key: "exercise-100", name: "Century of Code", description: "Pass 100 exercises", icon: "💪", category: "MILESTONE", rarity: "EPIC", xpReward: 120, criteria: { kind: "exercisesPassed", count: 100 }, order: 35 },
    { key: "lines-1000", name: "A Thousand Lines", description: "Write 1,000 lines of code", icon: "🖋️", category: "ACTIVITY", rarity: "RARE", xpReward: 60, criteria: { kind: "linesOfCode", count: 1000 }, order: 36 },
    { key: "lines-10000", name: "Code Fountain", description: "Write 10,000 lines of code", icon: "🖋️", category: "ACTIVITY", rarity: "EPIC", xpReward: 150, criteria: { kind: "linesOfCode", count: 10000 }, order: 37 },
    { key: "lines-100000", name: "Code Ocean", description: "Write 100,000 lines of code", icon: "🌊", category: "ACTIVITY", rarity: "LEGENDARY", xpReward: 400, criteria: { kind: "linesOfCode", count: 100000 }, order: 38, secret: true },
    // ── Study habits ─────────────────────────────────────────────────────────
    { key: "study-500", name: "Deep Focus", description: "Study for 500 minutes", icon: "⏱️", category: "ACTIVITY", rarity: "RARE", xpReward: 60, criteria: { kind: "studyMinutes", minutes: 500 }, order: 39 },
    { key: "study-3000", name: "Marathon Mind", description: "Study for 3,000 minutes", icon: "⏱️", category: "ACTIVITY", rarity: "EPIC", xpReward: 150, criteria: { kind: "studyMinutes", minutes: 3000 }, order: 40 },
    { key: "study-30-days", name: "Consistent", description: "Study on 30 different days", icon: "📆", category: "ACTIVITY", rarity: "EPIC", xpReward: 120, criteria: { kind: "studyDays", count: 30 }, order: 41 },
    { key: "streak-60", name: "Unbreakable", description: "Reach a 60-day streak", icon: "🔥", category: "STREAK", rarity: "LEGENDARY", xpReward: 250, criteria: { kind: "streakReached", days: 60 }, order: 42, secret: true },
    // ── Games ────────────────────────────────────────────────────────────────
    { key: "game-levels-10", name: "Level Runner", description: "Beat 10 game levels", icon: "🕹️", category: "GAME", rarity: "RARE", xpReward: 60, criteria: { kind: "gameLevelsBeaten", count: 10 }, order: 43 },
    { key: "game-levels-30", name: "Level Dominator", description: "Beat 30 game levels", icon: "🕹️", category: "GAME", rarity: "EPIC", xpReward: 150, criteria: { kind: "gameLevelsBeaten", count: 30 }, order: 44 },
    { key: "game-perfect-5", name: "Perfect Gamer", description: "Get a perfect score on 5 game levels", icon: "💯", category: "GAME", rarity: "EPIC", xpReward: 80, criteria: { kind: "gamePerfectLevels", count: 5 }, order: 45 },
    { key: "game-beaten-6", name: "All Games", description: "Beat every learning game", icon: "🏆", category: "GAME", rarity: "LEGENDARY", xpReward: 300, criteria: { kind: "gamesBeaten", count: 6 }, order: 46, secret: true },
    // ── Projects ─────────────────────────────────────────────────────────────
    { key: "projects-5", name: "Habitual Builder", description: "Submit 5 projects", icon: "🛠️", category: "PROJECT", rarity: "RARE", xpReward: 60, criteria: { kind: "projectsSubmitted", count: 5 }, order: 47 },
    { key: "projects-approved-3", name: "Ship Captain", description: "Get 3 projects approved", icon: "📦", category: "PROJECT", rarity: "EPIC", xpReward: 120, criteria: { kind: "projectsApproved", count: 3 }, order: 48 },
    // ── Economy / titles / store ─────────────────────────────────────────────
    { key: "coins-100", name: "First Coins", description: "Earn 100 CodeCoins", icon: "🪙", category: "ACTIVITY", rarity: "COMMON", xpReward: 20, criteria: { kind: "coinsEarned", count: 100 }, order: 49 },
    { key: "coins-1000", name: "Coin Hoarder", description: "Earn 1,000 CodeCoins", icon: "🪙", category: "ACTIVITY", rarity: "RARE", xpReward: 60, criteria: { kind: "coinsEarned", count: 1000 }, order: 50 },
    { key: "coins-5000", name: "Coin Empire", description: "Earn 5,000 CodeCoins", icon: "🪙", category: "ACTIVITY", rarity: "EPIC", xpReward: 150, criteria: { kind: "coinsEarned", count: 5000 }, order: 51 },
    { key: "titles-3", name: "Title Collector", description: "Own 3 titles", icon: "🏷️", category: "ACTIVITY", rarity: "RARE", xpReward: 50, criteria: { kind: "titlesOwned", count: 3 }, order: 52 },
    { key: "titles-10", name: "Title Master", description: "Own 10 titles", icon: "🏷️", category: "ACTIVITY", rarity: "EPIC", xpReward: 100, criteria: { kind: "titlesOwned", count: 10 }, order: 53 },
    { key: "store-1", name: "Shopper", description: "Buy your first store item", icon: "🛍️", category: "ACTIVITY", rarity: "COMMON", xpReward: 20, criteria: { kind: "storeItemsOwned", count: 1 }, order: 54 },
    { key: "store-5", name: "Full Wardrobe", description: "Buy 5 store items", icon: "🛍️", category: "ACTIVITY", rarity: "RARE", xpReward: 60, criteria: { kind: "storeItemsOwned", count: 5 }, order: 55 },
    { key: "missions-10", name: "Task Buster", description: "Complete 10 daily missions", icon: "🎯", category: "ACTIVITY", rarity: "RARE", xpReward: 50, criteria: { kind: "missionsCompleted", count: 10 }, order: 56 },
    // ── Courses / certificates ───────────────────────────────────────────────
    { key: "cert-3", name: "Triple Certified", description: "Earn 3 certificates", icon: "🏅", category: "COURSE", rarity: "EPIC", xpReward: 100, criteria: { kind: "certificatesEarned", count: 3 }, order: 57 },
    { key: "courses-3", name: "Course Conqueror", description: "Complete 3 courses", icon: "🎓", category: "COURSE", rarity: "EPIC", xpReward: 120, criteria: { kind: "courseCompleted" }, order: 58 },
    { key: "html-css-js", name: "The Web Trio", description: "Complete HTML, CSS and JavaScript", icon: "🌐", category: "COURSE", rarity: "RARE", xpReward: 150, criteria: { kind: "allOf", criteria: [{ kind: "courseCompleted", slug: "html-fundamentals" }, { kind: "courseCompleted", slug: "css-styling" }, { kind: "courseCompleted", slug: "javascript-basics" }] }, order: 59 },
    { key: "first-boss", name: "Boss Slayer", description: "Defeat your first world boss", icon: "👹", category: "WORLD", rarity: "RARE", xpReward: 60, criteria: { kind: "bossDefeated", worldKey: "html" }, order: 60 },
    { key: "world-cert-1", name: "World Certified", description: "Earn your first world certificate", icon: "🏅", category: "WORLD", rarity: "EPIC", xpReward: 100, criteria: { kind: "worldCertificatesEarned", count: 1 }, order: 61 },
    { key: "world-master-1", name: "World Conqueror", description: "Master your first Programming World", icon: "🌍", category: "WORLD", rarity: "EPIC", xpReward: 120, criteria: { kind: "worldMastered", worldKey: "html" }, order: 62 },
    { key: "worlds-mastered-3", name: "Pathfinder", description: "Master three Programming Worlds", icon: "🗺️", category: "WORLD", rarity: "LEGENDARY", xpReward: 250, criteria: { kind: "worldMastered" }, order: 63, secret: true },
    { key: "worlds-mastered-10", name: "Grandmaster of CodeSphere", description: "Master all ten Programming Worlds", icon: "🐉", category: "WORLD", rarity: "MYTHIC", xpReward: 1000, criteria: { kind: "worldMastered" }, order: 64, secret: true },
  ] as const;

  for (const a of items) {
    await prisma.achievement.upsert({
      where: { key: a.key },
      create: { ...a, criteria: a.criteria as never },
      update: { ...a, criteria: a.criteria as never },
    });
  }
}

async function upsertProgression() {
  const titles = [
    // ── Level titles ─────────────────────────────────────────────────────────
    { key: "beginner-coder", name: "Beginner Coder", description: "Everyone starts somewhere. First steps on the ladder.", icon: "🐣", rarity: "COMMON", unlockType: "level", unlockValue: 1, order: 1 },
    { key: "html-apprentice", name: "HTML Apprentice", description: "Reach level 5 and master the language of the web.", icon: "🌐", rarity: "COMMON", unlockType: "level", unlockValue: 5, order: 2 },
    { key: "css-crafter", name: "CSS Crafter", description: "Reach level 10 and paint the web your way.", icon: "🎨", rarity: "COMMON", unlockType: "level", unlockValue: 10, order: 3 },
    { key: "js-builder", name: "JS Builder", description: "Reach level 15 and make pages think.", icon: "🧠", rarity: "RARE", unlockType: "level", unlockValue: 15, order: 4 },
    { key: "frontend-dev", name: "Frontend Developer", description: "Reach level 20 — you build for the browser.", icon: "💻", rarity: "RARE", unlockType: "level", unlockValue: 20, order: 5 },
    { key: "logic-weaver", name: "Logic Weaver", description: "Reach level 25 and weave control flow into art.", icon: "🕸️", rarity: "RARE", unlockType: "level", unlockValue: 25, order: 6 },
    { key: "code-architect", name: "Code Architect", description: "Reach level 30 — you design, not just write.", icon: "🏛️", rarity: "RARE", unlockType: "level", unlockValue: 30, order: 7 },
    { key: "system-builder", name: "System Builder", description: "Reach level 35 and assemble software that lasts.", icon: "🧱", rarity: "EPIC", unlockType: "level", unlockValue: 35, order: 8 },
    { key: "algorithm-master", name: "Algorithm Master", description: "Reach level 40 and bend complexity to your will.", icon: "📐", rarity: "EPIC", unlockType: "level", unlockValue: 40, order: 9 },
    { key: "tech-visionary", name: "Tech Visionary", description: "Reach level 45 and see further than the code.", icon: "🔭", rarity: "EPIC", unlockType: "level", unlockValue: 45, order: 10 },
    { key: "senior-engineer", name: "Senior Engineer", description: "Reach level 50. Halfway to the mythic peak.", icon: "👨‍💻", rarity: "EPIC", unlockType: "level", unlockValue: 50, order: 11 },
    { key: "mentor", name: "Mentor", description: "Reach level 60 — teach, review and elevate others.", icon: "🧑‍🏫", rarity: "LEGENDARY", unlockType: "level", unlockValue: 60, order: 12 },
    { key: "arch-mage", name: "Arch Mage of Code", description: "Reach level 70 and cast spells in any language.", icon: "🧙", rarity: "LEGENDARY", unlockType: "level", unlockValue: 70, order: 13 },
    { key: "code-ninja", name: "Code Ninja", description: "Reach level 80 — silent, swift, untouchable.", icon: "🥷", rarity: "LEGENDARY", unlockType: "level", unlockValue: 80, order: 14 },
    { key: "code-myth", name: "Code Myth", description: "Reach level 90. Your code is told in legends.", icon: "🐉", rarity: "MYTHIC", unlockType: "level", unlockValue: 90, order: 15 },
    { key: "codesphere-legend", name: "CodeSphere Legend", description: "Reach level 100. The summit. The mythic peak.", icon: "👑", rarity: "MYTHIC", unlockType: "level", unlockValue: 100, order: 16 },
    // ── XP titles ────────────────────────────────────────────────────────────
    { key: "xp-pioneer", name: "XP Pioneer", description: "Earn 5,000 lifetime XP.", icon: "🚀", rarity: "RARE", unlockType: "xp", unlockValue: 5000, order: 17 },
    { key: "xp-champion", name: "XP Champion", description: "Earn 15,000 lifetime XP.", icon: "🏅", rarity: "EPIC", unlockType: "xp", unlockValue: 15000, order: 18 },
    { key: "xp-titan", name: "XP Titan", description: "Earn 50,000 lifetime XP.", icon: "🗿", rarity: "LEGENDARY", unlockType: "xp", unlockValue: 50000, order: 19 },
    { key: "xp-god", name: "XP God", description: "Earn 120,000 lifetime XP.", icon: "☄️", rarity: "MYTHIC", unlockType: "xp", unlockValue: 120000, order: 20 },
    // ── Achievement titles ───────────────────────────────────────────────────
    { key: "perfect-mind", name: "Perfect Mind", description: "Earn the Perfect Score achievement.", icon: "🎯", rarity: "RARE", unlockType: "achievement", achievementKey: "perfect-score", order: 21 },
    { key: "game-champion", name: "Game Champion", description: "Earn the Game Master achievement.", icon: "🎮", rarity: "EPIC", unlockType: "achievement", achievementKey: "game-beaten-3", order: 22 },
    { key: "streak-legend", name: "Streak Legend", description: "Earn the Unstoppable achievement.", icon: "🔥", rarity: "LEGENDARY", unlockType: "achievement", achievementKey: "streak-30", order: 23 },
    { key: "mythic-achiever", name: "Mythic Achiever", description: "Earn the Absolute Unit achievement.", icon: "💠", rarity: "MYTHIC", unlockType: "achievement", achievementKey: "level-100", order: 24 },
    // ── Store titles ─────────────────────────────────────────────────────────
    { key: "royal", name: "The Royal", description: "A title for those who invest their hard-earned coins.", icon: "👑", rarity: "LEGENDARY", unlockType: "store", price: 1500, order: 25 },
    { key: "nebula", name: "Nebula Dreamer", description: "Bought with coins. Worn with pride.", icon: "🌌", rarity: "MYTHIC", unlockType: "store", price: 2000, order: 26 },
  ] as const;

  for (const t of titles) {
    await prisma.title.upsert({
      where: { key: t.key },
      create: { ...t },
      update: { ...t },
    });
  }

  const storeItems = [
    // ── Profile frames ───────────────────────────────────────────────────────
    { key: "frame-classic", name: "Classic Frame", description: "A clean slate border for your profile card.", type: "profile_frame", asset: { border: "border-2 border-slate-400/60 rounded-2xl" }, price: 100, rarity: "COMMON", minLevel: 0, order: 1 },
    { key: "frame-gold", name: "Golden Frame", description: "A touch of gold around your badge.", type: "profile_frame", asset: { border: "border-[3px] border-amber-400/80 rounded-2xl shadow-lg shadow-amber-500/10" }, price: 500, rarity: "RARE", minLevel: 0, order: 2 },
    { key: "frame-cosmic", name: "Cosmic Frame", description: "A pulsing violet aura. Epic tier, level 20.", type: "profile_frame", asset: { border: "border-4 border-violet-400 rounded-2xl shadow-xl shadow-violet-500/20 animate-pulse" }, price: 1500, rarity: "EPIC", minLevel: 20, order: 3 },
    { key: "frame-legend", name: "Legend Frame", description: "Radiant gold for true legends. Level 30.", type: "profile_frame", asset: { border: "border-4 border-amber-300 rounded-2xl shadow-2xl shadow-amber-400/30" }, price: 4000, rarity: "LEGENDARY", minLevel: 30, order: 4 },
    { key: "frame-mythic", name: "Mythic Aura", description: "A living aura only level 50+ can wield.", type: "profile_frame", asset: { border: "border-4 border-pink-400 rounded-2xl shadow-2xl shadow-pink-500/40 animate-pulse" }, price: 8000, rarity: "MYTHIC", minLevel: 50, order: 5 },
    // ── Avatars ──────────────────────────────────────────────────────────────
    { key: "avatar-robot", name: "Robot Face", description: "Beep boop. Your code face.", type: "avatar", asset: { emoji: "🤖" }, price: 150, rarity: "COMMON", minLevel: 0, order: 6 },
    { key: "avatar-ninja", name: "Ninja", description: "Stealthy avatar for stealthy coders.", type: "avatar", asset: { emoji: "🥷" }, price: 400, rarity: "RARE", minLevel: 0, order: 7 },
    { key: "avatar-wizard", name: "Wizard", description: "Cast spells, ship features.", type: "avatar", asset: { emoji: "🧙" }, price: 1200, rarity: "EPIC", minLevel: 20, order: 8 },
    { key: "avatar-dragon", name: "Dragon Rider", description: "Ride the release to production.", type: "avatar", asset: { emoji: "🐉" }, price: 3500, rarity: "LEGENDARY", minLevel: 30, order: 9 },
    { key: "avatar-galaxy", name: "Galaxy Head", description: "Your mind, the cosmos.", type: "avatar", asset: { emoji: "🌌" }, price: 7500, rarity: "MYTHIC", minLevel: 50, order: 10 },
    // ── Username colors ──────────────────────────────────────────────────────
    { key: "name-blue", name: "Sky Name", description: "A calm sky-blue username.", type: "username_color", asset: { color: "#38bdf8" }, price: 200, rarity: "COMMON", minLevel: 0, order: 11 },
    { key: "name-gold", name: "Golden Name", description: "Your name in gold.", type: "username_color", asset: { color: "#fbbf24" }, price: 800, rarity: "RARE", minLevel: 0, order: 12 },
    { key: "name-neon", name: "Neon Name", description: "Electric violet, day and night.", type: "username_color", asset: { color: "#a78bfa" }, price: 2000, rarity: "EPIC", minLevel: 20, order: 13 },
    { key: "name-rainbow", name: "Rainbow Name", description: "A shifting gradient username.", type: "username_color", asset: { gradient: "linear-gradient(90deg,#f87171,#fbbf24,#4ade80,#38bdf8,#a78bfa)" }, price: 5000, rarity: "LEGENDARY", minLevel: 30, order: 14 },
    // ── Themes ───────────────────────────────────────────────────────────────
    { key: "theme-midnight", name: "Midnight", description: "Deep-blue accent for the night owls.", type: "theme", asset: { accent: "#6366f1", dark: true }, price: 300, rarity: "COMMON", minLevel: 0, order: 15 },
    { key: "theme-sunset", name: "Sunset", description: "Warm orange-pink accent.", type: "theme", asset: { accent: "#fb7185", dark: false }, price: 900, rarity: "RARE", minLevel: 0, order: 16 },
    { key: "theme-neon", name: "Neon District", description: "Acid green on near-black.", type: "theme", asset: { accent: "#4ade80", dark: true }, price: 2200, rarity: "EPIC", minLevel: 20, order: 17 },
    // ── Cursor effects ───────────────────────────────────────────────────────
    { key: "cursor-sparkles", name: "Sparkles", description: "Little sparkles trail your cursor.", type: "cursor_effect", asset: { effect: "sparkles" }, price: 400, rarity: "COMMON", minLevel: 0, order: 18 },
    { key: "cursor-trail", name: "Comet Trail", description: "A glowing trail follows you.", type: "cursor_effect", asset: { effect: "trail" }, price: 1200, rarity: "RARE", minLevel: 0, order: 19 },
    // ── Wallpapers ───────────────────────────────────────────────────────────
    { key: "wallpaper-grid", name: "Grid", description: "A subtle developer grid backdrop.", type: "wallpaper", asset: { background: "radial-gradient(rgba(148,163,184,0.15) 1px, transparent 1px) 0 0/24px 24px" }, price: 250, rarity: "COMMON", minLevel: 0, order: 20 },
    { key: "wallpaper-code", name: "Code Rain", description: "A faint streaming-code backdrop.", type: "wallpaper", asset: { background: "linear-gradient(135deg,rgba(56,189,248,0.08),rgba(139,92,246,0.08))" }, price: 900, rarity: "RARE", minLevel: 0, order: 21 },
    // ── Certificate borders ───────────────────────────────────────────────────
    { key: "cert-gold", name: "Gold Seal", description: "A gold frame on every certificate.", type: "certificate_border", asset: { border: "border-[6px] border-double border-amber-400/70" }, price: 600, rarity: "RARE", minLevel: 0, order: 22 },
    { key: "cert-laurel", name: "Laurel Wreath", description: "Victory laurels around your certificates.", type: "certificate_border", asset: { border: "border-4 border-emerald-400/60" }, price: 1800, rarity: "EPIC", minLevel: 20, order: 23 },
    // ── Title cards ──────────────────────────────────────────────────────────
    { key: "card-glow", name: "Glow Card", description: "A soft glow behind your displayed title.", type: "title_card", asset: { card: "glow" }, price: 300, rarity: "COMMON", minLevel: 0, order: 24 },
    { key: "card-holo", name: "Holo Card", description: "A holographic shimmer on your title.", type: "title_card", asset: { card: "holo" }, price: 1600, rarity: "EPIC", minLevel: 20, order: 25 },
    // ── Achievement effects ───────────────────────────────────────────────────
    { key: "effect-confetti", name: "Confetti", description: "Confetti bursts when you earn achievements.", type: "achievement_effect", asset: { effect: "confetti" }, price: 500, rarity: "COMMON", minLevel: 0, order: 26 },
    { key: "effect-gold-rain", name: "Gold Rain", description: "Golden rain when you level up.", type: "achievement_effect", asset: { effect: "gold-rain" }, price: 2000, rarity: "EPIC", minLevel: 20, order: 27 },
  ] as const;

  for (const s of storeItems) {
    await prisma.storeItem.upsert({
      where: { key: s.key },
      create: { ...s, asset: s.asset as never },
      update: { ...s, asset: s.asset as never },
    });
  }

  const missions = [
    { key: "mission-lesson", title: "Lesson of the Day", description: "Complete one lesson", type: "complete_lesson", target: 1, rewardCoins: 25, rewardXp: 20, order: 1 },
    { key: "mission-xp", title: "XP Hunt", description: "Earn 100 XP", type: "earn_xp", target: 100, rewardCoins: 20, rewardXp: 0, order: 2 },
    { key: "mission-quiz", title: "Quiz Whiz", description: "Pass one quiz", type: "pass_quiz", target: 1, rewardCoins: 20, rewardXp: 10, order: 3 },
    { key: "mission-exercise", title: "Practice Makes Perfect", description: "Pass two exercises", type: "pass_exercise", target: 2, rewardCoins: 15, rewardXp: 10, order: 4 },
    { key: "mission-game", title: "Game Time", description: "Beat one game level", type: "play_game", target: 1, rewardCoins: 20, rewardXp: 10, order: 5 },
    { key: "mission-study", title: "Focused Session", description: "Study for 20 minutes", type: "study_minutes", target: 20, rewardCoins: 20, rewardXp: 5, order: 6 },
  ] as const;

  for (const m of missions) {
    await prisma.dailyMission.upsert({
      where: { key: m.key },
      create: { ...m },
      update: { ...m },
    });
  }
}

async function upsertCatalog() {
  const webDev = await prisma.category.upsert({
    where: { slug: "web-development" },
    create: { name: "Web Development", slug: "web-development", description: "Build for the browser: HTML, CSS and JavaScript.", icon: "🌐", color: "#6366f1", order: 1 },
    update: {},
  });
  const networking = await prisma.category.upsert({
    where: { slug: "networking" },
    create: { name: "Networking", slug: "networking", description: "Design and troubleshoot real networks in a simulated lab.", icon: "🕸️", color: "#06b6d4", order: 2 },
    update: {},
  });
  return { webDev, networking };
}

// ---------------------------------------------------------------------------
// Course: HTML Fundamentals
// ---------------------------------------------------------------------------

async function seedHtmlCourse(categoryId: string) {
  const course = await prisma.course.upsert({
    where: { slug: "html-fundamentals" },
    create: {
      title: "HTML Fundamentals",
      slug: "html-fundamentals",
      description: "Learn the structure of the web by writing real HTML — headings, text, links, images, lists, tables and forms.",
      longDescription:
        "HTML is the skeleton of every web page. In this hands-on course you'll write real markup from the very first lesson, get instant feedback with structure checks, and finish by building a personal profile page.",
      categoryId,
      icon: "🌐",
      color: "#ef4444",
      difficulty: "BEGINNER",
      language: "html",
      estimatedHours: 4,
      xpTotal: 220,
      status: "PUBLISHED",
      isFree: true,
      order: 1,
    },
    update: { title: "HTML Fundamentals", description: "Learn the structure of the web by writing real HTML — headings, text, links, images, lists, tables and forms.", difficulty: "BEGINNER", status: "PUBLISHED", isFree: true },
  });

  const m1 = await prisma.module.upsert({
    where: { courseId_slug: { courseId: course.id, slug: "getting-started" } },
    create: { courseId: course.id, title: "Getting Started", slug: "getting-started", description: "Tags, elements and your first page.", order: 1, estimatedMinutes: 45 },
    update: { title: "Getting Started", order: 1, estimatedMinutes: 45 },
  });

  const lesson1 = await upsertLesson(m1.id, course.id, {
    slug: "what-is-html",
    title: "What is HTML?",
    description: "Understand tags and elements, and write your first page.",
    objectives: ["Explain what HTML is and where it lives", "Identify tags, elements and attributes", "Write a minimal valid HTML page"],
    difficulty: "BEGINNER",
    estimatedMinutes: 10,
    order: 1,
    content: block([
      ...p("HTML (**HyperText Markup Language**) is the language used to describe the structure of web pages. Every element on a page — headings, paragraphs, links, images — is built from HTML tags."),
      { type: "callout", variant: "info", title: "Remember", text: "HTML describes **what** things are (a heading, a list, a link). Styling how they look is CSS, and making them interactive is JavaScript." },
      { type: "heading", level: 2, text: "Tags and elements" },
      ...p("HTML is made of **elements**. An element usually has an opening tag, some content, and a closing tag:"),
      { type: "code", language: "html", code: "<p>Hello, world!</p>", title: "A paragraph element" },
      ...p("The tag name is written between angle brackets. The closing tag has a forward slash. Some elements are **void** (empty) — like an image or a line break — and have no closing tag."),
      { type: "heading", level: 2, text: "The skeleton of every page" },
      ...p("Every HTML document starts with a `<!DOCTYPE html>` declaration and wraps everything in an `<html>` element, with a `<head>` for metadata and a `<body>` for visible content:"),
      { type: "code", language: "html", code: `<!DOCTYPE html>
<html>
  <head>
    <title>My first page</title>
  </head>
  <body>
    <h1>Hello, world!</h1>
    <p>This is my first web page.</p>
  </body>
</html>`, title: "Minimal document" },
      { type: "example", title: "Run it", description: "Edit the code and click Run to see it in the preview.", html: "<h1>Hello, world!</h1>\n<p>This is my first web page.</p>" },
      { type: "checkpoint", title: "Checkpoint", items: ["HTML gives pages their structure", "An element has an opening tag, content and a closing tag", "The <body> holds the visible content"] },
      { type: "exercise", exerciseKey: "ex-html-skeleton", title: "Build the skeleton" },
      { type: "quiz", quizKey: "qz-html-tags", title: "HTML tags quick quiz" },
    ]),
  });

  const lesson2 = await upsertLesson(m1.id, course.id, {
    slug: "headings-and-text",
    title: "Headings and text",
    description: "Structure content with headings and paragraphs.",
    objectives: ["Use the six heading levels correctly", "Write paragraphs and emphasis", "Break lines and add horizontal rules"],
    difficulty: "BEGINNER",
    estimatedMinutes: 12,
    order: 2,
    content: block([
      ...p("Headings come in six levels, from `<h1>` (the most important) down to `<h6>`."),
      { type: "code", language: "html", code: "<h1>Main title</h1>\n<h2>Section</h2>\n<h3>Sub-section</h3>", title: "Heading levels" },
      ...p("Use only **one** `<h1>` per page (the page title). Lower levels divide it into sections. Skip levels only rarely — it's better to go h1 → h2 → h3 in order."),
      { type: "heading", level: 2, text: "Paragraphs and emphasis" },
      ...p("Text goes in `<p>` tags. You can make words **bold** with `<strong>` and *italic* with `<em>`:"),
      { type: "code", language: "html", code: "<p>This is <strong>very important</strong> and this is <em>emphasized</em>.</p>" },
      { type: "heading", level: 2, text: "Line breaks and rules" },
      ...p("Use `<br>` for a line break and `<hr>` for a horizontal rule (a visual divider). Both are void elements."),
      { type: "code", language: "html", code: "<p>First line<br>Second line</p>\n<hr>" },
      { type: "exercise", exerciseKey: "ex-html-headings", title: "Structure a page with headings" },
      { type: "exercise", exerciseKey: "ex-html-emphasis", title: "Add emphasis" },
    ]),
  });

  const lesson3 = await upsertLesson(m1.id, course.id, {
    slug: "links-and-images",
    title: "Links and images",
    description: "Connect pages with anchors and embed images.",
    objectives: ["Create hyperlinks with <a>", "Link to pages, sections and email", "Embed and size images"],
    difficulty: "BEGINNER",
    estimatedMinutes: 12,
    order: 3,
    content: block([
      ...p("The web would be nothing without links. An `<a>` (anchor) element points somewhere via the `href` attribute:"),
      { type: "code", language: "html", code: '<a href="https://example.com">Visit example.com</a>', title: "A hyperlink" },
      ...p("Use `target=\"_blank\"` to open the link in a new tab. To link within the same page, point at an element's `id` with a `#`:"),
      { type: "code", language: "html", code: '<a href="#contact">Jump to contact</a>\n...\n<section id="contact">Contact info</section>' },
      { type: "heading", level: 2, text: "Images" },
      ...p("Images use the void `<img>` element with `src` (the file path or URL) and `alt` (a text description for accessibility):"),
      { type: "code", language: "html", code: '<img src="https://picsum.photos/400/200" alt="A random photo" width="400" height="200">' },
      { type: "callout", variant: "warning", title: "Always set alt text", text: "Screen readers announce the `alt` text to visually impaired users, and it shows if the image fails to load. Never skip it for meaningful images." },
      { type: "exercise", exerciseKey: "ex-html-links", title: "Link it up" },
    ]),
  });

  const m2 = await prisma.module.upsert({
    where: { courseId_slug: { courseId: course.id, slug: "structure-and-forms" } },
    create: { courseId: course.id, title: "Structure and Forms", slug: "structure-and-forms", description: "Semantic markup and gathering user input.", order: 2, estimatedMinutes: 60 },
    update: { title: "Structure and Forms", order: 2, estimatedMinutes: 60 },
  });

  const lesson4 = await upsertLesson(m2.id, course.id, {
    slug: "lists-and-tables",
    title: "Lists and tables",
    description: "Organize content into lists and structured tables.",
    objectives: ["Build ordered and unordered lists", "Nest lists", "Create semantic tables"],
    difficulty: "BEGINNER",
    estimatedMinutes: 12,
    order: 1,
    content: block([
      ...p("Lists keep content organized. Use `<ul>` for an unordered (bulleted) list and `<ol>` for an ordered (numbered) list. Items go inside `<li>`:"),
      { type: "code", language: "html", code: "<ul>\n  <li>Apples</li>\n  <li>Bananas</li>\n</ul>\n\n<ol>\n  <li>Preheat the oven</li>\n  <li>Mix the batter</li>\n</ol>" },
      ...p("Lists can be **nested** by putting a list inside an `<li>`:"),
      { type: "code", language: "html", code: "<ul>\n  <li>Fruit\n    <ul>\n      <li>Apples</li>\n      <li>Oranges</li>\n    </ul>\n  </li>\n</ul>" },
      { type: "heading", level: 2, text: "Tables" },
      ...p("Tables use `<table>`, with rows in `<tr>`, header cells in `<th>` and data cells in `<td>`:"),
      { type: "code", language: "html", code: "<table>\n  <tr>\n    <th>Name</th>\n    <th>Age</th>\n  </tr>\n  <tr>\n    <td>Ada</td>\n    <td>36</td>\n  </tr>\n</table>" },
      { type: "exercise", exerciseKey: "ex-html-lists", title: "Build a shopping list" },
    ]),
  });

  const lesson5 = await upsertLesson(m2.id, course.id, {
    slug: "semantic-html",
    title: "Semantic HTML",
    description: "Use meaningful tags so the page structure makes sense to everyone.",
    objectives: ["Recognize semantic elements", "Choose the right tag for common sections", "Build a page layout with semantic tags"],
    difficulty: "BEGINNER",
    estimatedMinutes: 12,
    order: 2,
    content: block([
      ...p("Semantic HTML means using tags that **describe their purpose**, not just how they look. Instead of wrapping every block in a `<div>`, modern HTML gives you `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>` and `<footer>`."),
      { type: "code", language: "html", code: "<body>\n  <header>Site logo and tagline</header>\n  <nav>Home · About · Contact</nav>\n  <main>\n    <article>\n      <h2>A blog post</h2>\n      <p>The post body…</p>\n    </article>\n    <aside>Related links</aside>\n  </main>\n  <footer>Copyright notice</footer>\n</body>" },
      { type: "callout", variant: "tip", title: "Why it matters", text: "Semantic tags improve accessibility (screen readers), SEO, and make your code easier to read and maintain." },
      { type: "exercise", exerciseKey: "ex-html-semantic", title: "Restructure with semantic tags" },
      { type: "exercise", exerciseKey: "ex-html-order", title: "Order the page structure" },
    ]),
  });

  const lesson6 = await upsertLesson(m2.id, course.id, {
    slug: "forms",
    title: "Forms",
    description: "Collect user input with labels, inputs and buttons.",
    objectives: ["Build a form with inputs and labels", "Use the common input types", "Explain the role of the submit button"],
    difficulty: "BEGINNER",
    estimatedMinutes: 14,
    order: 3,
    content: block([
      ...p("Forms let users send information to a server. Every form starts with a `<form>` element containing inputs and a submit button."),
      { type: "code", language: "html", code: '<form>\n  <label for="name">Name</label>\n  <input id="name" name="name" type="text">\n\n  <label for="email">Email</label>\n  <input id="email" name="email" type="email">\n\n  <button type="submit">Sign up</button>\n</form>' },
      ...p("The `label` element's `for` attribute should match the input's `id`. Labels make forms **usable for everyone** — clicking the label focuses the field."),
      { type: "heading", level: 2, text: "Common input types" },
      { type: "table", headers: ["Type", "Purpose"], rows: [["text", "Single line of text"], ["email", "An email address (with validation)"], ["password", "Masked text"], ["number", "Numeric value"], ["checkbox", "On/off choice"], ["radio", "Pick one from a group"]] },
      { type: "heading", level: 2, text: "Textareas and selects" },
      ...p("Use `<textarea>` for multi-line text and `<select>`/`<option>` for a dropdown:"),
      { type: "code", language: "html", code: '<textarea name="bio" rows="3"></textarea>\n\n<select name="country">\n  <option value="us">United States</option>\n  <option value="uk">United Kingdom</option>\n</select>' },
      { type: "exercise", exerciseKey: "ex-html-form", title: "Build a sign-up form" },
      { type: "exercise", exerciseKey: "ex-html-fill-form", title: "Complete the form" },
      { type: "quiz", quizKey: "qz-html-forms", title: "Forms checkpoint" },
    ]),
  });

  // -------------------------------------------------------------------------
  // Exercises — HTML
  // -------------------------------------------------------------------------

  await upsertExercise(course.id, lesson1.id, {
    key: "ex-html-skeleton",
    type: "html_structure",
    title: "Build the skeleton",
    instructions: "Add a `<h1>` with the text \"My Web Page\" and a `<p>` that contains the word **Welcome** inside the body. Keep the existing structure.",
    starterCode: `<!DOCTYPE html>
<html>
<head>
  <title>My Web Page</title>
</head>
<body>

</body>
</html>`,
    solution: `<!DOCTYPE html>
<html>
<head>
  <title>My Web Page</title>
</head>
<body>
  <h1>My Web Page</h1>
  <p>Welcome to my site</p>
</body>
</html>`,
    hints: ["The heading tags are <h1> and </h1>.", "Wrap the welcome sentence in <p> and </p>."],
    config: {
      kind: "html_structure",
      checks: [
        { type: "tag", selector: "h1", min: 1 },
        { type: "text", selector: "p", contains: "welcome", ignoreCase: true },
      ],
    },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson2.id, {
    key: "ex-html-headings",
    type: "html_structure",
    title: "Structure a page with headings",
    instructions: "Inside the body, add one `<h1>` with the text **My Blog**, and three `<h2>` elements with the texts **About**, **Posts** and **Contact**.",
    starterCode: `<!DOCTYPE html>
<html>
<head>
  <title>My Blog</title>
</head>
<body>

</body>
</html>`,
    solution: `<!DOCTYPE html>
<html>
<head>
  <title>My Blog</title>
</head>
<body>
  <h1>My Blog</h1>
  <h2>About</h2>
  <h2>Posts</h2>
  <h2>Contact</h2>
</body>
</html>`,
    hints: ["Use <h1> for the blog title.", "Sections use <h2>."],
    config: {
      kind: "html_structure",
      checks: [
        { type: "tag", selector: "h1", min: 1 },
        { type: "tag", selector: "h2", min: 3 },
        { type: "text", selector: "h1", contains: "My Blog" },
      ],
    },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson2.id, {
    key: "ex-html-emphasis",
    type: "html_structure",
    title: "Add emphasis",
    instructions: "Wrap the word **sold out** in `<strong>` and the word **maybe** in `<em>` inside the paragraph.",
    starterCode: "<p>The tickets are sold out, so we will release more maybe tomorrow.</p>",
    solution: "<p>The tickets are <strong>sold out</strong>, so we will release more <em>maybe</em> tomorrow.</p>",
    hints: ["Strong makes text bold: <strong>…</strong>.", "Em gives emphasis: <em>…</em>."],
    config: {
      kind: "html_structure",
      checks: [
        { type: "tag", selector: "strong", min: 1 },
        { type: "tag", selector: "em", min: 1 },
        { type: "text", selector: "strong", contains: "sold out" },
        { type: "text", selector: "em", contains: "maybe" },
      ],
    },
    points: 10,
    order: 2,
  });

  await upsertExercise(course.id, lesson3.id, {
    key: "ex-html-links",
    type: "html_structure",
    title: "Link it up",
    instructions: "Add a link to **https://example.com** with the text **Visit Example** and set `target=\"_blank\"`. Below it, add an image with `src=\"https://picsum.photos/200\"` and alt text **Random image**.",
    starterCode: "<p>Check out this website:</p>\n\n",
    solution: '<p>Check out this website:</p>\n<a href="https://example.com" target="_blank">Visit Example</a>\n<img src="https://picsum.photos/200" alt="Random image">',
    hints: ["An anchor looks like <a href=\"...\">text</a>.", "Images are void elements: <img src=\"...\" alt=\"...\">."],
    config: {
      kind: "html_structure",
      checks: [
        { type: "tag", selector: "a[href='https://example.com']", min: 1 },
        { type: "attribute", selector: "a", attr: "target", value: "_blank" },
        { type: "tag", selector: "img", min: 1 },
        { type: "attribute", selector: "img", attr: "alt" },
      ],
    },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson4.id, {
    key: "ex-html-lists",
    type: "html_structure",
    title: "Build a shopping list",
    instructions: "Create an unordered list (`<ul>`) containing three list items (`<li>`): **Apples**, **Bread** and **Milk**.",
    starterCode: "",
    solution: "<ul>\n  <li>Apples</li>\n  <li>Bread</li>\n  <li>Milk</li>\n</ul>",
    hints: ["Start with <ul>.", "Each item is an <li>.</li>"],
    config: {
      kind: "html_structure",
      checks: [
        { type: "tag", selector: "ul li", min: 3 },
        { type: "text", selector: "li", contains: "Apples" },
        { type: "text", selector: "li", contains: "Milk" },
      ],
    },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson5.id, {
    key: "ex-html-semantic",
    type: "html_structure",
    title: "Restructure with semantic tags",
    instructions: "Inside the body, create a `<header>` containing an `<h1>` with the text **My Portfolio**, a `<main>` containing one `<article>`, and a `<footer>` with the text **© 2026**.",
    starterCode: "<!DOCTYPE html>\n<html>\n<head>\n  <title>Portfolio</title>\n</head>\n<body>\n\n</body>\n</html>",
    solution: `<!DOCTYPE html>
<html>
<head>
  <title>Portfolio</title>
</head>
<body>
  <header>
    <h1>My Portfolio</h1>
  </header>
  <main>
    <article>My first project</article>
  </main>
  <footer>© 2026</footer>
</body>
</html>`,
    hints: ["Header wraps the intro, main wraps the core content.", "Footer goes at the bottom of the body."],
    config: {
      kind: "html_structure",
      checks: [
        { type: "tag", selector: "header h1", min: 1 },
        { type: "tag", selector: "main article", min: 1 },
        { type: "tag", selector: "footer", min: 1 },
        { type: "text", selector: "footer", contains: "2026" },
      ],
    },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson5.id, {
    key: "ex-html-order",
    type: "ordering",
    title: "Order the page structure",
    instructions: "Put the elements in the order they should appear in a well-formed HTML document.",
    starterCode: "",
    config: {
      kind: "ordering",
      steps: ["<!DOCTYPE html>", "<html>", "<head><title>Page</title></head>", "<body>", "<h1>Hello</h1>", "</body>", "</html>"],
      answer: identity(7),
    },
    points: 10,
    order: 2,
  });

  await upsertExercise(course.id, lesson6.id, {
    key: "ex-html-form",
    type: "html_structure",
    title: "Build a sign-up form",
    instructions: "Create a form containing: a `<label>` with `for=\"name\"` and text **Name**, an `<input>` with `id=\"name\"`, and a `<button type=\"submit\">` with the text **Sign up**.",
    starterCode: "<form>\n\n</form>",
    solution: '<form>\n  <label for="name">Name</label>\n  <input id="name" name="name" type="text">\n  <button type="submit">Sign up</button>\n</form>',
    hints: ["Labels pair with inputs via for/id.", "The submit button uses type=\"submit\"."],
    config: {
      kind: "html_structure",
      checks: [
        { type: "tag", selector: "form label", min: 1 },
        { type: "tag", selector: "form input", min: 1 },
        { type: "tag", selector: "button[type='submit']", min: 1 },
        { type: "attribute", selector: "label", attr: "for", value: "name" },
      ],
    },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson6.id, {
    key: "ex-html-fill-form",
    type: "fill_blank",
    title: "Complete the form",
    instructions: "Fill in the blanks to build a working email sign-up field. The input should be type email.",
    starterCode: "",
    config: {
      kind: "fill_blank",
      template: '<form>\n  <____ for="email">Email</____>\n  <input id="____" name="email" type="____">\n  <button type="submit">Subscribe</button>\n</form>',
      blanks: ["label", "email", "email"],
    },
    points: 10,
    order: 2,
  });

  // -------------------------------------------------------------------------
  // Quizzes — HTML
  // -------------------------------------------------------------------------

  await upsertQuiz(lesson1.id, course.id, {
    key: "qz-html-tags",
    title: "HTML tags quick quiz",
    description: "Test your understanding of tags, elements and attributes.",
    passScore: 70,
    timeLimit: 5,
    order: 1,
    questions: [
      { type: "multiple_choice", prompt: "Which element wraps the visible content of a page?", options: ["<head>", "<body>", "<footer>", "<main>"], answer: 1, points: 10, order: 1, explanation: "The <body> holds everything visible to the user." },
      { type: "multiple_choice", prompt: "What does the `alt` attribute on an `<img>` provide?", options: ["The file size", "A text description of the image", "The image URL", "The image height"], answer: 1, points: 10, order: 2, explanation: "alt text describes the image for accessibility and as a fallback." },
      { type: "true_false", prompt: "The `<h1>` tag should be used only once per page.", answer: true, points: 10, order: 3, explanation: "One <h1> per page keeps a clear content hierarchy." },
      { type: "true_false", prompt: "A void element like `<br>` needs a closing tag.", answer: false, points: 10, order: 4, explanation: "Void elements have no closing tag." },
      { type: "multiple_choice", prompt: "Which attribute on an `<a>` opens the link in a new tab?", options: ["href", "rel", "target=\"_blank\"", "download"], answer: 2, points: 10, order: 5, explanation: "target=\"_blank\" opens the link in a new tab." },
    ],
  });

  await upsertQuiz(lesson6.id, course.id, {
    key: "qz-html-forms",
    title: "Forms checkpoint",
    description: "Make sure the basics of forms are locked in.",
    passScore: 70,
    timeLimit: 5,
    order: 1,
    questions: [
      { type: "multiple_choice", prompt: "What pairs a `<label>` with an input?", options: ["The label's `for` and the input's `id`", "Their order in the file", "The `name` attribute", "Nothing — labels are visual only"], answer: 0, points: 10, order: 1, explanation: "for must match the input's id." },
      { type: "multiple_choice", prompt: "Which input type masks the text the user types?", options: ["text", "hidden", "password", "mask"], answer: 2, points: 10, order: 2, explanation: "type=\"password\" masks input." },
      { type: "fill_blank", prompt: "The form must have a button with type \"____\" to submit.", blanks: [["submit", "Submit"]], points: 10, order: 3, explanation: "A submit button triggers form submission." },
      { type: "multiple_choice", prompt: "Which element provides a multi-line text field?", options: ["<input>", "<textarea>", "<select>", "<option>"], answer: 1, points: 10, order: 4, explanation: "<textarea> gives multi-line input." },
      { type: "ordering", prompt: "Arrange these elements in the order a browser reads them inside a form: label, then input, then submit.", items: ["<label for=\"email\">Email</label>", "<input id=\"email\" type=\"email\">", "<button type=\"submit\">Go</button>"], answer: identity(3), points: 10, order: 5, explanation: "Label first, input second, submit button last." },
    ],
  });

  await upsertProject(course.id, {
    slug: "personal-profile-page",
    title: "Personal Profile Page",
    description: "Build a personal profile page with a heading, an intro paragraph, an image, a list of skills and a contact link.",
    difficulty: "BEGINNER",
    requirements: ["A <h1> with your name", "A paragraph introducing yourself", "An <img> with alt text", "A list of at least 3 skills", "A link to your email"],
    starterCode: `<!DOCTYPE html>
<html>
<head>
  <title>My Profile</title>
</head>
<body>
  <header>
    <h1>Your Name</h1>
  </header>
  <main>
    <p>Write a short intro here.</p>
  </main>
</body>
</html>`,
    config: {
      kind: "html_structure",
      checks: [
        { type: "tag", selector: "h1", min: 1 },
        { type: "tag", selector: "p", min: 1 },
        { type: "tag", selector: "img", min: 1 },
        { type: "tag", selector: "ul li", min: 3 },
        { type: "tag", selector: "a[href^='mailto:']", min: 1 },
      ],
    },
    xpReward: 50,
    order: 1,
  });

  return { course, modules: [m1, m2] };
}

// ---------------------------------------------------------------------------
// Course: CSS Styling
// ---------------------------------------------------------------------------

async function seedCssCourse(categoryId: string) {
  const course = await prisma.course.upsert({
    where: { slug: "css-styling" },
    create: {
      title: "CSS Styling",
      slug: "css-styling",
      description: "Style the web with CSS — selectors, colors, the box model, flexbox and responsive layouts.",
      longDescription:
        "Take your pages from plain to polished. Learn how CSS rules work, master selectors and the box model, then build flexible layouts with Flexbox and media queries.",
      categoryId,
      icon: "🎨",
      color: "#3b82f6",
      difficulty: "BEGINNER",
      language: "css",
      estimatedHours: 4,
      xpTotal: 220,
      status: "PUBLISHED",
      isFree: true,
      order: 2,
    },
    update: { description: "Style the web with CSS — selectors, colors, the box model, flexbox and responsive layouts.", status: "PUBLISHED" },
  });

  const m1 = await prisma.module.upsert({
    where: { courseId_slug: { courseId: course.id, slug: "core-concepts" } },
    create: { courseId: course.id, title: "Core Concepts", slug: "core-concepts", description: "Rules, selectors and the box model.", order: 1, estimatedMinutes: 45 },
    update: { order: 1, estimatedMinutes: 45 },
  });

  const lesson1 = await upsertLesson(m1.id, course.id, {
    slug: "what-is-css",
    title: "What is CSS?",
    description: "Learn how style rules are written and applied.",
    objectives: ["Explain what CSS does", "Write a basic rule", "Know the three ways to add CSS"],
    difficulty: "BEGINNER",
    estimatedMinutes: 10,
    order: 1,
    content: block([
      ...p("CSS (**Cascading Style Sheets**) controls how HTML looks: colors, fonts, spacing and layout. A CSS rule selects elements and applies declarations:"),
      { type: "code", language: "css", code: "h1 {\n  color: tomato;\n  font-size: 2rem;\n}", title: "A CSS rule" },
      ...p("`h1` is the **selector** (which elements), and the block of `property: value;` pairs are the **declarations** (what to change)."),
      { type: "heading", level: 2, text: "Adding CSS to a page" },
      { type: "list", ordered: true, items: ["An external stylesheet linked with `<link>` (best practice)", "A `<style>` block in the head", "Inline `style=\"…\"` attributes (avoid)"] },
      { type: "code", language: "html", code: '<link rel="stylesheet" href="styles.css">', title: "Linking a stylesheet" },
      { type: "example", title: "Style it live", description: "Edit the CSS and watch the preview update.", html: "<h1>Hello CSS</h1>\n<p>Styled with a linked stylesheet.</p>", css: "h1 {\n  color: #3b82f6;\n  font-family: Georgia, serif;\n}\n\np {\n  font-size: 18px;\n  line-height: 1.5;\n}" },
      { type: "exercise", exerciseKey: "ex-css-first-rule", title: "Write your first rule" },
      { type: "quiz", quizKey: "qz-css-basics", title: "CSS basics quiz" },
    ]),
  });

  const lesson2 = await upsertLesson(m1.id, course.id, {
    slug: "selectors",
    title: "Selectors and properties",
    description: "Target exactly the elements you want.",
    objectives: ["Use type, class and ID selectors", "Combine selectors", "Use common color and text properties"],
    difficulty: "BEGINNER",
    estimatedMinutes: 12,
    order: 2,
    content: block([
      ...p("Selectors decide **which elements** a rule applies to. The three most common are type, class and ID:"),
      { type: "code", language: "css", code: "/* type */\np { color: gray; }\n\n/* class */\n.highlight { background: yellow; }\n\n/* id */\n#header { border-bottom: 2px solid black; }" },
      { type: "callout", variant: "tip", title: "Class vs ID", text: "Use classes when many elements share a style and IDs for one specific element. An ID should be unique on the page." },
      { type: "heading", level: 2, text: "Colors and text" },
      { type: "code", language: "css", code: ".title {\n  color: #e11d48;\n  font-family: 'Segoe UI', sans-serif;\n  font-size: 28px;\n  font-weight: 700;\n  text-align: center;\n}" },
      { type: "exercise", exerciseKey: "ex-css-selectors", title: "Style with selectors" },
    ]),
  });

  const lesson3 = await upsertLesson(m1.id, course.id, {
    slug: "box-model",
    title: "The box model",
    description: "Understand content, padding, border and margin.",
    objectives: ["Describe the four layers of the box model", "Space elements with margin and padding", "Add borders"],
    difficulty: "BEGINNER",
    estimatedMinutes: 12,
    order: 3,
    content: block([
      ...p("Every element on a page is a rectangular box made of four layers, outside-in: **content**, **padding**, **border** and **margin**."),
      { type: "table", headers: ["Layer", "Controls"], rows: [["Content", "The actual text/image"], ["Padding", "Space inside the border, around content"], ["Border", "A visible edge"], ["Margin", "Space outside the border, between elements"]] },
      { type: "code", language: "css", code: ".card {\n  padding: 16px;\n  border: 1px solid #ddd;\n  margin: 12px auto;\n  border-radius: 8px;\n}" },
      ...p("`box-sizing: border-box` makes the padding and border fit **inside** the declared width — almost always what you want:"),
      { type: "code", language: "css", code: "* {\n  box-sizing: border-box;\n}" },
      { type: "example", title: "The box model in action", html: '<div class="card">\n  <h3>Hello</h3>\n  <p>This card shows padding, border and margin.</p>\n</div>', css: "body {\n  font-family: sans-serif;\n  background: #f3f4f6;\n}\n\n.card {\n  width: 260px;\n  padding: 20px;\n  border: 2px solid #6366f1;\n  border-radius: 10px;\n  margin: 30px auto;\n  background: white;\n}" },
      { type: "exercise", exerciseKey: "ex-css-box", title: "Style a card with the box model" },
    ]),
  });

  const lesson4 = await upsertLesson(m1.id, course.id, {
    slug: "colors-and-typography",
    title: "Colors and typography",
    description: "Pick colors and craft readable text.",
    objectives: ["Use named colors, hex and rgb()", "Set font families and sizes", "Style text with weight, line-height and alignment"],
    difficulty: "BEGINNER",
    estimatedMinutes: 10,
    order: 4,
    content: block([
      ...p("CSS supports several ways to describe a color:"),
      { type: "code", language: "css", code: ".a { color: red; }        /* named */\n.b { color: #ff0000; }   /* hex */\n.c { color: rgb(255, 0, 0); } /* rgb */\n.d { background: rgba(255, 0, 0, 0.5); } /* with opacity */" },
      { type: "heading", level: 2, text: "Typography" },
      ...p("`font-family` stacks fallbacks, `font-size` scales text, and `line-height` controls vertical rhythm:"),
      { type: "code", language: "css", code: "body {\n  font-family: -apple-system, 'Segoe UI', sans-serif;\n  font-size: 16px;\n  line-height: 1.6;\n  color: #111827;\n}" },
      { type: "exercise", exerciseKey: "ex-css-typography", title: "Beautiful typography" },
    ]),
  });

  const m2 = await prisma.module.upsert({
    where: { courseId_slug: { courseId: course.id, slug: "layout" } },
    create: { courseId: course.id, title: "Layout", slug: "layout", description: "Flexbox, grid and responsive design.", order: 2, estimatedMinutes: 60 },
    update: { order: 2, estimatedMinutes: 60 },
  });

  const lesson5 = await upsertLesson(m2.id, course.id, {
    slug: "flexbox",
    title: "Flexbox",
    description: "Lay out items in rows and columns with flex.",
    objectives: ["Turn a container into a flexbox", "Justify and align items", "Use flex properties on items"],
    difficulty: "BEGINNER",
    estimatedMinutes: 12,
    order: 1,
    content: block([
      ...p("Flexbox arranges a group of items in one direction. Put `display: flex` on the **container**, then control placement with `justify-content` (main axis) and `align-items` (cross axis):"),
      { type: "code", language: "css", code: ".nav {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}" },
      { type: "table", headers: ["Value", "Effect"], rows: [["flex-start", "Items line up at the start"], ["center", "Items are centered"], ["space-between", "Equal gaps, no space at the ends"], ["space-around", "Equal space around each item"]] },
      { type: "example", title: "Flexbox navigation", html: '<nav class="nav">\n  <a href="#">Logo</a>\n  <div>\n    <a href="#">Home</a>\n    <a href="#">About</a>\n    <a href="#">Contact</a>\n  </div>\n</nav>', css: ".nav {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  background: #111827;\n  color: white;\n  padding: 12px 20px;\n  font-family: sans-serif;\n}\n\n.nav a { color: white; margin-left: 12px; text-decoration: none; }" },
      { type: "exercise", exerciseKey: "ex-css-flexbox", title: "Center with flexbox" },
      { type: "exercise", exerciseKey: "ex-css-flex-desc", title: "Describe the layout" },
    ]),
  });

  const lesson6 = await upsertLesson(m2.id, course.id, {
    slug: "grid-and-media-queries",
    title: "Grid & media queries",
    description: "Build two-dimensional layouts that respond to screen size.",
    objectives: ["Create a CSS grid", "Place items with grid areas", "Write media queries for responsiveness"],
    difficulty: "INTERMEDIATE",
    estimatedMinutes: 14,
    order: 2,
    content: block([
      ...p("CSS Grid handles **two dimensions** — rows and columns at once. Define columns with `grid-template-columns`:"),
      { type: "code", language: "css", code: ".gallery {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 16px;\n}" },
      ...p("`1fr` means one fraction of the available space, so three equal columns. Change the number of columns at different screen sizes with **media queries**:"),
      { type: "code", language: "css", code: "@media (max-width: 600px) {\n  .gallery {\n    grid-template-columns: 1fr;\n  }\n}" },
      { type: "callout", variant: "warning", title: "Order matters", text: "Media queries must come **after** the base rules they override, or the override never applies." },
      { type: "example", title: "Responsive gallery", html: '<div class="gallery">\n  <div>1</div>\n  <div>2</div>\n  <div>3</div>\n  <div>4</div>\n  <div>5</div>\n  <div>6</div>\n</div>', css: ".gallery {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 12px;\n  font-family: sans-serif;\n}\n\n.gallery div {\n  background: #6366f1;\n  color: white;\n  border-radius: 8px;\n  padding: 24px;\n  text-align: center;\n}\n\n@media (max-width: 600px) {\n  .gallery { grid-template-columns: 1fr; }\n}" },
      { type: "exercise", exerciseKey: "ex-css-grid", title: "Build a responsive grid" },
      { type: "exercise", exerciseKey: "ex-css-media", title: "Add a media query" },
      { type: "quiz", quizKey: "qz-css-layout", title: "Layout quiz" },
    ]),
  });

  // -------------------------------------------------------------------------
  // Exercises — CSS
  // -------------------------------------------------------------------------

  await upsertExercise(course.id, lesson1.id, {
    key: "ex-css-first-rule",
    type: "css_check",
    title: "Write your first rule",
    instructions: "Write a rule that makes every `h1` element **tomato** colored and `28px` in size.",
    starterCode: "",
    solution: "h1 {\n  color: tomato;\n  font-size: 28px;\n}",
    hints: ["Select h1, then open a block.", "color: tomato; sets the text color."],
    config: {
      kind: "css_check",
      checks: [
        { type: "selector", selector: "h1" },
        { type: "property", selector: "h1", property: "color", value: "tomato" },
        { type: "property", selector: "h1", property: "font-size", value: "28px" },
      ],
    },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson2.id, {
    key: "ex-css-selectors",
    type: "css_check",
    title: "Style with selectors",
    instructions: "Make the element with class `highlight` yellow background, and the element with id `title` have a 2px solid black bottom border.",
    starterCode: "",
    solution: ".highlight {\n  background: yellow;\n}\n\n#title {\n  border-bottom: 2px solid black;\n}",
    hints: ["Classes use a dot prefix.", "IDs use a hash prefix."],
    config: {
      kind: "css_check",
      checks: [
        { type: "selector", selector: ".highlight" },
        { type: "property", selector: ".highlight", property: "background", value: "yellow" },
        { type: "selector", selector: "#title" },
        { type: "property", selector: "#title", property: "border-bottom" },
      ],
    },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson3.id, {
    key: "ex-css-box",
    type: "css_check",
    title: "Style a card with the box model",
    instructions: "For the `.card` class add: `padding: 20px`, a `border` of `1px solid #ddd`, `margin: 16px`, and `border-radius: 12px`.",
    starterCode: "",
    solution: ".card {\n  padding: 20px;\n  border: 1px solid #ddd;\n  margin: 16px;\n  border-radius: 12px;\n}",
    hints: ["padding adds inner space.", "border-radius rounds the corners."],
    config: {
      kind: "css_check",
      checks: [
        { type: "selector", selector: ".card" },
        { type: "property", selector: ".card", property: "padding", value: "20px" },
        { type: "property", selector: ".card", property: "border" },
        { type: "property", selector: ".card", property: "border-radius", value: "12px" },
      ],
    },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson4.id, {
    key: "ex-css-typography",
    type: "css_check",
    title: "Beautiful typography",
    instructions: "For `body`, set `font-family` to a sans-serif stack, `line-height: 1.6` and text `color: #111827`.",
    starterCode: "",
    solution: "body {\n  font-family: -apple-system, 'Segoe UI', sans-serif;\n  line-height: 1.6;\n  color: #111827;\n}",
    hints: ["Font stacks list fallbacks separated by commas.", "line-height sets vertical rhythm."],
    config: {
      kind: "css_check",
      checks: [
        { type: "selector", selector: "body" },
        { type: "property", selector: "body", property: "line-height", value: "1.6" },
        { type: "property", selector: "body", property: "color", value: "#111827" },
      ],
    },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson5.id, {
    key: "ex-css-flexbox",
    type: "css_check",
    title: "Center with flexbox",
    instructions: "Give the `.container` class `display: flex`, center items on the main axis with `justify-content: center`, and center them on the cross axis with `align-items: center`.",
    starterCode: "",
    solution: ".container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}",
    hints: ["display: flex turns on flexbox.", "justify-content works on the main axis."],
    config: {
      kind: "css_check",
      checks: [
        { type: "selector", selector: ".container" },
        { type: "property", selector: ".container", property: "display", value: "flex" },
        { type: "property", selector: ".container", property: "justify-content", value: "center" },
        { type: "property", selector: ".container", property: "align-items", value: "center" },
      ],
    },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson5.id, {
    key: "ex-css-flex-desc",
    type: "code_completion",
    title: "Describe the layout",
    instructions: "Order the lines to build a flexbox that spreads navigation items across the row.",
    starterCode: "",
    config: {
      kind: "code_completion",
      lines: [".nav {", "  display: flex;", "  justify-content: space-between;", "  align-items: center;", "}"],
      answer: identity(5),
    },
    points: 10,
    order: 2,
  });

  await upsertExercise(course.id, lesson6.id, {
    key: "ex-css-grid",
    type: "css_check",
    title: "Build a responsive grid",
    instructions: "Give `.gallery` `display: grid` and `grid-template-columns: repeat(3, 1fr)` with a `gap: 12px`.",
    starterCode: "",
    solution: ".gallery {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 12px;\n}",
    hints: ["repeat(3, 1fr) makes three equal columns.", "gap adds space between tracks."],
    config: {
      kind: "css_check",
      checks: [
        { type: "selector", selector: ".gallery" },
        { type: "property", selector: ".gallery", property: "display", value: "grid" },
        { type: "property", selector: ".gallery", property: "grid-template-columns" },
      ],
    },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson6.id, {
    key: "ex-css-media",
    type: "css_check",
    title: "Add a media query",
    instructions: "Add a `@media (max-width: 600px)` block that switches `.gallery` to `grid-template-columns: 1fr`.",
    starterCode: "",
    solution: "@media (max-width: 600px) {\n  .gallery {\n    grid-template-columns: 1fr;\n  }\n}",
    hints: ["Media queries start with @media.", "Inside, override the columns."],
    config: {
      kind: "css_check",
      checks: [{ type: "media", query: "(max-width: 600px)" }],
    },
    points: 10,
    order: 2,
  });

  // -------------------------------------------------------------------------
  // Quizzes — CSS
  // -------------------------------------------------------------------------

  await upsertQuiz(lesson1.id, course.id, {
    key: "qz-css-basics",
    title: "CSS basics quiz",
    description: "Check your grasp of rules, selectors and the cascade.",
    passScore: 70,
    timeLimit: 5,
    order: 1,
    questions: [
      { type: "multiple_choice", prompt: "In the rule `h1 { color: red; }`, what is `h1`?", options: ["A property", "A value", "The selector", "The declaration block"], answer: 2, points: 10, order: 1, explanation: "h1 selects which elements the rule applies to." },
      { type: "multiple_choice", prompt: "Which is the best practice for adding CSS?", options: ["Inline style attributes", "A linked external stylesheet", "A <style> tag inside the body", "There is no best practice"], answer: 1, points: 10, order: 2, explanation: "An external stylesheet keeps markup clean and styles reusable." },
      { type: "true_false", prompt: "An ID selector must match exactly one element on the page.", answer: true, points: 10, order: 3, explanation: "IDs should be unique." },
      { type: "multiple_choice", prompt: "Which selector matches elements with class \"card\"?", options: ["#card", ".card", "card", "*card"], answer: 1, points: 10, order: 4, explanation: "A dot selects by class." },
      { type: "multiple_choice", prompt: "What does `font-family` control?", options: ["The size of text", "The typeface of text", "The color of text", "The spacing between lines"], answer: 1, points: 10, order: 5, explanation: "font-family sets the typeface." },
    ],
  });

  await upsertQuiz(lesson6.id, course.id, {
    key: "qz-css-layout",
    title: "Layout quiz",
    description: "Flexbox, grid and responsive fundamentals.",
    passScore: 70,
    timeLimit: 5,
    order: 1,
    questions: [
      { type: "multiple_choice", prompt: "Which property turns on flexbox?", options: ["position: flex", "display: flex", "flex: block", "layout: flex"], answer: 1, points: 10, order: 1, explanation: "display: flex makes the container a flex container." },
      { type: "multiple_choice", prompt: "`justify-content: space-between` does what?", options: ["Centers all items", "Puts equal space between items with none at the ends", "Adds space only before the first item", "Stacks items vertically"], answer: 1, points: 10, order: 2, explanation: "space-between distributes space between items." },
      { type: "multiple_choice", prompt: "What does `grid-template-columns: repeat(3, 1fr)` create?", options: ["3 rows", "3 equal columns", "A 3px gutter", "A fixed 3-column table"], answer: 1, points: 10, order: 3, explanation: "repeat(3, 1fr) = three equal columns." },
      { type: "fill_blank", prompt: "Media queries are written inside an @media rule that lists the ____ condition.", blanks: [["media", "screen", "width"]], points: 10, order: 4, explanation: "The query condition like (max-width: 600px)." },
      { type: "true_false", prompt: "Media queries should come after the base rules they override.", answer: true, points: 10, order: 5, explanation: "Later rules with equal specificity win." },
      { type: "matching", prompt: "Match each flex property to what it controls.", left: ["justify-content", "align-items", "flex-wrap", "gap"], right: ["Main axis alignment", "Cross axis alignment", "Whether items wrap", "Spacing between items"], answer: identity(4), points: 10, order: 6, explanation: "justify-content and align-items handle the two axes." },
    ],
  });

  await upsertProject(course.id, {
    slug: "css-profile-card",
    title: "Stylish Profile Card",
    description: "Style a profile card with a centered layout, rounded corners, a shadow, and a flexbox row of badges.",
    difficulty: "BEGINNER",
    requirements: ["A .card with border-radius and box-shadow", "A centered avatar image", "flexbox to center card content", "A row of badge pills using flexbox", "Good spacing with padding and margin"],
    starterCode: `body {
  font-family: sans-serif;
  background: #f3f4f6;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  margin: 0;
}

.card {
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  text-align: center;
}`,
    config: {
      kind: "css_check",
      checks: [
        { type: "selector", selector: ".card" },
        { type: "property", selector: ".card", property: "border-radius" },
        { type: "property", selector: "body", property: "display", value: "flex" },
      ],
    },
    xpReward: 50,
    order: 1,
  });

  return { course, modules: [m1, m2] };
}

// ---------------------------------------------------------------------------
// Course: Computer Networks
// ---------------------------------------------------------------------------

async function seedNetworkingCourse(categoryId: string) {
  const course = await prisma.course.upsert({
    where: { slug: "computer-networks" },
    create: {
      title: "Computer Networks",
      slug: "computer-networks",
      description: "Design, build and troubleshoot real networks in a live simulated lab — no equipment needed.",
      longDescription:
        "Networks connect the world. In this hands-on course you'll wire PCs to switches, configure IP addresses and DHCP, route traffic between subnets, and get a Wi-Fi network online — all inside the built-in Networking Lab.",
      categoryId,
      icon: "🕸️",
      color: "#06b6d4",
      difficulty: "BEGINNER",
      language: "networking",
      estimatedHours: 4,
      xpTotal: 260,
      status: "PUBLISHED",
      isFree: true,
      order: 2,
    },
    update: { title: "Computer Networks", description: "Design, build and troubleshoot real networks in a live simulated lab — no equipment needed.", difficulty: "BEGINNER", status: "PUBLISHED", isFree: true },
  });

  const m1 = await prisma.module.upsert({
    where: { courseId_slug: { courseId: course.id, slug: "lan-basics" } },
    create: { courseId: course.id, title: "LAN Basics", slug: "lan-basics", description: "Cables, switches and your first network.", order: 1, estimatedMinutes: 50 },
    update: { title: "LAN Basics", order: 1, estimatedMinutes: 50 },
  });

  const lesson1 = await upsertLesson(m1.id, course.id, {
    slug: "first-network",
    title: "Build Your First Network",
    description: "Place devices, wire them with the right cables, and get two PCs talking.",
    objectives: [
      "Recognize the roles of PCs, switches and cables",
      "Use the straight-through cable to connect a host to a switch",
      "Verify connectivity with a ping",
    ],
    difficulty: "BEGINNER",
    estimatedMinutes: 12,
    order: 1,
    content: block([
      ...p("A **Local Area Network (LAN)** lets nearby devices share data. The simplest LAN has three ingredients: **hosts** (PCs that use the network), a **switch** (the hub they all plug into), and **cables** that carry the signals."),
      ...p("Two devices are directly connected when they speak the same language on the wire. The rules are simple:"),
      {
        type: "list",
        ordered: false,
        items: [
          "A **straight-through** cable connects a PC to a switch (host → switch).",
          "A **crossover** cable connects two devices of the same kind, like PC to PC or switch to switch.",
          "A **console** cable connects your management port to a device's CLI.",
        ],
      },
      ...p("In the lab below, your job is to wire **PC1** and **PC2** to the **Switch** with straight-through cables, then check that both hosts can reach each other. Open a device and set its **IP address** so the two PCs are on the same subnet — for example `192.168.1.10` and `192.168.1.11` with a `/24` mask."),
      { type: "callout", variant: "tip", title: "Pro tip", text: "Use the **ping** tool in the toolbar, then click a source PC and a target PC. A `PING: OK` means the two hosts can talk over the switch." },
      { type: "netlab", title: "Hands-on: LAN Lab", template: "small-lan", missionSlug: "lan-basics" },
      { type: "checkpoint", title: "Checkpoint", items: ["I can identify a straight-through vs. a crossover cable", "I wired two PCs to a switch", "My two PCs can ping each other"] },
    ]),
  });

  const m2 = await prisma.module.upsert({
    where: { courseId_slug: { courseId: course.id, slug: "wireless" } },
    create: { courseId: course.id, title: "Going Wireless", slug: "wireless", description: "Wi-Fi routers, SSIDs and connecting without cables.", order: 2, estimatedMinutes: 40 },
    update: { title: "Going Wireless", order: 2, estimatedMinutes: 40 },
  });

  const lesson2 = await upsertLesson(m2.id, course.id, {
    slug: "wifi-home-network",
    title: "Set Up a Wi-Fi Network",
    description: "Place a wireless router, connect it to the internet, and join devices over Wi-Fi.",
    objectives: [
      "Explain what a wireless router does",
      "Connect a router's WAN port to an upstream switch",
      "Join wireless clients to the network over radio",
    ],
    difficulty: "BEGINNER",
    estimatedMinutes: 12,
    order: 1,
    content: block([
      ...p("A **wireless router** combines a switch, a router and a Wi-Fi access point in one box. Its **WAN (Wide Area Network)** port plugs into the internet uplink, while laptops and phones join through the **radio**."),
      ...p("Your mission is to connect the **Wireless Router's** WAN port to the internet switch with a straight-through cable, then give your laptop an IP address — either by hand or with **DHCP**."),
      {
        type: "list",
        ordered: false,
        items: [
          "Switch to the **Cable** tool and pick **Straight-through**.",
          "Click the Wireless Router, then the Internet switch to wire the WAN uplink.",
          "Open the laptop and set **DHCP** to enabled — it should lease an address automatically.",
        ],
      },
      { type: "netlab", title: "Hands-on: Home Wi-Fi", template: "wifi", missionSlug: "home-wifi" },
      { type: "checkpoint", title: "Checkpoint", items: ["My wireless router has a working WAN uplink", "My laptop leased an address over Wi-Fi"] },
    ]),
  });

  return { course, modules: [m1, m2], lessons: [lesson1, lesson2] };
}

// ---------------------------------------------------------------------------
// Course: JavaScript Basics
// ---------------------------------------------------------------------------

async function seedJsCourse(categoryId: string) {
  const course = await prisma.course.upsert({
    where: { slug: "javascript-basics" },
    create: {
      title: "JavaScript Basics",
      slug: "javascript-basics",
      description: "Learn the language of the web — variables, conditionals, loops, functions, arrays and objects — by writing and running real code.",
      longDescription:
        "JavaScript powers interactivity everywhere. This course is a hands-on foundation: you'll write programs in a real editor, run them, and get test-case feedback that proves your functions work.",
      categoryId,
      icon: "🧠",
      color: "#eab308",
      difficulty: "BEGINNER",
      language: "javascript",
      estimatedHours: 5,
      xpTotal: 260,
      status: "PUBLISHED",
      isFree: true,
      order: 3,
    },
    update: { description: "Learn the language of the web — variables, conditionals, loops, functions, arrays and objects — by writing and running real code.", status: "PUBLISHED" },
  });

  const m1 = await prisma.module.upsert({
    where: { courseId_slug: { courseId: course.id, slug: "basics" } },
    create: { courseId: course.id, title: "The Basics", slug: "basics", description: "Values, variables and control flow.", order: 1, estimatedMinutes: 60 },
    update: { order: 1, estimatedMinutes: 60 },
  });

  const lesson1 = await upsertLesson(m1.id, course.id, {
    slug: "variables-and-values",
    title: "Variables and values",
    description: "Store data in variables and know your types.",
    objectives: ["Create variables with let and const", "Work with strings, numbers and booleans", "Read values with console.log"],
    difficulty: "BEGINNER",
    estimatedMinutes: 12,
    order: 1,
    content: block([
      ...p("Variables are named boxes for data. Use `let` for values that change and `const` for values that don't:"),
      { type: "code", language: "javascript", code: "let score = 0;\nconst playerName = 'Ada';\n\nscore = 10;      // ok — score can change\n// playerName = 'Bob'; // error — const is fixed" },
      { type: "heading", level: 2, text: "Data types" },
      { type: "table", headers: ["Type", "Examples"], rows: [["number", "1, 3.14, -42"], ["string", "'hello', \"world\""], ["boolean", "true, false"], ["null / undefined", "absence of a value"]] },
      ...p("`console.log(...)` prints values so you can see what your code does — your constant companion while learning."),
      { type: "code", language: "javascript", code: "const greeting = 'Hello, world!';\nconsole.log(greeting);\n\nconsole.log(2 + 2);\nconsole.log(2 * 3);" },
      { type: "example", title: "Run it", description: "Look at the console output in the preview.", js: "const city = 'London';\nconst population = 9;\nconsole.log(city + ' has about ' + population + ' million people.');\nconsole.log('1 + 1 =', 1 + 1);" },
      { type: "exercise", exerciseKey: "ex-js-variables", title: "Declare your first variables" },
      { type: "exercise", exerciseKey: "ex-js-arithmetic", title: "Do the math" },
    ]),
  });

  const lesson2 = await upsertLesson(m1.id, course.id, {
    slug: "strings-and-numbers",
    title: "Strings and numbers",
    description: "Slice, combine and transform text and numbers.",
    objectives: ["Combine strings with concatenation and template literals", "Find string length and uppercase text", "Do arithmetic and use Math"],
    difficulty: "BEGINNER",
    estimatedMinutes: 12,
    order: 2,
    content: block([
      ...p("Template literals use backticks and `${}` to embed values — much cleaner than `+` concatenation:"),
      { type: "code", language: "javascript", code: "const name = 'Ada';\nconst age = 36;\n\nconsole.log(name + ' is ' + age);       // old way\nconsole.log(`${name} is ${age}`);     // template literal" },
      { type: "heading", level: 2, text: "String methods" },
      { type: "code", language: "javascript", code: "const word = 'JavaScript';\nconsole.log(word.length);      // 10\nconsole.log(word.toUpperCase()); // JAVASCRIPT\nconsole.log(word.slice(0, 4));   // Java" },
      { type: "heading", level: 2, text: "Number tricks" },
      { type: "code", language: "javascript", code: "console.log(7 / 2);        // 3.5\nconsole.log(7 % 2);        // 1  (remainder)\nconsole.log(Math.round(2.7));  // 3\nconsole.log(Math.max(3, 9));    // 9" },
      { type: "exercise", exerciseKey: "ex-js-strings", title: "Compose a message" },
      { type: "exercise", exerciseKey: "ex-js-string-fn", title: "greet function" },
    ]),
  });

  const lesson3 = await upsertLesson(m1.id, course.id, {
    slug: "conditionals",
    title: "Conditionals",
    description: "Make decisions with if, else and comparisons.",
    objectives: ["Compare values with ===, <, >", "Write if/else chains", "Combine conditions with && and ||"],
    difficulty: "BEGINNER",
    estimatedMinutes: 12,
    order: 3,
    content: block([
      ...p("Programs make choices with `if`/`else`. The condition is a boolean expression:"),
      { type: "code", language: "javascript", code: "const age = 18;\n\nif (age >= 18) {\n  console.log('You can vote.');\n} else {\n  console.log('Not yet.');\n}" },
      { type: "heading", level: 2, text: "Comparisons" },
      { type: "table", headers: ["Operator", "Meaning"], rows: [["===", "strictly equal"], ["!==", "strictly not equal"], ["> / <", "greater / less"], [">= / <=", "greater-or-equal / less-or-equal"]] },
      { type: "callout", variant: "danger", title: "Use ===, not ==", text: "`==` does loose conversion (`0 == '0'` is true). `===` compares type and value, which is what you want almost always." },
      { type: "heading", level: 2, text: "Combining conditions" },
      { type: "code", language: "javascript", code: "const temp = 24;\nconst sunny = true;\n\nif (temp > 20 && sunny) {\n  console.log('Great beach day!');\n} else if (temp > 20 || sunny) {\n  console.log('At least half good.');\n} else {\n  console.log('Stay in.');\n}" },
      { type: "exercise", exerciseKey: "ex-js-conditionals", title: "Rate the temperature" },
      { type: "exercise", exerciseKey: "ex-js-vote", title: "Check voting age" },
    ]),
  });

  const lesson4 = await upsertLesson(m1.id, course.id, {
    slug: "loops",
    title: "Loops",
    description: "Repeat work with for and while loops.",
    objectives: ["Write for loops", "Loop over arrays", "Know when a while loop is a better fit"],
    difficulty: "BEGINNER",
    estimatedMinutes: 12,
    order: 4,
    content: block([
      ...p("Loops repeat code. A `for` loop has three parts: start, condition and step:"),
      { type: "code", language: "javascript", code: "for (let i = 1; i <= 5; i++) {\n  console.log(i);\n}\n// 1 2 3 4 5" },
      { type: "heading", level: 2, text: "Looping over arrays" },
      ...p("Use a `for...of` loop to visit each item in an array directly:"),
      { type: "code", language: "javascript", code: "const fruits = ['apple', 'banana', 'cherry'];\nfor (const fruit of fruits) {\n  console.log(fruit);\n}" },
      { type: "heading", level: 2, text: "while loops" },
      ...p("A `while` loop runs while a condition stays true. Great for \"unknown length\" work:"),
      { type: "code", language: "javascript", code: "let n = 1;\nwhile (n < 4) {\n  console.log(n);\n  n++;\n}\n// 1 2 3" },
      { type: "callout", variant: "warning", title: "Avoid infinite loops", text: "If the condition never becomes false, the loop never ends (and your browser will freeze). Make sure something in the body changes the condition." },
      { type: "exercise", exerciseKey: "ex-js-loops", title: "Count with a loop" },
      { type: "exercise", exerciseKey: "ex-js-sum", title: "Sum an array" },
    ]),
  });

  const m2 = await prisma.module.upsert({
    where: { courseId_slug: { courseId: course.id, slug: "functions-and-data" } },
    create: { courseId: course.id, title: "Functions & Data", slug: "functions-and-data", description: "Reusable functions, arrays and objects.", order: 2, estimatedMinutes: 70 },
    update: { order: 2, estimatedMinutes: 70 },
  });

  const lesson5 = await upsertLesson(m2.id, course.id, {
    slug: "functions",
    title: "Functions",
    description: "Package logic into reusable, testable functions.",
    objectives: ["Declare and call functions", "Pass parameters and return values", "Use arrow functions"],
    difficulty: "BEGINNER",
    estimatedMinutes: 12,
    order: 1,
    content: block([
      ...p("A function wraps a chunk of logic with a name, inputs (**parameters**) and an output (`return`):"),
      { type: "code", language: "javascript", code: "function add(a, b) {\n  return a + b;\n}\n\nconsole.log(add(2, 3)); // 5" },
      ...p("The **arrow function** form is shorter and extremely common in modern JavaScript:"),
      { type: "code", language: "javascript", code: "const double = (x) => x * 2;\n\nconsole.log(double(5)); // 10" },
      { type: "callout", variant: "tip", title: "return vs console.log", text: "`return` hands a value back to the caller so it can be used; `console.log` just prints it. Functions you test with cases must use `return`." },
      { type: "example", title: "Function lab", description: "Add more functions and watch the console.", js: "function greet(name) {\n  return 'Hello, ' + name + '!';\n}\n\nconst shout = (text) => text.toUpperCase() + '!!!';\n\nconsole.log(greet('Ada'));\nconsole.log(shout('great job'));" },
      { type: "exercise", exerciseKey: "ex-js-function-add", title: "Write an add function" },
      { type: "exercise", exerciseKey: "ex-js-function-max", title: "Write a max function" },
    ]),
  });

  const lesson6 = await upsertLesson(m2.id, course.id, {
    slug: "arrays-and-objects",
    title: "Arrays and objects",
    description: "Store collections and key-value data.",
    objectives: ["Create and read arrays", "Use push, length and for...of", "Create objects and access properties"],
    difficulty: "BEGINNER",
    estimatedMinutes: 12,
    order: 2,
    content: block([
      ...p("An **array** is an ordered list, zero-indexed:"),
      { type: "code", language: "javascript", code: "const colors = ['red', 'green', 'blue'];\nconsole.log(colors[0]);      // red\nconsole.log(colors.length);   // 3\ncolors.push('yellow');\nconsole.log(colors[3]);      // yellow" },
      { type: "heading", level: 2, text: "Objects" },
      ...p("An **object** stores named values (properties):"),
      { type: "code", language: "javascript", code: "const user = {\n  name: 'Ada',\n  role: 'Admin',\n  skills: ['JS', 'HTML']\n};\n\nconsole.log(user.name);        // Ada\nconsole.log(user.skills[0]);   // JS" },
      { type: "exercise", exerciseKey: "ex-js-arrays", title: "Manage a list" },
      { type: "exercise", exerciseKey: "ex-js-objects", title: "Describe a movie" },
    ]),
  });

  const lesson7 = await upsertLesson(m2.id, course.id, {
    slug: "checkpoint",
    title: "JavaScript checkpoint",
    description: "A mixed review covering everything so far.",
    objectives: ["Combine variables, conditionals, loops and functions", "Solve problems with arrays and objects"],
    difficulty: "INTERMEDIATE",
    estimatedMinutes: 15,
    order: 3,
    content: block([
      ...p("Time to bring it together. You've covered variables, strings, numbers, conditionals, loops, functions, arrays and objects. Solve the challenges below without peeking at the answers."),
      { type: "exercise", exerciseKey: "ex-js-checkpoint", title: "countEven challenge" },
      { type: "exercise", exerciseKey: "ex-js-code-complete", title: "Complete the function" },
      { type: "quiz", quizKey: "qz-js-fundamentals", title: "JavaScript fundamentals" },
    ]),
  });

  // -------------------------------------------------------------------------
  // Exercises — JavaScript
  // -------------------------------------------------------------------------

  await upsertExercise(course.id, lesson1.id, {
    key: "ex-js-variables",
    type: "code_output",
    title: "Declare your first variables",
    instructions: "Create a `const` variable named `greeting` holding the string `Hello, world!` and log it with `console.log`.",
    starterCode: "// Your code here\n",
    solution: "const greeting = 'Hello, world!';\nconsole.log(greeting);",
    hints: ["const declares a fixed variable.", "console.log(value) prints it."],
    config: { kind: "code_output", expectedOutput: "Hello, world!", trimLines: true },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson1.id, {
    key: "ex-js-arithmetic",
    type: "code_output",
    title: "Do the math",
    instructions: "Log the result of `12 * 8` and then `99 - 42`, each on its own line using `console.log`.",
    starterCode: "// Your code here\n",
    solution: "console.log(12 * 8);\nconsole.log(99 - 42);",
    hints: ["* multiplies.", "Use two console.log lines."],
    config: { kind: "code_output", expectedOutput: "96\n57", trimLines: true },
    points: 10,
    order: 2,
  });

  await upsertExercise(course.id, lesson2.id, {
    key: "ex-js-strings",
    type: "code_output",
    title: "Compose a message",
    instructions: "Using a template literal, log the message `Ada is 36 years old` where `name` is `Ada` and `age` is `36`.",
    starterCode: "const name = 'Ada';\nconst age = 36;\n\n// Your code here\n",
    solution: "const name = 'Ada';\nconst age = 36;\nconsole.log(`${name} is ${age} years old`);",
    hints: ["Template literals use backticks and ${...}.", "Log it with console.log."],
    config: { kind: "code_output", expectedOutput: "Ada is 36 years old", trimLines: true },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson2.id, {
    key: "ex-js-string-fn",
    type: "js_function",
    title: "greet function",
    instructions: "Write a function `greet` that takes a `name` parameter and returns the string `Hello, NAME!` (where NAME is the value passed in).",
    starterCode: "function greet(name) {\n  // Your code here\n}\n",
    solution: "function greet(name) {\n  return 'Hello, ' + name + '!';\n}",
    hints: ["Return, don't log.", "Concatenate or use a template literal."],
    config: {
      kind: "js_function",
      functionName: "greet",
      tests: [
        { args: ["Ada"], expected: "Hello, Ada!", description: "greet('Ada')" },
        { args: ["Bob"], expected: "Hello, Bob!", description: "greet('Bob')" },
      ],
    },
    points: 10,
    order: 2,
  });

  await upsertExercise(course.id, lesson3.id, {
    key: "ex-js-conditionals",
    type: "code_output",
    title: "Rate the temperature",
    instructions: "If `temp` is greater than 25, log `Hot`; otherwise log `Cool`. Use `if`/`else`.",
    starterCode: "const temp = 30;\n\n// Your code here\n",
    solution: "const temp = 30;\nif (temp > 25) {\n  console.log('Hot');\n} else {\n  console.log('Cool');\n}",
    hints: ["Use if (temp > 25).", "Log exactly 'Hot' or 'Cool'."],
    config: { kind: "code_output", expectedOutput: "Hot", trimLines: true },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson3.id, {
    key: "ex-js-vote",
    type: "js_function",
    title: "Check voting age",
    instructions: "Write a function `canVote(age)` that returns `true` if age is 18 or more, otherwise `false`.",
    starterCode: "function canVote(age) {\n  // Your code here\n}\n",
    solution: "function canVote(age) {\n  return age >= 18;\n}",
    hints: ["Return the comparison directly.", "age >= 18 is already a boolean."],
    config: {
      kind: "js_function",
      functionName: "canVote",
      tests: [
        { args: [18], expected: true, description: "canVote(18)" },
        { args: [17], expected: false, description: "canVote(17)" },
        { args: [21], expected: true, description: "canVote(21)" },
      ],
    },
    points: 10,
    order: 2,
  });

  await upsertExercise(course.id, lesson4.id, {
    key: "ex-js-loops",
    type: "code_output",
    title: "Count with a loop",
    instructions: "Use a `for` loop to log the numbers `1` through `5`, each on its own line.",
    starterCode: "// Your code here\n",
    solution: "for (let i = 1; i <= 5; i++) {\n  console.log(i);\n}",
    hints: ["Start i at 1, stop at 5.", "i++ increments each round."],
    config: { kind: "code_output", expectedOutput: "1\n2\n3\n4\n5", trimLines: true },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson4.id, {
    key: "ex-js-sum",
    type: "js_function",
    title: "Sum an array",
    instructions: "Write a function `sum(numbers)` that returns the total of all numbers in the array. Use a `for...of` loop.",
    starterCode: "function sum(numbers) {\n  // Your code here\n}\n",
    solution: "function sum(numbers) {\n  let total = 0;\n  for (const n of numbers) {\n    total += n;\n  }\n  return total;\n}",
    hints: ["Start total at 0.", "Add each n to total, then return it."],
    config: {
      kind: "js_function",
      functionName: "sum",
      tests: [
        { args: [[1, 2, 3]], expected: 6, description: "sum([1, 2, 3])" },
        { args: [[10, -5, 4]], expected: 9, description: "sum([10, -5, 4])" },
        { args: [[]], expected: 0, description: "sum([])" },
      ],
    },
    points: 10,
    order: 2,
  });

  await upsertExercise(course.id, lesson5.id, {
    key: "ex-js-function-add",
    type: "js_function",
    title: "Write an add function",
    instructions: "Write a function `add(a, b)` that returns the sum of its two arguments.",
    starterCode: "function add(a, b) {\n  // Your code here\n}\n",
    solution: "function add(a, b) {\n  return a + b;\n}",
    hints: ["return a + b.", "Don't log — return."],
    config: {
      kind: "js_function",
      functionName: "add",
      tests: [
        { args: [2, 3], expected: 5, description: "add(2, 3)" },
        { args: [-1, 1], expected: 0, description: "add(-1, 1)" },
        { args: [0, 0], expected: 0, description: "add(0, 0)" },
      ],
    },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson5.id, {
    key: "ex-js-function-max",
    type: "js_function",
    title: "Write a max function",
    instructions: "Write a function `max(a, b)` that returns the larger of the two numbers.",
    starterCode: "function max(a, b) {\n  // Your code here\n}\n",
    solution: "function max(a, b) {\n  return a > b ? a : b;\n}",
    hints: ["Compare with >.", "Use a ternary or if/else."],
    config: {
      kind: "js_function",
      functionName: "max",
      tests: [
        { args: [3, 7], expected: 7, description: "max(3, 7)" },
        { args: [9, 2], expected: 9, description: "max(9, 2)" },
        { args: [4, 4], expected: 4, description: "max(4, 4)" },
      ],
    },
    points: 10,
    order: 2,
  });

  await upsertExercise(course.id, lesson6.id, {
    key: "ex-js-arrays",
    type: "code_output",
    title: "Manage a list",
    instructions: "Given the `items` array, log its **length**, then push the string `pear`, then log the **last** item.",
    starterCode: "const items = ['apple', 'banana', 'cherry'];\n\n// Your code here\n",
    solution: "const items = ['apple', 'banana', 'cherry'];\nconsole.log(items.length);\nitems.push('pear');\nconsole.log(items[items.length - 1]);",
    hints: [".length gives the count.", "push adds to the end.", "The last index is length - 1."],
    config: { kind: "code_output", expectedOutput: "3\npear", trimLines: true },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson6.id, {
    key: "ex-js-objects",
    type: "code_output",
    title: "Describe a movie",
    instructions: "Create an object `movie` with properties `title` (a string) and `year` (a number). Log `${movie.title} (${movie.year})`.",
    starterCode: "// Your code here\n",
    solution: "const movie = { title: 'Inception', year: 2010 };\nconsole.log(`${movie.title} (${movie.year})`);",
    hints: ["Objects use { key: value }.", "Access with dot notation."],
    config: { kind: "code_output", expectedOutput: "Inception (2010)", trimLines: true },
    points: 10,
    order: 2,
  });

  await upsertExercise(course.id, lesson7.id, {
    key: "ex-js-checkpoint",
    type: "js_function",
    title: "countEven challenge",
    instructions: "Write a function `countEven(numbers)` that returns how many numbers in the array are even.",
    starterCode: "function countEven(numbers) {\n  // Your code here\n}\n",
    solution: "function countEven(numbers) {\n  let count = 0;\n  for (const n of numbers) {\n    if (n % 2 === 0) count++;\n  }\n  return count;\n}",
    hints: ["n % 2 === 0 tests evenness.", "Increment a counter, return it."],
    config: {
      kind: "js_function",
      functionName: "countEven",
      tests: [
        { args: [[1, 2, 3, 4, 5]], expected: 2, description: "countEven([1,2,3,4,5])" },
        { args: [[10, 22, 33]], expected: 2, description: "countEven([10,22,33])" },
        { args: [[1, 3, 5]], expected: 0, description: "countEven([1,3,5])" },
      ],
    },
    points: 15,
    order: 1,
  });

  await upsertExercise(course.id, lesson7.id, {
    key: "ex-js-code-complete",
    type: "code_completion",
    title: "Complete the function",
    instructions: "Order the lines to build a working `isEven` function that returns whether a number is even.",
    starterCode: "",
    config: {
      kind: "code_completion",
      lines: ["function isEven(n) {", "  return n % 2 === 0;", "}"],
      answer: identity(3),
    },
    points: 10,
    order: 2,
  });

  // -------------------------------------------------------------------------
  // Quizzes — JavaScript
  // -------------------------------------------------------------------------

  await upsertQuiz(lesson7.id, course.id, {
    key: "qz-js-fundamentals",
    title: "JavaScript fundamentals",
    description: "A final review of everything in this course.",
    passScore: 70,
    timeLimit: 8,
    order: 1,
    questions: [
      { type: "multiple_choice", prompt: "Which keyword declares a value that cannot be reassigned?", options: ["let", "const", "var", "static"], answer: 1, points: 10, order: 1, explanation: "const values can't be reassigned." },
      { type: "multiple_choice", prompt: "What does `7 % 2` evaluate to?", options: ["3.5", "1", "3", "2"], answer: 1, points: 10, order: 2, explanation: "% is the remainder operator: 7 ÷ 2 = 3 remainder 1." },
      { type: "multiple_choice", prompt: "Which comparison is strict (checks type and value)?", options: ["==", "=", "===", "!="], answer: 2, points: 10, order: 3, explanation: "=== compares both type and value." },
      { type: "true_false", prompt: "`return` hands a value back to the caller of a function.", answer: true, points: 10, order: 4, explanation: "return exits the function with a value." },
      { type: "fill_blank", prompt: "The first item of an array is at index ____.", blanks: [["0", "zero"]], points: 10, order: 5, explanation: "Arrays are zero-indexed." },
      { type: "multiple_choice", prompt: "Which loop is best for visiting every item in an array?", options: ["for...of", "while(true)", "do...until", "for...each"], answer: 0, points: 10, order: 6, explanation: "for...of iterates over each element." },
      { type: "multiple_choice", prompt: "`const user = { name: 'Ada' }` — how do you read `name`?", options: ["user.name", "user['name']", "name.user", "Both user.name and user['name']"], answer: 3, points: 10, order: 7, explanation: "Dot and bracket notation both work." },
      { type: "code_completion", prompt: "Write code that logs the numbers 1 to 3 using a for loop. `let i = 1; i <= 3; i++`", answer: "for (let i = 1; i <= 3; i++) {\n  console.log(i);\n}", points: 10, order: 8, explanation: "The loop runs from 1 to 3 inclusive." },
    ],
  });

  await upsertProject(course.id, {
    slug: "javascript-calculator",
    title: "JavaScript Calculator",
    description: "Write the brain of a calculator: functions for add, subtract, multiply, divide and a friendly run() that prints results.",
    difficulty: "BEGINNER",
    requirements: ["An add(a, b) function", "A subtract(a, b) function", "A multiply(a, b) function", "A divide(a, b) function that guards against division by zero", "A run() function that calls the others and logs results"],
    starterCode: `function add(a, b) { return a + b; }

// TODO: subtract, multiply, divide

function run() {
  console.log(add(2, 3));
  // console.log(subtract(10, 4));
  // console.log(multiply(3, 4));
  // console.log(divide(10, 2));
}

run();`,
    config: {
      kind: "js_assert",
      test: `
let passed = true;
if (add(2, 3) !== 5) { console.log('add failed'); passed = false; }
if (subtract(10, 4) !== 6) { console.log('subtract failed'); passed = false; }
if (multiply(3, 4) !== 12) { console.log('multiply failed'); passed = false; }
if (divide(10, 2) !== 5) { console.log('divide failed'); passed = false; }
if (divide(5, 0) !== Infinity) { console.log('divide by zero failed'); passed = false; }
if (passed) console.log('All calculator tests passed!');`,
    },
    xpReward: 100,
    order: 1,
  });

  return { course, modules: [m1, m2] };
}

// ---------------------------------------------------------------------------
// Course: Coding with AI
// ---------------------------------------------------------------------------

async function seedAiCourse(categoryId: string) {
  const course = await prisma.course.upsert({
    where: { slug: "coding-with-ai" },
    create: {
      title: "Coding with AI",
      slug: "coding-with-ai",
      description: "Work smarter with AI code assistants like OpenCode — write prompts that get useful answers and vibe-code your way through real projects.",
      longDescription:
        "AI assistants are the fastest way to learn and ship code — if you know how to talk to them. This short course teaches prompt engineering fundamentals and the vibe-coding workflow, with the same hands-on exercises and grading as every other CodeSphere course.",
      categoryId,
      icon: "🤖",
      color: "#8b5cf6",
      difficulty: "BEGINNER",
      language: "javascript",
      estimatedHours: 2,
      xpTotal: 160,
      status: "PUBLISHED",
      isFree: true,
      order: 4,
    },
    update: { description: "Work smarter with AI code assistants like OpenCode — write prompts that get useful answers and vibe-code your way through real projects.", status: "PUBLISHED" },
  });

  const m1 = await prisma.module.upsert({
    where: { courseId_slug: { courseId: course.id, slug: "working-with-ai" } },
    create: { courseId: course.id, title: "Working with AI", slug: "working-with-ai", description: "A concept-first path through prompts, the Prompt Studio and the vibe-coding loop.", order: 1, estimatedMinutes: 58 },
    update: { title: "Working with AI", order: 1, estimatedMinutes: 58 },
  });

  const S = (step: number, title: string, subtitle?: string): ContentBlock => ({ type: "section", step, title, subtitle });

  const lesson1 = await upsertLesson(m1.id, course.id, {
    slug: "what-is-a-code-assistant",
    title: "What is a code assistant?",
    description: "Meet your AI pair-programmer, understand the chat loop, and learn the one rule that keeps it a tool instead of a shortcut.",
    objectives: ["Explain what a code assistant is", "Describe the chat loop of prompt → answer → review → follow-up", "Use the assistant as a learning tool, not a shortcut"],
    difficulty: "BEGINNER",
    estimatedMinutes: 14,
    order: 1,
    content: block([
      S(1, "Introduction", "An AI that reads and writes code with you."),
      ...p("A **code assistant** is an AI trained on huge amounts of code and documentation. It can autocomplete what you're typing, explain a block you don't understand, or write a whole feature when you describe it. **OpenCode** is one of these assistants, and it lives right in your editor."),
      { type: "callout", variant: "info", title: "Not magic", text: "Assistants are very good at pattern-matching, not reasoning. They can be confidently wrong. Your job is to review what they write, run it, and push back when it's off — that's the part that makes you a developer." },

      S(2, "Real-Life Analogy", "A fast colleague who has read every manual."),
      { type: "analogy", topic: "Your assistant is like an eager, well-read colleague", real: "Picture a junior colleague who is extremely fast, has read every manual, and always answers within seconds. They are helpful — but they have never built YOUR project, so their guesses need checking, not blind trust.", mapping: [
        { real: "They answer instantly, from memory", concept: "The assistant replies in seconds, based on patterns it has seen" },
        { real: "They don't know your project's history", concept: "The assistant doesn't know your code unless you tell it or paste it" },
        { real: "You give them a clear request to get a good result", concept: "A specific prompt gets a specific answer" },
        { real: "You review their work before it ships", concept: "You read, run and question everything it writes" },
      ] },

      S(3, "Why It Matters", "It can multiply how fast you learn and build."),
      ...p("Used well, an assistant compresses hours of googling into seconds of conversation. Used badly, it hands you code you don't understand — and code you don't understand is code you can't debug. The entire skill of working with AI is **staying in charge of the loop**."),
      { type: "list", items: ["You move faster: boilerplate and lookup answers come instantly", "You learn more: you can ask 'why' on every line", "You stay safe: every answer is reviewed before it's trusted"] },

      S(4, "Visual Explanation", "The chat loop."),
      { type: "visual", title: "Every conversation with an assistant is a loop", nodes: [
        { id: "a", label: "You type a prompt", detail: "What you want, in plain words", tone: "primary" },
        { id: "b", label: "The assistant answers", detail: "Code + explanation" },
        { id: "c", label: "You read and run it", detail: "Never skip this step" },
        { id: "d", label: "Does it match what you asked?", detail: "Compare, don't assume", tone: "warning" },
        { id: "e", label: "Follow up with feedback", detail: "One precise instruction at a time", tone: "success" },
        { id: "f", label: "Done — and you learned the why", detail: "Ask for explanations as you go", tone: "muted" },
      ], edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "c", to: "d", label: "Run it" },
        { from: "d", to: "e", label: "Not quite" },
        { from: "e", to: "f", label: "Works" },
      ], caption: "Not quite? Your feedback loops the assistant back to its answer — each round-trip improves the result." },

      S(5, "Step-by-Step", "Your first chat loop, step by step."),
      { type: "breakdown", language: "text", title: "A small chat loop", steps: [
        { code: `You: Capitalize each word in this sentence: "hello world"`, explain: "You state the task plainly. No jargon needed — the assistant maps your words to code.", why: "A precise task is the single biggest factor in a useful answer.", mistake: "Prompts like 'fix this' give the assistant no target. Say exactly what should happen." },
        { code: `AI: function titleCase(s) {
  return s.split(" ").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
}`, explain: "The assistant returns code, usually with a short explanation of how it works." },
        { code: `You: It crashes on empty strings. Explain the change.`, explain: "You ran it, found an edge case, and reported it back. That's the loop doing its job.", why: "Each round-trip narrows the answer toward what you actually need." },
        { code: `AI: Added a guard: if (s.trim() === "") return "";`, explain: "The assistant explains the fix so you learn the pattern instead of just copying it." },
      ] },

      S(6, "Interactive Demonstration", "Try the loop yourself."),
      ...p("This is a tiny, fake assistant with a handful of canned replies. Type a prompt and watch the loop: ask, receive, then follow up."),
      { type: "demo", title: "Chat loop playground", description: "Type hi, capitalize or bug to see canned responses.", html: `<div class="chat">
  <div id="log"></div>
  <div class="row">
    <input id="input" placeholder="Type a prompt for the assistant..." />
    <button id="send">Send</button>
  </div>
</div>`, css: `.chat { font-family: system-ui, sans-serif; max-width: 420px; margin: 12px auto; padding: 8px; }
#log { min-height: 200px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; background: #f9fafb; display: flex; flex-direction: column; gap: 8px; overflow: auto; }
.msg { padding: 6px 10px; border-radius: 10px; max-width: 85%; font-size: 13px; white-space: pre-wrap; line-height: 1.4; }
.me { align-self: flex-end; background: #8b5cf6; color: #fff; }
.ai { align-self: flex-start; background: #fff; border: 1px solid #e5e7eb; color: #111; }
.row { display: flex; gap: 6px; margin-top: 8px; }
.row input { flex: 1; padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 13px; }
.row button { padding: 6px 12px; border: none; border-radius: 8px; background: #8b5cf6; color: #fff; cursor: pointer; font-size: 13px; }`, js: `var replies = [
  ["hi", "Hi! I'm your code assistant. Ask me to explain, write, or fix code."],
  ["capitalize", "function titleCase(sentence) {\n  return sentence.split(' ').map(function(w) { return w[0].toUpperCase() + w.slice(1); }).join(' ');\n}"],
  ["bug", "Paste the exact error message and the code that produced it — that is the fastest way to a fix."],
  ["why", "Great question. Asking 'why' is how you turn an answer into understanding."]
];
function reply(text) {
  var lower = text.toLowerCase();
  for (var i = 0; i < replies.length; i++) {
    if (lower.indexOf(replies[i][0]) !== -1) return replies[i][1];
  }
  return "Good prompt. To give you a precise answer I'd want a clear task, some context, and any constraints.";
}
function addMsg(text, who) {
  var log = document.getElementById('log');
  var div = document.createElement('div');
  div.className = 'msg ' + who;
  div.textContent = text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}
function send() {
  var input = document.getElementById('input');
  var text = input.value.trim();
  if (!text) return;
  addMsg(text, 'me');
  setTimeout(function () { addMsg(reply(text), 'ai'); }, 250);
  input.value = '';
}
document.getElementById('send').addEventListener('click', send);
document.getElementById('input').addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });` },

      S(7, "Guided Practice", "Run the loop three times."),
      { type: "guided", title: "Practice the chat loop", steps: [
        { instruction: "Write a one-line prompt that asks the assistant to explain Array.map for a beginner.", explain: "Try: 'Explain what Array.map does for a beginner, with one example.'", check: "Does your prompt have a clear task?" },
        { instruction: "Imagine the assistant replied with a one-liner. Ask it to expand using a real-life analogy.", explain: "Follow-ups push the answer in the direction you want.", check: "Did you ask for something specific rather than 'more detail'?" },
        { instruction: "Name one rule from this lesson you want to remember tomorrow.", explain: "Saying it out loud is the fastest way to keep it.", check: "Can you say it in one sentence?" },
      ] },

      S(8, "Explain Every Mistake", "Copy, paste, trust — the mistake that undoes everything."),
      { type: "mistake", title: "Trusting the answer", language: "javascript",
        wrong: `function titleCase(sentence) {
  return sentence
    .split(" ")
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}`,
        wrongWhy: "This looks right — and nobody ran it. 'hello world' works, but an empty string crashes it and 'hello  world' (double space) produces an empty word. Ship-and-pray means the bug lands in production.",
        right: `function titleCase(sentence) {
  if (sentence.trim() === "") return "";
  return sentence
    .split(" ")
    .filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}`,
        rightWhy: "Reading and running the first version revealed the edge cases. Then you asked the assistant 'why does it crash on empty strings?' and learned the guard — that's the loop working.",
        fix: "Never mark an AI answer done without running it. Test the empty case, the double-space case, and the normal case." },

      S(9, "Challenge", "Say hello to your assistant."),
      ...p("Complete the exercise below. It uses the same grading as every CodeSphere exercise — the assistant can't hand you the answer, you have to type it."),
      { type: "exercise", exerciseKey: "ex-ai-greeting", title: "Say hello to your assistant" },

      S(10, "Reflection", "Think it through."),
      { type: "reflection", title: "Your first conversation with an assistant", questions: [
        "What is one thing a code assistant is NOT good at?",
        "When the assistant writes code that works, what should you still do before trusting it?",
        "Write a sentence describing the chat loop in your own words.",
      ] },
    ]),
  });

  const lesson2 = await upsertLesson(m1.id, course.id, {
    slug: "writing-better-prompts",
    title: "The anatomy of a great prompt",
    description: "Seven components turn vague asks into answers you can run. Learn them once, use them everywhere.",
    objectives: ["Name the seven components of a great prompt", "Structure a prompt with a role, task, context and constraints", "Turn a vague ask into a specific one"],
    difficulty: "BEGINNER",
    estimatedMinutes: 16,
    order: 2,
    content: block([
      S(1, "Introduction", "A prompt is an instruction — so write it like one."),
      ...p("A **prompt** is what you type to an assistant. Bad prompts get generic answers; good prompts get exactly what you need. The difference is usually not intelligence, it's **structure**. This lesson gives you the seven components every great prompt shares."),
      { type: "list", ordered: true, items: ["Role — who the assistant should be", "Task — the one thing to do", "Context — who you are and what you're building", "Constraints — what to avoid or limit", "Examples — what 'good' looks like", "Output format — how the answer should be shaped", "Success criteria — how you'll know it worked"] },

      S(2, "Real-Life Analogy", "Ordering a coffee, but written down."),
      { type: "analogy", topic: "A great prompt is a detailed coffee order", real: "Walk up to a barista and say 'coffee' and you'll get whatever's fastest. Say 'a medium oat-milk latte, extra hot, in a keep-cup, no sugar, and tell me when it's ready' and you'll get exactly the drink you wanted. Every detail steers the result.", mapping: [
        { real: "What you want: 'a latte'", concept: "The task: 'write a function that…'" },
        { real: "Who you are and your taste", concept: "Context: your level, your project, your stack" },
        { real: "'no sugar, extra hot'", concept: "Constraints: no frameworks, ES6 only" },
        { real: "'in a keep-cup'", concept: "Output format: 'show the code, then explain it'" },
        { real: "'tell me when it's ready'", concept: "Success criteria: 'it should pass these test cases'" },
      ] },

      S(3, "Why It Matters", "Your words become the assistant's only context."),
      ...p("The assistant knows nothing about your code, your level or your goal unless you write it down. Every component you include is information the assistant doesn't have to guess. Fewer guesses means fewer wasted round-trips."),
      { type: "table", headers: ["Component", "What it does", "Example"], rows: [
        ["Role", "Sets who the assistant is and how it talks", "You are a tutor for beginners."],
        ["Task", "States the goal precisely", "Write a button that turns red when clicked."],
        ["Context", "Sets the situation and your level", "I'm new to coding; this is a school project."],
        ["Constraints", "Bans or requires things", "No frameworks, ES6 only, under 30 lines."],
        ["Examples", "Shows what 'good' looks like", "Input 'hello' should output 'Hello!'"],
        ["Output format", "Tells it how to reply", "Code first, then a one-line explanation."],
        ["Success criteria", "Says how you'll know it worked", "It should pass these three tests."],
      ] },

      S(4, "Visual Explanation", "A prompt flows into an answer through its components."),
      { type: "visual", title: "Anatomy of a prompt", nodes: [
        { id: "prompt", label: "Your prompt", detail: "A few plain sentences", tone: "primary" },
        { id: "role", label: "Role", detail: "Who the assistant is" },
        { id: "task", label: "Task", detail: "The one thing to do", tone: "success" },
        { id: "context", label: "Context", detail: "Who you are + background" },
        { id: "constraints", label: "Constraints", detail: "What to avoid or limit" },
        { id: "format", label: "Output format", detail: "How to shape the answer" },
        { id: "answer", label: "A useful answer", detail: "Focused, runnable, on-topic", tone: "success" },
      ], edges: [
        { from: "prompt", to: "role" },
        { from: "role", to: "task" },
        { from: "task", to: "context" },
        { from: "context", to: "constraints" },
        { from: "constraints", to: "format" },
        { from: "format", to: "answer" },
      ], caption: "Miss a component and the assistant fills the gap with a guess." },

      S(5, "Step-by-Step", "Compose a prompt, one component at a time."),
      { type: "breakdown", language: "text", title: "Building a prompt for titleCase", steps: [
        { code: "TASK: Write a function that capitalizes each word in a sentence.", explain: "Start with the action. One clear task, one clear verb.", why: "Every other component orbits the task." },
        { code: "ROLE: You are a JavaScript tutor for beginners.", explain: "Tell the assistant who to be. That sets the tone and depth of the answer." },
        { code: "CONTEXT: I'm a student. I understand variables but not arrays.", explain: "Give background so the answer matches your level.", mistake: "Without this, the assistant assumes an expert audience." },
        { code: "CONSTRAINTS: No frameworks. Under 30 lines.", explain: "Ban what would derail the answer before it happens." },
        { code: "OUTPUT: Show the code, then one line on how it works.", explain: "Shape the reply so you can use it immediately." },
      ] },

      S(6, "Interactive Demonstration", "Build one yourself, block by block."),
      ...p("The **Prompt Builder** lets you compose a prompt out of the seven components instead of typing it from memory. Add blocks, fill them in, and watch the composed prompt grow."),
      { type: "promptBuilder", title: "Compose a prompt with components" },

      S(7, "Guided Practice", "Three situations, three prompts."),
      { type: "guided", title: "Write prompts for these situations", steps: [
        { instruction: "A classmate asked 'how do I make a website?'. Write a prompt that would get them a useful answer.", explain: "Add context (a beginner), a task (build a single page), constraints (no frameworks) and a format (code + a short explanation).", check: "Does your prompt include at least a task, context and format?" },
        { instruction: "Your code throws an error. Write the prompt you'd paste into the assistant.", explain: "The most useful version includes the exact error message and the code that produced it.", check: "Did you include the exact error text?" },
        { instruction: "Use the Prompt Builder above to compose a prompt that asks the assistant to explain closures.", explain: "Try adding a Role, Task, Context and Output format block.", check: "Is there exactly one clear task?" },
      ] },

      S(8, "Explain Every Mistake", "Vague prompts get vague answers."),
      { type: "mistake", title: "Asking for everything, getting nothing", language: "text",
        wrong: "Make a website",
        wrongWhy: "Five words, zero constraints. The assistant must guess your audience, your stack, your pages and your level — so it answers generically.",
        right: `Build a single HTML page about cycling for a beginner: one heading,
a paragraph, a 3-item list, and a button that alerts "Ride on!".
No CSS frameworks. Explain each tag in one line.`,
        rightWhy: "Task, context, constraints and output format are all present. The assistant knows exactly what to build and how to present it.",
        fix: "Before sending, count the components. Task, context, constraints, format — anything missing is a guess the assistant has to make." },

      S(9, "Challenge", "Assemble a prompt with code."),
      ...p("Now prove you know the pattern: write a function that builds a fully-specified prompt."),
      { type: "exercise", exerciseKey: "ex-ai-prompt", title: "Build a prompt generator" },

      S(10, "Reflection", "Think it through."),
      { type: "reflection", title: "Your prompt anatomy", questions: [
        "Which of the seven components do you skip most often, and why?",
        "Rewrite 'Make a website' in your own words using the components.",
        "Why does an example matter more than a longer explanation?",
      ] },
    ]),
  });

  const lesson3 = await upsertLesson(m1.id, course.id, {
    slug: "prompt-studio",
    title: "Craft and analyze your prompts",
    description: "Build prompts in the Prompt Studio and get an honest, rule-based score you can iterate on.",
    objectives: ["Use the Prompt Builder to compose a prompt from components", "Run a prompt through the Analyzer and read its feedback", "Iterate until a prompt reaches a strong score"],
    difficulty: "BEGINNER",
    estimatedMinutes: 15,
    order: 3,
    content: block([
      S(1, "Introduction", "Two tools, one skill: writing prompts on purpose."),
      ...p("The **Prompt Builder** assembles prompts out of components so you never forget one. The **Prompt Analyzer** scores any prompt from 0–100 with honest, rule-based feedback — no AI guessing. Together they turn 'write a prompt' from a blank page into a repeatable process."),
      { type: "callout", variant: "tip", title: "No AI grading here", text: "The Analyzer uses rules, not a model. That means feedback is instant, consistent and free — and it checks the same components you learned in the previous lesson." },

      S(2, "Real-Life Analogy", "Following a recipe, one ingredient at a time."),
      { type: "analogy", topic: "Analyzing a prompt is like checking a recipe", real: "A recipe that says 'make a cake' produces a different cake for every cook. A recipe with ingredients, quantities and steps produces the same cake every time. The Analyzer is your ingredient checklist.", mapping: [
        { real: "'make a cake'", concept: "A prompt with a task but no details" },
        { real: "A list of ingredients", concept: "The prompt components: role, context, constraints" },
        { real: "Steps and timings", concept: "Output format and success criteria" },
        { real: "Checking the fridge before you start", concept: "Running the Analyzer before you send the prompt" },
      ] },

      S(3, "Why It Matters", "Iterating beats retyping."),
      ...p("The fastest path to a great prompt is not writing it perfectly first try — it's running it through feedback and fixing one thing at a time. A 50→85 score in three passes beats ten minutes of staring at a blank box."),
      { type: "list", ordered: true, items: ["Draft a prompt from components", "Run it through the Analyzer", "Read what's missing", "Add one component", "Repeat until 85+"] },

      S(4, "Visual Explanation", "The score bands."),
      { type: "visual", title: "What each score range means", nodes: [
        { id: "weak", label: "0–49 · Weak", detail: "No clear task — the assistant is guessing", tone: "danger" },
        { id: "needs", label: "50–69 · Needs work", detail: "A task exists, but context, constraints or format are missing", tone: "warning" },
        { id: "good", label: "70–84 · Good", detail: "Most components covered — one or two small gaps", tone: "primary" },
        { id: "great", label: "85–100 · Great", detail: "All seven ingredients present", tone: "success" },
      ], edges: [
        { from: "weak", to: "needs" },
        { from: "needs", to: "good" },
        { from: "good", to: "great" },
      ] },

      S(5, "Step-by-Step", "Run the Builder and Analyzer together."),
      { type: "breakdown", language: "text", title: "The build → score → improve loop", steps: [
        { code: "1. Add a Task block in the Prompt Builder.", explain: "Every good prompt starts with one clear action." },
        { code: "2. Add Role, Context, Constraints and Output format.", explain: "Fill in the blocks the task depends on." },
        { code: "3. Copy the composed prompt.", explain: "The Builder formats it with labeled sections." },
        { code: "4. Paste it into the Prompt Analyzer.", explain: "You get a score plus per-component feedback instantly." },
        { code: "5. Add the missing components, then re-score.", explain: "Each pass should move the score up — that's iteration.", why: "Aim for 85+, where every component is covered." },
      ] },

      S(6, "Interactive Demonstration", "Build and score a real prompt."),
      ...p("Use the Builder to compose a prompt about anything you're learning. Then copy it into the Analyzer below and watch the feedback update as you edit it."),
      { type: "promptBuilder", title: "Compose your prompt" },
      { type: "promptAnalyzer", title: "Score your prompt", example: "Write a function that capitalizes each word in a sentence. Show the code, then explain it." },

      S(7, "Guided Practice", "Score 85 or higher."),
      { type: "guided", title: "Build then analyze", steps: [
        { instruction: "Open the Builder and add a Task block for a topic you're learning this week.", check: "Is the task one clear action verb?" },
        { instruction: "Add Role, Context, Constraints and Output format blocks.", explain: "Context should say who you are and what you're building." },
        { instruction: "Copy the composed prompt and run it through the Analyzer.", explain: "Note which components are reported as missing.", check: "Did you read the 'How to improve' list?" },
        { instruction: "Add Examples and Success criteria, then re-score until you reach 85+.", check: "A score of 85+ means every component is covered." },
      ] },

      S(8, "Explain Every Mistake", "Expecting a perfect prompt first try."),
      { type: "mistake", title: "The one-shot perfection trap", language: "text",
        wrong: "Tell me everything about functions.",
        wrongWhy: "There's no task beyond 'tell me', no level, no format — the answer could go anywhere.",
        right: `You are a tutor for beginners. Explain what JavaScript functions
are in under 150 words: what they are, why you use them, and one
tiny example. Then ask me one question to check my understanding.`,
        rightWhy: "Role, context, constraints, output format and success criteria are all present — the prompt even tells the assistant to quiz you so you know it worked.",
        fix: "First drafts are rarely perfect. Run your prompt through the Analyzer, read what's missing, and add one component at a time." },

      S(9, "Challenge", "Write the fully-specified prompt."),
      ...p("Write a function that returns a complete, 85+ prompt for any topic — role, task, constraints and format all included."),
      { type: "exercise", exerciseKey: "ex-prompt-improve", title: "Compose a full prompt with code" },

      S(10, "Reflection", "Think it through."),
      { type: "reflection", title: "Your Prompt Studio session", questions: [
        "What did the Analyzer's feedback teach you about your own prompts?",
        "Which component improved your score the most? Why do you think that is?",
        "How will you use the Prompt Studio when you work on real projects?",
      ] },
    ]),
  });

  const lesson4 = await upsertLesson(m1.id, course.id, {
    slug: "vibe-coding-with-opencode",
    title: "Vibe coding with OpenCode",
    description: "Describe the goal, let the assistant build it, and steer with precise feedback. Review everything before you trust it.",
    objectives: ["Run a vibe-coding loop", "Steer the assistant with targeted feedback", "Review generated code before trusting it"],
    difficulty: "BEGINNER",
    estimatedMinutes: 13,
    order: 4,
    content: block([
      S(1, "Introduction", "Building by describing, steering by feedback."),
      ...p("**Vibe coding** is building software by describing what you want in plain language and letting the AI write the code while you steer. The craft is in the steering: giving feedback that makes each iteration closer to what you imagined."),

      S(2, "Real-Life Analogy", "Directing a film, not writing every scene."),
      { type: "analogy", topic: "Vibe coding is like directing", real: "A director doesn't draw every frame. They describe the vision, watch the footage, and give one specific note at a time: 'the light is wrong', 'make the ending feel slower'. The crew builds; the director steers.", mapping: [
        { real: "The director describes the vision", concept: "You describe the goal in plain language" },
        { real: "The crew films a scene", concept: "The assistant writes a version of the code" },
        { real: "The director watches the footage", concept: "You run the code and read the output" },
        { real: "One note at a time", concept: "One precise instruction per round-trip" },
      ] },

      S(3, "Why It Matters", "Speed without losing understanding."),
      ...p("Vibe coding lets a beginner ship a real project on day one. But the moment you stop reading the code, you're no longer steering — you're just hoping. The loop only works if you stay in it: build, run, read, steer."),
      { type: "callout", variant: "warning", title: "Read what it writes", text: "Code you don't understand is code you can't debug — and you will debug it. Ask the assistant to explain anything surprising before you move on." },

      S(4, "Visual Explanation", "The vibe loop."),
      { type: "visual", title: "Describe → build → run → steer", nodes: [
        { id: "goal", label: "Describe the goal", detail: "One or two sentences", tone: "primary" },
        { id: "build", label: "Let the AI write v1" },
        { id: "run", label: "Run it, read the errors", detail: "Don't skip them", tone: "warning" },
        { id: "steer", label: "Reply with feedback", detail: "One precise instruction at a time", tone: "success" },
        { id: "done", label: "Ship it", detail: "You understand every line", tone: "muted" },
      ], edges: [
        { from: "goal", to: "build" },
        { from: "build", to: "run" },
        { from: "run", to: "steer", label: "Something's off" },
        { from: "steer", to: "done", label: "It works" },
      ], caption: "After a steer the assistant rebuilds — run it again. The loop repeats until it matches your goal." },

      S(5, "Step-by-Step", "A real vibe-coded session, round by round."),
      { type: "breakdown", language: "text", title: "Three rounds, three instructions", steps: [
        { code: "You: Make a page that counts how many times a button was clicked.", explain: "One goal, one sentence. The assistant writes a full page." },
        { code: "You: The number resets when I refresh. Keep it using localStorage.", explain: "You ran it, spotted the gap, and named the fix. That's a precise follow-up.", why: "Vague follow-ups like 'it's broken' force the assistant to guess again." },
        { code: "You: Nice. Now style the button green and rounded.", explain: "Small, precise instructions steer the design without rewriting everything." },
      ] },

      S(6, "Interactive Demonstration", "Steer your own vibe-coded counter."),
      ...p("This is the button counter from the lesson — with persistence already added. Run it, click, refresh, and notice how each round-trip improved it."),
      { type: "demo", title: "The vibe-coded click counter", description: "Click, refresh, and the count survives — that's the localStorage fix.", html: `<div class="demo">
  <p class="label">Times clicked</p>
  <p id="count">0</p>
  <button id="btn">Click me</button>
  <p class="hint">Refresh the page — the count survives because we saved it.</p>
</div>`, css: `.demo { font-family: system-ui, sans-serif; max-width: 320px; margin: 12px auto; padding: 12px; text-align: center; }
.label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin: 0 0 4px; }
#count { font-size: 48px; font-weight: 700; color: #111; margin: 4px 0 12px; }
#btn { padding: 10px 22px; border: none; border-radius: 10px; background: #16a34a; color: #fff; font-size: 15px; cursor: pointer; }
.hint { font-size: 12px; color: #9ca3af; margin-top: 14px; }`, js: `var count = Number(localStorage.getItem('count') || 0);
var el = document.getElementById('count');
el.textContent = count;
document.getElementById('btn').addEventListener('click', function () {
  count = count + 1;
  el.textContent = count;
  localStorage.setItem('count', String(count));
});` },

      S(7, "Guided Practice", "Steer a session from start to finish."),
      { type: "guided", title: "Practice the vibe loop", steps: [
        { instruction: "Describe a tiny goal: a page, a counter, or a styled button.", explain: "One or two sentences, plain language." },
        { instruction: "Run the result and read the errors out loud.", explain: "Saying them out loud forces you to actually read them.", check: "Did you find the error before asking the assistant?" },
        { instruction: "Reply with exactly one improvement.", explain: "The smallest useful next step — not a list of ten." },
        { instruction: "Repeat until you'd be happy shipping it.", explain: "When every line makes sense to you, you're done.", check: "Could you explain the final code to a friend?" },
      ] },

      S(8, "Explain Every Mistake", "Vibe without the loop is just copy-paste."),
      { type: "mistake", title: "Vibe and pray", language: "text",
        wrong: `You: Build me a full todo app.
AI: [writes a 400-line app]
You: Cool, ship it.`,
        wrongWhy: "One shot, no run, no review. The assistant guessed wrong about storage, styles and empty states — and nobody checked.",
        right: `You: Make a todo list where I can add and delete tasks.
AI: [writes v1]
You: It loses items on refresh. Save them in localStorage.
AI: [adds persistence]
You: Run it — an empty list should show "Nothing here yet".
AI: [fixes the empty state]`,
        rightWhy: "Each round adds one precise instruction, and every change is run and reviewed. That's steering, not praying.",
        fix: "If you can't explain one line of the code you're about to ship, you're not done. Ask the assistant to explain it first." },

      S(9, "Challenge", "Bring it together."),
      ...p("Two final checks: make a prompt specific, then prove what you know in the quiz."),
      { type: "exercise", exerciseKey: "ex-ai-improve", title: "Make the prompt specific" },
      { type: "quiz", quizKey: "qz-ai-fundamentals", title: "Coding with AI quiz" },

      S(10, "Reflection", "Think it through."),
      { type: "reflection", title: "Your vibe-coding mindset", questions: [
        "What's the difference between vibe coding and copy-paste-and-pray?",
        "Describe a time you will 'read the errors instead of skipping them'.",
        "Name one habit from this course you'll carry into your next project.",
      ] },
    ]),
  });

  // -------------------------------------------------------------------------
  // Exercises — Coding with AI
  // -------------------------------------------------------------------------

  await upsertExercise(course.id, lesson1.id, {
    key: "ex-ai-greeting",
    type: "code_output",
    title: "Say hello to your assistant",
    instructions: "Log the message `Let's build something with AI!` using `console.log`.",
    starterCode: "// Your code here\n",
    solution: "console.log(\"Let's build something with AI!\");",
    hints: ["console.log(...) prints a value.", "Strings go in quotes or backticks."],
    config: { kind: "code_output", expectedOutput: "Let's build something with AI!", trimLines: true },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson2.id, {
    key: "ex-ai-prompt",
    type: "js_function",
    title: "Build a prompt generator",
    instructions: "Write a function `makePrompt(topic)` that returns the string `Explain TOPIC in simple terms, with one short code example.` where TOPIC is the value passed in.",
    starterCode: "function makePrompt(topic) {\n  // Your code here\n}\n",
    solution: "function makePrompt(topic) {\n  return `Explain ${topic} in simple terms, with one short code example.`;\n}",
    hints: ["Use a template literal with backticks and ${...}.", "Return, don't log."],
    config: {
      kind: "js_function",
      functionName: "makePrompt",
      tests: [
        { args: ["loops"], expected: "Explain loops in simple terms, with one short code example.", description: "makePrompt('loops')" },
        { args: ["CSS flexbox"], expected: "Explain CSS flexbox in simple terms, with one short code example.", description: "makePrompt('CSS flexbox')" },
      ],
    },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson3.id, {
    key: "ex-prompt-improve",
    type: "js_function",
    title: "Compose a full prompt with code",
    instructions: "Write a function `buildPrompt(topic)` that returns a fully-specified prompt: `You are a patient tutor. Explain TOPIC in simple terms. Keep it under 200 words and show one short code example at the end.` where TOPIC is the value passed in.",
    starterCode: "function buildPrompt(topic) {\n  // Your code here\n}\n",
    solution: "function buildPrompt(topic) {\n  return `You are a patient tutor. Explain ${topic} in simple terms. Keep it under 200 words and show one short code example at the end.`;\n}",
    hints: ["Use a template literal with ${...}.", "Include the role ('You are a patient tutor') and the constraint ('under 200 words')."],
    config: {
      kind: "js_function",
      functionName: "buildPrompt",
      tests: [
        { args: ["closures"], expected: "You are a patient tutor. Explain closures in simple terms. Keep it under 200 words and show one short code example at the end.", description: "buildPrompt('closures')" },
        { args: ["CSS flexbox"], expected: "You are a patient tutor. Explain CSS flexbox in simple terms. Keep it under 200 words and show one short code example at the end.", description: "buildPrompt('CSS flexbox')" },
      ],
    },
    points: 10,
    order: 1,
  });

  await upsertExercise(course.id, lesson4.id, {
    key: "ex-ai-improve",
    type: "js_function",
    title: "Make the prompt specific",
    instructions: "Write a function `improvePrompt(question)` that returns the question followed by the suffix ` Please show working code and explain each line.`",
    starterCode: "function improvePrompt(question) {\n  // Your code here\n}\n",
    solution: "function improvePrompt(question) {\n  return question + ' Please show working code and explain each line.';\n}",
    hints: ["Concatenate with + or use a template literal.", "Keep the question exactly as passed in."],
    config: {
      kind: "js_function",
      functionName: "improvePrompt",
      tests: [
        { args: ["How do I center a div?"], expected: "How do I center a div? Please show working code and explain each line.", description: "improvePrompt('How do I center a div?')" },
        { args: ["What is a closure?"], expected: "What is a closure? Please show working code and explain each line.", description: "improvePrompt('What is a closure?')" },
      ],
    },
    points: 10,
    order: 1,
  });

  await upsertQuiz(lesson4.id, course.id, {
    key: "qz-ai-fundamentals",
    title: "Coding with AI",
    description: "A review of the prompt components, the chat loop and the vibe-coding loop.",
    passScore: 70,
    timeLimit: 6,
    order: 1,
    questions: [
      { type: "multiple_choice", prompt: "Which component should come first when you write a prompt?", options: ["Role", "Task", "Examples", "Emojis"], answer: 1, points: 10, order: 1, explanation: "A clear task anchors every other component." },
      { type: "multiple_choice", prompt: "Which prompt is most likely to produce a useful answer?", options: ["Make something cool", "Write a button that turns red when clicked and alerts 'Done' on the second click", "Give me some code", "Fix it"], answer: 1, points: 10, order: 2, explanation: "A precise task with constraints gives the assistant something concrete to build." },
      { type: "true_false", prompt: "You should always trust code written by an AI assistant without reading it.", answer: false, points: 10, order: 3, explanation: "Assistants can be confidently wrong — read and run everything they write." },
      { type: "multiple_choice", prompt: "A prompt that says 'You are a senior developer who teaches beginners' is defining the…", options: ["Task", "Context", "Role", "Output format"], answer: 2, points: 10, order: 4, explanation: "The Role tells the assistant who to be, which sets the tone and depth of the answer." },
      { type: "fill_blank", prompt: "Describing a goal in plain language and letting an AI write the code is called ____ coding.", blanks: [["vibe"]], points: 10, order: 5, explanation: "The skill is in the steering — giving feedback that improves each version." },
      { type: "multiple_choice", prompt: "Pasting the exact error message into your prompt is an example of adding good…", options: ["Context", "Role", "Constraints", "Success criteria"], answer: 0, points: 10, order: 6, explanation: "The error plus your code tells the assistant what actually happened." },
      { type: "multiple_choice", prompt: "'Keep it under 200 words and show one short code example at the end' is mostly a…", options: ["Role", "Output format", "Example", "Task"], answer: 1, points: 10, order: 7, explanation: "It tells the assistant how to shape the answer." },
      { type: "true_false", prompt: "Running your prompt through an analyzer and iterating is faster than retyping it from scratch.", answer: true, points: 10, order: 8, explanation: "Feedback shows exactly what's missing, so you fix one component at a time." },
      { type: "code_completion", prompt: "Write code that logs the message `Ask me anything` using `console.log`. `const msg = 'Ask me anything';`", answer: "const msg = 'Ask me anything';\nconsole.log(msg);", points: 10, order: 9, explanation: "console.log(msg) prints the variable's value." },
    ],
  });

  return { course, module: m1 };
}

// ---------------------------------------------------------------------------
// Learning games
// ---------------------------------------------------------------------------

type GameSeed = {
  key: string;
  slug: string;
  name: string;
  description: string;
  kind: string;
  icon: string;
  color: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
  levelRequirement: number;
  unlockCriteria: Record<string, unknown> | null;
  learningObjectives: string[];
  hints: string[];
  badges: { key: string; name: string; description: string; icon: string; requirement: string }[];
  order: number;
};

type GameLevelSeed = {
  key: string;
  order: number;
  title: string;
  description: string | null;
  instructions: string | null;
  objectives: string[];
  config: Record<string, unknown>;
  hints: string[];
  explanation: string | null;
  xpReward: number;
};

const GAME_SEEDS: { game: GameSeed; levels: GameLevelSeed[] }[] = [
  // ─────────────────────────── HTML Builder ────────────────────────────────
  {
    game: {
      key: "html-builder",
      slug: "html-builder",
      name: "HTML Builder",
      description: "Drag HTML tags into the right order to build real pages — paragraphs, documents and lists.",
      kind: "html_builder",
      icon: "🧱",
      color: "#ef4444",
      difficulty: "BEGINNER",
      estimatedMinutes: 8,
      xpReward: 60,
      levelRequirement: 1,
      unlockCriteria: { kind: "lessonsCompleted", count: 1 },
      learningObjectives: ["Order HTML tags correctly", "Nest tags inside each other", "Build complete page skeletons"],
      hints: ["Think top to bottom — what comes first in a page?", "A tag that opens must close, and inner tags close before outer ones (LIFO)."],
      badges: [
        { key: "html-bronze", name: "Page Builder", description: "Beat every HTML Builder level", icon: "🥉", requirement: "beat" },
        { key: "html-gold", name: "Structure Pro", description: "Beat every HTML Builder level perfectly", icon: "🥇", requirement: "allPerfect" },
      ],
      order: 1,
    },
    levels: [
      {
        key: "first-paragraph",
        order: 1,
        title: "Your first paragraph",
        description: "Build a single <p> element.",
        instructions: "Drag the blocks into the correct order to create a paragraph that says Hello, world!.",
        objectives: ["Recognize opening and closing tags", "Put text inside a tag pair"],
        config: {
          kind: "html_builder",
          description: "A paragraph element: an opening tag, some text, and a closing tag.",
          tokens: [
            { key: "t1", label: "<p>", kind: "open", indent: 0 },
            { key: "t2", label: "Hello, world!", kind: "text", indent: 1 },
            { key: "t3", label: "</p>", kind: "close", indent: 0 },
          ],
          answer: ["t1", "t2", "t3"],
          previewHtml: "<p>Hello, world!</p>",
        },
        hints: ["The opening tag comes before the content.", "The closing tag comes last and starts with a slash."],
        explanation: "An element opens with <p>, holds its text, then closes with </p>. Every tag that opens must close.",
        xpReward: 10,
      },
      {
        key: "page-skeleton",
        order: 2,
        title: "A proper document",
        description: "Assemble the skeleton every HTML page shares.",
        instructions: "Order the blocks from the doctype all the way down to the closing </html> tag.",
        objectives: ["Identify the html/head/body structure", "Nest the title inside the head", "Close the body before the html element"],
        config: {
          kind: "html_builder",
          description: "The five-part skeleton of a web page.",
          tokens: [
            { key: "t1", label: "<!DOCTYPE html>", kind: "void", indent: 0 },
            { key: "t2", label: "<html>", kind: "open", indent: 0 },
            { key: "t3", label: "<head>", kind: "open", indent: 1 },
            { key: "t4", label: "<title>My page</title>", kind: "void", indent: 2 },
            { key: "t5", label: "</head>", kind: "close", indent: 1 },
            { key: "t6", label: "<body>", kind: "open", indent: 1 },
            { key: "t7", label: "<h1>Welcome</h1>", kind: "void", indent: 2 },
            { key: "t8", label: "</body>", kind: "close", indent: 1 },
            { key: "t9", label: "</html>", kind: "close", indent: 0 },
          ],
          answer: ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9"],
          previewHtml: "<!DOCTYPE html>\n<html>\n  <head><title>My page</title></head>\n  <body><h1>Welcome</h1></body>\n</html>",
        },
        hints: ["The doctype always goes first.", "The head holds metadata; the body holds visible content.", "Close in reverse order: body before html."],
        explanation: "DOCTYPE declares the document, html wraps everything, head holds the title, body holds visible content. Closing order is the reverse of opening.",
        xpReward: 15,
      },
      {
        key: "shopping-list",
        order: 3,
        title: "A shopping list",
        description: "Build a list with two items.",
        instructions: "Arrange the blocks so each list item contains its text and lives inside the <ul>.",
        objectives: ["Nest list items inside a list", "Close inner elements before the outer list"],
        config: {
          kind: "html_builder",
          description: "An unordered list with two items.",
          tokens: [
            { key: "t1", label: "<ul>", kind: "open", indent: 0 },
            { key: "t2", label: "<li>Apples</li>", kind: "void", indent: 1 },
            { key: "t3", label: "<li>Bananas</li>", kind: "void", indent: 1 },
            { key: "t4", label: "</ul>", kind: "close", indent: 0 },
          ],
          answer: ["t1", "t2", "t3", "t4"],
          previewHtml: "<ul>\n  <li>Apples</li>\n  <li>Bananas</li>\n</ul>",
        },
        hints: ["Items go between the list's opening and closing tags.", "Both <li> elements sit side by side inside the list."],
        explanation: "List items are nested inside the list element: <ul> opens, each <li> contains its text, then </ul> closes everything.",
        xpReward: 20,
      },
    ],
  },

  // ────────────────────────────── CSS Painter ──────────────────────────────
  {
    game: {
      key: "css-painter",
      slug: "css-painter",
      name: "CSS Painter",
      description: "Style an element to match a target design by choosing exactly the right CSS declarations.",
      kind: "css_painter",
      icon: "🎨",
      color: "#8b5cf6",
      difficulty: "BEGINNER",
      estimatedMinutes: 8,
      xpReward: 60,
      levelRequirement: 1,
      unlockCriteria: { kind: "lessonsCompleted", count: 3 },
      learningObjectives: ["Map a visual design to CSS properties", "Pick correct property and value pairs", "Reject declarations that don't match"],
      hints: ["Read the target one property at a time.", "background changes the fill; color changes the text.", "Watch for lookalike distractors (color vs background-color)."],
      badges: [
        { key: "css-bronze", name: "Style Maker", description: "Beat every CSS Painter level", icon: "🥉", requirement: "beat" },
        { key: "css-gold", name: "Design Perfectionist", description: "Beat every CSS Painter level perfectly", icon: "🥇", requirement: "allPerfect" },
      ],
      order: 2,
    },
    levels: [
      {
        key: "green-card",
        order: 1,
        title: "Green card, white text",
        description: "Match the target card exactly.",
        instructions: "Select every declaration the target card needs. Leave out anything that doesn't belong.",
        objectives: ["Choose the right background and text color", "Spot wrong property/value pairs"],
        config: {
          kind: "css_painter",
          description: "A rounded green button with bold white centered text.",
          target: {
            title: "Target",
            description: "A green card with white, bold, centered text and soft corners.",
            element: "button.card",
            styles: [
              ["background", "#16a34a"],
              ["color", "#ffffff"],
              ["font-weight", "bold"],
              ["border-radius", "8px"],
              ["text-align", "center"],
            ],
          },
          declarations: [
            { key: "d1", label: "background: #16a34a", property: "background", value: "#16a34a" },
            { key: "d2", label: "color: #ffffff", property: "color", value: "#ffffff" },
            { key: "d3", label: "font-weight: bold", property: "font-weight", value: "bold" },
            { key: "d4", label: "border-radius: 8px", property: "border-radius", value: "8px" },
            { key: "d5", label: "background: #ffffff", property: "background", value: "#ffffff" },
            { key: "d6", label: "color: #16a34a", property: "color", value: "#16a34a" },
            { key: "d7", label: "border-radius: 50%", property: "border-radius", value: "50%" },
            { key: "d8", label: "text-align: center", property: "text-align", value: "center" },
          ],
          correct: ["d1", "d2", "d3", "d4", "d8"],
          passRatio: 0.75,
        },
        hints: ["Start with the two colors: fill and text.", "Only add border-radius if the target looks rounded."],
        explanation: "The card needs a green fill, white text, bold weight, a small corner radius and centered text — five declarations, no more.",
        xpReward: 10,
      },
      {
        key: "fancy-link",
        order: 2,
        title: "Fancy link button",
        description: "Match a pill-shaped link button.",
        instructions: "Pick the declarations that turn a plain link into a blue pill button.",
        objectives: ["Use padding and display", "Style links with text-decoration"],
        config: {
          kind: "css_painter",
          description: "A blue pill link with padding and no underline.",
          target: {
            title: "Target",
            description: "A blue pill-shaped button made from a link: padded, rounded, no underline.",
            element: "a.btn",
            styles: [
              ["background", "#2563eb"],
              ["color", "#ffffff"],
              ["padding", "12px 24px"],
              ["border-radius", "9999px"],
              ["text-decoration", "none"],
              ["display", "inline-block"],
            ],
          },
          declarations: [
            { key: "d1", label: "background: #2563eb", property: "background", value: "#2563eb" },
            { key: "d2", label: "color: #ffffff", property: "color", value: "#ffffff" },
            { key: "d3", label: "padding: 12px 24px", property: "padding", value: "12px 24px" },
            { key: "d4", label: "border-radius: 9999px", property: "border-radius", value: "9999px" },
            { key: "d5", label: "text-decoration: none", property: "text-decoration", value: "none" },
            { key: "d6", label: "display: inline-block", property: "display", value: "inline-block" },
            { key: "d7", label: "text-decoration: underline", property: "text-decoration", value: "underline" },
            { key: "d8", label: "padding: 0", property: "padding", value: "0" },
            { key: "d9", label: "border: none", property: "border", value: "none" },
          ],
          correct: ["d1", "d2", "d3", "d4", "d5", "d6"],
          passRatio: 0.75,
        },
        hints: ["A pill shape is a huge border-radius.", "Links are underlined by default — the target has no underline."],
        explanation: "A padded, rounded, blue link button: background + text color, generous padding, a full pill radius, no underline, and inline-block display.",
        xpReward: 15,
      },
      {
        key: "hero-title",
        order: 3,
        title: "Centered hero title",
        description: "Match a big, bold centered headline.",
        instructions: "Pick every declaration needed for a large, bold, centered headline.",
        objectives: ["Control text size and weight", "Fine-tune with letter-spacing"],
        config: {
          kind: "css_painter",
          description: "A large, extra-bold, centered dark headline.",
          target: {
            title: "Target",
            description: "A 3rem, 800-weight, centered dark headline with slight letter spacing.",
            element: "h1.hero",
            styles: [
              ["font-size", "3rem"],
              ["font-weight", "800"],
              ["color", "#0f172a"],
              ["text-align", "center"],
              ["letter-spacing", "0.05em"],
              ["font-family", "system-ui"],
            ],
          },
          declarations: [
            { key: "d1", label: "font-size: 3rem", property: "font-size", value: "3rem" },
            { key: "d2", label: "font-weight: 800", property: "font-weight", value: "800" },
            { key: "d3", label: "color: #0f172a", property: "color", value: "#0f172a" },
            { key: "d4", label: "text-align: center", property: "text-align", value: "center" },
            { key: "d5", label: "letter-spacing: 0.05em", property: "letter-spacing", value: "0.05em" },
            { key: "d6", label: "font-family: system-ui", property: "font-family", value: "system-ui" },
            { key: "d7", label: "font-size: 3px", property: "font-size", value: "3px" },
            { key: "d8", label: "text-align: left", property: "text-align", value: "left" },
            { key: "d9", label: "font-weight: 300", property: "font-weight", value: "300" },
          ],
          correct: ["d1", "d2", "d3", "d4", "d5", "d6"],
          passRatio: 0.75,
        },
        hints: ["Size and weight matter most — check them first.", "letter-spacing adds space between letters, not words."],
        explanation: "The headline is 3rem, extra-bold (800), dark, centered, with a system font and light letter spacing — all six declarations.",
        xpReward: 20,
      },
    ],
  },

  // ──────────────────────────── JS Logic Puzzle ─────────────────────────────
  {
    game: {
      key: "js-logic",
      slug: "js-logic",
      name: "JavaScript Logic Puzzle",
      description: "Arrange JavaScript statements so the program prints exactly the expected output.",
      kind: "js_logic",
      icon: "🧩",
      color: "#eab308",
      difficulty: "BEGINNER",
      estimatedMinutes: 8,
      xpReward: 60,
      levelRequirement: 1,
      unlockCriteria: { kind: "lessonsCompleted", count: 5 },
      learningObjectives: ["Trace program flow top to bottom", "Order statements to reach an output", "Predict what a program prints"],
      hints: ["Programs run top to bottom.", "Declare a variable before you use it.", "console.log prints as soon as it is reached."],
      badges: [
        { key: "js-bronze", name: "Logic Builder", description: "Beat every JS Logic Puzzle level", icon: "🥉", requirement: "beat" },
        { key: "js-gold", name: "Flow Master", description: "Beat every JS Logic Puzzle level perfectly", icon: "🥇", requirement: "allPerfect" },
      ],
      order: 3,
    },
    levels: [
      {
        key: "hello-name",
        order: 1,
        title: "A greeting",
        description: "Print Hello, Ada!",
        instructions: "Order the statements so the program prints Hello, Ada!.",
        objectives: ["Declare a variable before using it", "Trace a simple log"],
        config: {
          kind: "js_logic",
          description: "Two statements: a variable and a log.",
          statements: [
            { key: "s1", code: `const name = "Ada";` },
            { key: "s2", code: `console.log("Hello, " + name + "!");` },
          ],
          answer: ["s1", "s2"],
          expectedOutput: "Hello, Ada!",
        },
        hints: ["The variable must exist before you log it.", "Only one order prints Hello, Ada!."],
        explanation: "name is declared first, then used inside the log. Swapping them would throw a ReferenceError.",
        xpReward: 10,
      },
      {
        key: "running-total",
        order: 2,
        title: "Running total",
        description: "Print the total of 5 + 7.",
        instructions: "Order the statements so total starts at 0, adds 5, adds 7, and prints 12.",
        objectives: ["Order accumulation steps", "Read a final result"],
        config: {
          kind: "js_logic",
          description: "Accumulating into a total.",
          statements: [
            { key: "s1", code: `let total = 0;` },
            { key: "s2", code: `total += 5;` },
            { key: "s3", code: `total += 7;` },
            { key: "s4", code: `console.log(total);` },
          ],
          answer: ["s1", "s2", "s3", "s4"],
          expectedOutput: "12",
        },
        hints: ["Initialize the total first.", "Add before you print — order matters for the result."],
        explanation: "total starts at 0, becomes 5, then 12, and only then is printed.",
        xpReward: 15,
      },
      {
        key: "even-numbers",
        order: 3,
        title: "Even numbers",
        description: "Print the even numbers from 1 to 5.",
        instructions: "Order the loop, the conditional log, and the closing brace so the program prints 2 and 4.",
        objectives: ["Assemble a for loop", "Combine a loop with a condition"],
        config: {
          kind: "js_logic",
          description: "A for loop with an if that logs evens.",
          statements: [
            { key: "s1", code: `for (let i = 1; i <= 5; i++) {` },
            { key: "s2", code: `  if (i % 2 === 0) console.log(i);` },
            { key: "s3", code: `}` },
          ],
          answer: ["s1", "s2", "s3"],
          expectedOutput: "2\n4",
        },
        hints: ["A loop needs its body and a closing brace.", "i % 2 === 0 is true for even numbers."],
        explanation: "The loop runs i from 1 to 5; the if logs only when i is even, so 2 and 4 print on their own lines.",
        xpReward: 20,
      },
    ],
  },

  // ────────────────────────────── Bug Hunter ───────────────────────────────
  {
    game: {
      key: "bug-hunter",
      slug: "bug-hunter",
      name: "Bug Hunter",
      description: "Real code, real bugs. Read the code, find the mistake, fix it, and make the tests pass.",
      kind: "bug_hunter",
      icon: "🐞",
      color: "#16a34a",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 12,
      xpReward: 80,
      levelRequirement: 1,
      unlockCriteria: { kind: "lessonsCompleted", count: 8 },
      learningObjectives: ["Read code for logic errors", "Fix JavaScript function bugs", "Fix HTML content and structure bugs"],
      hints: ["Read the error or test output carefully.", "Check function names, operators and returns.", "Compare the current code with what it should do."],
      badges: [
        { key: "bug-bronze", name: "Debugger", description: "Beat every Bug Hunter level", icon: "🥉", requirement: "beat" },
        { key: "bug-gold", name: "Bug Squasher", description: "Beat every Bug Hunter level perfectly", icon: "🥇", requirement: "allPerfect" },
      ],
      order: 4,
    },
    levels: [
      {
        key: "wrong-greeting",
        order: 1,
        title: "Wrong greeting",
        description: "The function says Goodbye — it should say Hello.",
        instructions: "Fix the function so greet('Ada') returns Hello, Ada!.",
        objectives: ["Find a wrong string value", "Fix a return value"],
        config: {
          kind: "bug_hunter",
          description: "greet() returns the wrong greeting.",
          language: "javascript",
          starterCode: `function greet(name) {
  return "Goodbye, " + name + "!";
}

console.log(greet("Ada"));`,
          exerciseType: "js_function",
          exerciseConfig: {
            kind: "js_function",
            functionName: "greet",
            tests: [
              { args: ["Ada"], expected: "Hello, Ada!", description: "greet('Ada')" },
              { args: ["Bob"], expected: "Hello, Bob!", description: "greet('Bob')" },
            ],
          },
          points: 10,
        },
        hints: ["Compare the output to the expected greeting.", "Only one word needs changing."],
        explanation: "The bug was the word 'Goodbye' — changing it to 'Hello' makes both tests pass.",
        xpReward: 10,
      },
      {
        key: "wrong-operator",
        order: 2,
        title: "Wrong operator",
        description: "add() subtracts instead of adding.",
        instructions: "Fix add() so add(2, 3) is 5 and add(10, 4) is 14.",
        objectives: ["Spot a wrong arithmetic operator", "Fix a function body"],
        config: {
          kind: "bug_hunter",
          description: "add() uses - instead of +.",
          language: "javascript",
          starterCode: `function add(a, b) {
  return a - b;
}

console.log(add(2, 3));`,
          exerciseType: "js_function",
          exerciseConfig: {
            kind: "js_function",
            functionName: "add",
            tests: [
              { args: [2, 3], expected: 5, description: "add(2, 3)" },
              { args: [10, 4], expected: 14, description: "add(10, 4)" },
            ],
          },
          points: 10,
        },
        hints: ["2 - 3 is -1, not 5.", "Which operator adds?"],
        explanation: "The minus sign turned add into subtraction — changing - to + fixes both tests.",
        xpReward: 15,
      },
      {
        key: "wrong-list-item",
        order: 3,
        title: "Wrong list item",
        description: "The list should contain Oranges, not Apples.",
        instructions: "Fix the HTML so the first list item says Oranges.",
        objectives: ["Fix HTML text content", "Keep the structure valid"],
        config: {
          kind: "bug_hunter",
          description: "A list with the wrong first item.",
          language: "html",
          starterCode: `<ul>
  <li>Apples</li>
  <li>Bananas</li>
</ul>`,
          exerciseType: "html_structure",
          exerciseConfig: {
            kind: "html_structure",
            checks: [
              { type: "text", selector: "li", contains: "Oranges", ignoreCase: false },
              { type: "text", selector: "li", contains: "Bananas", ignoreCase: false },
            ],
          },
          points: 10,
        },
        hints: ["Read the list out loud — which word is wrong?", "Only edit the first list item's text."],
        explanation: "The first item said 'Apples' but the requirement was 'Oranges' — a one-word content fix.",
        xpReward: 20,
      },
    ],
  },

  // ───────────────────────────── Cyber Escape ───────────────────────────────
  {
    game: {
      key: "cyber-escape",
      slug: "cyber-escape",
      name: "Cyber Escape",
      description: "Phishing sites, fake logins and sketchy URLs. Spot the trap, identify the red flag, and escape safely.",
      kind: "cyber_escape",
      icon: "🛡️",
      color: "#0ea5e9",
      difficulty: "BEGINNER",
      estimatedMinutes: 10,
      xpReward: 70,
      levelRequirement: 1,
      unlockCriteria: { kind: "lessonsCompleted", count: 4 },
      learningObjectives: ["Identify phishing websites and fake login pages", "Spot suspicious URLs", "Recognize unsafe web elements"],
      hints: ["Check the URL bar before you trust a page.", "Urgency and password requests are red flags.", "Look at the domain name — typos and subdomains deceive."],
      badges: [
        { key: "cyber-bronze", name: "Safety Scout", description: "Beat every Cyber Escape level", icon: "🥉", requirement: "beat" },
        { key: "cyber-gold", name: "Web Guardian", description: "Beat every Cyber Escape level perfectly", icon: "🥇", requirement: "allPerfect" },
      ],
      order: 5,
    },
    levels: [
      {
        key: "spot-the-url",
        order: 1,
        title: "The URL bar is the first line of defense",
        description: "Judge websites by their address.",
        instructions: "Inspect each address and answer the questions about phishing risk.",
        objectives: ["Read domains carefully", "Recognize lookalike domains"],
        config: {
          kind: "cyber_escape",
          description: "You receive an email claiming your bank account is locked. It links to a page.",
          scenario: "An email says: 'We detected unusual activity. Verify your identity now.' The link points to the page below.",
          questions: [
            {
              id: "q1",
              type: "multiple_choice",
              prompt: "The link points to http://bank-secure-login.com. Is this page likely a phishing site?",
              url: "http://bank-secure-login.com",
              options: ["Yes — the domain is not your bank's real domain", "No — it looks official", "Only if it asks for money"],
              answer: 0,
              points: 10,
              explanation: "A real bank uses its own domain (like bank.com). An unknown domain pretending to be your bank is a classic phishing sign.",
            },
            {
              id: "q2",
              type: "true_false",
              prompt: "A login page is safe as long as the browser shows a padlock icon.",
              answer: false,
              points: 10,
              explanation: "A padlock only means the connection is encrypted — phishers can get a padlock too. Check the domain and the context.",
            },
            {
              id: "q3",
              type: "multiple_choice",
              prompt: "The email links to paypa1.com. What is the red flag?",
              url: "paypa1.com",
              options: ["It is a lookalike domain (typosquatting)", "The padlock means it is safe", "Email links are always safe"],
              answer: 0,
              points: 10,
              explanation: "A single letter swapped in a well-known name (paypal → paypa1) is a classic typosquatting trick.",
            },
          ],
          passRatio: 0.67,
        },
        hints: ["Read the whole domain, not just the brand name in it.", "Ask: did this link come from a trusted source?"],
        explanation: "URLs are the front door of trust. Unknown domains, swapped letters, and unexpected links are all reasons to stay out.",
        xpReward: 12,
      },
      {
        key: "fake-logins",
        order: 2,
        title: "Fake logins and urgency",
        description: "Pressure and demands are phishing tactics.",
        instructions: "Judge these login and email scenarios.",
        objectives: ["Recognize urgency tactics", "Check the real domain of a link"],
        config: {
          kind: "cyber_escape",
          description: "A message pressures you to act immediately.",
          scenario: "A message: 'Your account will be suspended in 24 hours. Verify your login now to keep it.'",
          questions: [
            {
              id: "q1",
              type: "true_false",
              prompt: "Urgent messages that pressure you to act fast are a common phishing tactic.",
              answer: true,
              points: 10,
              explanation: "Phishers create panic so you click before you think. Legitimate services rarely threaten instant suspension via email.",
            },
            {
              id: "q2",
              type: "multiple_choice",
              prompt: "What is the most reliable way to spot a fake login page?",
              options: ["Check the domain in the address bar carefully", "Look at how colorful the page is", "Count how many images it has", "Judge by the font style"],
              answer: 0,
              points: 10,
              explanation: "Design can be copied exactly, but the domain can't lie — read it character by character.",
            },
            {
              id: "q3",
              type: "multiple_choice",
              prompt: "The login link is https://accounts.google.com.evil.example/login. What is suspicious?",
              url: "https://accounts.google.com.evil.example/login",
              options: ["The real domain is evil.example, not google.com", "Nothing — google.com appears in the address", "The https padlock", "The /login path"],
              answer: 0,
              points: 10,
              explanation: "Read from the end: the actual domain is evil.example. 'google.com' is only a subdomain-like prefix designed to fool you.",
            },
          ],
          passRatio: 0.67,
        },
        hints: ["Phishing works by rushing you.", "The true domain is the part right before the first slash after .com/.net/etc."],
        explanation: "Urgency is a tactic, and a lookalike address is the tell. Slow down, read the domain, and go to the site directly.",
        xpReward: 16,
      },
      {
        key: "unsafe-elements",
        order: 3,
        title: "Unsafe web elements",
        description: "Popups, prizes and PIN requests.",
        instructions: "Judge these on-page traps.",
        objectives: ["Identify scam popups", "Protect sensitive data"],
        config: {
          kind: "cyber_escape",
          description: "While browsing, elements start asking for personal data.",
          scenario: "You visit a shopping site and interact with several elements.",
          questions: [
            {
              id: "q1",
              type: "multiple_choice",
              prompt: "A popup says 'Congratulations! You won a free iPhone! Click here to claim it.' This is most likely...",
              options: ["A phishing or scam popup", "A friendly reward from the store", "A browser update"],
              answer: 0,
              points: 10,
              explanation: "Unexpected prize popups that demand a click are a classic scam delivery method.",
            },
            {
              id: "q2",
              type: "true_false",
              prompt: "A page can look exactly like a real login page and still be a phishing trap.",
              answer: true,
              points: 10,
              explanation: "Phishing pages are built to be pixel-perfect copies — appearance alone is not proof of safety.",
            },
            {
              id: "q3",
              type: "multiple_choice",
              prompt: "A form asks for your full bank PIN 'for security verification'. What should you do?",
              options: ["Refuse — legitimate sites never ask for your PIN", "Type it in so they can verify you", "Ask a friend for their PIN instead", "Share it in a comment"],
              answer: 0,
              points: 10,
              explanation: "No legitimate service asks for your PIN, password, or OTP through a web form. That is a guaranteed scam.",
            },
          ],
          passRatio: 0.67,
        },
        hints: ["Real prizes don't knock on your screen.", "Sensitive data like PINs never belongs in a web form."],
        explanation: "Popups that promise prizes, perfect copies of login pages, and requests for PINs or passwords are all signals to leave the page.",
        xpReward: 20,
      },
    ],
  },

  // ─────────────────────────── Website Builder ─────────────────────────────
  {
    game: {
      key: "website-builder",
      slug: "website-builder",
      name: "Website Builder Challenge",
      description: "Build complete mini websites from a written brief. The checker verifies structure, content and styling.",
      kind: "website_builder",
      icon: "🌐",
      color: "#06b6d4",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 15,
      xpReward: 100,
      levelRequirement: 2,
      unlockCriteria: { kind: "lessonsCompleted", count: 10 },
      learningObjectives: ["Build a page from a written brief", "Meet structure and content requirements", "Apply semantic markup"],
      hints: ["Read the brief, then build the skeleton first.", "The checker tells you exactly which checks pass.", "Use semantic elements: header, main, section, footer."],
      badges: [
        { key: "wb-bronze", name: "Site Builder", description: "Beat every Website Builder level", icon: "🥉", requirement: "beat" },
        { key: "wb-gold", name: "Full-Stack Dreamer", description: "Beat every Website Builder level perfectly", icon: "🥇", requirement: "allPerfect" },
      ],
      order: 6,
    },
    levels: [
      {
        key: "about-me",
        order: 1,
        title: "About me page",
        description: "Build a small profile page from the brief.",
        instructions: "Complete the page so it has a heading, a paragraph, a list of 3 skills, an image and a link.",
        objectives: ["Fulfill a written brief", "Use common HTML elements"],
        config: {
          kind: "website_builder",
          description: "A one-section profile page.",
          checkKind: "html_structure",
          checks: [
            { type: "tag", selector: "h1" },
            { type: "tag", selector: "p" },
            { type: "tag", selector: "ul li", min: 3 },
            { type: "tag", selector: "img" },
            { type: "attribute", selector: "img", attr: "src" },
            { type: "tag", selector: "a" },
          ],
          requiredRatio: 1,
          starterCode: `<!DOCTYPE html>
<html>
  <body>
    <h1>Ada Lovelace</h1>
    <!-- TODO: add a paragraph about yourself,
         a list of 3 skills, an image, and a link -->
  </body>
</html>`,
        },
        hints: ["A paragraph uses <p>", "An image needs a src attribute.", "A link uses <a href=...>."],
        explanation: "The brief needed a heading, paragraph, 3-item list, image with a source, and a link — all six checks pass.",
        xpReward: 20,
      },
      {
        key: "recipe-page",
        order: 2,
        title: "Recipe page",
        description: "Style a recipe card to match the brief.",
        instructions: "Write the CSS so the recipe card looks warm, soft and rounded per the brief.",
        objectives: ["Style by class selector", "Match a design brief with CSS"],
        config: {
          kind: "website_builder",
          description: "A warm cream recipe card with a dark brown title.",
          checkKind: "css_check",
          checks: [
            { type: "property", selector: ".card", property: "background-color", value: "#fffaf0" },
            { type: "property", selector: ".card", property: "border-radius", value: "12px" },
            { type: "property", selector: ".card", property: "max-width", value: "400px" },
            { type: "property", selector: ".card h2", property: "color", value: "#6b4226" },
            { type: "property", selector: ".card p", property: "line-height", value: "1.6" },
          ],
          requiredRatio: 1,
          starterCode: `/* Make the card warm and rounded:
   - .card: cream background (#fffaf0), 12px radius, max-width 400px
   - .card h2: dark brown color (#6b4226)
   - .card p: line-height 1.6 */
.card {

}

.card h2 {

}

.card p {

}`,
        },
        hints: ["Each property goes inside the right selector's braces.", "Values must match the brief exactly."],
        explanation: "The brief mapped to five CSS checks — a cream, rounded, width-limited card with a brown title and airy paragraph text.",
        xpReward: 30,
      },
      {
        key: "landing-page",
        order: 3,
        title: "Landing page",
        description: "Assemble a full landing page skeleton.",
        instructions: "Build the skeleton: header with nav, main with a section and heading, and a footer with a button and links.",
        objectives: ["Use semantic layout tags", "Combine many elements in one page"],
        config: {
          kind: "website_builder",
          description: "A semantic one-page landing skeleton.",
          checkKind: "html_structure",
          checks: [
            { type: "tag", selector: "header" },
            { type: "tag", selector: "nav" },
            { type: "tag", selector: "nav a", min: 2 },
            { type: "tag", selector: "main" },
            { type: "tag", selector: "section" },
            { type: "tag", selector: "h1" },
            { type: "tag", selector: "button" },
            { type: "tag", selector: "footer" },
          ],
          requiredRatio: 1,
          starterCode: `<!DOCTYPE html>
<html>
  <head><title>Landing</title></head>
  <body>
    <!-- TODO: header > nav (2 links), main > section > h1,
         and a footer with a button -->
  </body>
</html>`,
        },
        hints: ["header, main and footer are siblings inside body.", "nav lives inside the header; the button lives in the footer."],
        explanation: "A semantic landing page: header with nav links, main with a section and heading, and a footer with a call-to-action button.",
        xpReward: 40,
      },
    ],
  },
];

// ─────────────────────────── World boss games ───────────────────────────────
//
// Single-level boss battles for worlds that don't ship a dedicated game yet.
// Each is a cyber_escape-style gauntlet of true/false questions. Assignments
// (which world, isBoss, certificate title) live in WORLD_ASSIGNMENTS below.

type BossQuestion = { id: string; type: "true_false"; prompt: string; answer: boolean; points: number; explanation: string };

function bossLevel(key: string, title: string, description: string, scenario: string, questions: BossQuestion[], instructions?: string) {
  return {
    key,
    order: 1,
    title,
    description,
    instructions: instructions ?? "Answer every question to defeat the world boss. You need at least 80% to win.",
    objectives: ["Demonstrate mastery of this world's core topic", "Answer the boss's challenge correctly"],
    config: { kind: "cyber_escape", scenario, questions, passRatio: 0.8 },
    hints: ["Read each statement carefully — watch for 'always', 'never' and double negatives."],
    explanation: "Boss defeated. Mastery points, a world certificate and bonus XP/coins are on the way!",
    xpReward: 40,
  } as GameLevelSeed;
}

function bossGame(key: string, name: string, description: string, icon: string, color: string, order: number, level: GameLevelSeed) {
  return {
    game: {
      key,
      slug: key,
      name,
      description,
      kind: "cyber_escape",
      icon,
      color,
      difficulty: order <= 3 ? "BEGINNER" : order <= 6 ? "INTERMEDIATE" : "ADVANCED",
      estimatedMinutes: 6,
      xpReward: 30,
      levelRequirement: 1,
      unlockCriteria: null,
      learningObjectives: ["Defeat the world boss to unlock the next world", "Apply everything learned in this world"],
      hints: ["Bosses check your fundamentals — the whole world in one challenge."],
      badges: [
        { key: `${key}-boss`, name: `${name}`, description: "Defeat this world boss", icon: "👹", requirement: "beat" },
      ],
      order,
    },
    levels: [level],
  } as const;
}

const WORLD_BOSS_SEEDS = [
  bossGame(
    "css-boss",
    "CSS Boss: Style Clash",
    "A brutal mix of specificity, the box model and selectors. Show the boss who really styles the web.",
    "🎨",
    "#3b82f6",
    2,
    bossLevel("style-clash", "Style Clash", "The boss throws conflicting rules at you.", "The Style Clash arena flickers between red and blue borders. Only one rule set wins.",
      [
        { id: "q1", type: "true_false", prompt: "An id selector (e.g. #header) has higher specificity than a class selector (e.g. .header).", answer: true, points: 10, explanation: "IDs beat classes in the specificity war." },
        { id: "q2", type: "true_false", prompt: "The box model, from outside in, is: border, margin, padding, content.", answer: false, points: 10, explanation: "It's margin, then border, then padding, then content." },
        { id: "q3", type: "true_false", prompt: "!important overrides any other declaration regardless of specificity.", answer: true, points: 10, explanation: "!important wins over normal declarations (except inline important, which wins over it)." },
        { id: "q4", type: "true_false", prompt: "Padding is the space between two elements; margin is space inside an element's border.", answer: false, points: 10, explanation: "Reversed: margin is between elements, padding is inside the border." },
        { id: "q5", type: "true_false", prompt: "Flexbox lays out items along a single main axis.", answer: true, points: 10, explanation: "Flexbox is one-dimensional; Grid is two-dimensional." },
      ]
    )
  ),
  bossGame(
    "responsive-boss",
    "Responsive Boss: Breakpoint Wars",
    "Media queries, flexible layouts and mobile-first thinking. Defeat the boss on every screen size.",
    "📱",
    "#22c55e",
    4,
    bossLevel("breakpoint-wars", "Breakpoint Wars", "The layout changes size — and so does the challenge.", "Your page must survive phones, tablets and desktops. Choose your CSS wisely.", 
      [
        { id: "q1", type: "true_false", prompt: "A mobile-first approach starts with styles for small screens and adds larger-screen styles with min-width queries.", answer: true, points: 10, explanation: "Mobile-first = base styles for mobile, then enhance upwards with min-width." },
        { id: "q2", type: "true_false", prompt: "The viewport meta tag is optional for responsive pages.", answer: false, points: 10, explanation: "Without <meta name=\"viewport\">, mobile browsers assume a wide desktop width." },
        { id: "q3", type: "true_false", prompt: "em units are relative to the root element's font size; rem units are relative to the parent.", answer: false, points: 10, explanation: "Reversed: rem is relative to the root, em to the parent." },
        { id: "q4", type: "true_false", prompt: "@media (min-width: 768px) applies when the viewport is 768px or wider.", answer: true, points: 10, explanation: "min-width means the rule applies at and above that width." },
        { id: "q5", type: "true_false", prompt: "Using flexible units like % , fr or vw instead of fixed pixels is the core of fluid layouts.", answer: true, points: 10, explanation: "Fixed pixel widths break on smaller screens; flexible units adapt." },
      ]
    )
  ),
  bossGame(
    "git-boss",
    "Git Boss: Merge Conflict",
    "Branches diverge, history forks and only a true version-control master can merge them.",
    "🌿",
    "#f97316",
    5,
    bossLevel("merge-conflict", "Merge Conflict", "Two branches edited the same file. Resolve it or never ship.", "You and a teammate changed README.md in different ways. The repository awaits your merge.",
      [
        { id: "q1", type: "true_false", prompt: "git pull fetches remote changes and merges them into your current branch.", answer: true, points: 10, explanation: "pull = fetch + merge (or rebase, depending on config)." },
        { id: "q2", type: "true_false", prompt: "A merge conflict happens when two branches change different files.", answer: false, points: 10, explanation: "Conflicts occur when the same lines/files are changed differently." },
        { id: "q3", type: "true_false", prompt: "git add stages changes, then git commit records them in history.", answer: true, points: 10, explanation: "The two-step dance: stage, then commit." },
        { id: "q4", type: "true_false", prompt: "git checkout -b feature creates a new branch and switches to it.", answer: true, points: 10, explanation: "-b = create branch and check it out in one command." },
        { id: "q5", type: "true_false", prompt: "Committing directly to main on a team project is usually a bad idea.", answer: true, points: 10, explanation: "Feature branches + pull requests keep main stable." },
      ]
    )
  ),
  bossGame(
    "backend-boss",
    "Backend Boss: Server Showdown",
    "HTTP, routing and the dark art of the server side. Show the boss who owns the stack.",
    "🖥️",
    "#8b5cf6",
    6,
    bossLevel("server-showdown", "Server Showdown", "The server won't answer requests it doesn't like.", "A new endpoint keeps returning 500s. Only a backend mind can route around the damage.",
      [
        { id: "q1", type: "true_false", prompt: "A server handles HTTP requests and sends back responses to clients.", answer: true, points: 10, explanation: "That's the core server job." },
        { id: "q2", type: "true_false", prompt: "GET requests are intended to change server state; POST requests are for reading.", answer: false, points: 10, explanation: "Reversed: GET reads, POST creates/changes." },
        { id: "q3", type: "true_false", prompt: "Middleware in Express runs between receiving a request and sending the response.", answer: true, points: 10, explanation: "Middleware processes request/response in the chain." },
        { id: "q4", type: "true_false", prompt: "Secret keys and passwords should be hardcoded in the source code for simplicity.", answer: false, points: 10, explanation: "Secrets belong in environment variables, never in code." },
        { id: "q5", type: "true_false", prompt: "An HTTP 200 status means the request succeeded.", answer: true, points: 10, explanation: "2xx = success, 4xx = client error, 5xx = server error." },
      ]
    )
  ),
  bossGame(
    "database-boss",
    "Database Boss: Data Warden",
    "Tables, keys and queries. Guard the data — or the database guard will get you.",
    "🗄️",
    "#14b8a6",
    7,
    bossLevel("data-warden", "Data Warden", "The schema is the gatekeeper. Choose the right keys.", "A query is running full-table scans and the index is starving. Restore order to the data.",
      [
        { id: "q1", type: "true_false", prompt: "A primary key uniquely identifies each row in a table.", answer: true, points: 10, explanation: "Primary keys are unique and non-null by definition." },
        { id: "q2", type: "true_false", prompt: "A foreign key links a column in one table to a primary key in another table.", answer: true, points: 10, explanation: "Foreign keys model relationships between tables." },
        { id: "q3", type: "true_false", prompt: "SELECT * FROM users returns every row in the users table.", answer: true, points: 10, explanation: "Without a WHERE clause, SELECT * returns all rows." },
        { id: "q4", type: "true_false", prompt: "Normalization is about making tables bigger by duplicating data.", answer: false, points: 10, explanation: "Normalization reduces duplication to keep data consistent." },
        { id: "q5", type: "true_false", prompt: "An index speeds up lookups on a column at the cost of slower writes.", answer: true, points: 10, explanation: "Indexes trade write speed for read speed." },
      ]
    )
  ),
  bossGame(
    "api-boss",
    "API Boss: Endpoint Guardian",
    "REST endpoints, JSON and status codes. Only an API master passes the gate.",
    "🔌",
    "#f59e0b",
    9,
    bossLevel("endpoint-guardian", "Endpoint Guardian", "Every request must meet the contract.", "The client sends a POST but the API expects a body with a missing token. The gate stays shut.",
      [
        { id: "q1", type: "true_false", prompt: "REST APIs typically exchange data in JSON.", answer: true, points: 10, explanation: "JSON is the lingua franca of modern APIs." },
        { id: "q2", type: "true_false", prompt: "PUT is the HTTP verb for reading data from a resource.", answer: false, points: 10, explanation: "PUT updates/replaces a resource; GET reads." },
        { id: "q3", type: "true_false", prompt: "A 404 status means the requested resource was not found.", answer: true, points: 10, explanation: "404 = Not Found." },
        { id: "q4", type: "true_false", prompt: "Authorization tokens should be sent in the URL's query string for convenience.", answer: false, points: 10, explanation: "Tokens go in headers (e.g. Authorization), never in the URL." },
        { id: "q5", type: "true_false", prompt: "An API endpoint like GET /api/users/42 returns the user with id 42.", answer: true, points: 10, explanation: "Path parameters select a specific resource." },
      ]
    )
  ),
  bossGame(
    "fullstack-boss",
    "Full Stack Boss: Grand Deploy",
    "Frontend, backend, database — all of it, wired together and shipped. The final gate.",
    "🚀",
    "#ef4444",
    10,
    bossLevel("grand-deploy", "Grand Deploy", "Everything must connect, build and deploy.", "The build fails on the server but passes locally. Trace the whole stack to ship it.",
      [
        { id: "q1", type: "true_false", prompt: "A full-stack app connects a frontend, a backend and a database.", answer: true, points: 10, explanation: "All three tiers working together." },
        { id: "q2", type: "true_false", prompt: "The frontend talks to the backend over HTTP using API calls.", answer: true, points: 10, explanation: "fetch/AJAX across the frontend-backend boundary." },
        { id: "q3", type: "true_false", prompt: "Environment variables can differ between local development and production.", answer: true, points: 10, explanation: "That's exactly why secrets/config live in env vars." },
        { id: "q4", type: "true_false", prompt: "A build that works locally will always work in production unchanged.", answer: false, points: 10, explanation: "Differing envs, paths and dependencies can break production." },
        { id: "q5", type: "true_false", prompt: "CI/CD automatically runs checks and deploys when you push code.", answer: true, points: 10, explanation: "Continuous integration + continuous delivery." },
      ]
    )
  ),
];

// ---------------------------------------------------------------------------
// Programming Worlds
// ---------------------------------------------------------------------------

type WorldSeed = {
  key: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  difficulty: string;
  order: number;
  courseSlugs: string[];
  unlockCriteria: Record<string, unknown> | null;
  rewardXp: number;
  rewardCoins: number;
};

const WORLD_SEEDS: WorldSeed[] = [
  {
    key: "html",
    slug: "html",
    name: "HTML Fundamentals",
    description: "Learn the skeleton of every web page — tags, attributes and document structure.",
    icon: "🧱",
    color: "#ef4444",
    difficulty: "BEGINNER",
    order: 1,
    courseSlugs: ["html-fundamentals"],
    unlockCriteria: null,
    rewardXp: 60,
    rewardCoins: 30,
  },
  {
    key: "css",
    slug: "css",
    name: "CSS Styling",
    description: "Paint the web — selectors, the box model, colors and layout.",
    icon: "🎨",
    color: "#3b82f6",
    difficulty: "BEGINNER",
    order: 2,
    courseSlugs: ["css-styling"],
    unlockCriteria: { kind: "worldCompleted", worldKey: "html" },
    rewardXp: 60,
    rewardCoins: 30,
  },
  {
    key: "javascript",
    slug: "javascript",
    name: "JavaScript",
    description: "Make pages think — variables, functions, loops and logic.",
    icon: "🧠",
    color: "#f59e0b",
    difficulty: "BEGINNER",
    order: 3,
    courseSlugs: ["javascript-basics"],
    unlockCriteria: { kind: "worldCompleted", worldKey: "css" },
    rewardXp: 60,
    rewardCoins: 30,
  },
  {
    key: "responsive",
    slug: "responsive-design",
    name: "Responsive Design",
    description: "Design once, work everywhere — media queries, flexible units and mobile-first thinking.",
    icon: "📱",
    color: "#22c55e",
    difficulty: "INTERMEDIATE",
    order: 4,
    courseSlugs: [],
    unlockCriteria: { kind: "worldCompleted", worldKey: "javascript" },
    rewardXp: 80,
    rewardCoins: 40,
  },
  {
    key: "git",
    slug: "git-github",
    name: "Git & GitHub",
    description: "Version control that makes collaboration safe — commits, branches and merges.",
    icon: "🌿",
    color: "#f97316",
    difficulty: "INTERMEDIATE",
    order: 5,
    courseSlugs: [],
    unlockCriteria: { kind: "worldCompleted", worldKey: "responsive" },
    rewardXp: 80,
    rewardCoins: 40,
  },
  {
    key: "backend",
    slug: "backend-development",
    name: "Backend Development",
    description: "The server side of the stack — HTTP, routing and APIs that power your pages.",
    icon: "🖥️",
    color: "#8b5cf6",
    difficulty: "INTERMEDIATE",
    order: 6,
    courseSlugs: [],
    unlockCriteria: { kind: "worldCompleted", worldKey: "git" },
    rewardXp: 80,
    rewardCoins: 40,
  },
  {
    key: "databases",
    slug: "databases",
    name: "Databases",
    description: "Store, query and relate data — tables, keys, indexes and SQL.",
    icon: "🗄️",
    color: "#14b8a6",
    difficulty: "ADVANCED",
    order: 7,
    courseSlugs: [],
    unlockCriteria: { kind: "worldCompleted", worldKey: "backend" },
    rewardXp: 100,
    rewardCoins: 50,
  },
  {
    key: "cybersecurity",
    slug: "cybersecurity",
    name: "Cybersecurity",
    description: "Protect users and data — threats, hardening and security fundamentals.",
    icon: "🛡️",
    color: "#0ea5e9",
    difficulty: "ADVANCED",
    order: 8,
    courseSlugs: [],
    unlockCriteria: { kind: "worldCompleted", worldKey: "databases" },
    rewardXp: 100,
    rewardCoins: 50,
  },
  {
    key: "api",
    slug: "api-development",
    name: "API Development",
    description: "Design, build and consume APIs — REST, JSON, status codes and authentication.",
    icon: "🔌",
    color: "#f59e0b",
    difficulty: "ADVANCED",
    order: 9,
    courseSlugs: [],
    unlockCriteria: { kind: "worldCompleted", worldKey: "cybersecurity" },
    rewardXp: 100,
    rewardCoins: 50,
  },
  {
    key: "fullstack",
    slug: "full-stack-projects",
    name: "Full Stack Projects",
    description: "Ship it — wire frontend to backend to database, deploy and maintain real projects.",
    icon: "🚀",
    color: "#ef4444",
    difficulty: "ADVANCED",
    order: 10,
    courseSlugs: [],
    unlockCriteria: { kind: "worldCompleted", worldKey: "api" },
    rewardXp: 120,
    rewardCoins: 60,
  },
];

// Which game is the boss of which world (+ certificate title it mints).
const WORLD_ASSIGNMENTS: Record<string, { worldKey: string; isBoss: boolean; rewardCoins: number; certificateTitle?: string }> = {
  "html-builder": { worldKey: "html", isBoss: false, rewardCoins: 0 },
  "website-builder": { worldKey: "html", isBoss: true, rewardCoins: 60, certificateTitle: "HTML Fundamentals Master" },
  "css-painter": { worldKey: "css", isBoss: false, rewardCoins: 0 },
  "css-boss": { worldKey: "css", isBoss: true, rewardCoins: 60, certificateTitle: "CSS Styling Master" },
  "js-logic": { worldKey: "javascript", isBoss: false, rewardCoins: 0 },
  "bug-hunter": { worldKey: "javascript", isBoss: true, rewardCoins: 60, certificateTitle: "JavaScript Master" },
  "responsive-boss": { worldKey: "responsive", isBoss: true, rewardCoins: 60, certificateTitle: "Responsive Design Master" },
  "git-boss": { worldKey: "git", isBoss: true, rewardCoins: 60, certificateTitle: "Git & GitHub Master" },
  "backend-boss": { worldKey: "backend", isBoss: true, rewardCoins: 60, certificateTitle: "Backend Master" },
  "database-boss": { worldKey: "databases", isBoss: true, rewardCoins: 60, certificateTitle: "Database Master" },
  "cyber-escape": { worldKey: "cybersecurity", isBoss: true, rewardCoins: 60, certificateTitle: "Cybersecurity Guardian" },
  "api-boss": { worldKey: "api", isBoss: true, rewardCoins: 60, certificateTitle: "API Master" },
  "fullstack-boss": { worldKey: "fullstack", isBoss: true, rewardCoins: 60, certificateTitle: "Full Stack Master" },
};

async function seedWorlds() {
  for (const w of WORLD_SEEDS) {
    await prisma.world.upsert({
      where: { key: w.key },
      create: {
        key: w.key,
        slug: w.slug,
        name: w.name,
        description: w.description,
        icon: w.icon,
        color: w.color,
        difficulty: w.difficulty,
        order: w.order,
        courseSlugs: w.courseSlugs,
        unlockCriteria: w.unlockCriteria as never,
        rewardXp: w.rewardXp,
        rewardCoins: w.rewardCoins,
        isActive: true,
      },
      update: {
        slug: w.slug,
        name: w.name,
        description: w.description,
        icon: w.icon,
        color: w.color,
        difficulty: w.difficulty,
        order: w.order,
        courseSlugs: w.courseSlugs,
        unlockCriteria: w.unlockCriteria as never,
        rewardXp: w.rewardXp,
        rewardCoins: w.rewardCoins,
      },
    });
  }
}

async function seedGames() {
  const worldByKey = new Map((await prisma.world.findMany()).map((w) => [w.key, w.id]));
  for (const { game, levels } of [...GAME_SEEDS, ...WORLD_BOSS_SEEDS]) {
    const created = await prisma.game.upsert({
      where: { slug: game.slug },
      create: {
        key: game.key,
        slug: game.slug,
        name: game.name,
        description: game.description,
        kind: game.kind,
        icon: game.icon,
        color: game.color,
        difficulty: game.difficulty,
        estimatedMinutes: game.estimatedMinutes,
        xpReward: game.xpReward,
        levelRequirement: game.levelRequirement,
        unlockCriteria: game.unlockCriteria as never,
        learningObjectives: game.learningObjectives,
        hints: game.hints,
        badges: game.badges as never,
        order: game.order,
      },
      update: {
        name: game.name,
        description: game.description,
        kind: game.kind,
        icon: game.icon,
        color: game.color,
        difficulty: game.difficulty,
        estimatedMinutes: game.estimatedMinutes,
        xpReward: game.xpReward,
        levelRequirement: game.levelRequirement,
        unlockCriteria: game.unlockCriteria as never,
        learningObjectives: game.learningObjectives,
        hints: game.hints,
        badges: game.badges as never,
        order: game.order,
      },
    });

    for (const level of levels) {
      await prisma.gameLevel.upsert({
        where: { gameId_key: { gameId: created.id, key: level.key } },
        create: {
          gameId: created.id,
          key: level.key,
          order: level.order,
          title: level.title,
          description: level.description,
          instructions: level.instructions,
          objectives: level.objectives,
          config: level.config as never,
          hints: level.hints,
          explanation: level.explanation,
          xpReward: level.xpReward,
        },
        update: {
          order: level.order,
          title: level.title,
          description: level.description,
          instructions: level.instructions,
          objectives: level.objectives,
          config: level.config as never,
          hints: level.hints,
          explanation: level.explanation,
          xpReward: level.xpReward,
        },
      });
    }

    const assignment = WORLD_ASSIGNMENTS[game.slug];
    if (assignment) {
      const worldId = worldByKey.get(assignment.worldKey) ?? null;
      await prisma.game.update({
        where: { id: created.id },
        data: {
          worldId,
          isBoss: assignment.isBoss,
          rewardCoins: assignment.rewardCoins,
          certificateTitle: assignment.certificateTitle ?? null,
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Upsert helpers
// ---------------------------------------------------------------------------

async function upsertLesson(moduleId: string, courseId: string, data: {
  slug: string;
  title: string;
  description?: string;
  objectives: string[];
  difficulty: string;
  estimatedMinutes: number;
  order: number;
  content: unknown;
}) {
  return prisma.lesson.upsert({
    where: { moduleId_slug: { moduleId, slug: data.slug } },
    create: {
      moduleId,
      courseId,
      slug: data.slug,
      title: data.title,
      description: data.description ?? null,
      summary: data.description ?? null,
      objectives: data.objectives,
      difficulty: data.difficulty,
      estimatedMinutes: data.estimatedMinutes,
      order: data.order,
      content: data.content as never,
      xpReward: 20,
      isPublished: true,
    },
    update: {
      title: data.title,
      description: data.description ?? null,
      objectives: data.objectives,
      difficulty: data.difficulty,
      estimatedMinutes: data.estimatedMinutes,
      order: data.order,
      content: data.content as never,
      isPublished: true,
    },
  });
}

async function upsertExercise(courseId: string, lessonId: string, data: {
  key: string;
  type: string;
  title: string;
  instructions: string;
  starterCode: string;
  solution?: string;
  hints?: string[];
  config: Record<string, unknown>;
  points: number;
  order: number;
}) {
  return prisma.exercise.upsert({
    where: { key: data.key },
    create: { ...data, lessonId, config: data.config as never, hints: data.hints ?? [], solution: data.solution ?? "", starterCode: data.starterCode || null },
    update: { ...data, lessonId, config: data.config as never, hints: data.hints ?? [], solution: data.solution ?? "" },
  });
}

async function upsertQuiz(
  lessonId: string,
  courseId: string,
  data: {
    key: string;
    title: string;
    description: string;
    passScore: number;
    timeLimit: number | null;
    order: number;
    questions: Array<{
      type: string;
      prompt: string;
      options?: string[];
      answer?: unknown;
      blanks?: unknown[];
      items?: string[];
      left?: string[];
      right?: string[];
      points: number;
      order: number;
      explanation?: string;
    }>;
  },
) {
  const quiz = await prisma.quiz.upsert({
    where: { key: data.key },
    create: {
      key: data.key,
      lessonId,
      courseId,
      title: data.title,
      description: data.description,
      passScore: data.passScore,
      timeLimit: data.timeLimit,
      points: 50,
      order: data.order,
      isPublished: true,
    },
    update: { title: data.title, description: data.description, passScore: data.passScore, timeLimit: data.timeLimit, order: data.order },
  });

  for (const [i, q] of data.questions.entries()) {
    const config: Record<string, unknown> = {};
    if (q.options) config.options = q.options;
    if (q.answer !== undefined) config.answer = q.answer;
    if (q.blanks) config.blanks = q.blanks;
    if (q.items) config.items = q.items;
    if (q.left) config.left = q.left;
    if (q.right) config.right = q.right;

    await prisma.quizQuestion.upsert({
      where: { id: `${quiz.key}-q${i + 1}` },
      create: { id: `${quiz.key}-q${i + 1}`, quizId: quiz.id, type: q.type, prompt: q.prompt, points: q.points, order: q.order, explanation: q.explanation ?? null, config: config as never },
      update: { type: q.type, prompt: q.prompt, points: q.points, order: q.order, explanation: q.explanation ?? null, config: config as never },
    });
  }

  return quiz;
}

async function upsertProject(courseId: string, data: {
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  requirements: string[];
  starterCode: string;
  config: Record<string, unknown>;
  xpReward: number;
  order: number;
}) {
  return prisma.project.upsert({
    where: { courseId_slug: { courseId, slug: data.slug } },
    create: { ...data, courseId, requirements: data.requirements, config: data.config as never },
    update: { ...data, courseId, requirements: data.requirements, config: data.config as never },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding CodeSphere�?�");
  await upsertUser();
  await upsertAchievements();
  await upsertProgression();
  const { webDev, networking } = await upsertCatalog();

  await seedHtmlCourse(webDev.id);
  await seedCssCourse(webDev.id);
  await seedJsCourse(webDev.id);
  await seedAiCourse(webDev.id);
  await seedNetworkingCourse(networking.id);
  await seedWorlds();
  await seedGames();

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
