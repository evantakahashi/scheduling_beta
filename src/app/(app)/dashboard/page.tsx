"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/game-store";
import { getTodayDateString } from "@/lib/utils";
import { calculateLevel } from "@/store/xp-calculator";

export default function DashboardPage() {
  const router = useRouter();
  const {
    profile,
    currentDay,
    quests,
    activeBoss,
    loadDay,
    loadActiveBoss,
  } = useGameStore();

  useEffect(() => {
    const today = getTodayDateString();
    loadDay(today);
    loadActiveBoss();
  }, [loadDay, loadActiveBoss]);

  const levelInfo = profile ? calculateLevel(profile.total_xp) : null;
  const completedCount = quests.filter((q) => q.status === "completed").length;
  const totalCount = quests.length;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto pb-24 space-y-4">
      {/* Vision / Anti-Vision Card */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Vision */}
        <div className="p-4 bg-hud-primary/5 border-b border-border">
          <div className="flex items-start gap-3">
            <span className="text-lg">🎯</span>
            <div className="flex-1">
              <h3 className="text-xs font-hud text-hud-primary uppercase tracking-wider mb-1">
                Vision
              </h3>
              <p className="text-sm text-foreground">
                {profile?.vision || "Set your vision in onboarding"}
              </p>
            </div>
          </div>
        </div>

        {/* Anti-Vision - always visible but subdued */}
        <div className="p-4 bg-hud-danger/5">
          <div className="flex items-start gap-3">
            <span className="text-lg opacity-60">☠️</span>
            <div className="flex-1">
              <h3 className="text-xs font-hud text-hud-danger/70 uppercase tracking-wider mb-1">
                Anti-Vision
              </h3>
              <p className="text-sm text-muted-foreground/70 italic">
                {profile?.anti_vision || "Set your anti-vision in onboarding"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mission Card */}
      <div className="border border-border rounded-lg p-4 bg-card/30">
        <div className="flex items-start gap-3">
          <span className="text-lg">📍</span>
          <div className="flex-1">
            <h3 className="text-xs font-hud text-muted-foreground uppercase tracking-wider mb-1">
              1 Year Mission
            </h3>
            <p className="text-sm text-foreground">
              {profile?.one_year_mission || "Set your mission in onboarding"}
            </p>
          </div>
        </div>
      </div>

      {/* Boss Card */}
      {activeBoss ? (
        <button
          onClick={() => router.push("/boss")}
          className="w-full text-left border border-hud-danger/30 rounded-lg p-4 bg-card/30 hover:bg-card/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">👹</span>
            <div className="flex-1">
              <h3 className="text-xs font-hud text-hud-danger uppercase tracking-wider mb-0.5">
                Active Boss
              </h3>
              <p className="text-sm font-medium text-foreground">
                {activeBoss.title}
              </p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>

          {/* HP Bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">HP</span>
              <span className="text-muted-foreground font-mono">
                {activeBoss.current_hp}/{activeBoss.total_hp}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-hud-danger to-hud-warning transition-all duration-500"
                style={{
                  width: `${(activeBoss.current_hp / activeBoss.total_hp) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Deadline */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Deadline: {formatDate(activeBoss.end_date)}</span>
          </div>
        </button>
      ) : (
        <button
          onClick={() => router.push("/boss")}
          className="w-full text-left border border-dashed border-border rounded-lg p-4 bg-card/30 hover:bg-card/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl opacity-50">👹</span>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">No active boss</p>
              <p className="text-xs text-muted-foreground/70">
                Create a monthly project to fight
              </p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </button>
      )}

      {/* Today Summary Card */}
      <button
        onClick={() => router.push("/today")}
        className="w-full text-left border border-hud-primary/30 rounded-lg p-4 bg-hud-primary/5 hover:bg-hud-primary/10 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚔️</span>
            <div>
              <h3 className="text-xs font-hud text-hud-primary uppercase tracking-wider mb-0.5">
                Today&apos;s Quests
              </h3>
              <p className="text-lg font-medium text-foreground">
                {completedCount}/{totalCount} completed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-hud-primary">
            <span className="text-sm font-hud">GO</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mt-3">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-hud-primary transition-all duration-500"
                style={{
                  width: `${(completedCount / totalCount) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </button>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        {/* XP */}
        <div className="border border-border rounded-lg p-3 bg-card/30 text-center">
          <p className="text-lg font-hud text-hud-primary">
            {profile?.total_xp?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-muted-foreground uppercase">XP</p>
        </div>

        {/* Streak */}
        <div className="border border-border rounded-lg p-3 bg-card/30 text-center">
          <p className="text-lg font-hud text-hud-warning">
            🔥 {profile?.current_streak || 0}
          </p>
          <p className="text-xs text-muted-foreground uppercase">Streak</p>
        </div>

        {/* Level */}
        <div className="border border-border rounded-lg p-3 bg-card/30 text-center">
          <p className="text-lg font-hud text-hud-secondary">
            {levelInfo?.level || 1}
          </p>
          <p className="text-xs text-muted-foreground uppercase">Level</p>
        </div>
      </div>
    </div>
  );
}
