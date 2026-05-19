# ERP System - Multi-Company & Investors Module
## Prompt for Z.ai (GLM 5.1)

---

## 1. Multi-Company Architecture

### The Concept
The system allows ONE admin to create and manage MULTIPLE companies. Each company is completely isolated with its own:
- Settings, warehouses, items, accounts, customers, suppliers
- Users (can be different per company or shared)
- Financial data, reports

### Company Creation Flow (Setup Wizard)

When creating a new company, the system runs an automated SETUP WIZARD:

```
┌─────────────────────────────────────────────────────────────┐
│                    NEW COMPANY SETUP                         │
├─────────────────────────────────────────────────────────────┤
│ Step 1: Company Info                                         │
│   - Company Name, Legal Name, Tax ID, Address, Logo          │
│   - Base Currency (default: EGP)                             │
│   - Fiscal Year Start Date                                   │
│                                                              │
│ Step 2: Chart of Accounts Setup                              │
│   - Choose template: Trading / Manufacturing / Services      │
│   - Auto-generate default accounts based on template         │
│   - Show preview before confirm                              │
│                                                              │
│ Step 3: Warehouses Setup                                     │
│   - Add default warehouse (Main Warehouse)                   │
│   - Option to add more warehouses                            │
│   - Set warehouse manager                                    │
│                                                              │
│ Step 4: Banks & Cash Setup                                   │
│   - Add bank accounts (Bank Name, Account No, Branch)        │
│   - Add cash boxes (Cashier 1, Cashier 2, etc.)              │
│   - Each creates corresponding accounts in Chart of Accounts │
│                                                              │
│ Step 5: Units of Measure                                     │
│   - Pre-filled: PCS, KG, LTR, BOX, MTR                       │
│   - Add custom units                                         │
│                                                              │
│ Step 6: Tax Settings                                         │
│   - Default VAT rate (default: 14%)                          │
│   - Tax registration number                                  │
│                                                              │
│ Step 7: Review & Confirm                                     │
│   - Show summary of all settings                             │
│   - Confirm to create company                                │
│   - System auto-creates all defaults                         │
└─────────────────────────────────────────────────────────────┘
```

### What Gets Auto-Created Per Company

| Category | Auto-Created Items |
|----------|-------------------|
| **Chart of Accounts** | Full tree (Assets, Liabilities, Equity, Revenue, Expenses) based on template |
| **Banks** | Each bank account → auto-creates account under "Banks" (1102) |
| **Cash Boxes** | Each cash box → auto-creates account under "Cash" (1101) |
| **Warehouses** | Main Warehouse + any additional warehouses |
| **Units** | PCS, KG, LTR, BOX, MTR |
| **Default Accounts Mapping** | Sales Account, Purchase Account, Inventory Account, COGS Account |

### Company Switching

```
┌────────────────────────────────────────┐
│  [Company Logo]  Company Name    [▼]   │
│                                        │
│  Switch Company:                       │
│  ├── ⚫ Company A (Active)             │
│  ├── ○ Company B                       │
│  ├── ○ Company C                       │
│  └── + Add New Company                 │
└────────────────────────────────────────┘
```

- User sees ONLY companies they have access to
- Switching company reloads all data for that company
- URL includes company slug or ID
- Session stores current company context

### Data Isolation Rules

```
Rule 1: Every table has company_id column
Rule 2: All queries filter by current company_id
Rule 3: Users can belong to multiple companies with different roles
Rule 4: Reports show data for ONE company at a time
Rule 5: Super Admin can see all companies (read-only or full access)
```

---

## 2. Investors Module (نظام المستثمرين)

### The Concept
Track investors, their capital contributions, profit shares, and withdrawals. This is part of the Accounting module but treated as a separate subsystem.

### Core Entities

#### 2.1 Investor (المستثمر)

| Field | Description |
|-------|-------------|
| Investor ID | Unique code (INV-001) |
| Full Name | Investor name |
| Phone / Email | Contact info |
| National ID / Passport | Identification |
| Join Date | When they joined |
| Status | Active / Inactive |

#### 2.2 Investment (الاستثمار / رأس المال)

| Field | Description |
|-------|-------------|
| Investment ID | Unique code |
| Investor ID | Link to investor |
| Date | Contribution date |
| Amount | Capital amount |
| Type | Cash / Bank Transfer / Asset |
| Account | Which bank/cash account received it |
| Notes | Description |

#### 2.3 Profit Distribution (توزيع الأرباح)

| Field | Description |
|-------|-------------|
| Distribution ID | Unique code |
| Period | Which period (Q1 2026, H1 2026, etc.) |
| Total Profit | Company profit for period |
| Distribution Date | When distributed |
| Status | Draft / Distributed |

#### 2.4 Investor Share (حصة المستثمر)

| Field | Description |
|-------|-------------|
| Investor ID | Link to investor |
| Distribution ID | Link to distribution |
| Ownership % | Percentage of total capital |
| Profit Share | Their share of profit (Total Profit × Ownership %) |
| Status | Pending / Paid |
| Payment Date | When paid |

#### 2.5 Withdrawal (سحب رأس المال أو أرباح)

| Field | Description |
|-------|-------------|
| Withdrawal ID | Unique code |
| Investor ID | Link to investor |
| Date | Withdrawal date |
| Amount | Amount withdrawn |
| Type | Capital Return / Profit Withdrawal |
| Account | Paid from which account |
| Notes | Reason |

### Investor Accounting Integration

```
When Investor Contributes Capital:
  Debit: Cash/Bank Account (1101/1102)
  Credit: Capital - Investor Name (3101-INV001)

  Also creates:
  - Investor record
  - Investment record
  - Updates total capital

When Profit is Distributed:
  Debit: Retained Earnings (3201)
  Credit: Profit Payable - Investor (2103-INV001)

  When Actually Paid:
  Debit: Profit Payable - Investor (2103-INV001)
  Credit: Cash/Bank (1101/1102)

When Investor Withdraws Capital:
  Debit: Capital - Investor (3101-INV001)
  Credit: Cash/Bank (1101/1102)
```

### Investor Reports

| Report | Description |
|--------|-------------|
| Investor Ledger | All transactions per investor (contributions, profits, withdrawals) |
| Capital Summary | Total capital, each investor's share %, current value |
| Profit Distribution History | All distributions with amounts per investor |
| ROI Report | Return on investment per investor over time |
| Withdrawal History | All withdrawals with reasons |

### Investor Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                    INVESTOR DASHBOARD                        │
├─────────────────────────────────────────────────────────────┤
│  Total Capital: EGP 5,000,000                                │
│  Number of Investors: 5                                      │
│  Total Profit Distributed: EGP 750,000                       │
│  Total Withdrawals: EGP 200,000                              │
├─────────────────────────────────────────────────────────────┤
│  Investors List:                                             │
│  ┌──────────┬─────────────┬──────────┬───────────┬─────────┐│
│  │ Name     │ Capital     │ Share %  │ Profit    │ Balance ││
│  ├──────────┼─────────────┼──────────┼───────────┼─────────┤│
│  │ Ahmed    │ 2,000,000   │ 40%      │ 300,000   │ 300,000 ││
│  │ Mohamed  │ 1,500,000   │ 30%      │ 225,000   │ 225,000 ││
│  │ Sara     │ 1,000,000   │ 20%      │ 150,000   │ 150,000 ││
│  │ Ali      │ 500,000     │ 10%      │ 75,000    │ 75,000  ││
│  └──────────┴─────────────┴──────────┴───────────┴─────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Enhanced Chart of Accounts for Investors

```
3-EQUITY (حقوق الملكية)
├── 31-Capital (رأس المال)
│   ├── 3101-Capital - Ahmed (رأس مال - أحمد)
│   ├── 3102-Capital - Mohamed (رأس مال - محمد)
│   ├── 3103-Capital - Sara (رأس مال - سارة)
│   └── 3104-Capital - Ali (رأس مال - علي)
│
└── 32-Retained Earnings (الأرباح المحتجزة)
    ├── 3201-Retained Earnings (أرباح محتجزة)
    └── 3202-Current Year Profit (ربح السنة الحالية)

2-LIABILITIES (الخصوم)
└── 21-Current Liabilities (خصوم متداولة)
    ├── 2101-Accounts Payable (موردين)
    ├── 2102-Tax Payable (ضريبة مستحقة)
    ├── 2103-Salaries Payable (مرتبات مستحقة)
    └── 2104-Profit Payable to Investors (أرباح مستحقة للمستثمرين)
        ├── 2104-01-Profit Payable - Ahmed
        ├── 2104-02-Profit Payable - Mohamed
        ├── 2104-03-Profit Payable - Sara
        └── 2104-04-Profit Payable - Ali
```

---

## 4. User Flow Guide (دليل تدفق المستخدم)

### 4.1 First-Time Setup (Super Admin)

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Login  │───▶│ Create First│───▶│ Run Setup   │───▶│ Add Users   │
│  Page   │    │   Company   │    │   Wizard    │    │  & Roles    │
└─────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │
      ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Dashboard  │───▶│ Add Items   │───▶│ Start       │
│  (Empty)    │    │ & Customers │    │ Operations  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 4.2 Daily Sales Flow (Sales User)

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Login  │───▶│ Select      │───▶│ Dashboard   │───▶│ New Sales   │
│         │    │  Company    │    │             │    │   Invoice   │
└─────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                           │
      ┌────────────────────────────────────────────────────┘
      ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Select      │───▶│ Add Items   │───▶│ Review      │───▶│ Save as     │
│ Customer    │    │ (Qty/Price) │    │ Totals      │    │   DRAFT     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
      ┌─────────────────────────────────────────────────────────┘
      ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  CONFIRM    │───▶│ System      │───▶│ Print       │───▶│ Collect     │
│  Invoice    │    │ Auto-deducts│    │ Invoice     │    │ Payment     │
│             │    │ stock & posts│    │ (A4)        │    │ (optional)  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 4.3 Daily Purchase Flow (Purchase User)

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Login  │───▶│ Select      │───▶│ New Purchase│───▶│ Select      │
│         │    │  Company    │    │   Invoice   │    │ Supplier    │
└─────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                           │
      ┌────────────────────────────────────────────────────┘
      ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Select      │───▶│ Add Items   │───▶│ Review      │───▶│ CONFIRM     │
│ Warehouse   │    │ (Qty/Price) │    │ Totals      │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
      ┌─────────────────────────────────────────────────────────┘
      ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ System      │───▶│ Print       │───▶│ Pay         │
│ Auto-adds   │    │ Invoice     │    │ Supplier    │
│ to stock    │    │             │    │ (optional)  │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 4.4 Accounting Flow (Accountant)

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Login  │───▶│ Select      │───▶│ Review Auto-│───▶│ Post        │
│         │    │  Company    │    │ generated   │    │ Entries     │
└─────────┘    └─────────────┘    │  Entries    │    │             │
                                  └─────────────┘    └─────────────┘
                                                           │
      ┌────────────────────────────────────────────────────┘
      ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Manual      │───▶│ Create      │───▶│ Add Lines   │───▶│ Review      │
│ Entry       │    │ Journal     │    │ (Dr/Cr)     │    │ Balance     │
│ (if needed) │    │ Entry       │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
      ┌─────────────────────────────────────────────────────────┘
      ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  POST       │───▶│ Generate    │───▶│ Review      │
│  Entry      │    │ Reports     │    │ Financials  │
└─────────────┘    │ (TB, P&L)   │    │             │
                   └─────────────┘    └─────────────┘
```

### 4.5 Investor Management Flow (Admin/Accountant)

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Login  │───▶│ Select      │───▶│ Investors   │───▶│ Add New     │
│         │    │  Company    │    │   Module    │    │  Investor   │
└─────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                           │
      ┌────────────────────────────────────────────────────┘
      ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Record      │───▶│ View        │───▶│ Period End  │───▶│ Calculate   │
│ Capital     │    │ Investor    │    │ (Quarterly) │    │  Profits    │
│ Contribution│    │  Ledger     │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
      ┌─────────────────────────────────────────────────────────┘
      ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Distribute  │───▶│ Pay         │───▶│ Record      │
│ Profits     │    │ Investors   │    │ Withdrawals │
│ (by %)      │    │             │    │ (if any)    │
└─────────────┘    └─────────────┘    └─────────────┘
```

### 4.6 Multi-Company Switching Flow

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Login  │───▶│ See List of │───▶│ Select      │───▶│ Dashboard   │
│         │    │  Companies  │    │  Company A  │    │  Company A  │
└─────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                          │
      ┌───────────────────────────────────┘
      ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Work in     │───▶│ Switch to   │───▶│ Dashboard   │
│ Company A   │    │ Company B   │    │  Company B  │
│             │    │ (from dropdown)   │  (different data)   │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## 5. Screens & UI Flow

### 5.1 Company Selector Screen

```
┌─────────────────────────────────────────────────────────────┐
│  Welcome, Ahmed!                                            │
│  Select a company to manage:                                │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ [Logo]          │  │ [Logo]          │  │    [+]      │ │
│  │ Company A       │  │ Company B       │  │             │ │
│  │ Trading Co.     │  │ Manufacturing   │  │  Add New    │ │
│  │ Role: Admin     │  │ Role: Accountant│  │  Company    │ │
│  │                 │  │                 │  │             │ │
│  │ [Enter]         │  │ [Enter]         │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│                                                             │
│  Recent Activity: Last login to Company A - 2 hours ago     │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Setup Wizard Screens

```
┌─────────────────────────────────────────────────────────────┐
│  Setup New Company - Step 3 of 7                            │
│  ─────────────────────────────────                          │
│                                                             │
│  Warehouses Setup                                           │
│                                                             │
│  Default Warehouse:                                         │
│  [Main Warehouse                    ] [Auto-create] ✓       │
│                                                             │
│  Additional Warehouses:                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Warehouse Name    │ Location      │ Manager    │ ✕  │   │
│  ├───────────────────┼───────────────┼────────────┼────┤   │
│  │ Alexandria WH     │ Alexandria    │ Mohamed    │ ✕  │   │
│  │ Cairo Branch      │ Nasr City     │ Sara       │ ✕  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [+ Add Warehouse]                                          │
│                                                             │
│  [Back]              [Skip]              [Next: Units] →   │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Investor Management Screen

```
┌─────────────────────────────────────────────────────────────┐
│  Investors > All Investors                    [+ Add Investor]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Summary Cards:                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ Total Capital│ │ Investors    │ │ Avg ROI      │        │
│  │ EGP 5,000,000│ │ 4 Active     │ │ 15%          │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Name    │ Capital    │ Share % │ Profit Share │ Status│   │
│  ├─────────┼────────────┼─────────┼──────────────┼───────┤   │
│  │ Ahmed   │ 2,000,000  │ 40%     │ 300,000      │ Active│   │
│  │ Mohamed │ 1,500,000  │ 30%     │ 225,000      │ Active│   │
│  │ Sara    │ 1,000,000  │ 20%     │ 150,000      │ Active│   │
│  │ Ali     │ 500,000    │ 10%     │ 75,000       │ Active│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [View Ledger] [Record Contribution] [Distribute Profits]   │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Investor Ledger Screen

```
┌─────────────────────────────────────────────────────────────┐
│  Investors > Ahmed's Ledger                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Investor Info:                                             │
│  Name: Ahmed Mohamed | Joined: 2025-01-15 | Status: Active │
│  Total Contributions: 2,000,000 | Current Balance: 300,000  │
│                                                             │
│  Transaction History:                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Date       │ Type           │ Amount    │ Balance   │   │
│  ├────────────┼────────────────┼───────────┼───────────┤   │
│  │ 2025-01-15 │ Capital In     │ 2,000,000 │ 2,000,000 │   │
│  │ 2025-06-30 │ Profit Share   │ 150,000   │ 150,000   │   │
│  │ 2025-12-31 │ Profit Share   │ 150,000   │ 300,000   │   │
│  │ 2026-03-15 │ Withdrawal     │ (50,000)  │ 250,000   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Record Contribution] [Pay Profit] [Record Withdrawal]     │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Data Model (Multi-Company + Investors)

### Core Tables

```
companies
├── id, name, legal_name, tax_id, logo, address, phone, email
├── base_currency_id, fiscal_year_start, vat_rate
├── status (active/inactive), created_at

company_users (junction table)
├── company_id, user_id, role
├── joined_at, is_active

investors
├── id, company_id, investor_code, full_name
├── phone, email, national_id, join_date, status

investments
├── id, company_id, investor_id, date, amount
├── type (cash/bank/asset), account_id, notes

profit_distributions
├── id, company_id, period_name, period_start, period_end
├── total_profit, distribution_date, status

investor_shares
├── id, distribution_id, investor_id, ownership_percent
├── profit_share, status, payment_date

withdrawals
├── id, company_id, investor_id, date, amount
├── type (capital/profit), account_id, notes
```

---

## 7. Prompt for Z.ai

Use this exact prompt with Z.ai:

```
I want to build an ERP system with these specific requirements:

1. MULTI-COMPANY SUPPORT:
   - One admin can create and manage multiple companies
   - Each company has completely isolated data
   - Company switching via dropdown in header
   - Setup wizard runs when creating new company (7 steps: company info, chart of accounts template, warehouses, banks/cash, units, tax, review)
   - Auto-creates defaults per company: chart of accounts, warehouses, bank accounts, cash boxes, units

2. INVESTORS MODULE:
   - Track investors and their capital contributions
   - Calculate ownership percentage automatically
   - Profit distribution by percentage
   - Record withdrawals (capital return or profit withdrawal)
   - Investor ledger showing all transactions
   - ROI reporting
   - Integration with chart of accounts (auto-creates capital accounts and profit payable accounts per investor)

3. USER FLOWS:
   - First-time setup flow for super admin
   - Daily sales flow (create → confirm → print → collect)
   - Daily purchase flow (create → confirm → print → pay)
   - Accounting flow (review auto-entries → post → manual entries → reports)
   - Investor management flow (add investor → record contribution → period end → calculate profits → distribute → pay)
   - Multi-company switching flow

4. CORE MODULES (from previous spec):
   - Settings (company, currency, units, users, roles)
   - Inventory (warehouses, items, categories, stock movements, FIFO)
   - Accounting (chart of accounts, journal entries, double-entry)
   - Sales (customers, invoices, payments)
   - Purchase (suppliers, invoices, payments)
   - Reports (financial, inventory, sales/purchase)

Please provide:
1. Complete data model for multi-company + investors
2. Detailed user flow diagrams for all 6 flows
3. UI mockup descriptions for key screens
4. Business rules and validation logic
5. How investors module integrates with accounting
6. Setup wizard step-by-step logic
```
