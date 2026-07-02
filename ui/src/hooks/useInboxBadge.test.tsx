// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInboxBadge } from "./useInboxBadge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const apiMocks = vi.hoisted(() => ({
  approvalsList: vi.fn(),
  authSession: vi.fn(),
  dashboardSummary: vi.fn(),
  heartbeatsList: vi.fn(),
  inboxDismissalsList: vi.fn(),
  issuesList: vi.fn(),
  joinRequests: vi.fn(),
}));

vi.mock("../api/access", () => ({
  accessApi: { listJoinRequests: apiMocks.joinRequests },
}));

vi.mock("../api/approvals", () => ({
  approvalsApi: { list: apiMocks.approvalsList },
}));

vi.mock("../api/auth", () => ({
  authApi: { getSession: apiMocks.authSession },
}));

vi.mock("../api/dashboard", () => ({
  dashboardApi: { summary: apiMocks.dashboardSummary },
}));

vi.mock("../api/heartbeats", () => ({
  heartbeatsApi: { list: apiMocks.heartbeatsList },
}));

vi.mock("../api/inboxDismissals", () => ({
  inboxDismissalsApi: {
    dismiss: vi.fn(),
    list: apiMocks.inboxDismissalsList,
  },
}));

vi.mock("../api/issues", () => ({
  issuesApi: { list: apiMocks.issuesList },
}));

async function waitForAssertion(assertion: () => void, attempts = 20) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      assertion();
      return;
    } catch (error) {
      if (attempt === attempts - 1) throw error;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }
  }
}

function Harness() {
  useInboxBadge("company-1");
  return <div>inbox badge test</div>;
}

describe("useInboxBadge", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    localStorage.clear();
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
    apiMocks.approvalsList.mockResolvedValue([]);
    apiMocks.authSession.mockResolvedValue({ user: { id: "user-1" }, session: { userId: "user-1" } });
    apiMocks.dashboardSummary.mockResolvedValue({
      agents: { error: 0 },
      costs: { monthBudgetCents: 0, monthUtilizationPercent: 0 },
    });
    apiMocks.heartbeatsList.mockResolvedValue([]);
    apiMocks.inboxDismissalsList.mockResolvedValue([]);
    apiMocks.issuesList.mockResolvedValue([]);
    apiMocks.joinRequests.mockResolvedValue([]);
  });

  afterEach(() => {
    container.remove();
  });

  it("requests the recent mine issue slice before counting unread badge items", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
    });
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Harness />
        </QueryClientProvider>,
      );
    });

    await waitForAssertion(() => {
      expect(apiMocks.issuesList).toHaveBeenCalledWith("company-1", {
        touchedByUserId: "me",
        inboxArchivedByUserId: "me",
        status: "backlog,todo,in_progress,in_review,blocked,done",
        limit: 100,
        sort: "recent",
      });
    });

    act(() => {
      root.unmount();
    });
  });
});
