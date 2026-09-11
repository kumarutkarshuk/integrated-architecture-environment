import { describe, expect, it } from "vitest";
import { renderInviteEmail } from "../../src/invites/mailer.js";

const sample = {
  to: "editor@example.com",
  projectName: "Checkout",
  inviteUrl: "http://localhost:3000/invite/abc123",
  inviterName: "Alex Rivera",
};

describe("Invite email renderer", () => {
  it("names the product, inviter, Project, editor role, matching email, and 7-day expiry", () => {
    const { html, text } = renderInviteEmail(sample);

    for (const part of [html, text]) {
      expect(part).toContain("Integrated Architecture Environment");
      expect(part).toContain("Alex Rivera");
      expect(part).toContain("Checkout");
      expect(part).toContain("as an editor");
      expect(part).toContain("editor@example.com");
      expect(part).toContain("7 days");
      expect(part).toContain("http://localhost:3000/invite/abc123");
    }

    expect(html).toContain('href="http://localhost:3000/invite/abc123"');
    expect(html).toContain("Open invite");
    expect(text).toContain("Open invite");
  });

  it("uses one Invite URL and no images, extra links, or sales wording", () => {
    const { html, text } = renderInviteEmail(sample);

    expect(html.match(/<a\b/g)).toEqual(["<a"]);
    expect(html.match(/https?:\/\/[^\s"'<>]+/g)).toEqual([
      "http://localhost:3000/invite/abc123",
    ]);
    expect(text.match(/https?:\/\/[^\s]+/g)).toEqual([
      "http://localhost:3000/invite/abc123",
    ]);
    expect(html).not.toMatch(/<img\b/i);
    expect(text).not.toMatch(/https?:\/\/bit\.ly|https?:\/\/t\.co/);

    for (const part of [html, text]) {
      expect(part.toLowerCase()).not.toMatch(
        /urgent|act now|limited time|don't miss|click here immediately/,
      );
    }
  });

  it("escapes Project name and inviter name in HTML and leaves them intact in text", () => {
    const { html, text } = renderInviteEmail({
      to: "editor@example.com",
      projectName: `A & B <Checkout>`,
      inviteUrl: "http://localhost:3000/invite/abc123",
      inviterName: `<script>alert(1)</script>`,
    });

    expect(html).toContain("A &amp; B &lt;Checkout&gt;");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<Checkout>");

    expect(text).toContain("A & B <Checkout>");
    expect(text).toContain("<script>alert(1)</script>");
  });

  it("keeps a matching subject that names the Project", () => {
    expect(renderInviteEmail(sample).subject).toBe("You were invited to Checkout");
  });
});
