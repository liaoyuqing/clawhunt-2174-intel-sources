import type { ReactElement } from "react";
import { render, screen, within, type RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { IntelSourcesPage } from "../src/pages/workbench/intel/sources";
import type { IntelRole } from "../src/types/source";
import { cloneSources } from "../src/services/sources";

export const SAMPLE_ROWS = cloneSources();

export function renderPage(route = "/workbench/intel/sources", ui?: ReactElement): RenderResult {
  return render(<MemoryRouter initialEntries={[route]}>{ui ?? <IntelSourcesPage />}</MemoryRouter>);
}

export async function renderPageReady(route = "/workbench/intel/sources", sessionRole?: IntelRole): Promise<RenderResult> {
  const result = renderPage(route, <IntelSourcesPage roleOverride={sessionRole} />);
  await screen.findByTestId("source-table");
  return result;
}

/** 打开第 index 行的编辑抽屉（默认第 0 行）。 */
export async function openEditDrawer(index = 0): Promise<void> {
  const user = userEvent.setup();
  const row = SAMPLE_ROWS[index] as (typeof SAMPLE_ROWS)[number];
  await user.click(await screen.findByTestId("edit-" + row.id));
  await screen.findByTestId("source-drawer-form");
}

export function rowCell(rowId: string): HTMLElement {
  const row = screen.getByTestId("source-row-" + rowId);
  return within(row) as unknown as HTMLElement;
}
