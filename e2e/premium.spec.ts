import { expect, test } from "@playwright/test";

test("teaser, demo pill, follow-ups, actions, lead card, and slot chips", async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem("driftwood-teaser-dismissed"));
  await page.goto("/");
  await page.locator("[data-hydrated=true]").waitFor();
  await expect(page.getByTestId("mode-pill").first()).toHaveText(/Demo mode/);
  await expect(page.getByTestId("trust-panel")).toContainText("What it won’t do");
  await expect(page.getByTestId("try-asking")).toBeVisible();
  await expect(page.getByTestId("launcher-teaser")).toBeVisible({ timeout: 8_000 });
  await expect(page.getByTestId("slot-chip").first()).toBeVisible();

  await page.getByTestId("quick-reply").filter({ hasText: "What’s your return policy?" }).click();
  await expect(page.getByRole("button", { name: "Copy" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Regenerate" }).first()).toBeVisible();
  await expect(page.getByTestId("quick-reply").first()).toBeVisible();
  await expect(page.getByTestId("citation-chip").first()).toBeVisible();

  await page.getByTestId("lead-link").click();
  await expect(page.getByTestId("lead-card")).toBeVisible();
  await expect(page.getByPlaceholder("Maya Chen")).toBeVisible();
});

test("handoff can resume the bot from the desk", async ({ page, request }) => {
  await request.post("/api/admin/reset");
  await page.goto("/");
  await page.locator("[data-hydrated=true]").waitFor();
  await page.getByTestId("quick-reply").filter({ hasText: "Talk to a person" }).click();
  await expect(page.getByTestId("handoff-banner")).toContainText(/team member|joined/i);
  await expect(page.getByTestId("ticket-card")).toBeVisible();
  await page.goto("/admin/tickets");
  await page.locator('a[href*="/admin/conversations/c_"]').first().click();
  const resume = page.getByTestId("resume-bot");
  await expect(resume).toBeVisible();
  const response = page.waitForResponse((item) => item.url().includes("/resume") && item.request().method() === "POST");
  await resume.click();
  expect((await response).ok()).toBeTruthy();
});
