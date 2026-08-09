import Link from "next/link";
import {
  Award,
  BookCheck,
  Clock3,
  Coins,
  Crown,
  Flame,
  FolderCheck,
  Gamepad2,
  GraduationCap,
  Map as MapIcon,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { levelFromXp } from "@/lib/engine/xp";
import { nextUnlock, unlocksAtLevel } from "@/lib/engine/levels";
import { loadWorldMap } from "@/lib/engine/worlds";
import { MAX_LEVEL } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { SettingsForm } from "@/components/profile/settings-form";
import { TitlesClient } from "@/components/profile/titles-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSession();
  const userId = session.id;

  const [user, settings, stats, achievements, certificates, gameProgress, purchases, worlds, titlesRows, ownedRows] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, include: { title: true } }),
      prisma.userSetting.findUnique({ where: { userId } }),
      Promise.all([
        prisma.lessonProgress.count({ where: { userId, status: "COMPLETED" } }),
        prisma.enrollment.count({ where: { userId, status: "COMPLETED" } }),
        prisma.projectSubmission.count({ where: { userId, status: "APPROVED" } }),
        prisma.exerciseSubmission.count({ where: { userId, passed: true } }),
        prisma.quizAttempt.count({ where: { userId, passed: true } }),
        prisma.quizAttempt.count({ where: { userId } }),
        prisma.studySession.aggregate({ where: { userId }, _sum: { durationSeconds: true } }),
        prisma.userAchievement.count({ where: { userId } }),
      ]),
      prisma.userAchievement.findMany({
        where: { userId },
        orderBy: { earnedAt: "desc" },
        take: 6,
        include: { achievement: { select: { name: true, icon: true, description: true } } },
      }),
      prisma.certificate.count({ where: { userId } }),
      prisma.gameProgress.count({ where: { userId, status: { in: ["BEATEN", "PERFECT"] } } }),
      prisma.userPurchase.count({ where: { userId } }),
      loadWorldMap(userId),
      prisma.title.findMany({ where: { isActive: true }, orderBy: [{ order: "asc" }] }),
      prisma.userTitle.findMany({ where: { userId }, select: { titleId: true } }),
    ]);

  if (!user) return null;

  const currentWorld = worlds.find((w) => w.isCurrent) ?? null;
  const worldsMastered = worlds.filter((w) => w.mastered).length;

  const ownedIds = new Set(ownedRows.map((o) => o.titleId));
  const titleData = {
    titles: titlesRows.map((t) => ({
      title: {
        key: t.key,
        name: t.name,
        description: t.description,
        icon: t.icon,
        rarity: t.rarity,
        unlockType: t.unlockType,
        price: t.price,
      },
      owned: ownedIds.has(t.id),
      equipped: user.titleId === t.id,
    })),
    equippedKey: user.titleId,
    equipped: user.title ?? null,
  };

  const lv = levelFromXp(user.xp);
  const [lessons, courses, projects, , quizPassed, quizAttempts, studyAgg] = stats;
  const accuracy = quizAttempts > 0 ? Math.round((quizPassed / quizAttempts) * 100) : 0;
  const hours = Math.round((studyAgg._sum.durationSeconds ?? 0) / 3600);
  const next = nextUnlock(lv.level);
  const earnedUnlocks = unlocksAtLevel(lv.level).slice(0, 3);
  const atCap = lv.level >= MAX_LEVEL;

  const equippedTitle = titleData.equipped
    ? { key: titleData.equipped.key, name: titleData.equipped.name, description: titleData.equipped.description, icon: titleData.equipped.icon, rarity: titleData.equipped.rarity, unlockType: titleData.equipped.unlockType, price: titleData.equipped.price }
    : null;

  const overview = (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-5 pt-6">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent text-2xl font-bold text-accent-foreground">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">
              {user.name}
              {equippedTitle && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
                  <Crown className="h-3.5 w-3.5" /> {equippedTitle.icon} {equippedTitle.name}
                </span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            {user.bio && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{user.bio}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="flex items-center gap-1 text-2xl font-bold">
              <Zap className="h-5 w-5 text-primary" /> {user.xp.toLocaleString()}
              <span className="text-sm font-medium text-muted-foreground">XP</span>
            </p>
            <p className="flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-600">
              <Coins className="h-4 w-4" /> {user.coins.toLocaleString()} coins
            </p>
            <p className="text-xs text-muted-foreground">Level {lv.level}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="flex items-center justify-between text-sm">
            <p className="font-medium">
              {atCap ? "Maximum level reached — the myth!" : `Level ${lv.level} → ${lv.level + 1}`}
            </p>
            <p className="text-muted-foreground">
              {atCap ? (
                "You've reached the top."
              ) : (
                <>
                  {lv.current.toLocaleString()} / {lv.needed.toLocaleString()} XP to Level {lv.level + 1}
                </>
              )}
            </p>
          </div>
          <Progress value={Math.round(lv.progress * 100)} className="h-2.5" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="h-3.5 w-3.5 text-orange-500" /> {user.streak}-day streak · best {user.longestStreak}
            </p>
            {next ? (
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Next unlock at level {next.level}: {next.icon} {next.title}
              </p>
            ) : (
              <p className="inline-flex items-center gap-1 text-xs text-success">
                <Award className="h-3.5 w-3.5" /> Everything unlocked
              </p>
            )}
          </div>
          {earnedUnlocks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {earnedUnlocks.map((u) => (
                <span
                  key={u.feature}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2.5 py-1 text-xs text-primary"
                >
                  {u.icon} {u.title}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { icon: BookCheck, label: "Lessons", value: lessons },
          { icon: GraduationCap, label: "Courses", value: courses },
          { icon: FolderCheck, label: "Projects", value: projects },
          { icon: Gamepad2, label: "Games", value: gameProgress },
          { icon: Target, label: "Accuracy", value: `${accuracy}%` },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 pt-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-lg font-bold leading-none">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: Clock3, label: "Hours studied", value: hours },
          { icon: Zap, label: "Lines of code", value: user.linesOfCode.toLocaleString() },
          { icon: Target, label: "Quizzes passed", value: quizPassed },
          { icon: Sparkles, label: "Store items", value: purchases },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 pt-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <s.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-lg font-bold leading-none">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {achievements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent achievements</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {achievements.map((a) => (
                <div key={a.id} className="rounded-lg bg-muted/50 p-3 text-center">
                  <span className="text-2xl" aria-hidden>
                    {a.achievement.icon}
                  </span>
                  <p className="mt-1 truncate text-xs font-medium">{a.achievement.name}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapIcon className="h-4 w-4 text-primary" /> Programming Worlds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentWorld ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <p className="font-medium">{currentWorld.icon} {currentWorld.name}</p>
                  <p className="font-bold" style={{ color: currentWorld.color }}>{currentWorld.masteryPercent}%</p>
                </div>
                <Progress value={currentWorld.masteryPercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {currentWorld.mastered ? (
                    <span className="font-semibold text-success">Mastered — on to the next world!</span>
                  ) : (
                    <>Defeat the world boss at 80% mastery to earn your certificate.</>
                  )}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Your journey through the Programming Worlds starts on the world map.</p>
            )}
            <p className="text-xs text-muted-foreground">
              {worldsMastered} of {worlds.length} worlds mastered · {worlds.filter((w) => w.bossDefeated).length} bosses defeated.
            </p>
            <Link href="/worlds" className="inline-block text-sm font-medium text-primary hover:underline">
              Open world map →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Certificates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {certificates} certificate{certificates === 1 ? "" : "s"} earned.
            </p>
            {certificates > 0 ? (
              <Link href="/certificates" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
                View certificates
              </Link>
            ) : (
              <Link href="/courses" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
                Start a course
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const titlesPanel = (
    <TitlesClient titles={titleData.titles} equipped={equippedTitle} />
  );

  const settingsPanel = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile settings</CardTitle>
      </CardHeader>
      <CardContent>
        <SettingsForm
          initial={{
            name: user.name,
            bio: user.bio,
            dailyGoalMinutes: settings?.dailyGoalMinutes ?? 30,
            preferredTime: settings?.preferredTime ?? "any",
            learningMode: settings?.learningMode ?? "READING",
            instructorMode: settings?.instructorMode ?? false,
          }}
        />
      </CardContent>
    </Card>
  );

  return <ProfileTabs overview={overview} titles={titlesPanel} settings={settingsPanel} />;
}
