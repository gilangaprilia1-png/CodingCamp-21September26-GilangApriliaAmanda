# 💰 Expense & Budget Visualizer

A clean, modern, single-page web application for tracking personal expenses and visualizing spending patterns — built with pure HTML, CSS, and Vanilla JavaScript. No frameworks, no backend, no build step required.

---

## 📸 Features at a Glance

| Feature | Details |
|---|---|
| **Total Balance** | Live spending total formatted as Indonesian Rupiah (Rp) |
| **Add Transaction** | Form with validation — name, amount, category |
| **Transaction List** | Scrollable, newest-first, with per-item delete |
| **Pie Chart** | Chart.js spending breakdown by category |
| **Monthly Summary** | Stats filtered by selected month |
| **Sort Transactions** | 5 sort options without mutating stored data |
| **Dark / Light Mode** | Theme toggle persisted in Local Storage |
| **Local Storage** | All data survives page refresh |
| **Responsive** | Fully mobile-friendly, no horizontal scroll |

---

## 🏗️ Project Structure

```
/
├── .kiro/                  # Kiro IDE configuration (auto-generated)
├── css/
│   └── style.css           # All styles — light mode, dark mode, responsive
├── js/
│   └── script.js           # All application logic
├── index.html              # Single HTML page — semantic, accessible markup
└── README.md               # This file
```

> **Constraint respected:** exactly one CSS file and one JavaScript file, as required.

---

## 🚀 How to Run Locally

### Option 1 — Open directly (simplest)
1. Clone or download this repository.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, or Safari).
3. That's it — no install, no build step, no server needed.

### Option 2 — Local development server (recommended to avoid CORS quirks)

Using Python (ships with macOS / most Linux distros):
```bash
# Python 3
python -m http.server 5500

# Then open http://localhost:5500 in your browser
```

Using Node.js:
```bash
npx serve .
# Then follow the URL printed in the terminal
```

Using VS Code / Kiro:
- Install the **Live Server** extension and click **Go Live** in the status bar.

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| **HTML5** | Semantic page structure, accessible markup |
| **CSS3** | Custom Properties, Grid, Flexbox, animations, media queries |
| **Vanilla JavaScript (ES6+)** | All application logic — no frameworks |
| **[Chart.js v4](https://www.chartjs.org/)** | Pie chart for spending distribution (loaded via CDN) |
| **Browser Local Storage API** | Client-side data persistence |

No npm, no bundler, no transpiler — the project runs directly in the browser.

---

## 📦 Local Storage

All data is stored in the browser's Local Storage under two keys:

| Key | Value |
|---|---|
| `expenseVisualizer_transactions` | JSON array of transaction objects |
| `expenseVisualizer_theme` | `"light"` or `"dark"` |

### Transaction Object Shape

```json
{
  "id":       "lz3k4abc1",
  "itemName": "Lunch at warung",
  "amount":   35000,
  "category": "Food",
  "date":     "2026-09-25T11:30:00.000Z"
}
```

### How it works

1. On page load, `loadTransactions()` reads the JSON from Local Storage and parses it into the in-memory `transactions` array.
2. Every add or delete calls `saveTransactions()`, which serializes the array back to Local Storage via `JSON.stringify`.
3. The selected theme is saved separately on every toggle and read back by `loadTheme()` before the first render — preventing a flash of the wrong theme.
4. Clearing browser storage (`localStorage.clear()`) resets the app to a blank state.

---

## ✨ MVP Features

### 1. Total Balance
- Displays the sum of all transaction amounts at the top of the page.
- Formatted as Indonesian Rupiah using `Intl`-compatible `toLocaleString('id-ID')`.
- Automatically recalculates after every add or delete.

### 2. Add Transaction Form
- **Fields:** Item Name, Amount (Rp), Category (Food / Transport / Fun).
- **Validation:** All fields required; amount must be > 0; category must be one of the three valid values.
- **Error display:** A red banner above the form with a clear message; invalid fields get a red border.
- **After submit:** Transaction is prepended to the list, form is cleared, all UI components update.

### 3. Transaction List
- Scrollable container showing all transactions.
- Each row shows: item name, amount, category badge, date, and a delete button (🗑).
- Newest transactions appear first by default.

### 4. Delete Transaction
- Clicking 🗑 triggers a slide-out animation, then removes the item from the array and Local Storage.
- The balance card, pie chart, and monthly summary all update immediately.

### 5. Pie Chart
- Powered by Chart.js (pie type).
- Shows Food / Transport / Fun spending proportions with percentage tooltips.
- Rebuilds itself after every add/delete and after a theme switch (so legend colours match).
- Displays a placeholder message when there are no transactions.

---

## 🌟 Optional Features Implemented

### A — Monthly Summary
- Five stat cards: Total Spending, Number of Transactions, Food, Transport, Fun.
- A `<input type="month">` picker lets the user select any month; it defaults to the current month on load.
- Changing the picker instantly re-filters and re-displays the stats.

### B — Sort Transactions
- A dropdown with five options:
  - **Newest** — most recent date first (default)
  - **Oldest** — earliest date first
  - **Highest Amount** — descending by Rp
  - **Lowest Amount** — ascending by Rp
  - **Category A–Z** — alphabetical by category name
- Sorting creates a new sorted copy of the array — the original stored order is **never mutated**.

### C — Dark / Light Mode
- A toggle button in the header switches between themes.
- Light mode is the default.
- Dark mode uses a carefully chosen palette (slate-800/900 surfaces, slate-100 text) with strong contrast.
- The chosen theme is saved to Local Storage and restored on the next page load — no flash of the wrong theme.
- The pie chart legend colour updates automatically when the theme changes.

---

## ♿ Accessibility

- Semantic HTML elements (`<header>`, `<main>`, `<footer>`, `<section>`, `<form>`).
- All form inputs have associated `<label>` elements.
- Error messages use `role="alert"` and `aria-live="polite"`.
- Delete buttons have descriptive `aria-label` attributes.
- Theme toggle button uses `aria-pressed` to communicate state.
- A visually-hidden live region announces add/delete events to screen readers.
- All interactive elements are keyboard-accessible and have visible focus styles.
- Respects `prefers-reduced-motion` — animations are disabled for users who prefer it.

---

## 📱 Responsive Design

| Breakpoint | Layout |
|---|---|
| ≥ 901 px (desktop) | Two-column grid: Balance + Form on top row; List + Chart on bottom row |
| 601–900 px (tablet) | Single column; summary grid wraps to 3 columns |
| ≤ 600 px (mobile) | Single column; all sections stacked; summary grid wraps to 2 columns |

No horizontal overflow on any viewport. Touch targets meet minimum size recommendations.

---

## 🌐 Deploy to GitHub Pages

1. Push the project to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Expense & Budget Visualizer"
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```

2. In your repository on GitHub, go to **Settings → Pages**.

3. Under **Source**, select **Deploy from a branch**, choose `main` (or `master`) and the `/ (root)` folder.

4. Click **Save**. GitHub will build and publish the site.

5. Your app will be live at:
   ```
   https://<your-username>.github.io/<repo-name>/
   ```

> **Why it works on GitHub Pages:** The project is entirely static (HTML + CSS + JS). There is no server-side code, no build step, and no environment variables required. Chart.js is loaded from a CDN so there are no local dependencies to install.

---

## 🗂️ Key JavaScript Functions

| Function | Description |
|---|---|
| `init()` | Entry point — loads theme, transactions, sets default month, renders UI |
| `loadTransactions()` | Reads and parses the transactions array from Local Storage |
| `saveTransactions()` | Serializes and writes the transactions array to Local Storage |
| `addTransaction(e)` | Validates form, builds transaction object, updates all UI |
| `deleteTransaction(id, el)` | Animates removal, filters array, updates all UI |
| `renderTransactions()` | Sorts a copy of the array, builds and injects DOM elements |
| `createTransactionElement(t)` | Creates a single transaction row DOM element |
| `updateTotalBalance()` | Sums all amounts, formats as Rupiah, updates the DOM |
| `updateChart()` | Aggregates by category, destroys old chart, creates new Chart.js instance |
| `updateMonthlySummary()` | Filters by selected month, updates all five stat values |
| `sortTransactions(arr)` | Returns a sorted copy of the given array (non-mutating) |
| `toggleTheme()` | Flips theme, persists to Local Storage, rebuilds chart |
| `loadTheme()` | Reads saved theme from Local Storage and applies it |
| `applyTheme(theme)` | Sets `data-theme` on `<body>`, updates button icon and label |
| `validateForm()` | Returns an error string or `null`; marks invalid fields |
| `announceToScreenReader(msg)` | Injects a message into an `aria-live` region |

---

## 📄 License

This project was created for educational purposes as part of CodingCamp 2026.  
Feel free to use it as a portfolio reference or learning resource.
