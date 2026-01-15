"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/game-store";

type Step = "vision" | "anti-vision" | "mission" | "review";

const steps: { key: Step; title: string; subtitle: string; placeholder: string }[] = [
  {
    key: "vision",
    title: "Define Your Vision",
    subtitle: "Describe your ideal future self in vivid detail. What does success look like?",
    placeholder: "I am a successful entrepreneur who has built multiple profitable products. I wake up excited every day, have financial freedom, and spend quality time with my loved ones...",
  },
  {
    key: "anti-vision",
    title: "Face Your Anti-Vision",
    subtitle: "What happens if you fail? Paint the picture you're running FROM.",
    placeholder: "I am stuck in a job I hate, watching others achieve their dreams while I make excuses. I have regrets about the chances I didn't take, the time I wasted on distractions...",
  },
  {
    key: "mission",
    title: "Set Your 1-Year Mission",
    subtitle: "What specific goal will move you toward your vision this year?",
    placeholder: "Launch 3 profitable SaaS products, each generating at least $1,000 MRR. Build an audience of 10,000 followers who value my work...",
  },
  {
    key: "review",
    title: "Review Your Character",
    subtitle: "These define your game. You can always update them later.",
    placeholder: "",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { loadProfile, completeOnboarding, isLoading } = useGameStore();

  const [currentStep, setCurrentStep] = useState(0);
  const [vision, setVision] = useState("");
  const [antiVision, setAntiVision] = useState("");
  const [mission, setMission] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const step = steps[currentStep];

  const getValue = () => {
    switch (step.key) {
      case "vision":
        return vision;
      case "anti-vision":
        return antiVision;
      case "mission":
        return mission;
      default:
        return "";
    }
  };

  const setValue = (value: string) => {
    switch (step.key) {
      case "vision":
        setVision(value);
        break;
      case "anti-vision":
        setAntiVision(value);
        break;
      case "mission":
        setMission(value);
        break;
    }
  };

  const canProceed = () => {
    if (step.key === "review") return true;
    return getValue().trim().length >= 20;
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    await completeOnboarding(vision, antiVision, mission);
    router.push("/today");
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center scan-lines">
        <div className="text-hud-primary font-hud animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 scan-lines">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((s, i) => (
              <div
                key={s.key}
                className={`w-2 h-2 rounded-full transition-all ${
                  i <= currentStep
                    ? "bg-hud-primary hud-glow"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-hud-primary to-hud-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="font-hud text-2xl md:text-3xl text-hud-primary text-glow tracking-wider">
                {step.title}
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">
                {step.subtitle}
              </p>
            </div>

            {/* Input or Review */}
            {step.key === "review" ? (
              <div className="space-y-6">
                <ReviewCard title="Vision" content={vision} color="hud-primary" />
                <ReviewCard title="Anti-Vision" content={antiVision} color="hud-danger" />
                <ReviewCard title="1-Year Mission" content={mission} color="hud-success" />
              </div>
            ) : (
              <div className="relative">
                <textarea
                  value={getValue()}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={step.placeholder}
                  rows={8}
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-hud-primary focus:border-transparent transition-all resize-none font-mono text-sm"
                />
                <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                  {getValue().length} characters
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-4">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 bg-card border border-border text-muted-foreground font-hud uppercase tracking-wider rounded-lg hover:bg-muted transition-colors"
                >
                  Back
                </button>
              )}

              {step.key === "review" ? (
                <button
                  onClick={handleComplete}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-hud-success/10 border border-hud-success text-hud-success font-hud uppercase tracking-wider rounded-lg hover:bg-hud-success/20 transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Begin Your Quest"}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex-1 py-3 bg-hud-primary/10 border border-hud-primary text-hud-primary font-hud uppercase tracking-wider rounded-lg hover:bg-hud-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ReviewCard({
  title,
  content,
  color,
}: {
  title: string;
  content: string;
  color: string;
}) {
  return (
    <div className={`border border-${color}/30 rounded-lg p-4 bg-card/50`}>
      <h3 className={`font-hud text-sm text-${color} uppercase tracking-wider mb-2`}>
        {title}
      </h3>
      <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    </div>
  );
}
