"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGameStore } from "@/store/game-store";
import type { RewardHistory, BossReward } from "@/types/database";

interface RewardWithDetails extends RewardHistory {
  reward?: BossReward;
}

export default function RewardsPage() {
  const router = useRouter();
  const { profile } = useGameStore();
  const [rewards, setRewards] = useState<RewardWithDetails[]>([]);
  const [unclaimedRewards, setUnclaimedRewards] = useState<BossReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRewards();
  }, [profile]);

  const loadRewards = async () => {
    if (!profile) return;
    const supabase = createClient();

    // Load reward history
    const { data: historyData } = await supabase
      .from("reward_history")
      .select("*")
      .eq("user_id", profile.id)
      .order("earned_at", { ascending: false });

    setRewards((historyData || []) as RewardHistory[]);

    // Load unclaimed rewards from defeated bosses
    const { data: unclaimedData } = await supabase
      .from("boss_rewards")
      .select("*, bosses!inner(status)")
      .eq("user_id", profile.id)
      .eq("is_claimed", false)
      .eq("bosses.status", "defeated");

    setUnclaimedRewards((unclaimedData || []) as BossReward[]);
    setIsLoading(false);
  };

  const handleClaimReward = async (rewardId: string) => {
    const supabase = createClient();
    const now = new Date().toISOString();

    await supabase
      .from("boss_rewards")
      .update({ is_claimed: true, claimed_at: now })
      .eq("id", rewardId);

    await supabase
      .from("reward_history")
      .update({ claimed_at: now })
      .eq("reward_id", rewardId);

    await loadRewards();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-hud-primary font-hud animate-pulse">Loading...</div>
      </div>
    );
  }

  const claimedRewards = rewards.filter((r) => r.claimed_at);
  const pendingRewards = rewards.filter((r) => !r.claimed_at);

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-2 text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="font-hud text-2xl text-hud-warning text-glow tracking-wider">
          MY REWARDS
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Loot earned from defeating bosses
        </p>
      </header>

      {/* Unclaimed Rewards */}
      {(unclaimedRewards.length > 0 || pendingRewards.length > 0) && (
        <section className="mb-8">
          <h2 className="font-hud text-sm text-hud-warning uppercase tracking-wider mb-3">
            Ready to Claim
          </h2>
          <div className="space-y-3">
            {unclaimedRewards.map((reward) => (
              <div
                key={reward.id}
                className="border border-hud-warning/50 rounded-lg p-4 bg-hud-warning/5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{reward.icon}</span>
                    <div>
                      <h3 className="text-sm text-foreground font-medium">
                        {reward.title}
                      </h3>
                      {reward.estimated_cost && (
                        <p className="text-xs text-hud-success">
                          Value: ${reward.estimated_cost}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleClaimReward(reward.id)}
                    className="px-4 py-2 bg-hud-warning/20 border border-hud-warning text-hud-warning text-sm font-hud uppercase rounded hover:bg-hud-warning/30 transition-colors"
                  >
                    Claim
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Claimed Rewards */}
      <section>
        <h2 className="font-hud text-sm text-muted-foreground uppercase tracking-wider mb-3">
          Reward History
        </h2>

        {claimedRewards.length === 0 && unclaimedRewards.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No rewards yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Defeat bosses to earn loot!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className={`border rounded-lg p-3 bg-card/30 ${
                  reward.claimed_at
                    ? "border-hud-success/30"
                    : "border-hud-warning/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{reward.reward_icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm text-foreground">{reward.reward_title}</h3>
                      {reward.claimed_at ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-hud-success/20 text-hud-success">
                          Claimed
                        </span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-hud-warning/20 text-hud-warning">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From: {reward.boss_title}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(reward.earned_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Spacer */}
      <div className="h-20" />
    </div>
  );
}
