import { JuryFlow } from "@/components/JuryFlow";

export default function Home() {
  return (
    <main className="flex-1 px-4 pt-10 pb-6 sm:pt-16">
      <JuryFlow
        hero={
          <div className="mx-auto mb-4 max-w-md text-center animate-fade-up">
            <p className="verdict-font gradient-text text-xs tracking-[0.3em]">JURY</p>
            <h1 className="verdict-font mt-3 text-3xl leading-tight text-[var(--foreground)] sm:text-4xl">
              Before real people judge you,
              <br />
              let 100 AI people do it first.
            </h1>
            <p className="mt-4 text-sm text-[var(--muted)]">
              Upload two versions. Pick the outcome. See which one wins.
            </p>
          </div>
        }
      />
    </main>
  );
}
