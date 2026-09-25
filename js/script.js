/**
 * Expense & Budget Visualizer
 * Author  : GilangApriliaAmanda
 * Date    : 2026
 * File    : js/script.js
 *
 * TABLE OF CONTENTS
 *  1.  Constants & DOM References
 *  2.  State
 *  3.  Local Storage Helpers  — loadTransactions / saveTransactions
 *  4.  Currency Formatter
 *  5.  Unique ID Generator
 *  6.  Add Transaction        — addTransaction
 *  7.  Delete Transaction     — deleteTransaction
 *  8.  Render Transactions    — renderTransactions
 *  9.  Update Total Balance   — updateTotalBalance
 * 10.  Update Pie Chart       — updateChart
 * 11.  Update Monthly Summary — updateMonthlySummary
 * 12.  Sort Transactions      — sortTransactions
 * 13.  Theme                  — toggleTheme / loadTheme
 * 14.  Form Validation
 * 15.  Event Listeners
 * 16.  Initialisation
 */

/* =============================================================
   1. CONSTANTS & DOM REFERENCES
============================================================= */

/** Keys used in Local Storage */
const LS_TRANSACTIONS_KEY = 'expenseVisualizer_transactions';
const LS_THEME_KEY         = 'expenseVisualizer_theme';

/** Valid categories — single source of truth */
const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

/** Chart.js colour palette (matches CSS variables) */
const CHART_COLORS = {
  Food:      '#f59e0b',
  Transport: '#3b82f6',
  Fun:       '#ec4899',
};

/* -- DOM elements ------------------------------------------ */
const body              = document.body;
const themeToggleBtn    = document.getElementById('themeToggleBtn');
const themeIcon         = document.getElementById('themeIcon');
const themeLabel        = document.getElementById('themeLabel');

const transactionForm   = document.getElementById('transactionForm');
const itemNameInput     = document.getElementById('itemName');
const amountInput       = document.getElementById('amount');
const categorySelect    = document.getElementById('category');
const formError         = document.getElementById('formError');

const totalBalanceEl    = document.getElementById('totalBalance');
const transactionListEl = document.getElementById('transactionList');
const emptyMsgEl        = document.getElementById('emptyMsg');
const sortSelectEl      = document.getElementById('sortSelect');

const monthPickerEl     = document.getElementById('monthPicker');
const monthTotalEl      = document.getElementById('monthTotal');
const monthCountEl      = document.getElementById('monthCount');
const monthFoodEl       = document.getElementById('monthFood');
const monthTransportEl  = document.getElementById('monthTransport');
const monthFunEl        = document.getElementById('monthFun');

const spendingChartCanvas = document.getElementById('spendingChart');
const chartEmptyEl        = document.getElementById('chartEmpty');

/* =============================================================
   2. STATE
============================================================= */

/**
 * Master array of transaction objects.
 * Each object: { id, itemName, amount, category, date }
 * This array always reflects the canonical order (by insertion / date).
 * Sorting only affects the rendered view, never this array.
 */
let transactions = [];

/** Chart.js instance — kept so we can destroy/re-create on update */
let spendingChart = null;

/* =============================================================
   3. LOCAL STORAGE HELPERS
============================================================= */

/**
 * loadTransactions
 * Reads the transactions array from Local Storage.
 * Falls back to an empty array if nothing is stored or JSON is corrupt.
 * @returns {Array} Array of transaction objects.
 */
function loadTransactions() {
  try {
    const raw = localStorage.getItem(LS_TRANSACTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Basic sanity: must be an array
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Could not parse stored transactions:', err);
    return [];
  }
}

/**
 * saveTransactions
 * Persists the current transactions array to Local Storage.
 */
function saveTransactions() {
  try {
    localStorage.setItem(LS_TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (err) {
    console.error('Could not save transactions to Local Storage:', err);
  }
}

/* =============================================================
   4. CURRENCY FORMATTER
============================================================= */

/**
 * formatRupiah
 * Formats a number as Indonesian Rupiah (e.g. Rp 25.000).
 * @param {number} amount
 * @returns {string}
 */
function formatRupiah(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

/* =============================================================
   5. UNIQUE ID GENERATOR
============================================================= */

/**
 * generateId
 * Creates a simple unique string ID using timestamp + random suffix.
 * Avoids any external dependency.
 * @returns {string}
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* =============================================================
   6. ADD TRANSACTION
============================================================= */

/**
 * addTransaction
 * Validates the form, builds a transaction object, prepends it to
 * the transactions array, persists it, and refreshes all UI components.
 * @param {Event} e - Form submit event
 */
function addTransaction(e) {
  e.preventDefault();

  // ── Validate inputs ─────────────────────────────────────
  const validationError = validateForm();
  if (validationError) {
    showFormError(validationError);
    return;
  }

  hideFormError();

  // ── Build transaction object ─────────────────────────────
  const newTransaction = {
    id:       generateId(),
    itemName: itemNameInput.value.trim(),
    amount:   parseFloat(amountInput.value),
    category: categorySelect.value,
    date:     new Date().toISOString(),   // ISO-8601 for consistent sorting
  };

  // ── Prepend (newest first in storage) ────────────────────
  transactions.unshift(newTransaction);

  // ── Persist ──────────────────────────────────────────────
  saveTransactions();

  // ── Refresh all UI ───────────────────────────────────────
  renderTransactions(newTransaction.id);  // pass ID so only this item animates
  updateTotalBalance();
  updateChart();
  updateMonthlySummary();

  // ── Clear form ───────────────────────────────────────────
  transactionForm.reset();
  clearInvalidStates();

  // ── Briefly announce to screen readers ───────────────────
  announceToScreenReader(`Transaction "${newTransaction.itemName}" added.`);
}

/* =============================================================
   7. DELETE TRANSACTION
============================================================= */

/**
 * deleteTransaction
 * Removes a transaction by ID, persists the change, and refreshes all UI.
 * Uses a CSS animation before actual removal for a smooth UX.
 * @param {string} id  - Transaction ID
 * @param {HTMLElement} itemEl - The DOM element to animate
 */
function deleteTransaction(id, itemEl) {
  // Animate out first
  itemEl.classList.add('transaction-item--removing');

  // Wait for animation to finish, then remove from data + re-render
  itemEl.addEventListener('animationend', () => {
    // Remove from array
    transactions = transactions.filter(t => t.id !== id);

    // Persist
    saveTransactions();

    // Refresh all UI
    renderTransactions();
    updateTotalBalance();
    updateChart();
    updateMonthlySummary();

    announceToScreenReader('Transaction deleted.');
  }, { once: true });
}

/* =============================================================
   8. RENDER TRANSACTIONS
============================================================= */

/**
 * renderTransactions
 * Clears the list container and re-renders all transactions
 * according to the currently selected sort order.
 * Does NOT mutate the master transactions array.
 *
 * @param {string|null} newId - Optional ID of a just-added transaction.
 *   When supplied, only that item gets the slide-in animation.
 *   On full re-renders (sort change, delete, page load) no animation plays
 *   to avoid jarring re-animation of every existing item.
 */
function renderTransactions(newId = null) {
  // Get a sorted copy (never mutates original array)
  const sorted = sortTransactions([...transactions]);

  // Clear existing items (keep the empty message element)
  const existingItems = transactionListEl.querySelectorAll('.transaction-item');
  existingItems.forEach(el => el.remove());

  if (sorted.length === 0) {
    emptyMsgEl.hidden = false;
    return;
  }

  emptyMsgEl.hidden = true;

  // Build and insert each item
  sorted.forEach((transaction) => {
    const item = createTransactionElement(transaction, transaction.id === newId);
    transactionListEl.appendChild(item);
  });
}

/**
 * createTransactionElement
 * Creates a single transaction list-item DOM element.
 * @param {Object} transaction
 * @param {boolean} animate - Whether to apply the slide-in animation.
 *   Pass true only for a freshly added item; false for re-renders.
 * @returns {HTMLElement}
 */
function createTransactionElement(transaction, animate = false) {
  const { id, itemName, amount, category, date } = transaction;

  // Format the date
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('id-ID', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });

  // Outer wrapper
  const li = document.createElement('div');
  // Only animate the specific newly-added item, not every item on re-render
  li.classList.add('transaction-item');
  if (animate) li.classList.add('transaction-item--new');
  li.setAttribute('role', 'listitem');
  li.setAttribute('data-id', id);

  // Category colour dot
  const dot = document.createElement('span');
  dot.classList.add('transaction-dot', `transaction-dot--${category}`);
  dot.setAttribute('aria-hidden', 'true');

  // Info block
  const info = document.createElement('div');
  info.classList.add('transaction-info');

  const nameEl = document.createElement('p');
  nameEl.classList.add('transaction-name');
  nameEl.textContent = itemName;
  // Use title for long names (truncated via CSS)
  nameEl.title = itemName;

  const meta = document.createElement('div');
  meta.classList.add('transaction-meta');

  const categoryEl = document.createElement('span');
  categoryEl.classList.add('transaction-category', `transaction-category--${category}`);
  categoryEl.textContent = category;

  const dateEl = document.createElement('span');
  dateEl.classList.add('transaction-date');
  dateEl.textContent = formattedDate;

  meta.appendChild(categoryEl);
  meta.appendChild(dateEl);
  info.appendChild(nameEl);
  info.appendChild(meta);

  // Amount
  const amountEl = document.createElement('span');
  amountEl.classList.add('transaction-amount');
  amountEl.textContent = formatRupiah(amount);

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.classList.add('btn-delete');
  deleteBtn.setAttribute('aria-label', `Delete transaction: ${itemName}`);
  deleteBtn.title = 'Delete transaction';
  deleteBtn.textContent = '🗑';

  deleteBtn.addEventListener('click', () => {
    deleteTransaction(id, li);
  });

  // Assemble
  li.appendChild(dot);
  li.appendChild(info);
  li.appendChild(amountEl);
  li.appendChild(deleteBtn);

  return li;
}

/* =============================================================
   9. UPDATE TOTAL BALANCE
============================================================= */

/**
 * updateTotalBalance
 * Sums all transaction amounts and updates the balance display.
 */
function updateTotalBalance() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  totalBalanceEl.textContent = formatRupiah(total);
}

/* =============================================================
   10. UPDATE PIE CHART
============================================================= */

/**
 * updateChart
 * Calculates spending per category and re-renders the Chart.js pie chart.
 * Destroys the previous chart instance before creating a new one to
 * prevent Chart.js "canvas already in use" errors.
 */
function updateChart() {
  // Aggregate spending per category
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  transactions.forEach(t => {
    if (totals[t.category] !== undefined) {
      totals[t.category] += t.amount;
    }
  });

  const hasData = Object.values(totals).some(v => v > 0);

  // Toggle chart/empty message visibility
  if (!hasData) {
    spendingChartCanvas.hidden = true;
    chartEmptyEl.hidden = false;
    if (spendingChart) {
      spendingChart.destroy();
      spendingChart = null;
    }
    return;
  }

  spendingChartCanvas.hidden = false;
  chartEmptyEl.hidden = true;

  // Destroy existing chart before re-creating
  if (spendingChart) {
    spendingChart.destroy();
    spendingChart = null;
  }

  const labels = Object.keys(totals);
  const data   = Object.values(totals);
  const colors = labels.map(l => CHART_COLORS[l]);

  // Determine text colour for legend based on current theme
  const isDark     = body.getAttribute('data-theme') === 'dark';
  const legendColor = isDark ? '#cbd5e1' : '#334155';

  spendingChart = new Chart(spendingChartCanvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor:      isDark ? '#1e293b' : '#ffffff',
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color:     legendColor,
            font:      { size: 13, weight: '500' },
            padding:   16,
            usePointStyle: true,
            pointStyleWidth: 10,
          },
        },
        tooltip: {
          callbacks: {
            /** Format tooltip value as Rupiah */
            label: function (context) {
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return ` ${formatRupiah(value)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

/* =============================================================
   11. UPDATE MONTHLY SUMMARY
============================================================= */

/**
 * updateMonthlySummary
 * Filters transactions by the selected month and updates all
 * monthly summary stat elements.
 */
function updateMonthlySummary() {
  const selectedMonth = monthPickerEl.value; // Format: "YYYY-MM"

  let filtered = transactions;

  if (selectedMonth) {
    const [year, month] = selectedMonth.split('-').map(Number);
    filtered = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year && (d.getMonth() + 1) === month;
    });
  }

  // Aggregate
  let total = 0;
  const catTotals = { Food: 0, Transport: 0, Fun: 0 };

  filtered.forEach(t => {
    total += t.amount;
    if (catTotals[t.category] !== undefined) {
      catTotals[t.category] += t.amount;
    }
  });

  // Update DOM
  monthTotalEl.textContent    = formatRupiah(total);
  monthCountEl.textContent    = filtered.length.toString();
  monthFoodEl.textContent     = formatRupiah(catTotals.Food);
  monthTransportEl.textContent = formatRupiah(catTotals.Transport);
  monthFunEl.textContent      = formatRupiah(catTotals.Fun);
}

/* =============================================================
   12. SORT TRANSACTIONS
============================================================= */

/**
 * sortTransactions
 * Returns a NEW sorted array based on the currently selected sort option.
 * NEVER mutates the source array.
 * @param {Array} arr - Copy of transactions array to sort
 * @returns {Array} Sorted array
 */
function sortTransactions(arr) {
  const sortValue = sortSelectEl.value;

  switch (sortValue) {
    case 'newest':
      // Default order: already prepended newest-first in addTransaction
      return arr.sort((a, b) => new Date(b.date) - new Date(a.date));

    case 'oldest':
      return arr.sort((a, b) => new Date(a.date) - new Date(b.date));

    case 'highest':
      return arr.sort((a, b) => b.amount - a.amount);

    case 'lowest':
      return arr.sort((a, b) => a.amount - b.amount);

    case 'categoryAZ':
      return arr.sort((a, b) => a.category.localeCompare(b.category));

    default:
      return arr;
  }
}

/* =============================================================
   13. THEME — DARK / LIGHT MODE
============================================================= */

/**
 * loadTheme
 * Reads the saved theme from Local Storage and applies it on page load.
 */
function loadTheme() {
  const saved = localStorage.getItem(LS_THEME_KEY) || 'light';
  applyTheme(saved);
}

/**
 * toggleTheme
 * Switches between 'light' and 'dark', persists the choice,
 * and refreshes the chart so legend colours update.
 */
function toggleTheme() {
  const current = body.getAttribute('data-theme') || 'light';
  const next    = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem(LS_THEME_KEY, next);

  // Rebuild chart with updated legend text colour
  updateChart();
}

/**
 * applyTheme
 * Sets the data-theme attribute on <body> and updates the toggle button UI.
 * @param {'light'|'dark'} theme
 */
function applyTheme(theme) {
  body.setAttribute('data-theme', theme);

  if (theme === 'dark') {
    themeIcon.textContent  = '☀️';
    themeLabel.textContent = 'Light Mode';
    themeToggleBtn.setAttribute('aria-pressed', 'true');
  } else {
    themeIcon.textContent  = '🌙';
    themeLabel.textContent = 'Dark Mode';
    themeToggleBtn.setAttribute('aria-pressed', 'false');
  }
}

/* =============================================================
   14. FORM VALIDATION
============================================================= */

/**
 * validateForm
 * Checks all three fields and returns the first error message found,
 * or null if everything is valid.
 * Also toggles the CSS 'is-invalid' class on each field.
 * @returns {string|null} Error message or null
 */
function validateForm() {
  clearInvalidStates();

  const name   = itemNameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const cat    = categorySelect.value;

  // Item name
  if (!name) {
    itemNameInput.classList.add('is-invalid');
    return 'Item name is required.';
  }
  if (name.length > 100) {
    itemNameInput.classList.add('is-invalid');
    return 'Item name must be 100 characters or fewer.';
  }

  // Amount
  if (!amountInput.value || amountInput.value === '') {
    amountInput.classList.add('is-invalid');
    return 'Amount is required.';
  }
  if (isNaN(amount) || amount <= 0) {
    amountInput.classList.add('is-invalid');
    return 'Amount must be a positive number greater than zero.';
  }
  if (!Number.isFinite(amount)) {
    amountInput.classList.add('is-invalid');
    return 'Amount is not a valid number.';
  }

  // Category
  if (!cat || !VALID_CATEGORIES.includes(cat)) {
    categorySelect.classList.add('is-invalid');
    return 'Please select a valid category (Food, Transport, or Fun).';
  }

  return null; // All valid
}

/**
 * showFormError
 * Displays an error banner above the form.
 * @param {string} message
 */
function showFormError(message) {
  formError.textContent = `⚠️ ${message}`;
  formError.hidden = false;
  // Scroll into view so mobile users see it
  formError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * hideFormError
 * Hides the error banner.
 */
function hideFormError() {
  formError.textContent = '';
  formError.hidden = true;
}

/**
 * clearInvalidStates
 * Removes is-invalid class from all form fields.
 */
function clearInvalidStates() {
  itemNameInput.classList.remove('is-invalid');
  amountInput.classList.remove('is-invalid');
  categorySelect.classList.remove('is-invalid');
}

/* =============================================================
   15. ACCESSIBILITY HELPER
============================================================= */

/**
 * announceToScreenReader
 * Inserts a visually-hidden live region message for screen readers.
 * @param {string} message
 */
function announceToScreenReader(message) {
  // Re-use or create the live region
  let liveRegion = document.getElementById('sr-live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'sr-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }
  // Clear then set to trigger the announcement
  liveRegion.textContent = '';
  setTimeout(() => { liveRegion.textContent = message; }, 50);
}

/* =============================================================
   16. EVENT LISTENERS
============================================================= */

/** Form submission — add transaction */
transactionForm.addEventListener('submit', addTransaction);

/** Clear validation errors as user types / changes values */
itemNameInput.addEventListener('input', () => {
  if (itemNameInput.classList.contains('is-invalid')) {
    itemNameInput.classList.remove('is-invalid');
    hideFormError();
  }
});

amountInput.addEventListener('input', () => {
  if (amountInput.classList.contains('is-invalid')) {
    amountInput.classList.remove('is-invalid');
    hideFormError();
  }
});

categorySelect.addEventListener('change', () => {
  if (categorySelect.classList.contains('is-invalid')) {
    categorySelect.classList.remove('is-invalid');
    hideFormError();
  }
});

/** Sort dropdown — re-render list only (no data mutation) */
sortSelectEl.addEventListener('change', () => {
  renderTransactions();
});

/** Month picker — update monthly summary on change */
monthPickerEl.addEventListener('change', () => {
  updateMonthlySummary();
});

/** Theme toggle */
themeToggleBtn.addEventListener('click', toggleTheme);

/* =============================================================
   17. INITIALISATION
============================================================= */

/**
 * init
 * Entry point — runs once when the DOM is ready.
 * Loads persisted data, applies saved theme, and renders all UI.
 */
function init() {
  // 1. Apply saved theme (must be first to avoid flash of wrong theme)
  loadTheme();

  // 2. Load transactions from Local Storage
  transactions = loadTransactions();

  // 3. Set the month picker to the current month by default
  const now   = new Date();
  const yyyy  = now.getFullYear();
  const mm    = String(now.getMonth() + 1).padStart(2, '0');
  monthPickerEl.value = `${yyyy}-${mm}`;

  // 4. Render all UI components
  renderTransactions();
  updateTotalBalance();
  updateChart();
  updateMonthlySummary();
}

// Run on DOMContentLoaded (script is loaded with defer so DOM is already ready,
// but we guard here for safety in case someone removes the defer attribute).
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
