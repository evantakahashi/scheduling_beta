import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { GameStore, LocalQuest, LocalDay, SacrificeResult } from "./types";
import type { Quest, Day, Profile, Boss, UserAttribute, AttributeId, BossReward } from "@/types/database";
import {
  executeSacrifice as runSacrifice,
  recalculateScheduleTimes,
  calculateDarknessLevel,
  calculateFreeTime,
} from "./sacrifice-engine";
import { calculateQuestXP, calculateBossDamage } from "./xp-calculator";

// Helper to convert DB Quest to LocalQuest
function toLocalQuest(quest: Quest, attributeIds: AttributeId[] = []): LocalQuest {
  return {
    ...quest,
    plannedStart: new Date(quest.planned_start),
    plannedEnd: new Date(quest.planned_end),
    actualStart: quest.actual_start ? new Date(quest.actual_start) : null,
    actualEnd: quest.actual_end ? new Date(quest.actual_end) : null,
    attribute_ids: attributeIds,
  };
}

// Helper to convert DB Day to LocalDay
function toLocalDay(day: Day, profile: Profile): LocalDay {
  const bedtime = day.bedtime || profile.default_bedtime;
  const wakeTime = day.wake_time || profile.default_wake_time;

  return {
    ...day,
    bedtimeDate: new Date(`${day.date}T${bedtime}`),
    wakeTimeDate: new Date(`${day.date}T${wakeTime}`),
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  profile: null,
  isOnboarded: false,
  userAttributes: [],
  currentDay: null,
  quests: [],
  activeBoss: null,
  freeTimeMinutes: 0,
  darknessLevel: 0,
  isLoading: false,
  isSyncing: false,
  recentSacrifices: [],
  recentDamage: 0,
  isGameOver: false,
  droppedLoot: null,
  defeatedBossTitle: null,

  // Load user profile
  loadProfile: async () => {
    set({ isLoading: true });
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        set({ isLoading: false });
        return;
      }

      // Try to get existing profile
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        const profile = data as unknown as Profile;
        const isOnboarded = !!(
          profile.vision &&
          profile.anti_vision &&
          profile.one_year_mission
        );
        set({ profile, isOnboarded, isLoading: false });
      } else if (error?.code === "PGRST116") {
        // Profile doesn't exist - create one
        const newProfile = {
          id: user.id,
          display_name: user.user_metadata?.display_name || "Player",
          vision: "",
          anti_vision: "",
          one_year_mission: "",
          default_bedtime: "22:00",
          default_wake_time: "07:00",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        const { data: created } = await supabase
          .from("profiles")
          .insert(newProfile as Record<string, unknown>)
          .select()
          .single();

        if (created) {
          set({ profile: created as unknown as Profile, isOnboarded: false, isLoading: false });
        } else {
          console.error("Failed to create profile");
          set({ isLoading: false });
        }
      } else {
        console.error("Error loading profile:", error);
        set({ isLoading: false });
      }
    } catch (err) {
      console.error("loadProfile error:", err);
      set({ isLoading: false });
    }
  },

  // Load day data and quests
  loadDay: async (date: string) => {
    const { profile } = get();
    if (!profile) return;

    set({ isLoading: true });
    const supabase = createClient();

    // Get or create day record
    const { data: existingDay } = await supabase
      .from("days")
      .select("*")
      .eq("user_id", profile.id)
      .eq("date", date)
      .single();

    let day = existingDay as unknown as Day | null;

    if (!day) {
      // Create new day
      const { data: newDayData } = await supabase
        .from("days")
        .insert({ user_id: profile.id, date } as Record<string, unknown>)
        .select()
        .single();
      day = newDayData as unknown as Day;
    }

    if (!day) {
      set({ isLoading: false });
      return;
    }

    // Load quests for this day
    const { data: questsData } = await supabase
      .from("quests")
      .select("*")
      .eq("day_id", day.id)
      .order("position");

    const quests = (questsData || []) as unknown as Quest[];

    // Load quest attributes for all quests
    const questIds = quests.map((q) => q.id);
    const { data: questAttrsData } = await supabase
      .from("quest_attributes")
      .select("*")
      .in("quest_id", questIds);

    // Group attributes by quest_id
    const attrsByQuestId = new Map<string, AttributeId[]>();
    (questAttrsData || []).forEach((qa: { quest_id: string; attribute_id: AttributeId }) => {
      const existing = attrsByQuestId.get(qa.quest_id) || [];
      attrsByQuestId.set(qa.quest_id, [...existing, qa.attribute_id]);
    });

    const localDay = toLocalDay(day, profile);
    const localQuests = quests.map((q) =>
      toLocalQuest(q, attrsByQuestId.get(q.id) || [])
    );

    // Calculate derived values
    const freeTimeMinutes = calculateFreeTime(
      localQuests,
      localDay.bedtimeDate
    );

    const sacrificed = localQuests.filter((q) => q.status === "sacrificed");
    const completed = localQuests.filter((q) => q.status === "completed");
    const failedMain = localQuests.filter(
      (q) => q.status === "failed" && q.quest_type === "main"
    );
    const darknessLevel = calculateDarknessLevel(
      completed,
      sacrificed,
      failedMain,
      profile.difficulty_mode
    );

    set({
      currentDay: localDay,
      quests: localQuests,
      freeTimeMinutes,
      darknessLevel,
      isLoading: false,
    });
  },

  // Load active boss
  loadActiveBoss: async () => {
    const { profile } = get();
    if (!profile) return;

    const supabase = createClient();
    const { data } = await supabase
      .from("bosses")
      .select("*")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .order("end_date")
      .limit(1)
      .single();

    set({ activeBoss: (data as unknown as Boss) || null });
  },

  // Load user attributes
  loadUserAttributes: async () => {
    const { profile } = get();
    if (!profile) return;

    const supabase = createClient();
    const { data } = await supabase
      .from("user_attributes")
      .select("*")
      .eq("user_id", profile.id);

    set({ userAttributes: (data as unknown as UserAttribute[]) || [] });
  },

  // Add a new quest
  addQuest: async (questInput) => {
    const { currentDay, quests, profile } = get();
    if (!currentDay || !profile) return;

    const supabase = createClient();
    const position = quests.length;

    const newQuest = {
      day_id: currentDay.id,
      user_id: profile.id,
      boss_id: questInput.boss_id || null,
      title: questInput.title,
      description: questInput.description || null,
      quest_type: questInput.quest_type,
      duration_minutes: questInput.duration_minutes,
      planned_start: questInput.plannedStart.toISOString(),
      planned_end: questInput.plannedEnd.toISOString(),
      actual_start: null,
      actual_end: null,
      position,
      status: "pending",
      base_xp: questInput.base_xp,
      earned_xp: 0,
      accuracy: null,
      boss_damage: 0,
      is_endurance: questInput.is_endurance || false,
    };

    const { data } = await supabase
      .from("quests")
      .insert(newQuest as Record<string, unknown>)
      .select()
      .single();

    if (data) {
      const createdQuest = data as unknown as Quest;
      const attributeIds = questInput.attribute_ids || [];

      // Save quest attributes if any
      if (attributeIds.length > 0) {
        const attrInserts = attributeIds.map((attr_id) => ({
          quest_id: createdQuest.id,
          attribute_id: attr_id,
        }));
        await supabase.from("quest_attributes").insert(attrInserts);
      }

      const localQuest = toLocalQuest(createdQuest, attributeIds);
      set({ quests: [...quests, localQuest] });

      // Recalculate free time
      const freeTimeMinutes = calculateFreeTime(
        [...quests, localQuest],
        currentDay.bedtimeDate
      );
      set({ freeTimeMinutes });
    }
  },

  // Update a quest
  updateQuest: (questId, updates) => {
    const { quests } = get();
    set({
      quests: quests.map((q) => (q.id === questId ? { ...q, ...updates } : q)),
    });
  },

  // Delete a quest
  deleteQuest: async (questId) => {
    const { quests, currentDay } = get();
    const filtered = quests.filter((q) => q.id !== questId);

    // Reorder positions
    const reordered = filtered.map((q, i) => ({ ...q, position: i }));

    set({ quests: reordered });

    if (currentDay) {
      const freeTimeMinutes = calculateFreeTime(
        reordered,
        currentDay.bedtimeDate
      );
      set({ freeTimeMinutes });
    }

    // Sync deletion to Supabase
    const supabase = createClient();
    const { error } = await supabase.from("quests").delete().eq("id", questId);

    if (error) console.error("Failed to delete quest:", error);
  },

  // Reorder quests (drag and drop)
  reorderQuests: (activeId, overId) => {
    const { quests, currentDay } = get();
    const activeIndex = quests.findIndex((q) => q.id === activeId);
    const overIndex = quests.findIndex((q) => q.id === overId);

    if (activeIndex === -1 || overIndex === -1) return;

    const reordered = [...quests];
    const [removed] = reordered.splice(activeIndex, 1);
    reordered.splice(overIndex, 0, removed);

    // Update positions
    const withPositions = reordered.map((q, i) => ({ ...q, position: i }));

    // Recalculate times
    if (currentDay) {
      const recalculated = recalculateScheduleTimes(
        withPositions,
        0,
        currentDay.wakeTimeDate
      );
      set({ quests: recalculated });

      const freeTimeMinutes = calculateFreeTime(
        recalculated,
        currentDay.bedtimeDate
      );
      set({ freeTimeMinutes });
    } else {
      set({ quests: withPositions });
    }
  },

  // Start a quest
  startQuest: async (questId) => {
    const { quests, currentDay, profile } = get();
    if (!currentDay || !profile) return;

    const now = new Date();
    const questIndex = quests.findIndex((q) => q.id === questId);
    if (questIndex === -1) return;

    const quest = quests[questIndex];

    // Update quest to active
    const updatedQuests = quests.map((q) =>
      q.id === questId
        ? {
            ...q,
            status: "active" as const,
            actualStart: now,
          }
        : q
    );

    // Recalculate schedule from this quest forward
    const recalculated = recalculateScheduleTimes(
      updatedQuests,
      quest.position,
      now
    );

    set({ quests: recalculated });

    // Check if sacrifice is needed
    const result = runSacrifice(recalculated, currentDay.bedtimeDate, now);

    if (result.sacrificedQuests.length > 0) {
      set({
        quests: result.updatedQuests,
        recentSacrifices: result.sacrificedQuests,
      });

      // Update darkness level
      const sacrificed = result.updatedQuests.filter(
        (q) => q.status === "sacrificed"
      );
      const completed = result.updatedQuests.filter(
        (q) => q.status === "completed"
      );
      const failedMain = result.updatedQuests.filter(
        (q) => q.status === "failed" && q.quest_type === "main"
      );
      const darknessLevel = calculateDarknessLevel(
        completed,
        sacrificed,
        failedMain,
        profile.difficulty_mode
      );
      set({ darknessLevel });
    }

    // Update free time
    const freeTimeMinutes = calculateFreeTime(
      result.updatedQuests,
      currentDay.bedtimeDate
    );
    set({ freeTimeMinutes });

    // Sync to Supabase
    const supabase = createClient();
    const { error } = await supabase
      .from("quests")
      .update({
        status: "active",
        actual_start: now.toISOString(),
      } as Record<string, unknown>)
      .eq("id", questId);

    if (error) console.error("Failed to start quest:", error);
  },

  // Complete a quest
  completeQuest: async (questId) => {
    const { quests, currentDay, activeBoss, profile } = get();
    if (!currentDay || !profile) return;

    const now = new Date();
    const quest = quests.find((q) => q.id === questId);
    if (!quest) return;

    // Calculate XP and accuracy (with difficulty multiplier)
    const questWithEnd = { ...quest, actualEnd: now };
    const xpResult = calculateQuestXP(questWithEnd, profile.difficulty_mode);
    const bossDamage = calculateBossDamage(questWithEnd, xpResult.accuracy);

    // Update quest
    const updatedQuests = quests.map((q) =>
      q.id === questId
        ? {
            ...q,
            status: "completed" as const,
            actualEnd: now,
            earned_xp: xpResult.earnedXp,
            accuracy: xpResult.accuracy,
            boss_damage: bossDamage,
          }
        : q
    );

    // Recalculate schedule for remaining quests
    const nextPending = updatedQuests.find(
      (q) => q.position > quest.position && q.status === "pending"
    );

    if (nextPending) {
      const recalculated = recalculateScheduleTimes(
        updatedQuests,
        nextPending.position,
        now
      );
      set({ quests: recalculated });
    } else {
      set({ quests: updatedQuests });
    }

    // Update boss HP if applicable
    if (activeBoss && bossDamage > 0) {
      const newHp = Math.max(0, activeBoss.current_hp - bossDamage);
      const wasDefeated = newHp <= 0 && activeBoss.current_hp > 0;

      set({
        activeBoss: { ...activeBoss, current_hp: newHp },
        recentDamage: bossDamage,
      });

      // Sync boss damage
      const supabase = createClient();
      await supabase
        .from("bosses")
        .update({
          current_hp: newHp,
          status: newHp <= 0 ? "defeated" : "active",
          defeated_at: newHp <= 0 ? now.toISOString() : null,
        } as Record<string, unknown>)
        .eq("id", activeBoss.id);

      // Boss defeated - trigger loot drop!
      if (wasDefeated) {
        // Get available rewards for this boss
        const { data: rewards } = await supabase
          .from("boss_rewards")
          .select("*")
          .eq("boss_id", activeBoss.id)
          .eq("is_claimed", false);

        if (rewards && rewards.length > 0) {
          // Randomly select one reward to drop
          const droppedReward = rewards[Math.floor(Math.random() * rewards.length)];

          // Record in history
          await supabase.from("reward_history").insert({
            user_id: profile.id,
            reward_id: droppedReward.id,
            boss_title: activeBoss.title,
            reward_title: droppedReward.title,
            reward_icon: droppedReward.icon,
          });

          set({
            droppedLoot: droppedReward,
            defeatedBossTitle: activeBoss.title,
            activeBoss: null,
          });
        } else {
          set({ activeBoss: null });
        }
      }
    }

    // Update profile XP
    set({
      profile: {
        ...profile,
        total_xp: profile.total_xp + xpResult.earnedXp,
      },
    });

    // Distribute XP to attributes
    if (quest.attribute_ids.length > 0 && xpResult.earnedXp > 0) {
      const xpPerAttribute = Math.floor(xpResult.earnedXp / quest.attribute_ids.length);
      const { userAttributes } = get();

      // Update local state
      const updatedAttrs = [...userAttributes];
      for (const attrId of quest.attribute_ids) {
        const existing = updatedAttrs.find((a) => a.attribute_id === attrId);
        if (existing) {
          existing.total_xp += xpPerAttribute;
        } else {
          updatedAttrs.push({
            user_id: profile.id,
            attribute_id: attrId,
            total_xp: xpPerAttribute,
          });
        }
      }
      set({ userAttributes: updatedAttrs });

      // Sync to Supabase (upsert)
      const supabase = createClient();
      for (const attrId of quest.attribute_ids) {
        supabase.rpc("increment_attribute_xp", {
          p_user_id: profile.id,
          p_attribute_id: attrId,
          p_xp_amount: xpPerAttribute,
        }).then(({ error }) => {
          if (error) {
            // Fallback: upsert directly
            const attr = updatedAttrs.find((a) => a.attribute_id === attrId);
            if (attr) {
              supabase.from("user_attributes").upsert({
                user_id: profile.id,
                attribute_id: attrId,
                total_xp: attr.total_xp,
              });
            }
          }
        });
      }
    }

    // Update darkness and free time
    const sacrificed = updatedQuests.filter((q) => q.status === "sacrificed");
    const completed = updatedQuests.filter((q) => q.status === "completed");
    const failedMain = updatedQuests.filter(
      (q) => q.status === "failed" && q.quest_type === "main"
    );
    const darknessLevel = calculateDarknessLevel(
      completed,
      sacrificed,
      failedMain,
      profile.difficulty_mode
    );
    const freeTimeMinutes = calculateFreeTime(
      updatedQuests,
      currentDay.bedtimeDate
    );

    set({ darknessLevel, freeTimeMinutes });

    // Sync to Supabase
    const supabase = createClient();
    const { error: questError } = await supabase
      .from("quests")
      .update({
        status: "completed",
        actual_end: now.toISOString(),
        earned_xp: xpResult.earnedXp,
        accuracy: xpResult.accuracy,
        boss_damage: bossDamage,
      } as Record<string, unknown>)
      .eq("id", questId);

    if (questError) console.error("Failed to complete quest:", questError);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ total_xp: profile.total_xp + xpResult.earnedXp } as Record<string, unknown>)
      .eq("id", profile.id);

    if (profileError) console.error("Failed to update profile XP:", profileError);
  },

  // Skip a quest
  skipQuest: async (questId) => {
    const { quests, currentDay, profile } = get();
    if (!currentDay || !profile) return;

    const quest = quests.find((q) => q.id === questId);
    if (!quest) return;

    const updatedQuests = quests.map((q) =>
      q.id === questId ? { ...q, status: "sacrificed" as const } : q
    );

    // Recalculate times
    const now = new Date();
    const nextPending = updatedQuests.find(
      (q) => q.position > quest.position && q.status === "pending"
    );

    if (nextPending) {
      const recalculated = recalculateScheduleTimes(
        updatedQuests,
        nextPending.position,
        now
      );
      set({ quests: recalculated });
    } else {
      set({ quests: updatedQuests });
    }

    // Update darkness
    const sacrificed = updatedQuests.filter((q) => q.status === "sacrificed");
    const completed = updatedQuests.filter((q) => q.status === "completed");
    const failedMain = updatedQuests.filter(
      (q) => q.status === "failed" && q.quest_type === "main"
    );
    const darknessLevel = calculateDarknessLevel(
      completed,
      sacrificed,
      failedMain,
      profile.difficulty_mode
    );
    const freeTimeMinutes = calculateFreeTime(
      updatedQuests,
      currentDay.bedtimeDate
    );

    set({ darknessLevel, freeTimeMinutes });

    // Hardcore mode: trigger game over if main quest is sacrificed
    if (profile.difficulty_mode === "hardcore" && quest.quest_type === "main") {
      set({ isGameOver: true });
    }

    // Sync to Supabase
    const supabase = createClient();
    const { error } = await supabase
      .from("quests")
      .update({ status: "sacrificed" } as Record<string, unknown>)
      .eq("id", questId);

    if (error) console.error("Failed to skip quest:", error);
  },

  // Recalculate entire schedule
  recalculateSchedule: () => {
    const { quests, currentDay } = get();
    if (!currentDay) return;

    const recalculated = recalculateScheduleTimes(
      quests,
      0,
      currentDay.wakeTimeDate
    );
    const freeTimeMinutes = calculateFreeTime(
      recalculated,
      currentDay.bedtimeDate
    );

    set({ quests: recalculated, freeTimeMinutes });
  },

  // Execute sacrifice algorithm
  executeSacrifice: (): SacrificeResult => {
    const { quests, currentDay } = get();
    if (!currentDay) {
      return { updatedQuests: quests, sacrificedQuests: [], mainQuestsAtRisk: [] };
    }

    const result = runSacrifice(quests, currentDay.bedtimeDate);
    set({
      quests: result.updatedQuests,
      recentSacrifices: result.sacrificedQuests,
    });

    return result;
  },

  // Update profile
  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) return;

    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update(updates as Record<string, unknown>)
      .eq("id", profile.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update profile:", error);
      return;
    }

    if (data) {
      set({ profile: data as unknown as Profile });
    }
  },

  // Complete onboarding
  completeOnboarding: async (vision, antiVision, mission, classId) => {
    const { profile } = get();
    if (!profile) return;

    const supabase = createClient();
    const updates: Record<string, unknown> = {
      vision,
      anti_vision: antiVision,
      one_year_mission: mission,
    };
    if (classId) {
      updates.class_id = classId;
    }

    const { data } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id)
      .select()
      .single();

    if (data) {
      set({ profile: data as unknown as Profile, isOnboarded: true });
    }
  },

  // Dismiss game over screen (Hardcore mode)
  dismissGameOver: async () => {
    const { profile } = get();
    if (!profile) return;

    // Reset streak
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ current_streak: 0 } as Record<string, unknown>)
      .eq("id", profile.id);

    set({
      isGameOver: false,
      profile: { ...profile, current_streak: 0 },
    });
  },

  // Claim dropped loot
  claimLoot: async () => {
    const { droppedLoot, profile } = get();
    if (!droppedLoot || !profile) return;

    const supabase = createClient();
    const now = new Date().toISOString();

    // Mark reward as claimed
    await supabase
      .from("boss_rewards")
      .update({ is_claimed: true, claimed_at: now })
      .eq("id", droppedLoot.id);

    // Update history
    await supabase
      .from("reward_history")
      .update({ claimed_at: now })
      .eq("reward_id", droppedLoot.id);

    set({ droppedLoot: null, defeatedBossTitle: null });
  },

  // Dismiss loot without claiming
  dismissLoot: () => {
    set({ droppedLoot: null, defeatedBossTitle: null });
  },

  // Manually defeat boss with proof
  defeatBoss: async (bossId, proofImageUrl) => {
    const { profile, activeBoss } = get();
    if (!profile) return;

    const supabase = createClient();
    const now = new Date().toISOString();

    // Update boss status to defeated with proof
    await supabase
      .from("bosses")
      .update({
        status: "defeated",
        current_hp: 0,
        defeated_at: now,
        proof_image_url: proofImageUrl,
      } as Record<string, unknown>)
      .eq("id", bossId);

    // Get boss details for loot drop
    const { data: boss } = await supabase
      .from("bosses")
      .select("*")
      .eq("id", bossId)
      .single();

    if (!boss) {
      set({ activeBoss: null });
      return;
    }

    // Get available rewards for this boss
    const { data: rewards } = await supabase
      .from("boss_rewards")
      .select("*")
      .eq("boss_id", bossId)
      .eq("is_claimed", false);

    if (rewards && rewards.length > 0) {
      // Randomly select one reward to drop
      const droppedReward = rewards[Math.floor(Math.random() * rewards.length)] as BossReward;

      // Record in history
      await supabase.from("reward_history").insert({
        user_id: profile.id,
        reward_id: droppedReward.id,
        boss_title: boss.title,
        reward_title: droppedReward.title,
        reward_icon: droppedReward.icon,
      });

      set({
        droppedLoot: droppedReward,
        defeatedBossTitle: boss.title,
        activeBoss: activeBoss?.id === bossId ? null : activeBoss,
      });
    } else {
      set({ activeBoss: activeBoss?.id === bossId ? null : activeBoss });
    }
  },
}));
