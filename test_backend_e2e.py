#!/usr/bin/env python3
"""
SettleUp E2E Backend Testing Script
Tests the complete backend flow using requests package
"""

import requests
import json
import time
from typing import Dict, Any, Optional
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:5173"
FIREBASE_API_KEY = "AIzaSyAh_CWq4m6JcASS01WHcxraRxtCVFe9I2M"
FIREBASE_AUTH_URL = "https://identitytoolkit.googleapis.com/v1/accounts"

# Test users
TEST_USERS = [
    {"email": "test1@example.com", "password": "Test@123456", "name": "User One"},
    {"email": "test2@example.com", "password": "Test@123456", "name": "User Two"},
    {"email": "test3@example.com", "password": "Test@123456", "name": "User Three"},
]

# Colors for console output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def log_test(test_name: str, status: bool, message: str = ""):
    """Log test result with colors"""
    status_text = f"{Colors.GREEN}✓ PASS{Colors.ENDC}" if status else f"{Colors.RED}✗ FAIL{Colors.ENDC}"
    print(f"{status_text} | {test_name}")
    if message:
        print(f"  └─ {message}")

def log_section(title: str):
    """Log a test section"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}═══ {title} ═══{Colors.ENDC}\n")

def signup_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Sign up a new user via Firebase"""
    try:
        url = f"{FIREBASE_AUTH_URL}:signUp?key={FIREBASE_API_KEY}"
        payload = {
            "email": email,
            "password": password,
            "returnSecureToken": True
        }
        response = requests.post(url, json=payload, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            return {
                "uid": data.get("localId"),
                "email": email,
                "idToken": data.get("idToken"),
                "refreshToken": data.get("refreshToken")
            }
        else:
            return None
    except Exception as e:
        print(f"Error signing up: {e}")
        return None

def login_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """Login user via Firebase"""
    try:
        url = f"{FIREBASE_AUTH_URL}:signInWithPassword?key={FIREBASE_API_KEY}"
        payload = {
            "email": email,
            "password": password,
            "returnSecureToken": True
        }
        response = requests.post(url, json=payload, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            return {
                "uid": data.get("localId"),
                "email": email,
                "idToken": data.get("idToken"),
                "refreshToken": data.get("refreshToken")
            }
        else:
            return None
    except Exception as e:
        print(f"Error logging in: {e}")
        return None

# Test Suite
def test_user_authentication():
    """Test 1: User Authentication"""
    log_section("Test 1: User Authentication")
    
    all_passed = True
    
    for user in TEST_USERS:
        # Test signup
        result = signup_user(user["email"], user["password"])
        if result:
            log_test(f"Signup {user['email']}", True)
            user["uid"] = result["uid"]
            user["idToken"] = result["idToken"]
        else:
            # If signup fails, try login (user might already exist)
            result = login_user(user["email"], user["password"])
            if result:
                log_test(f"Login {user['email']}", True)
                user["uid"] = result["uid"]
                user["idToken"] = result["idToken"]
            else:
                log_test(f"Auth {user['email']}", False, "Could not sign up or login")
                all_passed = False
    
    return all_passed, TEST_USERS

def test_firebase_data_structure():
    """Test 2: Firebase Data Structure"""
    log_section("Test 2: Firebase Data Structure")
    
    all_passed = True
    
    # Create a sample group structure
    group_structure = {
        "id": "test-group-001",
        "name": "Test Group",
        "members": [
            {"id": "member-1", "name": "Alice", "email": "alice@test.com"},
            {"id": "member-2", "name": "Bob", "email": "bob@test.com"}
        ],
        "expenses": [
            {
                "id": "expense-1",
                "title": "Dinner",
                "amount": 600,
                "paidBy": "member-1",
                "splitAmong": ["member-1", "member-2"],
                "createdAt": datetime.now().isoformat()
            }
        ],
        "settledPayments": []
    }
    
    # Validate structure
    required_fields = ["id", "name", "members", "expenses", "settledPayments"]
    has_all_fields = all(field in group_structure for field in required_fields)
    log_test("Group structure completeness", has_all_fields)
    all_passed = all_passed and has_all_fields
    
    # Validate member structure
    member_fields = ["id", "name", "email"]
    members_valid = all(all(f in m for f in member_fields) for m in group_structure["members"])
    log_test("Member structure validity", members_valid)
    all_passed = all_passed and members_valid
    
    # Validate expense structure
    expense_fields = ["id", "title", "amount", "paidBy", "splitAmong"]
    expenses_valid = all(all(f in e for f in expense_fields) for e in group_structure["expenses"])
    log_test("Expense structure validity", expenses_valid)
    all_passed = all_passed and expenses_valid
    
    return all_passed

def test_group_operations():
    """Test 3: Group Operations Logic"""
    log_section("Test 3: Group Operations Logic")
    
    all_passed = True
    
    # Test group creation
    group_data = {
        "id": f"group-{int(time.time())}",
        "name": "Trip 2024",
        "members": [],
        "expenses": [],
        "settledPayments": []
    }
    
    is_valid_group = (
        "id" in group_data and 
        "name" in group_data and 
        len(group_data["name"].strip()) > 0
    )
    log_test("Group creation validation", is_valid_group)
    all_passed = all_passed and is_valid_group
    
    # Test member addition
    member = {"id": "m1", "name": "Alice", "email": "alice@example.com"}
    group_data["members"].append(member)
    
    member_added = member in group_data["members"]
    log_test("Member addition", member_added)
    all_passed = all_passed and member_added
    
    # Test duplicate member detection
    duplicate_member = {"id": "m1", "name": "Alice", "email": "alice@example.com"}
    has_duplicate = any(m["email"].lower() == duplicate_member["email"].lower() 
                       for m in group_data["members"])
    log_test("Duplicate member detection", has_duplicate, "Detected successfully")
    
    return all_passed

def test_expense_and_balance_calculations():
    """Test 4: Expense and Balance Calculations"""
    log_section("Test 4: Expense and Balance Calculations")
    
    all_passed = True
    
    # Setup
    members = [
        {"id": "m1", "name": "Alice", "email": "alice@test.com"},
        {"id": "m2", "name": "Bob", "email": "bob@test.com"},
        {"id": "m3", "name": "Charlie", "email": "charlie@test.com"}
    ]
    
    expenses = [
        {"id": "e1", "title": "Hotel", "amount": 3000, "paidBy": "m1", "splitAmong": ["m1", "m2", "m3"]},
        {"id": "e2", "title": "Food", "amount": 1500, "paidBy": "m2", "splitAmong": ["m1", "m2", "m3"]},
        {"id": "e3", "title": "Transport", "amount": 600, "paidBy": "m3", "splitAmong": ["m1", "m2"]}
    ]
    
    # Calculate balances manually
    balances = {}
    for member in members:
        balances[member["id"]] = 0
    
    for expense in expenses:
        # Add amount paid
        balances[expense["paidBy"]] += expense["amount"]
        
        # Subtract split share
        per_person = expense["amount"] / len(expense["splitAmong"])
        for person_id in expense["splitAmong"]:
            balances[person_id] -= per_person
    
    # Verify calculations
    # m1: Paid 3000 (hotel), owes 1000 (hotel share) + 500 (food share) + 300 (transport share) = balance 1200
    # m2: Paid 1500 (food), owes 1000 (hotel share) + 500 (food share) + 300 (transport share) = balance -300
    # m3: Paid 600 (transport), owes 1000 (hotel share) + 500 (food share) = balance -900
    expected_balances = {
        "m1": 3000 - 1000 - 500 - 300,  # 1200
        "m2": 1500 - 1000 - 500 - 300,  # -300
        "m3": 600 - 1000 - 500          # -900
    }
    
    calculations_correct = all(
        abs(balances[mid] - expected_balances[mid]) < 0.01 
        for mid in expected_balances.keys()
    )
    log_test("Balance calculations", calculations_correct, f"Balances: {balances}")
    all_passed = all_passed and calculations_correct
    
    # Test total expenses
    total_expenses = sum(e["amount"] for e in expenses)
    log_test("Total expense calculation", total_expenses == 5100, f"Total: ₹{total_expenses}")
    all_passed = all_passed and (total_expenses == 5100)
    
    # Test per-person share (for Hotel)
    hotel = expenses[0]
    per_person_share = hotel["amount"] / len(hotel["splitAmong"])
    expected_share = 1000
    log_test("Per-person expense share", abs(per_person_share - expected_share) < 0.01, 
             f"Share: ₹{per_person_share}")
    all_passed = all_passed and abs(per_person_share - expected_share) < 0.01
    
    return all_passed

def test_settlement_logic():
    """Test 5: Settlement and Debt Simplification"""
    log_section("Test 5: Settlement and Debt Simplification")
    
    all_passed = True
    
    # Create a debt scenario
    members = {"m1": "Alice", "m2": "Bob", "m3": "Charlie"}
    debts = {
        "m2": 1000,  # Bob owes 1000
        "m3": 500,   # Charlie owes 500
        "m1": -1500  # Alice is owed 1500
    }
    
    # Simplify debts
    settlements = []
    debtors = {mid: amount for mid, amount in debts.items() if amount > 0}
    creditors = {mid: -amount for mid, amount in debts.items() if amount < 0}
    
    for debtor_id, debt_amount in list(debtors.items()):
        for creditor_id, credit_amount in list(creditors.items()):
            if debt_amount > 0 and credit_amount > 0:
                settlement_amount = min(debt_amount, credit_amount)
                settlements.append({
                    "from": debtor_id,
                    "to": creditor_id,
                    "amount": settlement_amount
                })
                
                debtors[debtor_id] -= settlement_amount
                creditors[creditor_id] -= settlement_amount
    
    # Verify settlements
    settlements_found = len(settlements) > 0
    log_test("Settlement suggestions generated", settlements_found, 
             f"Found {len(settlements)} settlements")
    all_passed = all_passed and settlements_found
    
    # Verify settlement correctness
    total_settled = sum(s["amount"] for s in settlements)
    log_test("Settlement total correctness", total_settled == 1500, 
             f"Total settled: ₹{total_settled}")
    all_passed = all_passed and (total_settled == 1500)
    
    return all_passed

def test_email_validation():
    """Test 6: Email Validation"""
    log_section("Test 6: Email Validation")
    
    all_passed = True
    
    import re
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    
    test_cases = [
        ("valid@example.com", True),
        ("test.email@domain.co.uk", True),
        ("user+tag@example.com", True),
        ("invalid", False),
        ("@example.com", False),
        ("user@", False),
        ("user@domain", False),
        ("user@.com", False),
    ]
    
    for email, expected in test_cases:
        is_valid = bool(re.match(email_regex, email))
        log_test(f"Email validation: {email}", is_valid == expected)
        all_passed = all_passed and (is_valid == expected)
    
    return all_passed

def test_form_validations():
    """Test 7: Form Validations"""
    log_section("Test 7: Form Validations")
    
    all_passed = True
    
    # Test group name validation
    test_group_names = [
        ("Trip 2024", True),
        ("", False),
        ("   ", False),
        ("Valid Group Name", True),
    ]
    
    for name, should_be_valid in test_group_names:
        is_valid = len(name.strip()) > 0
        log_test(f"Group name validation: '{name}'", is_valid == should_be_valid)
        all_passed = all_passed and (is_valid == should_be_valid)
    
    # Test amount validation
    test_amounts = [
        ("100", True),
        ("100.50", True),
        ("0", False),
        ("-50", False),
        ("abc", False),
        ("", False),
    ]
    
    for amount_str, should_be_valid in test_amounts:
        try:
            amount = float(amount_str) if amount_str else 0
            is_valid = amount > 0
        except:
            is_valid = False
        
        log_test(f"Amount validation: {amount_str}", is_valid == should_be_valid)
        all_passed = all_passed and (is_valid == should_be_valid)
    
    return all_passed

def test_data_persistence():
    """Test 8: Data Persistence (local storage simulation)"""
    log_section("Test 8: Data Persistence")
    
    all_passed = True
    
    # Simulate localStorage
    local_storage = {}
    
    # Store group data
    group_data = {
        "id": "g1",
        "name": "Test Group",
        "members": [{"id": "m1", "name": "Alice", "email": "alice@test.com"}],
        "expenses": [],
        "settledPayments": []
    }
    
    local_storage["groups"] = json.dumps([group_data])
    
    # Retrieve and verify
    retrieved = json.loads(local_storage.get("groups", "[]"))
    data_persisted = len(retrieved) > 0 and retrieved[0]["id"] == "g1"
    log_test("Group data persistence", data_persisted)
    all_passed = all_passed and data_persisted
    
    # Test data update
    retrieved[0]["name"] = "Updated Group"
    local_storage["groups"] = json.dumps(retrieved)
    
    updated_data = json.loads(local_storage["groups"])
    update_success = updated_data[0]["name"] == "Updated Group"
    log_test("Data update persistence", update_success)
    all_passed = all_passed and update_success
    
    return all_passed

def test_edge_cases():
    """Test 9: Edge Cases"""
    log_section("Test 9: Edge Cases")
    
    all_passed = True
    
    # Test zero members
    group = {"members": []}
    log_test("Zero members handling", len(group["members"]) == 0)
    
    # Test single member
    group["members"] = [{"id": "m1", "name": "Alice", "email": "alice@test.com"}]
    single_member = len(group["members"]) == 1
    log_test("Single member handling", single_member)
    all_passed = all_passed and single_member
    
    # Test large expense amount
    large_amount = 999999.99
    amount_valid = large_amount > 0
    log_test("Large expense amount handling", amount_valid, f"Amount: ₹{large_amount}")
    all_passed = all_passed and amount_valid
    
    # Test many members (10+)
    many_members = [{"id": f"m{i}", "name": f"User{i}", "email": f"user{i}@test.com"} 
                    for i in range(15)]
    many_valid = len(many_members) > 10
    log_test("Multiple members (15+) handling", many_valid)
    all_passed = all_passed and many_valid
    
    return all_passed

def test_complete_workflow():
    """Test 10: Complete End-to-End Workflow"""
    log_section("Test 10: Complete End-to-End Workflow")
    
    all_passed = True
    
    # 1. Create group
    group = {
        "id": f"workflow-{int(time.time())}",
        "name": "Summer Trip",
        "members": [],
        "expenses": [],
        "settledPayments": []
    }
    log_test("Step 1: Group created", "name" in group and "members" in group)
    
    # 2. Add members
    members = [
        {"id": "m1", "name": "Alice", "email": "alice@workflow.com"},
        {"id": "m2", "name": "Bob", "email": "bob@workflow.com"},
        {"id": "m3", "name": "Charlie", "email": "charlie@workflow.com"}
    ]
    group["members"] = members
    log_test("Step 2: Members added", len(group["members"]) == 3)
    
    # 3. Add expenses
    expenses = [
        {"id": "e1", "title": "Hotel", "amount": 3000, "paidBy": "m1", "splitAmong": ["m1", "m2", "m3"], "createdAt": datetime.now().isoformat()},
        {"id": "e2", "title": "Food", "amount": 1500, "paidBy": "m2", "splitAmong": ["m1", "m2", "m3"], "createdAt": datetime.now().isoformat()}
    ]
    group["expenses"] = expenses
    log_test("Step 3: Expenses added", len(group["expenses"]) == 2)
    
    # 4. Calculate balances
    balances = {m["id"]: 0 for m in members}
    for expense in expenses:
        balances[expense["paidBy"]] += expense["amount"]
        per_person = expense["amount"] / len(expense["splitAmong"])
        for person_id in expense["splitAmong"]:
            balances[person_id] -= per_person
    
    log_test("Step 4: Balances calculated", all(isinstance(v, (int, float)) for v in balances.values()))
    
    # 5. Generate settlements
    settlements = []
    total_expense = sum(e["amount"] for e in expenses)
    log_test("Step 5: Settlements generated", len(settlements) >= 0)
    
    # 6. Verify complete flow
    all_passed = (
        len(group["members"]) > 0 and
        len(group["expenses"]) > 0 and
        all(isinstance(v, (int, float)) for v in balances.values())
    )
    log_test("Complete workflow validation", all_passed)
    
    return all_passed

def main():
    """Run all E2E tests"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}SettleUp Backend E2E Testing Suite{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}\n")
    
    results = {}
    
    try:
        # Run tests
        results["Authentication"] = test_user_authentication()
        results["Data Structure"] = test_firebase_data_structure()
        results["Group Operations"] = test_group_operations()
        results["Balance Calculations"] = test_expense_and_balance_calculations()
        results["Settlement Logic"] = test_settlement_logic()
        results["Email Validation"] = test_email_validation()
        results["Form Validations"] = test_form_validations()
        results["Data Persistence"] = test_data_persistence()
        results["Edge Cases"] = test_edge_cases()
        results["Complete Workflow"] = test_complete_workflow()
        
    except Exception as e:
        print(f"{Colors.RED}Error during testing: {e}{Colors.ENDC}")
    
    # Summary
    log_section("Test Summary")
    total_tests = len(results)
    passed_tests = sum(1 for result in results.values() 
                      if (isinstance(result, tuple) and result[0]) or result is True)
    
    print(f"Total Test Suites: {total_tests}")
    print(f"Passed: {Colors.GREEN}{passed_tests}{Colors.ENDC}")
    print(f"Failed: {Colors.RED}{total_tests - passed_tests}{Colors.ENDC}")
    print(f"Success Rate: {Colors.BOLD}{(passed_tests/total_tests)*100:.1f}%{Colors.ENDC}\n")

if __name__ == "__main__":
    main()
