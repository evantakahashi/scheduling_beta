export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8 scan-lines">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="font-hud text-4xl text-hud-primary text-glow tracking-wider">
            THE SYSTEM
          </h1>
          <p className="text-muted-foreground font-mono">
            Your life is a video game. Maximize flow states.
          </p>
        </header>

        {/* Status Card */}
        <div className="border border-hud-primary/30 rounded-lg p-6 hud-glow-subtle bg-card/50 backdrop-blur">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground uppercase tracking-wide">
                System Status
              </span>
              <span className="text-hud-success text-sm font-mono">
                ● ONLINE
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-hud-primary to-hud-secondary"
                style={{ width: "75%" }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Initializing quest engine...
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "XP", value: "0", color: "text-hud-primary" },
            { label: "STREAK", value: "0", color: "text-hud-warning" },
            { label: "ACCURACY", value: "-%", color: "text-hud-success" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="border border-border rounded-lg p-4 text-center bg-card/30"
            >
              <div className={`font-hud text-2xl ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center pt-4">
          <button className="px-8 py-3 bg-hud-primary/10 border border-hud-primary text-hud-primary font-hud uppercase tracking-wider rounded hover:bg-hud-primary/20 transition-colors hud-glow-subtle">
            Begin Character Creation
          </button>
        </div>
      </div>
    </main>
  );
}
