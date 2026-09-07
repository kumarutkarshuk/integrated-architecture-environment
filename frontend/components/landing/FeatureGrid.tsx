import { Reveal } from "../motion/Reveal";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";

/** Only what v1 ships. Nothing here is a promise about a later version. */
const FEATURES = [
  {
    title: "Prompt a Project",
    description:
      "Describe a system in plain words and an AI Generation drafts the first canvas for you.",
  },
  {
    title: "Regenerate Previews",
    description:
      "Not convinced? Generate another Preview and pick the one that reads right.",
  },
  {
    title: "Apply a Preview",
    description:
      "Write the Preview you chose onto the live canvas, and editing unlocks.",
  },
  {
    title: "Export a Spec",
    description:
      "Freeze the canvas as markdown, ending with a gaps summary of what was inferred or missing.",
  },
  {
    title: "Live cursors",
    description:
      "Invite Collaborators by email and watch their cursors move on the canvas with you.",
  },
  {
    title: "Saved status",
    description:
      "The canvas says whether your work is saved, and goes read-only rather than losing edits offline.",
  },
];

export function FeatureGrid() {
  return (
    <section
      aria-label="What v1 does"
      className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24"
    >
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="display-type text-2xl font-semibold sm:text-3xl">
          What it does today
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          Six things, all shipping. Chat about a finished canvas and AI edits to
          it are not here yet.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <Reveal key={feature.title} delay={index * 0.04}>
            <Card className="surface-glass h-full rounded-xl border-0">
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription className="leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
