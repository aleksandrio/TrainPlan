import { expect, test, type Page } from "@playwright/test";

// User-perspective flow: sign up, set a goal, generate a week, skip a session and accept the re-plan,
// edit a session into a rule violation. Needs a reachable Supabase with email confirmation disabled.

const password = "E2e-Test-Passw0rd!";

async function signUp(page: Page) {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/auth/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /sign up/i }).click();
  await page.waitForURL(/\/app\/goal$/);
  return email;
}

async function saveGoal(page: Page) {
  await page.getByLabel("What do you want to achieve?").fill("Better conditioning and jump for Monday volleyball");
  await page.getByText("Intermediate", { exact: true }).click();
  // Days: Tue, Thu, Fri, Sat (defaults are Tue/Thu/Sat; add Fri)
  await page.getByText("Fri", { exact: true }).click();
  await page.getByLabel(/fixed weekly activity/i).check();
  await page.getByLabel("Commitment day").selectOption("0");
  await page.getByLabel("Commitment name").fill("Volleyball");
  await page.getByRole("button", { name: /save goal/i }).click();
  await page.waitForURL(/\/app$/);
}

test("anonymous visitor is redirected to sign-in", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/auth\/signin/);
});

test("user generates a valid week, skips a session and gets a re-plan, then edits into a violation", async ({
  page,
}) => {
  await signUp(page);
  await saveGoal(page);

  // Empty state, then generate
  await expect(page.getByTestId("empty-week")).toBeVisible();
  await page.getByTestId("generate-button").click();
  await expect(page.getByTestId("week-grid")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("validity-badge")).toContainText("Valid week");

  // One session on each available day plus the fixed commitment on Monday
  for (const day of [0, 1, 3, 4, 5]) {
    await expect(page.getByTestId(`day-${day}`).getByTestId("session-card")).toHaveCount(1);
  }
  await expect(page.getByTestId("day-0").getByTestId("session-card")).toContainText("fixed");
  await expect(page.getByTestId("day-2").getByTestId("session-card")).toHaveCount(0);

  // Skip Tuesday's session: a re-plan proposal appears; accept it
  await page.getByTestId("day-1").getByRole("button", { name: "Skip" }).click();
  await expect(page.getByTestId("replan-dialog")).toBeVisible();
  await page.getByTestId("accept-replan").click();
  await expect(page.getByTestId("replan-dialog")).toBeHidden();
  await expect(page.getByTestId("change-summary")).toBeVisible();
  await expect(page.getByTestId("validity-badge")).toContainText("Valid week");
  await expect(page.getByTestId("day-1").getByTestId("session-card")).toHaveAttribute("data-status", "skipped");

  // Mark Thursday done
  await page.getByTestId("day-3").getByRole("button", { name: "Done" }).click();
  await expect(page.getByTestId("day-3").getByTestId("session-card")).toHaveAttribute("data-status", "done");

  // Edit Sunday (day before volleyball) into a heavy session -> rule violation shown, plan not valid
  await page.getByTestId("add-session-6").click();
  const form = page.getByTestId("session-form");
  await form.getByLabel("Intensity").selectOption("heavy");
  await form.getByRole("button", { name: "Add" }).click();
  await expect(page.getByTestId("violations")).toContainText("Sun must be light or rest before Volleyball");
  await expect(page.getByTestId("validity-badge")).toContainText("rule issue");

  // Delete it again -> valid
  await page.getByTestId("day-6").getByRole("button", { name: "Delete session" }).click();
  await expect(page.getByTestId("validity-badge")).toContainText("Valid week");

  // History lists the week
  await page.goto("/app/history");
  await expect(page.getByTestId("history-list")).toContainText("1 done");
});
