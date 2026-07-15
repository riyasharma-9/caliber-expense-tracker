const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

// Serve static files from the root directory securely (only expose public assets)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'style.css'));
});
app.get('/app.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'app.js'));
});

// Helper: Read data from JSON file
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, initialize it
    if (error.code === 'ENOENT') {
      const initialData = {
        transactions: [],
        categories: ["Food", "Rent", "Utilities", "Entertainment", "Salary", "Misc"]
      };
      await writeData(initialData);
      return initialData;
    }
    console.error('Error reading database file:', error);
    throw error;
  }
}

// Helper: Write data to JSON file
async function writeData(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing to database file:', error);
    throw error;
  }
}

// GET /api/transactions - Get all transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
});

// GET /api/data - Get all transactions and categories
app.get('/api/data', async (req, res) => {
  try {
    const data = await readData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve database contents' });
  }
});

// POST /api/transactions - Add a new transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const { type, amount, category, date, description } = req.body;

    // Validation
    if (!type || !amount || !category || !date) {
      return res.status(400).json({ error: 'Type, amount, category, and date are required.' });
    }
    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ error: 'Type must be either "income" or "expense".' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    const data = await readData();
    const newTransaction = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      type,
      amount: parsedAmount,
      category,
      date,
      description: description || ''
    };

    data.transactions.push(newTransaction);
    await writeData(data);

    res.status(201).json({ message: 'Transaction added successfully', transaction: newTransaction });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save transaction' });
  }
});

// DELETE /api/transactions/:id - Delete a transaction by ID
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readData();
    
    const initialLength = data.transactions.length;
    data.transactions = data.transactions.filter(t => t.id !== id);

    if (data.transactions.length === initialLength) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await writeData(data);
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// POST /api/categories - Add a custom category
app.post('/api/categories', async (req, res) => {
  try {
    let { category } = req.body;
    if (!category || typeof category !== 'string' || !category.trim()) {
      return res.status(400).json({ error: 'Category name must be a non-empty string' });
    }
    
    category = category.trim();
    const data = await readData();
    
    // Check for duplicate (case insensitive)
    const exists = data.categories.some(c => c.toLowerCase() === category.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    data.categories.push(category);
    await writeData(data);
    
    res.status(201).json({ message: 'Category added successfully', categories: data.categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add category' });
  }
});

// POST /api/reset - Clear all transactions to start from zero
app.post('/api/reset', async (req, res) => {
  try {
    const data = await readData();
    data.transactions = [];
    await writeData(data);
    res.json({ message: 'All transactions cleared. Database reset to zero.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

// Function to initialize database on startup by clearing transactions
async function initializeDatabaseOnStart() {
  try {
    const data = await readData();
    data.transactions = [];
    await writeData(data);
    console.log('Database initialized: transactions cleared to start from zero.');
  } catch (error) {
    console.error('Failed to initialize database on startup:', error);
  }
}

initializeDatabaseOnStart().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});
