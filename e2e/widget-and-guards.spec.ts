import { expect, test } from "@playwright/test";

test("widget opens and the host page stays intact", async ({ page }) => {
  await page.goto("/embed-demo");
  await expect(page.getByRole("heading", { name: "Harbor notes" })).toBeVisible();
  const launcher = page.getByRole("button", { name: "Open chat with Rowan" });
  await expect(launcher).toBeVisible();
  await launcher.click();
  await expect(page.getByRole("dialog", { name: "Driftwood support" })).toBeVisible();
  const frame = page.frameLocator('iframe[title="Driftwood support"]');
  await expect(frame.getByText(/I’m Rowan/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Driftwood support" })).toBeHidden();
});

test("a knowledge question shows a citation", async ({ page }) => {
  await page.goto("/");
  await page.locator("[data-hydrated=true]").waitFor();
  await page.getByTestId("composer-input").fill("What is your return policy?");
  await page.getByTestId("composer-send").click();
  await expect(page.getByText(/30 days/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Returns and exchanges" }).first()).toBeVisible();
});

test("asking for a person opens a ticket", async ({ page, request }) => {
  await request.post("/api/admin/reset");
  await page.goto("/");
  await page.locator("[data-hydrated=true]").waitFor();
  await page.getByTestId("composer-input").fill("I want to talk to a human");
  await page.getByTestId("composer-send").click();
  await expect(page.getByTestId("ticket-card")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("composer-input")).toBeVisible();
});
