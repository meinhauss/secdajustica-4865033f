import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import Index from "./Index";

const sections = vi.hoisted(() => ({
  cartorio: vi.fn(() => null),
  tribunal: vi.fn(() => null),
  estatisticas: vi.fn(() => null),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "route-test-user" },
    loading: false,
    roles: ["cidadao"],
    profile: { nome_completo: "Teste", discord_user_id: "123456789012345678" },
  }),
}));
vi.mock("@/hooks/useKeyboardNavigation", () => ({ useKeyboardNavigation: vi.fn(), SHORTCUTS_LIST: [] }));
vi.mock("@/components/LoginPage", () => ({ default: () => null }));
vi.mock("@/components/sections/DashboardHome", () => ({ default: () => null }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/sections/CartorarioSection", () => ({ default: sections.cartorio }));
vi.mock("@/components/sections/TribunalSection", () => ({ default: sections.tribunal }));
vi.mock("@/components/sections/EstatisticasSection", () => ({ default: sections.estatisticas }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("section navigation", () => {
  it.each([
    ["/cartorio", "cartorio"],
    ["/cart%C3%B3rio", "cartorio"],
    ["/tribunal", "tribunal"],
    ["/estatisticas", "estatisticas"],
  ] as const)("loads the requested section at %s", async (path, section) => {
    render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/:section" element={<Index />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(sections[section]).toHaveBeenCalled());
    for (const other of Object.keys(sections) as (keyof typeof sections)[]) {
      if (other !== section) expect(sections[other]).not.toHaveBeenCalled();
    }
  });
});