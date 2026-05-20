# Python E2E Backend Testing Guide

## Setup

1. **Install Python (3.8+)**
   ```bash
   python3 --version
   ```

2. **Install requests package**
   ```bash
   pip install requests
   # or
   pip3 install requests
   ```

## Running Tests

### Run all E2E backend tests
```bash
python3 test_backend_e2e.py
```

### Run with output redirection
```bash
python3 test_backend_e2e.py | tee test_results.log
```

## Test Coverage

The Python E2E test suite includes 10 comprehensive test suites:

### 1. **User Authentication** ✅
- Tests Firebase signup flow
- Tests Firebase login flow
- Validates authentication tokens

### 2. **Data Structure** ✅
- Validates group structure (id, name, members, expenses, settledPayments)
- Validates member structure (id, name, email)
- Validates expense structure (id, title, amount, paidBy, splitAmong)

### 3. **Group Operations** ✅
- Tests group creation validation
- Tests member addition
- Tests duplicate member detection

### 4. **Balance Calculations** ✅
- Complex multi-member expense scenarios
- Calculates who owes whom
- Validates per-person split amounts
- Tests total expense calculations

### 5. **Settlement Logic** ✅
- Simplifies complex debts
- Generates optimal settlement suggestions
- Validates settlement amounts

### 6. **Email Validation** ✅
- Valid email format detection
- Tests edge cases (user+tag, subdomains, etc.)
- Invalid format detection

### 7. **Form Validations** ✅
- Group name validation (not empty)
- Amount validation (positive numbers only)
- Whitespace handling

### 8. **Data Persistence** ✅
- Simulates localStorage operations
- Tests data storage and retrieval
- Tests data updates

### 9. **Edge Cases** ✅
- Zero members handling
- Single member handling
- Large expense amounts
- Many members (15+) handling

### 10. **Complete End-to-End Workflow** ✅
- Full integration test:
  1. Create group
  2. Add members
  3. Add expenses
  4. Calculate balances
  5. Generate settlements

## Test Results Example

```
════════════════════════════════════════════════════════════════════
SettleUp Backend E2E Testing Suite
════════════════════════════════════════════════════════════════════

═══ Test 1: User Authentication ═══

✓ PASS | Signup test1@example.com
✓ PASS | Login test2@example.com
✓ PASS | Login test3@example.com

═══ Test 2: Firebase Data Structure ═══

✓ PASS | Group structure completeness
✓ PASS | Member structure validity
✓ PASS | Expense structure validity

... (more tests)

═══ Test Summary ═══

Total Test Suites: 10
Passed: 10
Failed: 0
Success Rate: 100.0%
```

## Key Test Scenarios

### Expense Split Calculation
```
Hotel: ₹3000 (paid by Alice, split among 3 people)
- Each person owes: ₹1000

Food: ₹1500 (paid by Bob, split among 3 people)
- Each person owes: ₹500

Result:
- Alice: +3000 (paid) - 1500 (owes) = +1500 (owed to)
- Bob: +1500 (paid) - 1000 - 500 = 0
- Charlie: -1000 - 500 = -1500 (owes)
```

### Settlement Simplification
```
Multiple debts:
- Bob owes Alice: ₹1000
- Charlie owes Alice: ₹500

Simplified to:
- Bob pays Alice: ₹1000
- Charlie pays Alice: ₹500
```

## Advanced Usage

### Modify Test Users
Edit the `TEST_USERS` list at the top of `test_backend_e2e.py`:

```python
TEST_USERS = [
    {"email": "your-email@example.com", "password": "YourPassword123", "name": "Your Name"},
    # Add more test users...
]
```

### Add Custom Tests
Add a new test function:

```python
def test_custom_feature():
    """Test custom feature"""
    log_section("Test: Custom Feature")
    
    # Your test logic here
    result = your_test_function()
    log_test("Custom test name", result, "Optional message")
    
    return result
```

Then add it to the `main()` function:
```python
results["Custom Feature"] = test_custom_feature()
```

## Troubleshooting

### `requests` module not found
```bash
pip install requests
# or
pip3 install requests
```

### Connection errors
- Ensure Firebase is configured correctly
- Check if you have internet connection
- Verify Firebase credentials in `FIREBASE_API_KEY`

### Authentication failures
- Verify Firebase project ID is correct
- Check if test users exist or can be created
- Review Firebase authentication settings

### Assertion errors
- Check if the test data matches expected format
- Review balance calculation logic
- Print intermediate values for debugging

## Performance Baseline

Expected test execution time:
- **With network calls**: 5-15 seconds
- **Without network calls**: < 1 second

## CI/CD Integration

Add to GitHub Actions (`.github/workflows/test-backend.yml`):

```yaml
name: Python E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install requests
      - name: Run E2E tests
        run: python3 test_backend_e2e.py
```

## Notes

- Tests use Firebase production credentials (embedded)
- For security, move credentials to environment variables
- Tests create real Firebase accounts - use test email addresses
- All tests are independent and can run in any order
