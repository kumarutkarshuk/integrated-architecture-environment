import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { testAppConfig } from "../test-config.js";

const app = createApp(testAppConfig);

describe("health API", () => {
  it("returns ok without auth", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toEqual({ status: "ok" });
  });
});
