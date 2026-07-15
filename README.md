# Caliber Expense Checker — Premium Expense Tracker

Caliber Expense Checker is a modern, responsive, and visual personal wealth management system designed to track income and expenses. It features a sleek glassmorphic dark-theme dashboard, real-time balance calculations, custom category creation, dynamic category-based expense analytics, and persistent local file storage.


---

## 🚀 Features

- **Dashboard Metrics:** Real-time metrics for Net Balance, Total Income, and Total Expenses formatted in Indian Rupees (₹).
- **Transaction Entry Form:** Easily log income and expenses with detailed descriptions, dates, amounts, and categories.
- **Custom Categorization:** Add custom expense categories instantly via a pop-up modal directly from the entry form.
- **Visual Analytics:** View real-time visual distribution of your expenses by category on an interactive Chart.js donut chart.
- **Transaction History Log:** Filterable list of all logged transactions sorted chronologically with single-click delete support.
- **JSON File Storage:** All transaction records and custom categories are persistently saved to a local database (`data.json`).
- **Clean Architecture & Dark Mode:** Minimalist, premium dark-themed layout built with responsive CSS grid and flexbox.

---

## 🛠 Tech Stack

- **Frontend:** Vanilla HTML5, Modern CSS3 (Variables, Grids, Transitions, Backdrops), Vanilla ES6 JavaScript
- **Libraries:** [Chart.js](https://www.chartjs.org/) (Data visualization)
- **Backend:** Node.js with Express and CORS
- **Database:** Local JSON File I/O (`fs` module with async/promises)

---

## 📁 Project Structure

```text
expense-tracker/
├── public/                 # Static Frontend Files
│   ├── index.html          # HTML Layout & Structure
│   ├── style.css           # Custom Glassmorphic CSS Theme
│   └── app.js              # State Management, Fetch API & Chart.js Logic
├── server.js               # Node.js Express App & File Database Controller
├── data.json               # Local JSON Database (Auto-created if missing)
├── package.json            # Project Metadata & Dependences
└── README.md               # Setup & Documentation
```

---

## ⚙️ How to Run Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- npm (Node Package Manager)

### Step-by-Step Installation

1. **Clone or Navigate to the Directory:**
   ```bash
   cd C:/Users/sonyw/.gemini/antigravity/scratch/expense-tracker
   ```

2. **Install Dependencies:**
   Install required modules (`express` and `cors`):
   ```bash
   npm install
   ```

3. **Start the Express Server:**
   Launch the backend server:
   ```bash
   npm start
   ```
   You should see: `Server is running on http://localhost:3000`

4. **Access the Application:**
   Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

---

## 🔗 API Endpoints (Backend)

The server provides a standard JSON REST API structure:

| Endpoint | Method | Description | Payload (JSON) |
|---|---|---|---|
| `/api/data` | GET | Fetches all transactions and categories. | N/A |
| `/api/transactions` | POST | Appends a new transaction entry. | `{ type, amount, category, date, description }` |
| `/api/transactions/:id` | DELETE | Removes a transaction by ID. | N/A |
| `/api/categories` | POST | Appends a custom category (case-insensitive checks). | `{ category }` |

---

## 🛡️ License

Independent Project. Developed for Portfolio and Internship submission.
