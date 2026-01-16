"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/game-store";
import { getTodayDateString, formatDuration } from "@/lib/utils";
import { calculateLevel } from "@/store/xp-calculator";
import { AddQuestModal } from "@/components/quest-log/add-quest-modal";
import { XpPopupContainer } from "@/components/effects/xp-popup";
import { BossDamageContainer } from "@/components/effects/boss-damage-popup";
import { SacrificeAnimationContainer } from "@/components/effects/sacrifice-animation";
import { DarknessOverlay } from "@/components/hud/darkness-overlay";
import { StreakDisplay } from "@/components/effects/streak-fire";
import { GameOverScreen } from "@/components/effects/game-over-screen";
import { LootDropModal } from "@/components/effects/loot-drop-modal";

export default function TodayPage() {
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const {
    profile,
    currentDay,
    quests,
    activeBoss,
    freeTimeMinutes,
    darknessLevel,
    recentDamage,
    recentSacrifices,
    isGameOver,
    droppedLoot,
    defeatedBossTitle,
    loadDay,
    loadActiveBoss,
    startQuest,
    completeQuest,
    skipQuest,
    dismissGameOver,
    claimLoot,
    dismissLoot,
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
  const sacrificedQuests = quests.filter((q) => q.status === "sacrificed");

  // Prepare sacrifice data for animation
  const sacrificeData = recentSacrifices.map((q) => ({
    id: q.id,
    title: q.title,
  }));

  return (
    <div className="relative min-h-screen">
      {/* Game Over Screen (Hardcore mode) */}
      <GameOverScreen
        isVisible={isGameOver}
        antiVision={profile?.anti_vision}
        onContinue={dismissGameOver}
      />

      {/* Loot Drop Modal */}
      <LootDropModal
        isOpen={!!droppedLoot}
        bossTitle={defeatedBossTitle}
        reward={droppedLoot}
        onClaim={claimLoot}
        onDismiss={dismissLoot}
      />

      {/* Enhanced Darkness Overlay */}
      <DarknessOverlay
        level={darknessLevel}
        antiVision={profile?.anti_vision}
      />

      {/* Sacrifice Notifications */}
      <SacrificeAnimationContainer sacrificedQuests={sacrificeData} />

      <div className="relative z-10 p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        {/* Header with XP and Streak */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
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
            {/* Settings Button */}
            <button
              onClick={() => router.push("/settings")}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>

          <div className="flex gap-4 items-center">
            {/* XP with Popup Animation */}
            <XpPopupContainer currentXp={profile?.total_xp || 0}>
              <div className="text-right">
                <div className="font-hud text-lg text-hud-primary">
                  {profile?.total_xp || 0}
                </div>
                <div className="text-xs text-muted-foreground uppercase">XP</div>
              </div>
            </XpPopupContainer>

            {/* Streak with Fire Animation */}
            <StreakDisplay streak={profile?.current_streak || 0} />
          </div>
        </header>

        {/* Boss HP Bar with Damage Animation */}
        {activeBoss && (
          <BossDamageContainer recentDamage={recentDamage}>
            <div className="border border-hud-danger/30 rounded-lg p-4 bg-card/50 relative overflow-hidden">
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
          </BossDamageContainer>
        )}

        {/* Free Time Bar */}
        <div className="border border-border rounded-lg p-4 bg-card/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground uppercase tracking-wide">
              Free Time Remaining
            </span>
            <span
              className={`font-mono text-sm ${
                freeTimeMinutes <= 60 ? "text-hud-danger animate-pulse" : "text-foreground"
              }`}
            >
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
                  : "bg-hud-danger animate-pulse"
              }`}
              style={{
                width: `${Math.min(100, (freeTimeMinutes / 240) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Active Quest */}
        {activeQuest && (
          <div className="border-2 border-hud-primary rounded-lg p-4 bg-hud-primary/5 hud-glow-subtle animate-pulse-glow">
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

        {/* Sacrificed Quests */}
        {sacrificedQuests.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-hud text-sm text-hud-danger/70 uppercase tracking-wider">
              Sacrificed ({sacrificedQuests.length})
            </h2>

            {sacrificedQuests.map((quest) => (
              <div
                key={quest.id}
                className="border border-hud-danger/20 rounded-lg p-4 bg-darkness-bg/30 opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground/50 line-through">
                      {quest.title}
                    </h3>
                    <span className="text-xs text-hud-danger/50">
                      {formatDuration(quest.duration_minutes)}
                    </span>
                  </div>
                  <div className="text-hud-danger text-lg">&#x2620;</div>
                </div>
              </div>
            ))}
          </div>
        )}

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
                      <span className="text-hud-success">+{quest.earned_xp} XP</span>
                      {quest.accuracy && (
                        <span>{Math.round(quest.accuracy)}% accuracy</span>
                      )}
                    </div>
                  </div>
                  <div className="text-hud-success text-xl">&#x2713;</div>
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
                className="h-full bg-gradient-to-r from-hud-secondary to-hud-primary transition-all duration-500"
                style={{
                  width: `${(levelInfo.currentXp / levelInfo.nextLevelXp) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Spacer for floating button */}
        <div className="h-20" />
      </div>

      {/* Floating Add Quest Button */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-hud-primary text-background rounded-full shadow-lg hover:bg-hud-primary/90 transition-all hover:scale-105 flex items-center justify-center z-30 hud-glow"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Add Quest Modal */}
      <AddQuestModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
