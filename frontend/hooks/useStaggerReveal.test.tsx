import { render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";
import { useStaggerReveal } from "./useStaggerReveal";

function RevealList({
  items,
  enabled = true,
}: {
  items: string[];
  enabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useStaggerReveal(ref, {
    itemsKey: items.join("|"),
    enabled,
    fromX: 8,
    fromY: 8,
  });

  return (
    <div ref={ref}>
      {items.map((id) => (
        <p key={id} data-stagger-item={id}>
          {id}
        </p>
      ))}
    </div>
  );
}

describe("useStaggerReveal", () => {
  it("starts new items hidden so they can ease in", () => {
    render(<RevealList items={["alpha", "beta"]} />);

    expect(screen.getByText("alpha").style.opacity).toBe("0");
    expect(screen.getByText("beta").style.opacity).toBe("0");
  });

  it("starts items hidden after they appear in an already mounted panel", () => {
    const { rerender } = render(<RevealList items={[]} enabled={false} />);

    rerender(<RevealList items={["alpha"]} enabled />);

    expect(screen.getByText("alpha").style.opacity).toBe("0");
  });
});
