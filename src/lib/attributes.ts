import type { Attribute, AttributeId } from "@/types/database";

export const ATTRIBUTES: Attribute[] = [
  { id: "str", name: "Strength", icon: "💪", description: "Physical power and endurance", color: "#ff6b6b" },
  { id: "int", name: "Intellect", icon: "🧠", description: "Mental acuity and learning", color: "#4ecdc4" },
  { id: "cha", name: "Charisma", icon: "🗣️", description: "Social influence and communication", color: "#ffe66d" },
  { id: "foc", name: "Focus", icon: "🎯", description: "Concentration and discipline", color: "#95e1d3" },
  { id: "vit", name: "Vitality", icon: "❤️", description: "Health and wellbeing", color: "#f38181" },
  { id: "cre", name: "Creativity", icon: "🎨", description: "Innovation and artistic expression", color: "#aa96da" },
];

export const ATTRIBUTE_MAP: Record<AttributeId, Attribute> = Object.fromEntries(
  ATTRIBUTES.map((a) => [a.id, a])
) as Record<AttributeId, Attribute>;

export function getAttributeById(id: AttributeId): Attribute {
  return ATTRIBUTE_MAP[id];
}
