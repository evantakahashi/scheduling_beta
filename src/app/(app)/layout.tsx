"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/game-store";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { loadProfile, isOnboarded, isLoading, profile } = useGameStore();
  const hasLoaded = useRef(false);

  useEffect(() => {
    // Only load profile if we don't already have one
    if (!hasLoaded.current && !profile) {
      hasLoaded.current = true;
      loadProfile();
    }
  }, [loadProfile, profile]);

  useEffect(() => {
    // Redirect to onboarding if profile exists but not completed
    if (!isLoading && profile && !isOnboarded) {
      router.push("/onboarding");
    }
    // Redirect to login if no profile after loading
    if (!isLoading && !profile) {
      router.push("/login");
    }
  }, [isLoading, profile, isOnboarded, router]);

  // Show loading while fetching profile
  if (!profile) {
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
