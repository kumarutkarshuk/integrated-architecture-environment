import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { testAppConfig } from "../test-config.js";

const app = createApp(testAppConfig);

describe("health API", () => {
  it("returns ok without auth", async () => {
    const root = await request(app).get("/health").expect(200);
    const api = await request(app).get("/api/health").expect(200);

    expect(root.body).toEqual({ status: "ok" });
    expect(api.body).toEqual({ status: "ok" });
  });
});
