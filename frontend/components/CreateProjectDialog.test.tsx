import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateProjectDialog } from "./CreateProjectDialog";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { toast } from "sonner";

describe("CreateProjectDialog", () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockReset();
    vi.mocked(toast.success).mockReset();
  });

  it("shows an in-app name field for a blank Project", () => {
    const promptSpy = vi.spyOn(window, "prompt");
    render(
      <CreateProjectDialog
        mode="blank"
        onClose={() => undefined}
        onCreateBlankProject={async () => undefined}
        onCreatePromptProject={async () => undefined}
      />,
    );

    expect(screen.getByLabelText("Name")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Create blank project" }),
    ).toBeTruthy();
    expect(promptSpy).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it("does not create a blank Project when the name is empty or whitespace", async () => {
    const onCreateBlankProject = vi.fn(async () => undefined);
    render(
      <CreateProjectDialog
        mode="blank"
        onClose={() => undefined}
        onCreateBlankProject={onCreateBlankProject}
        onCreatePromptProject={async () => undefined}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Create blank project" }),
    );

    expect(onCreateBlankProject).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Name is required");

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "   " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create blank project" }),
    );

    expect(onCreateBlankProject).not.toHaveBeenCalled();
  });

  it("creates a blank Project with a trimmed name", async () => {
    const onCreateBlankProject = vi.fn(async () => undefined);
    const onClose = vi.fn();
    render(
      <CreateProjectDialog
        mode="blank"
        onClose={onClose}
        onCreateBlankProject={onCreateBlankProject}
        onCreatePromptProject={async () => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "  Payment service  " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create blank project" }),
    );

    await waitFor(() => {
      expect(onCreateBlankProject).toHaveBeenCalledWith("Payment service");
    });
    expect(toast.success).toHaveBeenCalledWith('Created "Payment service"');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("lets the User dismiss the blank form without creating", () => {
    const onCreateBlankProject = vi.fn(async () => undefined);
    const onClose = vi.fn();
    render(
      <CreateProjectDialog
        mode="blank"
        onClose={onClose}
        onCreateBlankProject={onCreateBlankProject}
        onCreatePromptProject={async () => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Payment service" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCreateBlankProject).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows a toast when creating a blank Project fails", async () => {
    const onCreateBlankProject = vi.fn(async () => {
      throw new Error("Failed to fetch");
    });
    render(
      <CreateProjectDialog
        mode="blank"
        onClose={() => undefined}
        onCreateBlankProject={onCreateBlankProject}
        onCreatePromptProject={async () => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Payment service" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create blank project" }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Could not reach the server. Check your connection and try again.",
      );
    });
    expect(
      screen.getByRole("button", { name: "Create blank project" }),
    ).toBeTruthy();
  });

  it("creates a prompt Project when name and prompt are provided", async () => {
    const onCreatePromptProject = vi.fn(async () => undefined);
    render(
      <CreateProjectDialog
        mode="prompt"
        onClose={() => undefined}
        onCreateBlankProject={async () => undefined}
        onCreatePromptProject={onCreatePromptProject}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Payment service" },
    });
    fireEvent.change(screen.getByLabelText("Prompt"), {
      target: { value: "Design a payment flow" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create prompt project" }),
    );

    await waitFor(() => {
      expect(onCreatePromptProject).toHaveBeenCalledWith(
        "Payment service",
        "Design a payment flow",
      );
    });
    expect(toast.success).toHaveBeenCalledWith('Created "Payment service"');
  });

  it("shows a toast when prompt form validation fails", () => {
    render(
      <CreateProjectDialog
        mode="prompt"
        onClose={() => undefined}
        onCreateBlankProject={async () => undefined}
        onCreatePromptProject={async () => undefined}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Create prompt project" }),
    );

    expect(toast.error).toHaveBeenCalledWith("Name and prompt are required");
  });

  it("shows a toast when creating a prompt Project fails", async () => {
    const onCreatePromptProject = vi.fn(async () => {
      throw new Error("Daily generate limit reached (5 per day)");
    });

    render(
      <CreateProjectDialog
        mode="prompt"
        onClose={() => undefined}
        onCreateBlankProject={async () => undefined}
        onCreatePromptProject={onCreatePromptProject}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Payment service" },
    });
    fireEvent.change(screen.getByLabelText("Prompt"), {
      target: { value: "Design a payment flow" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create prompt project" }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Daily generate limit reached (5 per day)",
      );
    });
  });

  it("shows the server message when creating a blank Project hits a name clash", async () => {
    const onCreateBlankProject = vi.fn(async () => {
      throw new Error("A Project with this name already exists");
    });
    render(
      <CreateProjectDialog
        mode="blank"
        onClose={() => undefined}
        onCreateBlankProject={onCreateBlankProject}
        onCreatePromptProject={async () => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Checkout" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create blank project" }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "A Project with this name already exists",
      );
    });
  });

  it("shows the server message when creating a blank Project hits the daily limit", async () => {
    const onCreateBlankProject = vi.fn(async () => {
      throw new Error("Daily Project create limit reached (10 per day)");
    });
    render(
      <CreateProjectDialog
        mode="blank"
        onClose={() => undefined}
        onCreateBlankProject={onCreateBlankProject}
        onCreatePromptProject={async () => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Checkout" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create blank project" }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Daily Project create limit reached (10 per day)",
      );
    });
  });
});
