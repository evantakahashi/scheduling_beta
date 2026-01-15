export type QuestType = "main" | "side";
export type QuestStatus =
  | "pending"
  | "active"
  | "completed"
  | "sacrificed"
  | "failed";
export type BossStatus = "active" | "defeated" | "failed";

export interface Profile {
  id: string;
  display_name: string;
  vision: string;
  anti_vision: string;
  one_year_mission: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  accuracy_score: number | null;
  default_bedtime: string;
  default_wake_time: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Mission {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  year: number;
  target_value: number | null;
  current_value: number;
  is_active: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Boss {
  id: string;
  user_id: string;
  mission_id: string | null;
  title: string;
  description: string | null;
  total_hp: number;
  current_hp: number;
  start_date: string;
  end_date: string;
  status: BossStatus;
  defeated_at: string | null;
  xp_reward: number;
  created_at: string;
  updated_at: string;
}

export interface Day {
  id: string;
  user_id: string;
  date: string;
  bedtime: string | null;
  wake_time: string | null;
  xp_earned: number;
  accuracy_score: number | null;
  quests_completed: number;
  quests_sacrificed: number;
  darkness_level: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quest {
  id: string;
  day_id: string;
  user_id: string;
  boss_id: string | null;
  title: string;
  description: string | null;
  quest_type: QuestType;
  duration_minutes: number;
  planned_start: string;
  planned_end: string;
  actual_start: string | null;
  actual_end: string | null;
  position: number;
  status: QuestStatus;
  base_xp: number;
  earned_xp: number;
  accuracy: number | null;
  boss_damage: number;
  created_at: string;
  updated_at: string;
}

// Input types for creating records
export type CreateProfileInput = Omit<
  Profile,
  "id" | "created_at" | "updated_at" | "total_xp" | "current_streak" | "longest_streak" | "accuracy_score"
>;

export type CreateMissionInput = Omit<
  Mission,
  "id" | "user_id" | "created_at" | "updated_at" | "completed_at" | "current_value"
>;

export type CreateBossInput = Omit<
  Boss,
  "id" | "user_id" | "created_at" | "updated_at" | "defeated_at" | "current_hp"
>;

export type CreateDayInput = Omit<
  Day,
  | "id"
  | "user_id"
  | "created_at"
  | "updated_at"
  | "xp_earned"
  | "accuracy_score"
  | "quests_completed"
  | "quests_sacrificed"
  | "darkness_level"
>;

export type CreateQuestInput = Omit<
  Quest,
  | "id"
  | "user_id"
  | "created_at"
  | "updated_at"
  | "actual_start"
  | "actual_end"
  | "status"
  | "earned_xp"
  | "accuracy"
  | "boss_damage"
>;

// Supabase Database type helper
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      missions: {
        Row: Mission;
        Insert: Omit<Mission, "id" | "created_at" | "updated_at">;
        Update: Partial<Mission>;
      };
      bosses: {
        Row: Boss;
        Insert: Omit<Boss, "id" | "created_at" | "updated_at">;
        Update: Partial<Boss>;
      };
      days: {
        Row: Day;
        Insert: Omit<Day, "id" | "created_at" | "updated_at">;
        Update: Partial<Day>;
      };
      quests: {
        Row: Quest;
        Insert: Omit<Quest, "id" | "created_at" | "updated_at">;
        Update: Partial<Quest>;
      };
    };
  };
}
