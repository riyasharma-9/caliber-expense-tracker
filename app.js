// API Base URL
const API_URL = '/api';

// Fallback configuration for GitHub Pages/Offline
const DEFAULT_CATEGORIES = ["Food", "Rent", "Utilities", "Entertainment", "Salary", "Misc", "Subscriptions"];
let useLocalStorage = window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';

// Helper: Read from localStorage
function getLocalData() {
  const txs = localStorage.getItem('caliber_transactions');
  const cats = localStorage.getItem('caliber_categories');
  return {
    transactions: txs ? JSON.parse(txs) : [],
    categories: cats ? JSON.parse(cats) : DEFAULT_CATEGORIES
  };
}

// Helper: Write to localStorage
function saveLocalData(data) {
  localStorage.setItem('caliber_transactions', JSON.stringify(data.transactions));
  localStorage.setItem('caliber_categories', JSON.stringify(data.categories));
}

// Application State
let state = {
  transactions: [],
  categories: []
};

// Chart.js Instance Reference
let expenseChart = null;

// DOM Elements
const elements = {
  totalBalance: document.getElementById('total-balance'),
  totalIncome: document.getElementById('total-income'),
  totalExpenses: document.getElementById('total-expenses'),
  
  transactionForm: document.getElementById('transaction-form'),
  amountInput: document.getElementById('amount'),
  categorySelect: document.getElementById('category'),
  dateInput: document.getElementById('date'),
  descriptionInput: document.getElementById('description'),
  
  transactionList: document.getElementById('transaction-list'),
  historyEmpty: document.getElementById('history-empty'),
  
  // Category Modal Elements
  categoryModal: document.getElementById('category-modal'),
  categoryForm: document.getElementById('category-form'),
  newCategoryInput: document.getElementById('new-category'),
  categoryError: document.getElementById('category-error'),
  btnOpenCategoryModal: document.getElementById('btn-open-category-modal'),
  btnCloseCategoryModal: document.getElementById('btn-close-category-modal'),
  
  // Chart Elements
  chartCanvas: document.getElementById('expense-chart'),
  chartNoData: document.getElementById('chart-no-data'),
  
  // Reset Button Element
  btnResetDb: document.getElementById('btn-reset-db')
};

// Reset database and fetch data on page load/refresh
async function resetAndFetchData() {
  if (useLocalStorage) {
    const data = getLocalData();
    data.transactions = [];
    saveLocalData(data);
    await fetchData();
    return;
  }

  try {
    const response = await fetch(`${API_URL}/reset`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error();
  } catch (error) {
    console.warn('API /reset failed, falling back to localStorage');
    useLocalStorage = true;
    const data = getLocalData();
    data.transactions = [];
    saveLocalData(data);
  } finally {
    await fetchData();
  }
}

// Initial Setup
document.addEventListener('DOMContentLoaded', () => {
  // Set default date input to today
  const today = new Date().toISOString().split('T')[0];
  elements.dateInput.value = today;

  // Reset database on page load/refresh, then load the empty state
  resetAndFetchData();

  // Event Listeners
  elements.transactionForm.addEventListener('submit', handleTransactionSubmit);
  elements.categoryForm.addEventListener('submit', handleCategorySubmit);
  
  // Modal toggle listeners
  elements.btnOpenCategoryModal.addEventListener('click', openCategoryModal);
  elements.btnCloseCategoryModal.addEventListener('click', closeCategoryModal);
  
  // Reset database listener
  if (elements.btnResetDb) {
    elements.btnResetDb.addEventListener('click', handleResetDatabase);
  }
  
  // Close modal when clicking outside card
  elements.categoryModal.addEventListener('click', (e) => {
    if (e.target === elements.categoryModal) closeCategoryModal();
  });
});

// Format Currency to INR (₹)
function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Fetch all transactions and categories
async function fetchData() {
  if (useLocalStorage) {
    const data = getLocalData();
    state.transactions = data.transactions;
    state.categories = data.categories;
    updateUI();
    return;
  }

  try {
    const response = await fetch(`${API_URL}/data`);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const data = await response.json();
    state.transactions = data.transactions;
    state.categories = data.categories;
    
    updateUI();
  } catch (error) {
    console.warn('Failed to fetch from API, falling back to localStorage:', error);
    useLocalStorage = true;
    const data = getLocalData();
    state.transactions = data.transactions;
    state.categories = data.categories;
    updateUI();
  }
}

// Update UI Components
function updateUI() {
  renderCategories();
  renderTransactions();
  calculateTotals();
  renderChart();
}

// Render Category dropdown
function renderCategories() {
  const currentSelection = elements.categorySelect.value;
  
  // Clear select options except placeholder
  elements.categorySelect.innerHTML = '<option value="" disabled selected>Select</option>';
  
  state.categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    elements.categorySelect.appendChild(option);
  });
  
  // Restore selection if it still exists
  if (state.categories.includes(currentSelection)) {
    elements.categorySelect.value = currentSelection;
  }
}

// Render Transaction history table
function renderTransactions() {
  elements.transactionList.innerHTML = '';
  
  if (state.transactions.length === 0) {
    elements.historyEmpty.style.display = 'flex';
    return;
  }
  
  elements.historyEmpty.style.display = 'none';
  
  // Sort transactions by date descending, then ID descending (newest first)
  const sortedTransactions = [...state.transactions].sort((a, b) => {
    const dateCompare = new Date(b.date) - new Date(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.id.localeCompare(a.id);
  });

  sortedTransactions.forEach(tx => {
    const tr = document.createElement('tr');
    tr.dataset.id = tx.id;
    
    // Formatting date
    const dateObj = new Date(tx.date);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const isExpense = tx.type === 'expense';
    const amountClass = isExpense ? 'text-danger' : 'text-success';
    const amountPrefix = isExpense ? '-' : '+';
    
    tr.innerHTML = `
      <td>${formattedDate}</td>
      <td>
        <div style="font-weight: 600; font-size: 0.95rem;">${tx.description || 'No Description'}</div>
      </td>
      <td>
        <span class="category-badge">${tx.category}</span>
      </td>
      <td class="text-right ${amountClass}" style="font-weight: 700;">
        ${amountPrefix}${formatCurrency(tx.amount).replace('INR', '').trim()}
      </td>
      <td>
        <button class="btn-delete" onclick="deleteTransaction('${tx.id}')" title="Delete Transaction">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </td>
    `;
    
    elements.transactionList.appendChild(tr);
  });
}

// Calculate totals for dashboard cards
function calculateTotals() {
  let income = 0;
  let expenses = 0;
  
  state.transactions.forEach(tx => {
    if (tx.type === 'income') {
      income += tx.amount;
    } else {
      expenses += tx.amount;
    }
  });
  
  const balance = income - expenses;
  
  elements.totalIncome.textContent = formatCurrency(income);
  elements.totalExpenses.textContent = formatCurrency(expenses);
  elements.totalBalance.textContent = formatCurrency(balance);
  
  // Change balance text color if negative
  if (balance < 0) {
    elements.totalBalance.style.color = 'var(--danger)';
  } else {
    elements.totalBalance.style.color = 'var(--text-primary)';
  }
}

// Render Donut Chart using Chart.js
function renderChart() {
  const expensesOnly = state.transactions.filter(tx => tx.type === 'expense');
  
  if (expensesOnly.length === 0) {
    elements.chartNoData.style.display = 'block';
    elements.chartCanvas.style.display = 'none';
    if (expenseChart) {
      expenseChart.destroy();
      expenseChart = null;
    }
    return;
  }
  
  elements.chartNoData.style.display = 'none';
  elements.chartCanvas.style.display = 'block';
  
  // Aggregate expenses by category
  const categoryTotals = {};
  expensesOnly.forEach(tx => {
    categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
  });
  
  const labels = Object.keys(categoryTotals);
  const dataValues = Object.values(categoryTotals);
  
  // Palette definition
  const baseColors = [
    '#6366f1', // Indigo
    '#a855f7', // Purple
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#f97316', // Orange
    '#84cc16'  // Lime
  ];
  
  // Map labels to a color array
  const borderColors = labels.map((_, index) => baseColors[index % baseColors.length]);
  const backgroundColors = borderColors.map(color => `${color}25`); // Add 15% opacity for background fill
  
  if (expenseChart) {
    // If chart exists, update its data and configuration
    expenseChart.data.labels = labels;
    expenseChart.data.datasets[0].data = dataValues;
    expenseChart.data.datasets[0].backgroundColor = backgroundColors;
    expenseChart.data.datasets[0].borderColor = borderColors;
    expenseChart.update();
  } else {
    // Create new chart
    const ctx = elements.chartCanvas.getContext('2d');
    expenseChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1.5,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#9ca3af',
              font: {
                family: 'Outfit',
                size: 11
              },
              padding: 15
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.label}: ${formatCurrency(context.raw)}`;
              }
            }
          }
        },
        cutout: '65%'
      }
    });
  }
}

// Handle new transaction form submit
async function handleTransactionSubmit(e) {
  e.preventDefault();
  
  const type = document.querySelector('input[name="type"]:checked').value;
  const amount = parseFloat(elements.amountInput.value);
  const category = elements.categorySelect.value;
  const date = elements.dateInput.value;
  const description = elements.descriptionInput.value.trim();
  
  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a positive numeric value for the amount.');
    return;
  }
  
  if (!category) {
    alert('Please select a category.');
    return;
  }
  
  const payload = { type, amount, category, date, description };
  
  if (useLocalStorage) {
    const data = getLocalData();
    const newTransaction = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      ...payload
    };
    data.transactions.push(newTransaction);
    saveLocalData(data);
    
    // Clear inputs except type and date
    elements.amountInput.value = '';
    elements.descriptionInput.value = '';
    elements.categorySelect.selectedIndex = 0;
    
    await fetchData();
    return;
  }

  try {
    const response = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save transaction');
    }
    
    // Clear inputs except type and date
    elements.amountInput.value = '';
    elements.descriptionInput.value = '';
    elements.categorySelect.selectedIndex = 0;
    
    // Refresh Data
    fetchData();
  } catch (error) {
    alert(error.message);
  }
}

// Delete transaction helper exposed to window scope
async function deleteTransaction(id) {
  if (!confirm('Are you sure you want to delete this transaction?')) return;
  
  if (useLocalStorage) {
    const data = getLocalData();
    data.transactions = data.transactions.filter(t => t.id !== id);
    saveLocalData(data);
    await fetchData();
    return;
  }

  try {
    const response = await fetch(`${API_URL}/transactions/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Failed to delete transaction');
    
    fetchData();
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    alert('Error deleting transaction.');
  }
}
window.deleteTransaction = deleteTransaction;

// Modal Toggles
function openCategoryModal() {
  elements.categoryModal.classList.add('active');
  elements.newCategoryInput.focus();
}

// Make openCategoryModal available globally for potential direct bindings
window.openCategoryModal = openCategoryModal;

function closeCategoryModal() {
  elements.categoryModal.classList.remove('active');
  elements.newCategoryInput.value = '';
  elements.categoryError.textContent = '';
}

// Handle new custom category submit
async function handleCategorySubmit(e) {
  e.preventDefault();
  
  const category = elements.newCategoryInput.value.trim();
  if (!category) return;
  
  if (useLocalStorage) {
    const data = getLocalData();
    
    // Check for duplicate (case insensitive)
    const exists = data.categories.some(c => c.toLowerCase() === category.toLowerCase());
    if (exists) {
      elements.categoryError.textContent = 'Category already exists';
      return;
    }

    data.categories.push(category);
    saveLocalData(data);
    
    // Update local state categories
    state.categories = data.categories;
    
    // Refresh dropdown and select the new category
    renderCategories();
    elements.categorySelect.value = category;
    
    // Close modal
    closeCategoryModal();
    return;
  }

  try {
    const response = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      elements.categoryError.textContent = data.error || 'Failed to add category';
      return;
    }
    
    // Update local state categories
    state.categories = data.categories;
    
    // Refresh dropdown and select the new category
    renderCategories();
    elements.categorySelect.value = category;
    
    // Close modal
    closeCategoryModal();
  } catch (error) {
    elements.categoryError.textContent = 'Server error occurred.';
  }
}

// Handle clearing all transactions / resetting database
async function handleResetDatabase() {
  if (!confirm('Are you sure you want to clear all transactions? This will reset your dashboard to zero.')) {
    return;
  }
  
  if (useLocalStorage) {
    const data = getLocalData();
    data.transactions = [];
    saveLocalData(data);
    await fetchData();
    return;
  }

  try {
    const response = await fetch(`${API_URL}/reset`, {
      method: 'POST'
    });
    
    if (!response.ok) throw new Error('Failed to reset database');
    
    fetchData();
  } catch (error) {
    console.error('Failed to reset database:', error);
    alert('Error resetting database.');
  }
}
