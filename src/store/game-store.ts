import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { GameStore, LocalQuest, LocalDay, SacrificeResult } from "./types";
import type { Quest, Day, Profile, Boss } from "@/types/database";
import {
  executeSacrifice as runSacrifice,
  recalculateScheduleTimes,
  calculateDarknessLevel,
  calculateFreeTime,
} from "./sacrifice-engine";
import { calculateQuestXP, calculateBossDamage } from "./xp-calculator";

// Helper to convert DB Quest to LocalQuest
function toLocalQuest(quest: Quest): LocalQuest {
  return {
    ...quest,
    plannedStart: new Date(quest.planned_start),
    plannedEnd: new Date(quest.planned_end),
    actualStart: quest.actual_start ? new Date(quest.actual_start) : null,
    actualEnd: quest.actual_end ? new Date(quest.actual_end) : null,
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
  currentDay: null,
  quests: [],
  activeBoss: null,
  freeTimeMinutes: 0,
  darknessLevel: 0,
  isLoading: false,
  isSyncing: false,
  recentSacrifices: [],
  recentDamage: 0,

  // Load user profile
  loadProfile: async () => {
    set({ isLoading: true });
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      set({ isLoading: false });
      return;
    }

    const { data } = await supabase
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
    } else {
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
    const localDay = toLocalDay(day, profile);
    const localQuests = quests.map(toLocalQuest);

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
    const darknessLevel = calculateDarknessLevel(completed, sacrificed, failedMain);

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
    };

    const { data } = await supabase
      .from("quests")
      .insert(newQuest as Record<string, unknown>)
      .select()
      .single();

    if (data) {
      const localQuest = toLocalQuest(data as unknown as Quest);
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
  deleteQuest: (questId) => {
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
    supabase.from("quests").delete().eq("id", questId);
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
  startQuest: (questId) => {
    const { quests, currentDay } = get();
    if (!currentDay) return;

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
        failedMain
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
    supabase
      .from("quests")
      .update({
        status: "active",
        actual_start: now.toISOString(),
      } as Record<string, unknown>)
      .eq("id", questId);
  },

  // Complete a quest
  completeQuest: (questId) => {
    const { quests, currentDay, activeBoss, profile } = get();
    if (!currentDay || !profile) return;

    const now = new Date();
    const quest = quests.find((q) => q.id === questId);
    if (!quest) return;

    // Calculate XP and accuracy
    const questWithEnd = { ...quest, actualEnd: now };
    const xpResult = calculateQuestXP(questWithEnd);
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
      set({
        activeBoss: { ...activeBoss, current_hp: newHp },
        recentDamage: bossDamage,
      });

      // Sync boss damage
      const supabase = createClient();
      supabase
        .from("bosses")
        .update({
          current_hp: newHp,
          status: newHp <= 0 ? "defeated" : "active",
          defeated_at: newHp <= 0 ? now.toISOString() : null,
        } as Record<string, unknown>)
        .eq("id", activeBoss.id);
    }

    // Update profile XP
    set({
      profile: {
        ...profile,
        total_xp: profile.total_xp + xpResult.earnedXp,
      },
    });

    // Update darkness and free time
    const sacrificed = updatedQuests.filter((q) => q.status === "sacrificed");
    const completed = updatedQuests.filter((q) => q.status === "completed");
    const failedMain = updatedQuests.filter(
      (q) => q.status === "failed" && q.quest_type === "main"
    );
    const darknessLevel = calculateDarknessLevel(
      completed,
      sacrificed,
      failedMain
    );
    const freeTimeMinutes = calculateFreeTime(
      updatedQuests,
      currentDay.bedtimeDate
    );

    set({ darknessLevel, freeTimeMinutes });

    // Sync to Supabase
    const supabase = createClient();
    supabase
      .from("quests")
      .update({
        status: "completed",
        actual_end: now.toISOString(),
        earned_xp: xpResult.earnedXp,
        accuracy: xpResult.accuracy,
        boss_damage: bossDamage,
      } as Record<string, unknown>)
      .eq("id", questId);

    supabase
      .from("profiles")
      .update({ total_xp: profile.total_xp + xpResult.earnedXp } as Record<string, unknown>)
      .eq("id", profile.id);
  },

  // Skip a quest
  skipQuest: (questId) => {
    const { quests, currentDay } = get();
    if (!currentDay) return;

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
      failedMain
    );
    const freeTimeMinutes = calculateFreeTime(
      updatedQuests,
      currentDay.bedtimeDate
    );

    set({ darknessLevel, freeTimeMinutes });

    // Sync to Supabase
    const supabase = createClient();
    supabase
      .from("quests")
      .update({ status: "sacrificed" } as Record<string, unknown>)
      .eq("id", questId);
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
    const { data } = await supabase
      .from("profiles")
      .update(updates as Record<string, unknown>)
      .eq("id", profile.id)
      .select()
      .single();

    if (data) {
      set({ profile: data as unknown as Profile });
    }
  },

  // Complete onboarding
  completeOnboarding: async (vision, antiVision, mission) => {
    const { profile } = get();
    if (!profile) return;

    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .update({
        vision,
        anti_vision: antiVision,
        one_year_mission: mission,
      } as Record<string, unknown>)
      .eq("id", profile.id)
      .select()
      .single();

    if (data) {
      set({ profile: data as unknown as Profile, isOnboarded: true });
    }
  },
}));
