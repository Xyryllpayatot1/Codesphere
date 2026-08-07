// ---------------------------------------------------------------------------
// Achievement rule engine. Criteria are pure data (stored on the Achievement
// row) and evaluated deterministically against a user-stats snapshot — no AI.
// ---------------------------------------------------------------------------

export type UserStats = {
  xp: number;
  level: number;
  streak: number;
  lessonsCompleted: number;
  exercisesPassed: number;
  quizzesPassed: number;
  quizAttempts: number;
  quizPerfect: number;
  projectsSubmitted: number;
  projectsApproved: number;
  studyDays: number;
  studyMinutes: number;
  linesOfCode: number;
  coinsEarned: number;
  certificatesEarned: number;
  coursesCompleted: string[]; // course slugs
  gamesBeaten: string[]; // game slugs with every level beaten
  gameLevelsBeaten: number;
  gameLevelsPerfect: number;
  titlesOwned: number;
  missionsCompleted: number;
  storeItemsOwned: number;
  worldsMastered: string[]; // world keys with boss defeated + mastery >= threshold
  bossesDefeated: string[]; // world keys whose boss has been defeated
  worldCertificatesEarned: number;
};

export type AchievementCriteria =
  | { kind: "lessonsCompleted"; count: number }
  | { kind: "exercisesPassed"; count: number }
  | { kind: "quizzesPassed"; count: number }
  | { kind: "quizAttempts"; count: number }
  | { kind: "quizPerfect"; count: number }
  | { kind: "projectsSubmitted"; count: number }
  | { kind: "projectsApproved"; count: number }
  | { kind: "streakReached"; days: number }
  | { kind: "levelReached"; level: number }
  | { kind: "xpReached"; xp: number }
  | { kind: "studyDays"; count: number }
  | { kind: "studyMinutes"; minutes: number }
  | { kind: "linesOfCode"; count: number }
  | { kind: "coinsEarned"; count: number }
  | { kind: "titlesOwned"; count: number }
  | { kind: "missionsCompleted"; count: number }
  | { kind: "storeItemsOwned"; count: number }
  | { kind: "certificatesEarned"; count: number }
  | { kind: "courseCompleted"; slug?: string }
  | { kind: "gameBeaten"; slug: string }
  | { kind: "gamesBeaten"; count: number }
  | { kind: "gameLevelsBeaten"; count: number }
  | { kind: "gamePerfectLevels"; count: number }
  | { kind: "worldMastered"; worldKey?: string }
  | { kind: "bossDefeated"; worldKey: string }
  | { kind: "worldCertificatesEarned"; count: number }
  | { kind: "allOf"; criteria: AchievementCriteria[] }
  | { kind: "anyOf"; criteria: AchievementCriteria[] };

export function evaluateCriteria(criteria: AchievementCriteria, stats: UserStats): boolean {
  switch (criteria.kind) {
    case "lessonsCompleted":
      return stats.lessonsCompleted >= criteria.count;
    case "exercisesPassed":
      return stats.exercisesPassed >= criteria.count;
    case "quizzesPassed":
      return stats.quizzesPassed >= criteria.count;
    case "quizAttempts":
      return stats.quizAttempts >= criteria.count;
    case "quizPerfect":
      return stats.quizPerfect >= criteria.count;
    case "projectsSubmitted":
      return stats.projectsSubmitted >= criteria.count;
    case "projectsApproved":
      return stats.projectsApproved >= criteria.count;
    case "streakReached":
      return stats.streak >= criteria.days;
    case "levelReached":
      return stats.level >= criteria.level;
    case "xpReached":
      return stats.xp >= criteria.xp;
    case "studyDays":
      return stats.studyDays >= criteria.count;
    case "studyMinutes":
      return stats.studyMinutes >= criteria.minutes;
    case "linesOfCode":
      return stats.linesOfCode >= criteria.count;
    case "coinsEarned":
      return stats.coinsEarned >= criteria.count;
    case "titlesOwned":
      return stats.titlesOwned >= criteria.count;
    case "missionsCompleted":
      return stats.missionsCompleted >= criteria.count;
    case "storeItemsOwned":
      return stats.storeItemsOwned >= criteria.count;
    case "certificatesEarned":
      return stats.certificatesEarned >= criteria.count;
    case "courseCompleted":
      return criteria.slug ? stats.coursesCompleted.includes(criteria.slug) : stats.coursesCompleted.length > 0;
    case "gameBeaten":
      return stats.gamesBeaten.includes(criteria.slug);
    case "gamesBeaten":
      return stats.gamesBeaten.length >= criteria.count;
    case "gameLevelsBeaten":
      return stats.gameLevelsBeaten >= criteria.count;
    case "gamePerfectLevels":
      return stats.gameLevelsPerfect >= criteria.count;
    case "worldMastered":
      return criteria.worldKey ? stats.worldsMastered.includes(criteria.worldKey) : stats.worldsMastered.length > 0;
    case "bossDefeated":
      return stats.bossesDefeated.includes(criteria.worldKey);
    case "worldCertificatesEarned":
      return stats.worldCertificatesEarned >= criteria.count;
    case "allOf":
      return criteria.criteria.every((c) => evaluateCriteria(c, stats));
    case "anyOf":
      return criteria.criteria.some((c) => evaluateCriteria(c, stats));
    default:
      return false;
  }
}
