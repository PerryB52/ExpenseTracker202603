# Expense Tracker - AGENTS.md

This document serves as context and guidelines for AI agents working in this codebase.

---

## 1. Tech Stack Overview

- **Framework**: Ionic 8 (`@ionic/angular` v8.0.0) + Angular 20 (`@angular/core` v20.3.17)
- **Native Runtime**: Capacitor 8 (`@capacitor/core` v8.2.0)
- **Database & Storage**:
  - Native SQLite: `@capacitor-community/sqlite` v8.0.1
  - Web Fallback: `jeep-sqlite` v2.8.0 / `sql.js` v1.11.0
  - App Initializer: Database initialized before Angular bootstrapping via `APP_INITIALIZER` provider in `app.module.ts`.
- **State Management**: Angular 17+ Signals (`signal`, `computed`).
- **Styling & UI**: Ionic UI components (`IonModal`, `IonFab`, `IonAlert`, `IonToast`) + SCSS.

---

## 2. Directory & Architectural Mapping

```
src/app/
├── app-routing.module.ts       # Root router (redirects to /tabs)
├── app.module.ts               # App root module with APP_INITIALIZER database hook
├── components/
│   └── month-picker-modal/     # Shared Month/Year grid modal picker used across Tab 1 & Tab 2
├── models/
│   └── expense.model.ts        # Shared TypeScript interfaces (Expense, Category, chart & form models)
├── services/
│   ├── database.service.ts     # SQLite lifecycle, schema creation, migrations, seeding
│   ├── data.service.ts         # Central data store (Signals) & SQLite CRUD logic
│   └── csv.service.ts          # RFC-4180 CSV export, backup restore, and external statement import
├── utils/
│   ├── chart.utils.ts          # Pure analytics grouping, history bar calculation, & SVG pie chart math
│   ├── currency.utils.ts       # Currency code to symbol mapping
│   └── date.utils.ts           # Local date parsing/formatting, week Monday math, month shifting
├── tab1/                       # Tab 1: Expense feed, date grouping, add/edit modal
├── tab2/                       # Tab 2: Analytics, dynamic SVG Pie chart, Bar chart history, category drill-down
├── tab3/                       # Tab 3: Category/Subcategory editor, CSV Import/Export, settings
└── tabs/                       # Tab layout wrapper and bottom tab bar navigation
```

---

## 3. Data Models & Schemas

### TypeScript Interfaces (`src/app/models/expense.model.ts`)

```typescript
export interface Expense {
  id: string;
  amount: number;
  category: string;
  subcategory?: string;
  description: string;
  date: string;       // ISO format (YYYY-MM-DD or full ISO)
  currency: string;   // e.g. "USD", "EUR", "RON"
}

export interface Category {
  name: string;
  subcategories: string[];
}
```

### SQLite Database Schema (`expensetracker_db`)

- **`expenses`**: `(id TEXT PRIMARY KEY, amount REAL, category TEXT, subcategory TEXT, description TEXT, date TEXT, currency TEXT)`
- **`categories`**: `(name TEXT PRIMARY KEY)`
- **`subcategories`**: `(parent_category TEXT, name TEXT, PRIMARY KEY(parent_category, name))`
- **`settings`**: `(key TEXT PRIMARY KEY, value TEXT)`

---

## 4. Design & Coding Conventions

1. **State & Reactive Updates**:
   - Use Angular `signal` and `computed` primitives for local and shared state.
   - Component templates bind directly to read-only signals exposed by `DataService` (e.g., `dataService.expenses()`, `dataService.categories()`).

2. **Database Integrity & Persistence**:
   - Whenever updating or deleting data, run the corresponding SQL statement via `DatabaseService.getDb()`, call `DatabaseService.saveStore()` (for web persistency), and update the local Angular `signal`.
   - Never mutate state signals directly without updating SQLite persistence.

3. **Modals & UI Controls**:
   - Use `@ViewChild` to control `IonModal` and `MonthPickerModalComponent` instances.
   - Use `ToastController` for light notifications and validation feedback.
   - Use `AlertController` for destructive operations (e.g. data wipe).

4. **CSV Handling**:
   - All CSV parsing and export logic lives in `CsvService` (`src/app/services/csv.service.ts`), which delegates bulk database replacement to `DataService.replaceAllData()`.
   - Maintain support for both native backup CSV format and external statement CSV imports with header parsing.

5. **Context Maintenance**:
   - When creating new SQLite tables, data models, routes, or global services, always update `AGENTS.md` in the same commit/task.

6. **Tab Navigation & Month Synchronization**:
   - `DataService.selectedExpenseMonth` stores Tab 1's active month filter.
   - When navigating from Tab 1 to Tab 2, Tab 2 synchronizes its view to Tab 1's active month via `ionViewWillEnter()`.
   - This synchronization is strictly one-way: navigating between months or timeframes in Tab 2 does not affect Tab 1's selected month.

---

## 5. Helpful File References

- Domain Models: [`expense.model.ts`](file:///d:/01%20Projects%20Coding/ExpenseTracker202603/expense-tracker/src/app/models/expense.model.ts)
- Database Lifecycle: [`database.service.ts`](file:///d:/01%20Projects%20Coding/ExpenseTracker202603/expense-tracker/src/app/services/database.service.ts)
- Data Store & Signals: [`data.service.ts`](file:///d:/01%20Projects%20Coding/ExpenseTracker202603/expense-tracker/src/app/services/data.service.ts)
- CSV Import/Export: [`csv.service.ts`](file:///d:/01%20Projects%20Coding/ExpenseTracker202603/expense-tracker/src/app/services/csv.service.ts)
- Chart & Analytics Math: [`chart.utils.ts`](file:///d:/01%20Projects%20Coding/ExpenseTracker202603/expense-tracker/src/app/utils/chart.utils.ts)
- Main Expense List: [`tab1.page.ts`](file:///d:/01%20Projects%20Coding/ExpenseTracker202603/expense-tracker/src/app/tab1/tab1.page.ts)
- Analytics & Charts: [`tab2.page.ts`](file:///d:/01%20Projects%20Coding/ExpenseTracker202603/expense-tracker/src/app/tab2/tab2.page.ts)
- Settings & Categories: [`tab3.page.ts`](file:///d:/01%20Projects%20Coding/ExpenseTracker202603/expense-tracker/src/app/tab3/tab3.page.ts)
