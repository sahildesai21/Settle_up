# E2E Testing Guide

## Setup

1. **Install Playwright**
```bash
npm install -D @playwright/test
```

2. **Add these scripts to package.json:**
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run tests in UI mode (recommended for development)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run specific test file
```bash
npx playwright test e2e/app.test.ts
```

### Run specific test
```bash
npx playwright test -g "User can create a group"
```

### Debug a specific test
```bash
npm run test:e2e:debug
```

## Test Coverage

The E2E test suite includes:

### Basic Flows (10 tests)
1. ✅ User can create an account
2. ✅ User can create a group
3. ✅ User can add members to a group
4. ✅ User can add expenses and split them
5. ✅ Balances are calculated correctly
6. ✅ Settlements are suggested correctly
7. ✅ User can export group as PDF
8. ✅ User can delete a group
9. ✅ Group name validation - empty name disables button
10. ✅ Member email validation

### Performance Tests (2 tests)
1. ✅ App loads within 3 seconds
2. ✅ Group creation is responsive

## Test Reports

After running tests, view the HTML report:
```bash
npx playwright show-report
```

## Debugging Tips

- Use `page.pause()` to pause execution and inspect the page
- Enable trace with `--trace on` to record network/DOM activity
- Use `--headed` to watch the browser in real-time
- Check `test-results/` folder for screenshots on failures

## CI/CD Integration

For GitHub Actions, add to `.github/workflows/test.yml`:
```yaml
- name: Run E2E tests
  run: |
    npm install -D @playwright/test
    npm run test:e2e
```

## Troubleshooting

**"Page did not navigate"**: Add `waitForLoadState('networkidle')` after navigation

**"Timeout"**: Increase timeout in config or specific test:
```typescript
test.setTimeout(60000); // 60 seconds
```

**"Flaky tests"**: Add explicit waits or use `waitForLoadState('domcontentloaded')`
