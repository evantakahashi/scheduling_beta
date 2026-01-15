"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    router.push("/today");
    router.refresh();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="font-hud text-3xl text-hud-primary text-glow tracking-wider">
          THE SYSTEM
        </h1>
        <p className="text-muted-foreground text-sm">
          Welcome back, Player
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-muted-foreground mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-hud-primary focus:border-transparent transition-all"
              placeholder="player@example.com"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-muted-foreground mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-hud-primary focus:border-transparent transition-all"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-hud-primary/10 border border-hud-primary text-hud-primary font-hud uppercase tracking-wider rounded-lg hover:bg-hud-primary/20 transition-colors hud-glow-subtle disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Authenticating..." : "Enter The System"}
        </button>
      </form>

      {/* Sign up link */}
      <p className="text-center text-sm text-muted-foreground">
        New player?{" "}
        <Link
          href="/signup"
          className="text-hud-primary hover:underline"
        >
          Create your character
        </Link>
      </p>
    </div>
  );
}
