import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { oauthCallbackRoute } from "../oauth-callback.js";

describe("GET /api/oauth/callback/:providerId", () => {
  it("redirects to safe default with invalid_state when state row missing", async () => {
    const db = {
      query: {
        oauthAuthorizationStates: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      },
    };
    const app = express();
    app.use(
      "/api/oauth/callback/:providerId",
      oauthCallbackRoute({
        db: db as unknown as never,
        registry: { get: () => undefined } as unknown as never,
        publicUrl: "https://app.paperclip.test",
        secretService: {
          upsertSecretByName: async () => ({ id: "s" }),
        },
      }),
    );
    const res = await request(app).get(
      "/api/oauth/callback/github?state=missing&code=x",
    );
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("oauth_error=invalid_state");
  });

  it("redirects with replay error when consumed_at set", async () => {
    const db = {
      query: {
        oauthAuthorizationStates: {
          findFirst: vi.fn().mockResolvedValue({
            id: "s",
            providerId: "github",
            consumedAt: new Date(),
            expiresAt: new Date(Date.now() + 60_000),
            returnUrl: "/settings/connections",
            companyId: "c1",
            codeVerifier: "v",
            redirectUri: "x",
            scopesRequested: [],
          }),
        },
      },
    };
    const app = express();
    app.use(
      "/api/oauth/callback/:providerId",
      oauthCallbackRoute({
        db: db as unknown as never,
        registry: {
          get: () => ({ config: { id: "github" } } as unknown as never),
        } as unknown as never,
        publicUrl: "https://app.paperclip.test",
        secretService: {
          upsertSecretByName: async () => ({ id: "s" }),
        },
      }),
    );
    const res = await request(app).get(
      "/api/oauth/callback/github?state=s&code=x",
    );
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("oauth_error=replay");
  });
});
