"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useGameStore } from "@/store/game-store";
import type { Boss, BossReward } from "@/types/database";

interface BossWithRewards extends Boss {
  rewards: BossReward[];
}

const REWARD_ICONS = ["🎁", "🍣", "🎮", "🎬", "🛍️", "✈️", "🍕", "☕"];
const HP_PER_HOUR = 10;

export default function BossPage() {
  const router = useRouter();
  const { profile, activeBoss, loadActiveBoss } = useGameStore();
  const [bosses, setBosses] = useState<BossWithRewards[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingBoss, setEditingBoss] = useState<BossWithRewards | null>(null);
  const [defeatingBoss, setDefeatingBoss] = useState<Boss | null>(null);

  useEffect(() => {
    loadBosses();
  }, [profile]);

  const loadBosses = async () => {
    if (!profile) return;
    const supabase = createClient();

    const { data: bossesData } = await supabase
      .from("bosses")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });

    if (!bossesData) {
      setBosses([]);
      setIsLoading(false);
      return;
    }

    // Load rewards for each boss
    const bossesWithRewards: BossWithRewards[] = [];
    for (const boss of bossesData) {
      const { data: rewards } = await supabase
        .from("boss_rewards")
        .select("*")
        .eq("boss_id", boss.id);

      bossesWithRewards.push({
        ...boss,
        rewards: (rewards || []) as BossReward[],
      } as BossWithRewards);
    }

    setBosses(bossesWithRewards);
    setIsLoading(false);
  };

  const handleDeleteBoss = async (bossId: string) => {
    const supabase = createClient();
    await supabase.from("bosses").delete().eq("id", bossId);
    setBosses(bosses.filter((b) => b.id !== bossId));
    if (activeBoss?.id === bossId) {
      loadActiveBoss();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-hud-primary font-hud animate-pulse">Loading...</div>
      </div>
    );
  }

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
        <div className="flex items-center justify-between">
          <h1 className="font-hud text-2xl text-hud-danger text-glow tracking-wider">
            BOSS FIGHTS
          </h1>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-hud-danger/10 border border-hud-danger text-hud-danger text-sm font-hud uppercase rounded hover:bg-hud-danger/20 transition-colors"
          >
            + New Boss
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Monthly projects with HP and loot rewards
        </p>
      </header>

      {/* Active Boss */}
      {activeBoss && (
        <section className="mb-8">
          <h2 className="font-hud text-sm text-muted-foreground uppercase tracking-wider mb-3">
            Active Boss
          </h2>
          <div className="border border-hud-danger/50 rounded-lg p-4 bg-hud-danger/5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-hud text-lg text-hud-danger">{activeBoss.title}</span>
              <span className="text-sm text-muted-foreground">
                {activeBoss.current_hp}/{activeBoss.total_hp} HP
                {activeBoss.estimated_hours && (
                  <span className="ml-2 text-xs">({activeBoss.estimated_hours}h est.)</span>
                )}
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-hud-danger to-hud-warning transition-all"
                style={{ width: `${(activeBoss.current_hp / activeBoss.total_hp) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              {activeBoss.description && (
                <p className="text-xs text-muted-foreground">{activeBoss.description}</p>
              )}
              <button
                onClick={() => setDefeatingBoss(activeBoss)}
                className="px-4 py-2 bg-hud-success/10 border border-hud-success text-hud-success text-xs font-hud uppercase rounded hover:bg-hud-success/20 transition-colors"
              >
                Defeat Boss
              </button>
            </div>
          </div>
        </section>
      )}

      {/* All Bosses */}
      <section>
        <h2 className="font-hud text-sm text-muted-foreground uppercase tracking-wider mb-3">
          All Bosses
        </h2>

        {bosses.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No bosses yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Create a boss to track monthly projects
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bosses.map((boss) => (
              <div
                key={boss.id}
                className={`border rounded-lg p-4 bg-card/30 ${
                  boss.status === "defeated"
                    ? "border-hud-success/30"
                    : boss.status === "active"
                    ? "border-hud-danger/30"
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-hud text-sm text-foreground">{boss.title}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          boss.status === "defeated"
                            ? "bg-hud-success/20 text-hud-success"
                            : boss.status === "active"
                            ? "bg-hud-danger/20 text-hud-danger"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {boss.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {boss.current_hp}/{boss.total_hp} HP
                      {boss.estimated_hours && (
                        <span className="ml-2">({boss.estimated_hours}h)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const bossWithRewards = bosses.find((b) => b.id === boss.id);
                        if (bossWithRewards) setEditingBoss(bossWithRewards);
                      }}
                      className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBoss(boss.id)}
                      className="px-2 py-1 text-xs text-hud-danger/70 hover:text-hud-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Proof Image for Defeated Bosses */}
                {boss.status === "defeated" && boss.proof_image_url && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                      <span>📸</span> Proof of Completion
                    </p>
                    <img
                      src={boss.proof_image_url}
                      alt="Proof of completion"
                      className="max-h-32 rounded border border-hud-success/30 object-contain"
                    />
                  </div>
                )}

                {/* Rewards preview */}
                {boss.rewards.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">Loot Table:</p>
                    <div className="flex flex-wrap gap-2">
                      {boss.rewards.map((r) => (
                        <span
                          key={r.id}
                          className={`text-xs px-2 py-1 rounded border ${
                            r.is_claimed
                              ? "bg-hud-success/10 border-hud-success/30 text-hud-success"
                              : "bg-card border-border text-muted-foreground"
                          }`}
                        >
                          {r.icon} {r.title}
                          {r.is_claimed && " ✓"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(isCreating || editingBoss) && (
          <BossEditor
            boss={editingBoss}
            onSave={async () => {
              await loadBosses();
              await loadActiveBoss();
              setIsCreating(false);
              setEditingBoss(null);
            }}
            onClose={() => {
              setIsCreating(false);
              setEditingBoss(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Defeat Boss Modal */}
      <AnimatePresence>
        {defeatingBoss && (
          <DefeatBossModal
            boss={defeatingBoss}
            onDefeat={async () => {
              await loadBosses();
              await loadActiveBoss();
              setDefeatingBoss(null);
            }}
            onClose={() => setDefeatingBoss(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Boss Editor Modal
function BossEditor({
  boss,
  onSave,
  onClose,
}: {
  boss: BossWithRewards | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const { profile } = useGameStore();
  const [title, setTitle] = useState(boss?.title || "");
  const [description, setDescription] = useState(boss?.description || "");
  const [estimatedHours, setEstimatedHours] = useState(boss?.estimated_hours || 10);
  const totalHp = estimatedHours * HP_PER_HOUR;
  const [endDate, setEndDate] = useState(
    boss?.end_date?.split("T")[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [rewards, setRewards] = useState<Partial<BossReward>[]>(boss?.rewards || []);
  const [isSaving, setIsSaving] = useState(false);

  const addReward = () => {
    setRewards([
      ...rewards,
      { title: "", icon: "🎁", estimated_cost: null },
    ]);
  };

  const updateReward = (index: number, updates: Partial<BossReward>) => {
    const newRewards = [...rewards];
    newRewards[index] = { ...newRewards[index], ...updates };
    setRewards(newRewards);
  };

  const removeReward = (index: number) => {
    setRewards(rewards.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!profile || !title.trim()) return;
    setIsSaving(true);

    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    if (boss) {
      // Update existing boss
      await supabase
        .from("bosses")
        .update({
          title,
          description: description || null,
          total_hp: totalHp,
          estimated_hours: estimatedHours,
          end_date: endDate,
        })
        .eq("id", boss.id);

      // Delete old rewards and insert new
      await supabase.from("boss_rewards").delete().eq("boss_id", boss.id);

      if (rewards.length > 0) {
        await supabase.from("boss_rewards").insert(
          rewards.map((r) => ({
            boss_id: boss.id,
            user_id: profile.id,
            title: r.title,
            description: r.description || null,
            icon: r.icon || "🎁",
            estimated_cost: r.estimated_cost || null,
          }))
        );
      }
    } else {
      // Create new boss
      const { data: newBoss } = await supabase
        .from("bosses")
        .insert({
          user_id: profile.id,
          title,
          description: description || null,
          total_hp: totalHp,
          current_hp: totalHp,
          estimated_hours: estimatedHours,
          start_date: today,
          end_date: endDate,
          status: "active",
          xp_reward: totalHp * 5,
        })
        .select()
        .single();

      if (newBoss && rewards.length > 0) {
        await supabase.from("boss_rewards").insert(
          rewards.map((r) => ({
            boss_id: newBoss.id,
            user_id: profile.id,
            title: r.title,
            description: r.description || null,
            icon: r.icon || "🎁",
            estimated_cost: r.estimated_cost || null,
          }))
        );
      }
    }

    setIsSaving(false);
    onSave();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg md:top-[5%] md:bottom-auto md:max-h-[90vh] overflow-y-auto z-50 bg-card border border-hud-danger/30 rounded-lg"
      >
        <div className="p-6 space-y-5">
          <h2 className="font-hud text-lg text-hud-danger">
            {boss ? "Edit Boss" : "New Boss"}
          </h2>

          {/* Title */}
          <div>
            <label className="block text-xs text-muted-foreground uppercase mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ship MVP v1.0"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-hud-danger"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-muted-foreground uppercase mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Build and launch the first version"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-hud-danger"
            />
          </div>

          {/* Hours & HP Display */}
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground uppercase mb-2">Estimated Hours</label>
                <input
                  type="number"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(parseInt(e.target.value) || 1)}
                  min={1}
                  max={100}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-hud-danger"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-muted-foreground uppercase mb-2">Deadline</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-hud-danger"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-hud-danger/5 border border-hud-danger/30 rounded-lg">
              <span className="text-xs text-muted-foreground">Calculated HP</span>
              <span className="font-hud text-hud-danger">{totalHp} HP</span>
            </div>
            <p className="text-xs text-muted-foreground/70">
              {HP_PER_HOUR} HP per hour of estimated work. Damage quests to deplete HP.
            </p>
          </div>

          {/* Loot Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground uppercase">Loot Table</label>
              <button
                type="button"
                onClick={addReward}
                className="text-xs text-hud-warning hover:underline"
              >
                + Add Reward
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {rewards.map((r, i) => (
                <div key={i} className="flex gap-2 items-center p-2 bg-background rounded border border-border">
                  <select
                    value={r.icon}
                    onChange={(e) => updateReward(i, { icon: e.target.value })}
                    className="bg-transparent text-lg border-none focus:outline-none w-12"
                  >
                    {REWARD_ICONS.map((icon) => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={r.title}
                    onChange={(e) => updateReward(i, { title: e.target.value })}
                    placeholder="Reward name"
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                  <input
                    type="number"
                    value={r.estimated_cost || ""}
                    onChange={(e) => updateReward(i, { estimated_cost: parseFloat(e.target.value) || null })}
                    placeholder="$"
                    className="w-16 bg-transparent text-sm focus:outline-none text-right"
                  />
                  <button
                    type="button"
                    onClick={() => removeReward(i)}
                    className="text-hud-danger/70 hover:text-hud-danger text-xs"
                  >
                    X
                  </button>
                </div>
              ))}
              {rewards.length === 0 && (
                <p className="text-xs text-muted-foreground/50 text-center py-4">
                  No rewards yet. Add loot to earn when defeating this boss!
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-card border border-border text-muted-foreground font-hud uppercase text-sm rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || isSaving}
              className="flex-1 py-3 bg-hud-danger/10 border border-hud-danger text-hud-danger font-hud uppercase text-sm rounded-lg hover:bg-hud-danger/20 transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Boss"}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// Defeat Boss Modal with Photo Proof
function DefeatBossModal({
  boss,
  onDefeat,
  onClose,
}: {
  boss: Boss;
  onDefeat: () => void;
  onClose: () => void;
}) {
  const { profile, defeatBoss } = useGameStore();
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [isDefeating, setIsDefeating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setProofImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDefeat = async () => {
    if (!proofImage || !profile) return;
    setIsDefeating(true);

    await defeatBoss(boss.id, proofImage);
    setIsDefeating(false);
    onDefeat();
  };

  const progressPercent = Math.round(
    ((boss.total_hp - boss.current_hp) / boss.total_hp) * 100
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md md:top-[10%] md:bottom-auto z-50 bg-card border border-hud-success/30 rounded-lg"
      >
        <div className="p-6 space-y-5">
          <div className="text-center">
            <span className="text-4xl">🏆</span>
            <h2 className="font-hud text-lg text-hud-success mt-2">
              DEFEAT &ldquo;{boss.title}&rdquo;?
            </h2>
          </div>

          {/* Progress Info */}
          <div className="bg-background rounded-lg p-4 border border-border">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Current HP</span>
              <span className="text-foreground">
                {boss.current_hp}/{boss.total_hp}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-hud-success to-hud-primary"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {progressPercent}% complete via quests
            </p>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-xs text-muted-foreground uppercase mb-2">
              Proof of Completion
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${
                proofImage
                  ? "border-hud-success/50 bg-hud-success/5"
                  : "border-border hover:border-muted-foreground"
              }`}
            >
              {proofImage ? (
                <img
                  src={proofImage}
                  alt="Proof"
                  className="max-h-36 max-w-full object-contain rounded"
                />
              ) : (
                <>
                  <span className="text-2xl mb-2">📸</span>
                  <span className="text-sm text-muted-foreground">
                    Click to upload proof
                  </span>
                  <span className="text-xs text-muted-foreground/70 mt-1">
                    Screenshot, photo, or proof of completion
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-card border border-border text-muted-foreground font-hud uppercase text-sm rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDefeat}
              disabled={!proofImage || isDefeating}
              className="flex-1 py-3 bg-hud-success/10 border border-hud-success text-hud-success font-hud uppercase text-sm rounded-lg hover:bg-hud-success/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDefeating ? "Defeating..." : "Defeat Boss"}
            </button>
          </div>

          {!proofImage && (
            <p className="text-xs text-hud-warning text-center">
              Photo proof required to defeat boss
            </p>
          )}
        </div>
      </motion.div>
    </>
  );
}
