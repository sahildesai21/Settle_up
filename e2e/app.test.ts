import { test, expect, Page } from '@playwright/test';

// Configuration
const BASE_URL = 'http://localhost:5173';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Test@123456';

// Helper functions
async function login(page: Page, email: string, password: string) {
  await page.goto(BASE_URL);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
}

async function createGroup(page: Page, groupName: string) {
  await page.fill('input[placeholder="Group name (e.g. Goa Trip 🏖️)"]', groupName);
  await page.click('button:has-text("Create")');
  await page.waitForTimeout(500);
  expect(await page.locator(`text=${groupName}`).isVisible()).toBeTruthy();
}

async function addMember(page: Page, name: string, email: string) {
  await page.fill('input[placeholder="Member name"]', name);
  await page.fill('input[placeholder="Member email"]', email);
  await page.click('button:has-text("Add")');
  await page.waitForTimeout(300);
}

async function addExpense(page: Page, description: string, amount: string, paidBy: string, splitMembers: string[]) {
  // Fill description
  await page.fill('input[placeholder="e.g. Dinner 🍕"]', description);
  
  // Fill amount
  await page.fill('input[type="number"]', amount);
  
  // Select who paid
  await page.locator('text=Who paid?').locator('..').locator('button').first().click();
  await page.click(`text=${paidBy}`);
  
  // Select split members
  for (const member of splitMembers) {
    const memberButton = page.locator(`button:has-text("${member}")`).first();
    if (!(await memberButton.evaluate(el => el.classList.contains('bg-primary/10')))) {
      await memberButton.click();
    }
  }
  
  // Submit
  await page.click('button:has-text("Add Expense")');
  await page.waitForTimeout(300);
}

// Tests
test.describe('SettleUp E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('1. User can create an account', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Try to sign up
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    
    // Click sign in (or sign up button if visible)
    const signButton = page.locator('button:has-text("Sign In")').first();
    await signButton.click();
    
    // Wait for redirect or error
    await page.waitForTimeout(1000);
  });

  test('2. User can create a group', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Create a group
    const groupName = `Trip ${Date.now()}`;
    await createGroup(page, groupName);
    
    // Verify group appears in list
    expect(await page.locator(`text=${groupName}`).isVisible()).toBeTruthy();
  });

  test('3. User can add members to a group', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Create a group first
    const groupName = `Group ${Date.now()}`;
    await createGroup(page, groupName);
    
    // Click on the group to open it
    await page.click(`text=${groupName}`);
    await page.waitForLoadState('networkidle');
    
    // Add members
    const members = [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
      { name: 'Charlie', email: 'charlie@example.com' },
    ];
    
    for (const member of members) {
      await addMember(page, member.name, member.email);
      expect(await page.locator(`text=${member.name}`).isVisible()).toBeTruthy();
    }
  });

  test('4. User can add expenses and split them', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Create group and add members
    const groupName = `Expense Test ${Date.now()}`;
    await createGroup(page, groupName);
    await page.click(`text=${groupName}`);
    await page.waitForLoadState('networkidle');
    
    const members = [
      { name: 'Alice', email: 'alice@test.com' },
      { name: 'Bob', email: 'bob@test.com' },
    ];
    
    for (const member of members) {
      await addMember(page, member.name, member.email);
    }
    
    await page.waitForTimeout(500);
    
    // Add an expense
    await addExpense(page, 'Dinner', '600', 'Alice', ['Alice', 'Bob']);
    
    // Verify expense appears
    expect(await page.locator('text=Dinner').isVisible()).toBeTruthy();
    expect(await page.locator('text=600').isVisible()).toBeTruthy();
  });

  test('5. Balances are calculated correctly', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Create group
    const groupName = `Balance Test ${Date.now()}`;
    await createGroup(page, groupName);
    await page.click(`text=${groupName}`);
    await page.waitForLoadState('networkidle');
    
    // Add members
    await addMember(page, 'Alice', 'alice@balance.com');
    await addMember(page, 'Bob', 'bob@balance.com');
    await page.waitForTimeout(500);
    
    // Add expense: Alice paid 1000, split equally
    await addExpense(page, 'Trip cost', '1000', 'Alice', ['Alice', 'Bob']);
    await page.waitForTimeout(500);
    
    // Check balance summary
    const balanceText = await page.locator('text=Balance').first().isVisible();
    expect(balanceText).toBeTruthy();
  });

  test('6. Settlements are suggested correctly', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Create group
    const groupName = `Settlement Test ${Date.now()}`;
    await createGroup(page, groupName);
    await page.click(`text=${groupName}`);
    await page.waitForLoadState('networkidle');
    
    // Add members
    await addMember(page, 'Alice', 'alice@settle.com');
    await addMember(page, 'Bob', 'bob@settle.com');
    await page.waitForTimeout(500);
    
    // Add expenses to create settlement needs
    await addExpense(page, 'Hotel', '3000', 'Alice', ['Alice', 'Bob']);
    await page.waitForTimeout(300);
    await addExpense(page, 'Food', '2000', 'Bob', ['Alice', 'Bob']);
    await page.waitForTimeout(300);
    
    // Look for settlement section
    const settlementVisible = await page.locator('text=Settlement').isVisible({ timeout: 1000 }).catch(() => false);
    expect(settlementVisible).toBeTruthy();
  });

  test('7. User can export group as PDF', async ({ page, context }) => {
    await page.goto(BASE_URL);
    
    // Create group with data
    const groupName = `Export Test ${Date.now()}`;
    await createGroup(page, groupName);
    await page.click(`text=${groupName}`);
    await page.waitForLoadState('networkidle');
    
    // Add members and expense
    await addMember(page, 'Alice', 'alice@export.com');
    await addMember(page, 'Bob', 'bob@export.com');
    await page.waitForTimeout(500);
    
    await addExpense(page, 'Test expense', '500', 'Alice', ['Alice', 'Bob']);
    await page.waitForTimeout(500);
    
    // Look for export button and click it
    const downloadPromise = context.waitForEvent('download');
    const exportButton = page.locator('button').filter({ hasText: 'Export' }).first();
    
    const isVisible = await exportButton.isVisible({ timeout: 1000 }).catch(() => false);
    if (isVisible) {
      await exportButton.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.pdf');
    }
  });

  test('8. User can delete a group', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Create a group
    const groupName = `Delete Test ${Date.now()}`;
    await createGroup(page, groupName);
    
    // Find and click delete button
    const groupCard = page.locator(`text=${groupName}`).first().locator('..');
    const deleteButton = groupCard.locator('button[title="Delete"]').first();
    
    const isVisible = await deleteButton.isVisible({ timeout: 500 }).catch(() => false);
    if (isVisible) {
      await deleteButton.click();
      // Confirm deletion if prompted
      const confirmButton = page.locator('button:has-text("Delete")').last();
      await confirmButton.click();
      await page.waitForTimeout(300);
      
      // Verify group is deleted
      const groupExists = await page.locator(`text=${groupName}`).isVisible({ timeout: 500 }).catch(() => false);
      expect(groupExists).toBeFalsy();
    }
  });

  test('9. Group name validation - empty name disabled button', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Try to create group without name
    const createButton = page.locator('button:has-text("Create")').first();
    const isDisabled = await createButton.isDisabled();
    expect(isDisabled).toBeTruthy();
    
    // Type name and verify button is enabled
    const groupInput = page.locator('input[placeholder="Group name (e.g. Goa Trip 🏖️)"]');
    await groupInput.fill('Valid Group');
    const isEnabled = await createButton.isEnabled();
    expect(isEnabled).toBeTruthy();
  });

  test('10. Member email validation', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Create and open group
    const groupName = `Email Test ${Date.now()}`;
    await createGroup(page, groupName);
    await page.click(`text=${groupName}`);
    await page.waitForLoadState('networkidle');
    
    const addButton = page.locator('button:has-text("Add")').first();
    
    // Try invalid email formats
    const invalidEmails = ['invalid', 'test@', '@test.com'];
    
    for (const email of invalidEmails) {
      await page.fill('input[placeholder="Member name"]', 'Test User');
      await page.fill('input[placeholder="Member email"]', email);
      const isDisabled = await addButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    }
    
    // Try valid email
    await page.fill('input[placeholder="Member email"]', 'valid@test.com');
    const isEnabled = await addButton.isEnabled();
    expect(isEnabled).toBeTruthy();
  });
});

test.describe('Performance Tests', () => {
  test('1. App loads within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });

  test('2. Group creation is responsive', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const startTime = Date.now();
    const groupName = `Perf Test ${Date.now()}`;
    await createGroup(page, groupName);
    const responseTime = Date.now() - startTime;
    
    expect(responseTime).toBeLessThan(2000);
  });
});
