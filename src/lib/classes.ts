import type { CharacterClass, ClassId, AttributeId } from "@/types/database";

export const CHARACTER_CLASSES: CharacterClass[] = [
  {
    id: "founder",
    name: "The Founder",
    icon: "🚀",
    description: "Build products, lead teams, scale businesses",
    default_wake_time: "07:00",
    default_bedtime: "22:00",
    primary_attributes: ["int", "cha"] as AttributeId[],
  },
  {
    id: "scholar",
    name: "The Scholar",
    icon: "📚",
    description: "Pursue knowledge, master skills, share wisdom",
    default_wake_time: "07:00",
    default_bedtime: "22:00",
    primary_attributes: ["int", "foc"] as AttributeId[],
  },
  {
    id: "athlete",
    name: "The Athlete",
    icon: "🏃",
    description: "Train hard, compete harder, recover smarter",
    default_wake_time: "06:00",
    default_bedtime: "21:00",
    primary_attributes: ["str", "vit"] as AttributeId[],
  },
  {
    id: "monk",
    name: "The Monk",
    icon: "🧘",
    description: "Cultivate mindfulness, embrace simplicity",
    default_wake_time: "05:30",
    default_bedtime: "21:30",
    primary_attributes: ["foc", "vit"] as AttributeId[],
  },
  {
    id: "creator",
    name: "The Creator",
    icon: "🎨",
    description: "Design, write, build beautiful things",
    default_wake_time: "08:00",
    default_bedtime: "23:00",
    primary_attributes: ["cre", "int"] as AttributeId[],
  },
  {
    id: "custom",
    name: "Custom",
    icon: "⚙️",
    description: "Define your own path",
    default_wake_time: "07:00",
    default_bedtime: "22:00",
    primary_attributes: [] as AttributeId[],
  },
];

export const CLASS_MAP: Record<ClassId, CharacterClass> = Object.fromEntries(
  CHARACTER_CLASSES.map((c) => [c.id, c])
) as Record<ClassId, CharacterClass>;

export function getClassById(id: ClassId): CharacterClass {
  return CLASS_MAP[id];
}
