const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const port = 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Database setup
const db = new sqlite3.Database('./customers.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT,
      last_name TEXT,
      phone_number TEXT,
      email TEXT,
      address TEXT
    )`);
});

// API Endpoints

// Create a new customer
app.post('/customers', (req, res) => {
  const { first_name, last_name, phone_number, email, address } = req.body;

  // Validation
  if (!/^[a-zA-Z]+$/.test(first_name) || !/^[a-zA-Z]+$/.test(last_name)) {
    return res.status(400).json({ error: 'Names must contain only letters.' });
  }
  if (!/^\d{10}$/.test(phone_number)) {
    return res.status(400).json({ error: 'Phone number must be 10 digits.' });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  db.run(
    `INSERT INTO customers (first_name, last_name, phone_number, email, address) VALUES (?, ?, ?, ?, ?)`,
    [first_name, last_name, phone_number, email, address],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: 'Customer added successfully', id: this.lastID });
    }
  );
});

// Get customer details by ID
app.get('/customers/:id', (req, res) => {
  const id = req.params.id;
  db.get(`SELECT * FROM customers WHERE id = ?`, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.status(200).json(row);
  });
});

// Update customer details
app.put('/customers/:id', (req, res) => {
  const id = req.params.id;
  const { first_name, last_name, phone_number, email, address } = req.body;

  // Validation
  if (!/^[a-zA-Z]+$/.test(first_name) || !/^[a-zA-Z]+$/.test(last_name)) {
    return res.status(400).json({ error: 'Names must contain only letters.' });
  }
  if (!/^\d{10}$/.test(phone_number)) {
    return res.status(400).json({ error: 'Phone number must be 10 digits.' });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  db.run(
    `UPDATE customers SET first_name = ?, last_name = ?, phone_number = ?, email = ?, address = ? WHERE id = ?`,
    [first_name, last_name, phone_number, email, address, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(200).json({ message: 'Customer updated successfully' });
    }
  );
});

// Delete a customer by ID
app.delete('/customers/:id', (req, res) => {
  const id = req.params.id;

  db.run(`DELETE FROM customers WHERE id = ?`, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.status(200).json({ message: 'Customer deleted' });
  });
});

// Search customers by name, email, or address (search across multiple fields)
app.get('/customers', (req, res) => {
  const { search } = req.query;
  const query = `
    SELECT * FROM customers 
    WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR address LIKE ?
  `;

  db.all(query, [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(rows);
  });
});

// Pagination for customers
app.get('/customers/page/:page', (req, res) => {
  const page = parseInt(req.params.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;

  const countQuery = `SELECT COUNT(*) as total FROM customers`;
  const dataQuery = `SELECT * FROM customers LIMIT ? OFFSET ?`;

  db.get(countQuery, (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    db.all(dataQuery, [limit, offset], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(200).json({
        totalCustomers: countResult.total,
        totalPages: Math.ceil(countResult.total / limit),
        customers: rows
      });
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

