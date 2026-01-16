"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useGameStore } from "@/store/game-store";
import type { ScheduleBuild, BuildQuestTemplate, AttributeId } from "@/types/database";
import { ATTRIBUTES } from "@/lib/attributes";
import { formatDuration, getTodayDateString } from "@/lib/utils";

interface BuildWithTemplates extends ScheduleBuild {
  templates: BuildQuestTemplate[];
}

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BuildsPage() {
  const router = useRouter();
  const { profile, loadDay } = useGameStore();
  const [builds, setBuilds] = useState<BuildWithTemplates[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBuild, setEditingBuild] = useState<BuildWithTemplates | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadBuilds();
  }, [profile]);

  const loadBuilds = async () => {
    if (!profile) return;
    const supabase = createClient();

    const { data: buildsData } = await supabase
      .from("schedule_builds")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at");

    if (!buildsData) {
      setBuilds([]);
      setIsLoading(false);
      return;
    }

    // Load templates for each build
    const buildsWithTemplates: BuildWithTemplates[] = [];
    for (const build of buildsData) {
      const { data: templates } = await supabase
        .from("build_quest_templates")
        .select("*")
        .eq("build_id", build.id)
        .order("position");

      buildsWithTemplates.push({
        ...build,
        templates: (templates || []) as BuildQuestTemplate[],
      } as BuildWithTemplates);
    }

    setBuilds(buildsWithTemplates);
    setIsLoading(false);
  };

  const handleApplyBuild = async (build: BuildWithTemplates) => {
    if (!profile) return;
    if (build.templates.length === 0) {
      router.push("/today");
      return;
    }

    const supabase = createClient();

    // Get or create today's day record
    const today = getTodayDateString();
    let dayId: string;

    const { data: existingDay, error: dayError } = await supabase
      .from("days")
      .select("id")
      .eq("user_id", profile.id)
      .eq("date", today)
      .single();

    if (existingDay) {
      dayId = existingDay.id;
    } else if (dayError?.code === "PGRST116") {
      // No day exists, create one
      const { data: newDay, error: createDayError } = await supabase
        .from("days")
        .insert({ user_id: profile.id, date: today })
        .select("id")
        .single();

      if (createDayError || !newDay) {
        console.error("Failed to create day:", createDayError);
        return;
      }
      dayId = newDay.id;
    } else {
      console.error("Failed to fetch day:", dayError);
      return;
    }

    // Get max position of existing quests to append after them
    const { data: existingQuests } = await supabase
      .from("quests")
      .select("position")
      .eq("day_id", dayId)
      .order("position", { ascending: false })
      .limit(1);

    let startPosition = existingQuests?.[0]?.position ?? -1;
    startPosition += 1;

    // Separate fixed and flexible tasks
    const fixedTasks = build.templates
      .filter((t) => t.scheduled_start)
      .sort((a, b) => (a.scheduled_start || "").localeCompare(b.scheduled_start || ""));
    const flexibleTasks = build.templates.filter((t) => !t.scheduled_start);

    // Helper to create date from time string (e.g., "12:00")
    const timeToDate = (timeStr: string): Date => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    };

    // Build scheduled quest list: fixed tasks at their times, flexible fill gaps
    interface ScheduledQuest {
      template: BuildQuestTemplate;
      plannedStart: Date;
      plannedEnd: Date;
    }
    const scheduledQuests: ScheduledQuest[] = [];

    // Place fixed tasks first
    for (const template of fixedTasks) {
      const plannedStart = timeToDate(template.scheduled_start!);
      const plannedEnd = new Date(plannedStart.getTime() + template.duration_minutes * 60000);
      scheduledQuests.push({ template, plannedStart, plannedEnd });
    }

    // Fill gaps with flexible tasks
    let flexIndex = 0;
    let currentTime = new Date(); // Start from now

    // Sort scheduled by start time
    scheduledQuests.sort((a, b) => a.plannedStart.getTime() - b.plannedStart.getTime());

    // Insert flexible tasks in gaps before and between fixed tasks
    const finalSchedule: ScheduledQuest[] = [];

    for (const fixed of scheduledQuests) {
      // Fill gap before this fixed task with flexible tasks
      while (flexIndex < flexibleTasks.length && currentTime.getTime() + flexibleTasks[flexIndex].duration_minutes * 60000 <= fixed.plannedStart.getTime()) {
        const flex = flexibleTasks[flexIndex];
        const flexEnd = new Date(currentTime.getTime() + flex.duration_minutes * 60000);
        finalSchedule.push({ template: flex, plannedStart: new Date(currentTime), plannedEnd: flexEnd });
        currentTime = flexEnd;
        flexIndex++;
      }

      // Add the fixed task
      finalSchedule.push(fixed);
      currentTime = fixed.plannedEnd;
    }

    // Add remaining flexible tasks after all fixed tasks
    while (flexIndex < flexibleTasks.length) {
      const flex = flexibleTasks[flexIndex];
      const flexEnd = new Date(currentTime.getTime() + flex.duration_minutes * 60000);
      finalSchedule.push({ template: flex, plannedStart: new Date(currentTime), plannedEnd: flexEnd });
      currentTime = flexEnd;
      flexIndex++;
    }

    // Insert all quests
    for (let i = 0; i < finalSchedule.length; i++) {
      const { template, plannedStart, plannedEnd } = finalSchedule[i];

      const { data: quest, error: questError } = await supabase
        .from("quests")
        .insert({
          day_id: dayId,
          user_id: profile.id,
          title: template.title,
          description: template.description,
          quest_type: template.quest_type,
          duration_minutes: template.duration_minutes,
          planned_start: plannedStart.toISOString(),
          planned_end: plannedEnd.toISOString(),
          position: startPosition + i,
          status: "pending",
          base_xp: template.quest_type === "main" ? 20 : 10,
          earned_xp: 0,
          boss_damage: 0,
        })
        .select()
        .single();

      if (questError) {
        console.error("Failed to create quest:", questError);
        continue;
      }

      // Insert attribute tags
      if (quest && template.attribute_ids?.length > 0) {
        await supabase.from("quest_attributes").insert(
          template.attribute_ids.map((attr_id) => ({
            quest_id: quest.id,
            attribute_id: attr_id,
          }))
        );
      }
    }

    // Refresh the store's day data before navigating
    await loadDay(today);
    router.push("/today");
  };

  const handleDeleteBuild = async (buildId: string) => {
    const supabase = createClient();
    await supabase.from("schedule_builds").delete().eq("id", buildId);
    setBuilds(builds.filter((b) => b.id !== buildId));
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
          <h1 className="font-hud text-2xl text-hud-primary text-glow tracking-wider">
            MY BUILDS
          </h1>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-hud-primary/10 border border-hud-primary text-hud-primary text-sm font-hud uppercase rounded hover:bg-hud-primary/20 transition-colors"
          >
            + New Build
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Schedule templates you can apply to any day
        </p>
      </header>

      {/* Builds List */}
      {builds.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No builds yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Create a build to save your favorite schedule
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {builds.map((build) => (
            <div
              key={build.id}
              className="border border-border rounded-lg p-4 bg-card/30"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{build.icon}</span>
                  <div>
                    <h3 className="font-hud text-sm text-foreground">{build.name}</h3>
                    {build.description && (
                      <p className="text-xs text-muted-foreground">{build.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApplyBuild(build)}
                    className="px-3 py-1.5 bg-hud-success/10 border border-hud-success text-hud-success text-xs font-hud uppercase rounded hover:bg-hud-success/20 transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => setEditingBuild(build)}
                    className="px-3 py-1.5 bg-card border border-border text-muted-foreground text-xs uppercase rounded hover:bg-muted transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteBuild(build.id)}
                    className="px-3 py-1.5 bg-card border border-hud-danger/30 text-hud-danger/70 text-xs uppercase rounded hover:bg-hud-danger/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Default days */}
              {build.default_days.length > 0 && (
                <div className="flex gap-1 mb-3">
                  {DAY_NAMES.map((day, i) => (
                    <span
                      key={day}
                      className={`text-xs px-2 py-0.5 rounded ${
                        build.default_days.includes(i)
                          ? "bg-hud-primary/20 text-hud-primary"
                          : "bg-muted/50 text-muted-foreground/50"
                      }`}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              )}

              {/* Quest templates preview */}
              <div className="space-y-1">
                {build.templates.slice(0, 4).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={t.quest_type === "main" ? "text-hud-warning" : "text-hud-secondary"}>
                      {t.quest_type === "main" ? "M" : "S"}
                    </span>
                    <span className="flex-1 truncate">{t.title}</span>
                    {t.scheduled_start ? (
                      <span className="text-hud-primary">{t.scheduled_start}</span>
                    ) : (
                      <span className="text-muted-foreground/50">flex</span>
                    )}
                    <span>{formatDuration(t.duration_minutes)}</span>
                  </div>
                ))}
                {build.templates.length > 4 && (
                  <div className="text-xs text-muted-foreground/50">
                    +{build.templates.length - 4} more quests
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Build Modal */}
      <AnimatePresence>
        {(isCreating || editingBuild) && (
          <BuildEditor
            build={editingBuild}
            onSave={async () => {
              await loadBuilds();
              setIsCreating(false);
              setEditingBuild(null);
            }}
            onClose={() => {
              setIsCreating(false);
              setEditingBuild(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Build Editor Modal
function BuildEditor({
  build,
  onSave,
  onClose,
}: {
  build: BuildWithTemplates | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const { profile } = useGameStore();
  const [name, setName] = useState(build?.name || "");
  const [icon, setIcon] = useState(build?.icon || "📋");
  const [description, setDescription] = useState(build?.description || "");
  const [defaultDays, setDefaultDays] = useState<number[]>(build?.default_days || []);
  const [templates, setTemplates] = useState<Partial<BuildQuestTemplate>[]>(
    build?.templates || []
  );
  const [isSaving, setIsSaving] = useState(false);

  const addTemplate = () => {
    setTemplates([
      ...templates,
      {
        title: "",
        quest_type: "side",
        duration_minutes: 30,
        attribute_ids: [],
        position: templates.length,
        scheduled_start: null,
      },
    ]);
  };

  const updateTemplate = (index: number, updates: Partial<BuildQuestTemplate>) => {
    const newTemplates = [...templates];
    newTemplates[index] = { ...newTemplates[index], ...updates };
    setTemplates(newTemplates);
  };

  const removeTemplate = (index: number) => {
    setTemplates(templates.filter((_, i) => i !== index));
  };

  const toggleDay = (day: number) => {
    setDefaultDays(
      defaultDays.includes(day)
        ? defaultDays.filter((d) => d !== day)
        : [...defaultDays, day].sort()
    );
  };

  const handleSave = async () => {
    if (!profile || !name.trim()) return;
    setIsSaving(true);

    const supabase = createClient();

    if (build) {
      // Update existing build
      await supabase
        .from("schedule_builds")
        .update({ name, icon, description: description || null, default_days: defaultDays })
        .eq("id", build.id);

      // Delete old templates and insert new
      await supabase.from("build_quest_templates").delete().eq("build_id", build.id);

      if (templates.length > 0) {
        await supabase.from("build_quest_templates").insert(
          templates.map((t, i) => ({
            build_id: build.id,
            title: t.title,
            description: t.description || null,
            quest_type: t.quest_type,
            duration_minutes: t.duration_minutes,
            attribute_ids: t.attribute_ids || [],
            position: i,
            scheduled_start: t.scheduled_start || null,
          }))
        );
      }
    } else {
      // Create new build
      const { data: newBuild } = await supabase
        .from("schedule_builds")
        .insert({
          user_id: profile.id,
          name,
          icon,
          description: description || null,
          default_days: defaultDays,
        })
        .select()
        .single();

      if (newBuild && templates.length > 0) {
        await supabase.from("build_quest_templates").insert(
          templates.map((t, i) => ({
            build_id: newBuild.id,
            title: t.title,
            description: t.description || null,
            quest_type: t.quest_type,
            duration_minutes: t.duration_minutes,
            attribute_ids: t.attribute_ids || [],
            position: i,
            scheduled_start: t.scheduled_start || null,
          }))
        );
      }
    }

    setIsSaving(false);
    onSave();
  };

  const ICON_OPTIONS = ["📋", "🔥", "🌿", "⚡", "🎯", "💪", "🧠", "🌙"];

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
        className="fixed inset-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg md:top-[5%] md:bottom-auto md:max-h-[90vh] overflow-y-auto z-50 bg-card border border-hud-primary/30 rounded-lg"
      >
        <div className="p-6 space-y-5">
          <h2 className="font-hud text-lg text-hud-primary">
            {build ? "Edit Build" : "New Build"}
          </h2>

          {/* Name & Icon */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-muted-foreground uppercase mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Deep Work Mode"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-hud-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground uppercase mb-2">Icon</label>
              <div className="flex gap-1">
                {ICON_OPTIONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    className={`w-8 h-8 rounded border text-lg ${
                      icon === i ? "border-hud-primary bg-hud-primary/10" : "border-border"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-muted-foreground uppercase mb-2">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Maximum focus, minimal meetings"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-hud-primary"
            />
          </div>

          {/* Default Days */}
          <div>
            <label className="block text-xs text-muted-foreground uppercase mb-2">Default Days</label>
            <div className="flex gap-1">
              {DAY_NAMES.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`flex-1 py-2 rounded border text-xs ${
                    defaultDays.includes(i)
                      ? "border-hud-primary bg-hud-primary/10 text-hud-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Quest Templates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground uppercase">Quests</label>
              <button
                type="button"
                onClick={addTemplate}
                className="text-xs text-hud-primary hover:underline"
              >
                + Add Quest
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {templates.map((t, i) => (
                <div key={i} className="p-2 bg-background rounded border border-border space-y-2">
                  <div className="flex gap-2 items-center">
                    <select
                      value={t.quest_type}
                      onChange={(e) => updateTemplate(i, { quest_type: e.target.value as "main" | "side" })}
                      className="bg-transparent text-xs border-none focus:outline-none"
                    >
                      <option value="main">Main</option>
                      <option value="side">Side</option>
                    </select>
                    <input
                      type="text"
                      value={t.title}
                      onChange={(e) => updateTemplate(i, { title: e.target.value })}
                      placeholder="Quest title"
                      className="flex-1 bg-transparent text-sm focus:outline-none"
                    />
                    <select
                      value={t.duration_minutes}
                      onChange={(e) => updateTemplate(i, { duration_minutes: parseInt(e.target.value) })}
                      className="bg-transparent text-xs border-none focus:outline-none"
                    >
                      {DURATION_PRESETS.map((d) => (
                        <option key={d} value={d}>{formatDuration(d)}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeTemplate(i)}
                      className="text-hud-danger/70 hover:text-hud-danger text-xs"
                    >
                      X
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => updateTemplate(i, { scheduled_start: t.scheduled_start ? null : "09:00" })}
                      className={`px-2 py-1 rounded border ${
                        t.scheduled_start
                          ? "border-hud-primary bg-hud-primary/10 text-hud-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {t.scheduled_start ? "Fixed" : "Flexible"}
                    </button>
                    {t.scheduled_start && (
                      <input
                        type="time"
                        value={t.scheduled_start}
                        onChange={(e) => updateTemplate(i, { scheduled_start: e.target.value })}
                        className="bg-transparent text-sm focus:outline-none border border-border rounded px-2 py-1"
                      />
                    )}
                    {!t.scheduled_start && (
                      <span className="text-muted-foreground/50">fills gaps between fixed tasks</span>
                    )}
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground/50 text-center py-4">
                  No quests yet. Add some to your build.
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
              disabled={!name.trim() || isSaving}
              className="flex-1 py-3 bg-hud-primary/10 border border-hud-primary text-hud-primary font-hud uppercase text-sm rounded-lg hover:bg-hud-primary/20 transition-colors disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Build"}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
