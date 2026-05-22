// @vitest-environment jsdom

import { act } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  dashboardSummary: vi.fn(),
  activityList: vi.fn(),
  userDirectoryList: vi.fn(),
  issuesList: vi.fn(),
  agentsList: vi.fn(),
  projectsList: vi.fn(),
  setBreadcrumbs: vi.fn(),
  openOnboarding: vi.fn(),
}));

vi.mock("@/lib/router", () => ({
  Link: ({ children, className, ...props }: ComponentProps<"a">) => (
    <a className={className} {...props}>{children}</a>
  ),
}));

vi.mock("@/plugins/slots", () => ({
  PluginSlotOutlet: () => null,
}));

vi.mock("../components/ActiveAgentsPanel", () => ({
  ActiveAgentsPanel: () => <div data-testid="active-agents-panel" />,
}));

vi.mock("../api/dashboard", () => ({
  dashboardApi: { summary: apiMocks.dashboardSummary },
}));

vi.mock("../api/activity", () => ({
  activityApi: { list: apiMocks.activityList },
}));

vi.mock("../api/access", () => ({
  accessApi: { listUserDirectory: apiMocks.userDirectoryList },
}));

vi.mock("../api/issues", () => ({
  issuesApi: { list: apiMocks.issuesList },
}));

vi.mock("../api/agents", () => ({
  agentsApi: { list: apiMocks.agentsList },
}));

vi.mock("../api/projects", () => ({
  projectsApi: { list: apiMocks.projectsList },
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompanyId: "company-1", companies: [{ id: "company-1", name: "EmpireMind.ai" }] }),
}));

vi.mock("../context/DialogContext", () => ({
  useDialogActions: () => ({ openOnboarding: apiMocks.openOnboarding }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: apiMocks.setBreadcrumbs }),
}));

import { Dashboard } from "./Dashboard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function resetDashboardApiMocks() {
  apiMocks.dashboardSummary.mockResolvedValue({
    agents: { active: 0, running: 0, paused: 0, error: 0 },
    tasks: { open: 0, inProgress: 0, blocked: 0 },
    costs: { monthSpendCents: 0, monthBudgetCents: 0, monthUtilizationPercent: 0 },
    pendingApprovals: 0,
    budgets: {
      activeIncidents: 0,
      pausedAgents: 0,
      pausedProjects: 0,
      pendingApprovals: 0,
    },
    runActivity: [],
  });
  apiMocks.activityList.mockResolvedValue([]);
  apiMocks.userDirectoryList.mockResolvedValue({ users: [] });
  apiMocks.issuesList.mockResolvedValue([]);
  apiMocks.agentsList.mockResolvedValue([]);
  apiMocks.projectsList.mockResolvedValue([]);
  apiMocks.setBreadcrumbs.mockReset();
  apiMocks.openOnboarding.mockReset();
}

describe("Dashboard", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    resetDashboardApiMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("fetches only the recent issue slice needed for dashboard charts and task rows", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
    });
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Dashboard />
        </QueryClientProvider>,
      );
    });

    expect(apiMocks.issuesList).toHaveBeenCalledWith("company-1", { limit: 25 });
    expect(apiMocks.issuesList).not.toHaveBeenCalledWith("company-1", undefined);

    act(() => {
      root.unmount();
    });
  });
});
