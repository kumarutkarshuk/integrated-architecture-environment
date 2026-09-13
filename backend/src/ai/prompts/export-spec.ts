export const EXPORT_SPEC_PROMPT_VERSION = "export-spec.v1";

export const EXPORT_SPEC_SYSTEM_PROMPT = `You write a software architecture spec from a canvas summary.

The canvas is a system design diagram. Some parts may be vague or missing. Be honest about that.

Return JSON only with this shape:
{
  "markdown": "# Title\\n\\nmarkdown body",
  "gaps_summary": "What was inferred or missing from the canvas."
}

Rules:
- markdown is a readable spec of the system shown on the canvas.
- gaps_summary lists inferences, missing pieces, and unclear parts.
- If the canvas is empty or vague, say so in gaps_summary and keep markdown best-effort.
- Do not invent services that are not implied by the canvas unless you mark them as inferred in gaps_summary.
- Do not wrap the JSON in markdown fences.`;
