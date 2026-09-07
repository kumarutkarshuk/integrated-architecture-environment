import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { LandingSection } from "./LandingSection";

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
    <LandingSection
      label="What v1 does"
      heading="What it does today"
      description="Six things, all shipping. Chat about a finished canvas and AI edits to it are not here yet."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card
            key={feature.title}
            className="surface-glass h-full rounded-xl border-0"
          >
            <CardHeader>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription className="leading-relaxed">
                {feature.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </LandingSection>
  );
}
