# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**"The System"** - A gamified productivity app where life is treated as a video game. The goal is to maximize flow states through adaptive daily scheduling with game mechanics.

## Philosophy

| Game Concept | Real World |
|--------------|------------|
| Vision | The Win Condition |
| Anti-Vision | The Stakes (failure state shown when failing) |
| Daily Quests | Fluid Schedule (tasks as queue) |
| Boss | Monthly Project (HP bar depletes as quests complete) |
| Mission | 1 Year Goal |
| XP | Based on schedule accuracy, not just completion |

## Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Framer Motion
- **State Management:** Zustand
- **Drag & Drop:** dnd-kit
- **Backend/DB:** Supabase (PostgreSQL, Auth)
- **Deployment:** Vercel

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
```

## Core Mechanics

### The Sacrifice Algorithm
When time runs out (approaching bedtime), Side Quests are automatically sacrificed (deleted) to protect Main Quests. Located in `src/store/sacrifice-engine.ts`.

### XP Calculation
XP is based on schedule accuracy:
- Plan 1hr, take 1hr = 100% base XP (max efficiency)
- Plan 1hr, take 3hr = 0% XP (penalty for poor estimation)
- Main quests = 2x XP multiplier

### Darkness Level
A 0-100 value tracking daily failures. Drives the Anti-Vision UI overlay that bleeds into the interface when the user is failing their goals.

## Database Schema (Supabase)

Five core tables with RLS policies scoped to `auth.uid()`:
- `profiles` - Character sheet (vision, anti_vision, one_year_mission, total_xp, streak)
- `missions` - Yearly goals with measurable targets
- `bosses` - Monthly projects with HP system (total_hp, current_hp)
- `days` - Daily instances with darkness_level
- `quests` - Tasks (quest_type: main/side, status, accuracy, boss_damage)

## Key Files

- `src/store/game-store.ts` - Main Zustand store
- `src/store/sacrifice-engine.ts` - Auto-sacrifice algorithm
- `src/store/xp-calculator.ts` - XP formulas
- `src/components/hud/` - Sci-Fi HUD frame components
- `src/components/quest-log/` - Quest list and cards

## UI Theme

Sci-Fi HUD aesthetic:
- Primary: `#00f0ff` (cyan glow)
- Secondary: `#ff00aa` (magenta accent)
- Success: `#00ff88`, Warning: `#ffaa00`, Danger: `#ff0044`
- Darkness overlay: `#1a0a0a` (red-black for Anti-Vision)
- Font: Orbitron (HUD elements), JetBrains Mono (data)
