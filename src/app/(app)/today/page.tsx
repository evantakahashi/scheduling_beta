"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import { getTodayDateString, formatDuration } from "@/lib/utils";
import { calculateLevel } from "@/store/xp-calculator";

export default function TodayPage() {
  const {
    profile,
    currentDay,
    quests,
    activeBoss,
    freeTimeMinutes,
    darknessLevel,
    loadDay,
    loadActiveBoss,
    startQuest,
    completeQuest,
    skipQuest,
  } = useGameStore();

  useEffect(() => {
    const today = getTodayDateString();
    loadDay(today);
    loadActiveBoss();
  }, [loadDay, loadActiveBoss]);

  const levelInfo = profile ? calculateLevel(profile.total_xp) : null;
  const pendingQuests = quests.filter((q) => q.status === "pending");
  const activeQuest = quests.find((q) => q.status === "active");
  const completedQuests = quests.filter((q) => q.status === "completed");

  return (
    <div className="relative min-h-screen">
      {/* Darkness Overlay */}
      {darknessLevel > 0 && (
        <div
          className="darkness-overlay"
          style={{ opacity: darknessLevel / 200 }}
        />
      )}

      <div className="relative z-10 p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        {/* Header with XP and Streak */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-hud text-xl text-hud-primary text-glow tracking-wider">
              TODAY
            </h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="flex gap-4">
            {/* XP */}
            <div className="text-right">
              <div className="font-hud text-lg text-hud-primary">
                {profile?.total_xp || 0}
              </div>
              <div className="text-xs text-muted-foreground uppercase">XP</div>
            </div>

            {/* Streak */}
            <div className="text-right">
              <div className="font-hud text-lg text-hud-warning">
                {profile?.current_streak || 0}
              </div>
              <div className="text-xs text-muted-foreground uppercase">Streak</div>
            </div>
          </div>
        </header>

        {/* Boss HP Bar */}
        {activeBoss && (
          <div className="border border-hud-danger/30 rounded-lg p-4 bg-card/50">
            <div className="flex items-center justify-between mb-2">
              <span className="font-hud text-sm text-hud-danger uppercase tracking-wide">
                {activeBoss.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {activeBoss.current_hp}/{activeBoss.total_hp} HP
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-hud-danger to-hud-warning transition-all duration-500"
                style={{
                  width: `${(activeBoss.current_hp / activeBoss.total_hp) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Free Time Bar */}
        <div className="border border-border rounded-lg p-4 bg-card/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground uppercase tracking-wide">
              Free Time Remaining
            </span>
            <span className="font-mono text-sm text-foreground">
              {formatDuration(freeTimeMinutes)}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                freeTimeMinutes > 120
                  ? "bg-hud-success"
                  : freeTimeMinutes > 60
                  ? "bg-hud-warning"
                  : "bg-hud-danger"
              }`}
              style={{
                width: `${Math.min(100, (freeTimeMinutes / 240) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Active Quest */}
        {activeQuest && (
          <div className="border-2 border-hud-primary rounded-lg p-4 bg-hud-primary/5 hud-glow-subtle">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-hud-primary uppercase tracking-wider font-hud">
                In Progress
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  activeQuest.quest_type === "main"
                    ? "badge-main"
                    : "badge-side"
                }`}
              >
                {activeQuest.quest_type.toUpperCase()}
              </span>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {activeQuest.title}
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {formatDuration(activeQuest.duration_minutes)}
              </span>
              <button
                onClick={() => completeQuest(activeQuest.id)}
                className="px-4 py-2 bg-hud-success/10 border border-hud-success text-hud-success text-sm font-hud uppercase rounded hover:bg-hud-success/20 transition-colors"
              >
                Complete
              </button>
            </div>
          </div>
        )}

        {/* Quest Queue */}
        <div className="space-y-3">
          <h2 className="font-hud text-sm text-muted-foreground uppercase tracking-wider">
            Quest Queue ({pendingQuests.length})
          </h2>

          {pendingQuests.length === 0 && !activeQuest ? (
            <div className="border border-dashed border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">No quests scheduled</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Add quests to start your day
              </p>
            </div>
          ) : (
            pendingQuests.map((quest, index) => (
              <div
                key={quest.id}
                className="border border-border rounded-lg p-4 bg-card/30 hover:bg-card/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          quest.quest_type === "main"
                            ? "badge-main"
                            : "badge-side"
                        }`}
                      >
                        {quest.quest_type.toUpperCase()}
                      </span>
                    </div>
                    <h3 className="font-medium text-foreground">
                      {quest.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{formatDuration(quest.duration_minutes)}</span>
                      <span>
                        {quest.plannedStart.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {index === 0 && !activeQuest && (
                      <button
                        onClick={() => startQuest(quest.id)}
                        className="px-3 py-1.5 bg-hud-primary/10 border border-hud-primary text-hud-primary text-xs font-hud uppercase rounded hover:bg-hud-primary/20 transition-colors"
                      >
                        Start
                      </button>
                    )}
                    <button
                      onClick={() => skipQuest(quest.id)}
                      className="px-3 py-1.5 bg-card border border-border text-muted-foreground text-xs uppercase rounded hover:bg-muted transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Completed Quests */}
        {completedQuests.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-hud text-sm text-muted-foreground uppercase tracking-wider">
              Completed ({completedQuests.length})
            </h2>

            {completedQuests.map((quest) => (
              <div
                key={quest.id}
                className="border border-hud-success/20 rounded-lg p-4 bg-hud-success/5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground/70 line-through">
                      {quest.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>+{quest.earned_xp} XP</span>
                      {quest.accuracy && (
                        <span>{Math.round(quest.accuracy)}% accuracy</span>
                      )}
                    </div>
                  </div>
                  <div className="text-hud-success text-xl">✓</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Level Progress */}
        {levelInfo && (
          <div className="border border-border rounded-lg p-4 bg-card/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-hud text-sm text-hud-secondary">
                Level {levelInfo.level}
              </span>
              <span className="text-xs text-muted-foreground">
                {levelInfo.currentXp}/{levelInfo.nextLevelXp} XP
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-hud-secondary to-hud-primary"
                style={{
                  width: `${(levelInfo.currentXp / levelInfo.nextLevelXp) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
