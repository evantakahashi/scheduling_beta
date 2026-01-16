export type QuestType = "main" | "side";
export type QuestStatus =
  | "pending"
  | "active"
  | "completed"
  | "sacrificed"
  | "failed";
export type BossStatus = "active" | "defeated" | "failed";
export type DifficultyMode = "story" | "normal" | "hardcore";
export type AttributeId = "str" | "int" | "cha" | "foc" | "vit" | "cre";

export interface Attribute {
  id: AttributeId;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export interface QuestAttribute {
  quest_id: string;
  attribute_id: AttributeId;
}

export interface UserAttribute {
  user_id: string;
  attribute_id: AttributeId;
  total_xp: number;
}

export type ClassId = "founder" | "scholar" | "athlete" | "monk" | "creator" | "custom";

export interface CharacterClass {
  id: ClassId;
  name: string;
  icon: string;
  description: string;
  default_wake_time: string;
  default_bedtime: string;
  primary_attributes: AttributeId[];
}

export interface ClassQuestTemplate {
  id: string;
  class_id: ClassId;
  title: string;
  description: string | null;
  quest_type: QuestType;
  duration_minutes: number;
  attribute_ids: AttributeId[];
  position: number;
  is_default: boolean;
}

export interface ScheduleBuild {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  description: string | null;
  wake_time: string | null;
  bedtime: string | null;
  default_days: number[];
  created_at: string;
  updated_at: string;
}

export interface BuildQuestTemplate {
  id: string;
  build_id: string;
  title: string;
  description: string | null;
  quest_type: QuestType;
  duration_minutes: number;
  attribute_ids: AttributeId[];
  position: number;
}

export interface BossReward {
  id: string;
  boss_id: string;
  user_id: string;
  title: string;
  description: string | null;
  icon: string;
  estimated_cost: number | null;
  is_claimed: boolean;
  claimed_at: string | null;
  created_at: string;
}

export interface RewardHistory {
  id: string;
  user_id: string;
  reward_id: string;
  boss_title: string;
  reward_title: string;
  reward_icon: string;
  earned_at: string;
  claimed_at: string | null;
}

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
  difficulty_mode: DifficultyMode;
  class_id: ClassId | null;
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
  estimated_hours: number | null;
  proof_image_url: string | null;
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
  is_endurance: boolean;
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
      attributes: {
        Row: Attribute;
        Insert: Attribute;
        Update: Partial<Attribute>;
      };
      quest_attributes: {
        Row: QuestAttribute;
        Insert: QuestAttribute;
        Update: Partial<QuestAttribute>;
      };
      user_attributes: {
        Row: UserAttribute;
        Insert: UserAttribute;
        Update: Partial<UserAttribute>;
      };
    };
  };
}
