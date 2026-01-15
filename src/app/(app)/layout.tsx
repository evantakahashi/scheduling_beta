"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/game-store";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { loadProfile, isOnboarded, isLoading, profile } = useGameStore();

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    // Redirect to onboarding if not completed
    if (!isLoading && profile && !isOnboarded) {
      router.push("/onboarding");
    }
  }, [isLoading, profile, isOnboarded, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center scan-lines">
        <div className="text-hud-primary font-hud animate-pulse">
          Loading System...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background scan-lines">
      {children}
    </div>
  );
}
