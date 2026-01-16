"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/game-store";
import { DIFFICULTY_CONFIG } from "@/store/xp-calculator";
import { AttributeRadar, AttributeList } from "@/components/stats/attribute-radar";
import type { DifficultyMode } from "@/types/database";

interface DifficultyOption {
  mode: DifficultyMode;
  name: string;
  tagline: string;
  features: string[];
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    mode: "story",
    name: "STORY MODE",
    tagline: "Life happens. Tasks shift freely.",
    features: [
      "No XP penalty for overtime",
      "No streak loss",
      "Darkness disabled",
    ],
  },
  {
    mode: "normal",
    name: "NORMAL MODE",
    tagline: "Balanced challenge.",
    features: [
      "Standard XP calculation",
      "80% daily completion = streak",
      "Darkness at 30%+ failure",
    ],
  },
  {
    mode: "hardcore",
    name: "HARDCORE MODE",
    tagline: "No excuses. No mercy.",
    features: [
      "1.5x XP multiplier",
      "Miss ANY Main Quest = streak reset",
      '"GAME OVER" screen on failure',
      "Darkness bleeds at 10%+ failure",
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { profile, updateProfile, userAttributes, loadUserAttributes } = useGameStore();
  const [selectedMode, setSelectedMode] = useState<DifficultyMode>(
    profile?.difficulty_mode || "normal"
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadUserAttributes();
  }, [loadUserAttributes]);

  const handleSelectMode = async (mode: DifficultyMode) => {
    setSelectedMode(mode);
    setIsSaving(true);
    await updateProfile({ difficulty_mode: mode });
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-2 text-sm"
        >
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
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="font-hud text-2xl text-hud-primary text-glow tracking-wider">
          SETTINGS
        </h1>
      </header>

      {/* Difficulty Mode Section */}
      <section className="space-y-4">
        <h2 className="font-hud text-sm text-muted-foreground uppercase tracking-wider">
          Difficulty Mode
        </h2>

        <div className="space-y-3">
          {DIFFICULTY_OPTIONS.map((option) => {
            const isSelected = selectedMode === option.mode;
            const config = DIFFICULTY_CONFIG[option.mode];

            return (
              <button
                key={option.mode}
                onClick={() => handleSelectMode(option.mode)}
                disabled={isSaving}
                className={`w-full text-left border rounded-lg p-4 transition-all ${
                  isSelected
                    ? "border-hud-primary bg-hud-primary/10 hud-glow-subtle"
                    : "border-border bg-card/30 hover:bg-card/50"
                } ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {/* Radio indicator */}
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? "border-hud-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-hud-primary" />
                      )}
                    </div>

                    <div>
                      <h3
                        className={`font-hud text-sm tracking-wide ${
                          isSelected ? "text-hud-primary" : "text-foreground"
                        }`}
                      >
                        {option.name}
                        {option.mode === "normal" && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Default)
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground italic">
                        &ldquo;{option.tagline}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* XP Multiplier Badge */}
                  {config.xpMultiplier > 1 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-hud-warning/20 text-hud-warning border border-hud-warning/30">
                      {config.xpMultiplier}x XP
                    </span>
                  )}
                </div>

                {/* Features list */}
                <ul className="ml-7 mt-3 space-y-1">
                  {option.features.map((feature, i) => (
                    <li
                      key={i}
                      className="text-xs text-muted-foreground flex items-center gap-2"
                    >
                      <span className="text-hud-primary/50">&#x2022;</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </section>

      {/* Warning for Hardcore */}
      {selectedMode === "hardcore" && (
        <div className="mt-6 border border-hud-danger/30 rounded-lg p-4 bg-hud-danger/5">
          <div className="flex items-start gap-3">
            <span className="text-hud-danger text-lg">&#x26A0;</span>
            <div>
              <h4 className="font-hud text-sm text-hud-danger mb-1">WARNING</h4>
              <p className="text-xs text-muted-foreground">
                In Hardcore mode, failing or sacrificing any Main Quest will
                trigger a GAME OVER screen. Your streak will reset, and you must
                restart your day. Choose this mode only if you&apos;re ready for
                the ultimate challenge.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Section */}
      <section className="mt-10 space-y-4">
        <h2 className="font-hud text-sm text-muted-foreground uppercase tracking-wider">
          Profile
        </h2>

        <div className="border border-border rounded-lg p-4 bg-card/30 space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Display Name</span>
            <span className="text-sm text-foreground">
              {profile?.display_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total XP</span>
            <span className="text-sm text-hud-primary font-mono">
              {profile?.total_xp || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Current Streak</span>
            <span className="text-sm text-hud-warning font-mono">
              {profile?.current_streak || 0} days
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Longest Streak</span>
            <span className="text-sm text-muted-foreground font-mono">
              {profile?.longest_streak || 0} days
            </span>
          </div>
        </div>
      </section>

      {/* Attributes Section */}
      <section className="mt-10 space-y-4">
        <h2 className="font-hud text-sm text-muted-foreground uppercase tracking-wider">
          Attributes
        </h2>

        <div className="border border-border rounded-lg p-6 bg-card/30">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Radar Chart */}
            <div className="flex-shrink-0">
              <AttributeRadar userAttributes={userAttributes} size={200} />
            </div>

            {/* Attribute List */}
            <div className="flex-1 w-full">
              <AttributeList userAttributes={userAttributes} />
            </div>
          </div>

          {userAttributes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Complete quests with attributes to level up your stats!
            </p>
          )}
        </div>
      </section>

      {/* Sleep Schedule */}
      <section className="mt-10 space-y-4">
        <h2 className="font-hud text-sm text-muted-foreground uppercase tracking-wider">
          Sleep Schedule
        </h2>

        <div className="border border-border rounded-lg p-4 bg-card/30 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Wake Time</span>
            <span className="text-sm text-foreground font-mono">
              {profile?.default_wake_time || "07:00"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Bedtime</span>
            <span className="text-sm text-foreground font-mono">
              {profile?.default_bedtime || "22:00"}
            </span>
          </div>
        </div>
      </section>

      {/* Boss Fights */}
      <section className="mt-10 space-y-4">
        <h2 className="font-hud text-sm text-muted-foreground uppercase tracking-wider">
          Boss Fights
        </h2>

        <button
          onClick={() => router.push("/boss")}
          className="w-full border border-hud-danger/30 rounded-lg p-4 bg-card/30 hover:bg-card/50 transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👹</span>
              <div>
                <h3 className="text-sm text-foreground font-medium">Boss Fights</h3>
                <p className="text-xs text-muted-foreground">
                  Monthly projects with HP and loot rewards
                </p>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </button>
      </section>

      {/* Schedule Builds */}
      <section className="mt-10 space-y-4">
        <h2 className="font-hud text-sm text-muted-foreground uppercase tracking-wider">
          Schedule Builds
        </h2>

        <button
          onClick={() => router.push("/builds")}
          className="w-full border border-border rounded-lg p-4 bg-card/30 hover:bg-card/50 transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <h3 className="text-sm text-foreground font-medium">My Builds</h3>
                <p className="text-xs text-muted-foreground">
                  Create and manage schedule templates
                </p>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </button>
      </section>

      {/* Rewards */}
      <section className="mt-10 space-y-4">
        <h2 className="font-hud text-sm text-muted-foreground uppercase tracking-wider">
          Rewards
        </h2>

        <button
          onClick={() => router.push("/rewards")}
          className="w-full border border-hud-warning/30 rounded-lg p-4 bg-card/30 hover:bg-card/50 transition-colors text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <div>
                <h3 className="text-sm text-foreground font-medium">My Rewards</h3>
                <p className="text-xs text-muted-foreground">
                  View earned loot and claim rewards
                </p>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </button>
      </section>

      {/* Spacer */}
      <div className="h-20" />
    </div>
  );
}
