import { expect, test } from "@playwright/test";

test("tracks DW-10482 and returns the beanie", async ({ page, request }) => {
  const reset = await request.post("/api/admin/reset");
  expect(reset.ok()).toBeTruthy();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /find the parcel/i })).toBeVisible();
  await page.locator("[data-hydrated=true]").waitFor();
  await page.getByTestId("quick-reply").filter({ hasText: "Where is my order #DW-10482?" }).click();
  await expect(page.getByText(/email used at checkout/i)).toBeVisible();

  await page.getByTestId("composer-input").fill("maya.chen@example.com");
  await page.getByTestId("composer-send").click();
  await expect(page.getByTestId("tracking-card")).toContainText("NL-8842193");
  await expect(page.getByTestId("tracking-card")).toContainText("Delivered");

  await page.getByTestId("quick-reply").filter({ hasText: "Trail Wool Beanie" }).click();
  const label = page.getByTestId("return-card");
  await expect(label).toBeVisible();
  await expect(label).toContainText(/RMA-/);

  await page.getByRole("link", { name: "View label" }).click();
  await expect(page.getByRole("heading", { name: /RMA-/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download PDF" })).toBeVisible();
});

test("desk shows the return and a narrow phone layout still chats", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/returns");
  await expect(page.getByRole("heading", { name: "RMA-1008" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByTestId("composer-input")).toBeVisible();
});
