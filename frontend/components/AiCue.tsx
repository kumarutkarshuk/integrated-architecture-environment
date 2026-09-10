"use client";

import { BorderBeam } from "./ui/border-beam";

interface AiCueProps {
  duration?: number;
}

export function AiCue({ duration = 6 }: AiCueProps) {
  return <BorderBeam duration={duration} borderWidth={1.25} />;
}
