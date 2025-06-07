const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Weka password yako ya MySQL hapa ikiwa ipo
  database: 'ussd_db'
});

db.connect(err => {
  if (err) {
    console.error(' Kosa katika kuungana na database:', err.message);
    return;
  }
  console.log(' Imefanikiwa kuungana na database');
});

// Serve frontend (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get all retailers
app.get('/api/retailers', (req, res) => {
  db.query('SELECT * FROM retailers', (err, results) => {
    if (err) {
      console.error(' Kosa katika kupata wachuuzi:', err.message);
      return res.status(500).json({ error: 'Imeshindikana kupata wachuuzi.' });
    }
    res.json(results);
  });
});

// Add a new retailer (registration)
app.post('/api/retailers', (req, res) => {
  const { name, phoneNumber, location, tinNumber } = req.body; // Added tinNumber
  db.query(
    'INSERT INTO retailers (name, phone_number, location, tin_number) VALUES (?, ?, ?, ?)', // Added tin_number
    [name, phoneNumber, location, tinNumber], // Added tinNumber
    (err, result) => {
      if (err) {
        console.error(' Kosa katika kusajili mchuuzi:', err.message);
        return res.status(500).json({ error: 'Imeshindikana kusajili mchuuzi.' });
      }
      res.status(201).json({ message: 'Mfanyabiashara amesajiliwa kikamilifu!', retailerId: result.insertId });
    }
  );
});

// Retailer Login - Modified to use name and tin_number
app.post('/api/retailers/login', (req, res) => {
  const { name, tinNumber } = req.body; // Changed from retailerId to tinNumber
  db.query(
    'SELECT retailer_id, name, tin_number FROM retailers WHERE name = ? AND tin_number = ?', // Changed to tin_number
    [name, tinNumber], // Changed to tinNumber
    (err, results) => {
      if (err) {
        console.error(' Kosa la kuingia kwa mchuuzi:', err.message);
        return res.status(500).json({ error: 'Kosa la seva. Tafadhali jaribu tena.' });
      }
      if (results.length > 0) {
        res.json({ success: true, message: 'Umeingia kwa mafanikio.', retailer: results[0] });
      } else {
        res.status(401).json({ success: false, error: 'Jina au Nambari ya TIN si sahihi.' }); // Updated error message
      }
    }
  );
});

// Update retailer details
app.put('/api/retailers/:retailerId', (req, res) => {
  const retailerId = req.params.retailerId;
  const { name, phoneNumber, location, tinNumber } = req.body; // Added tinNumber
  db.query(
    'UPDATE retailers SET name = ?, phone_number = ?, location = ?, tin_number = ? WHERE retailer_id = ?', // Added tin_number
    [name, phoneNumber, location, tinNumber, retailerId], // Added tinNumber
    (err, result) => {
      if (err) {
        console.error(' Kosa katika kusahihisha maelezo ya mchuuzi:', err.message);
        return res.status(500).json({ error: 'Imeshindikana kusahihisha maelezo ya mchuuzi.' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Mfanyabiashara hakupatikana.' });
      }
      res.json({ success: true, message: 'Maelezo ya mfanyabiashara yamebadilishwa kikamilifu.' });
    }
  );
});


// Get products for a specific retailer
app.get('/api/products/:retailerId', (req, res) => {
  const retailerId = req.params.retailerId;
  db.query('SELECT * FROM products WHERE retailer_id = ?', [retailerId], (err, results) => {
    if (err) {
      console.error(' Kosa katika kupata bidhaa za mchuuzi:', err.message);
      return res.status(500).json({ error: 'Imeshindikana kupata bidhaa.' });
    }
    res.json(results);
  });
});

// Add a new product
app.post('/api/products', (req, res) => {
  const { name, price, retailerId } = req.body;
  db.query(
    'INSERT INTO products (retailer_id, product_name, product_cost) VALUES (?, ?, ?)',
    [retailerId, name, price],
    (err, result) => {
      if (err) {
        console.error(' Kosa katika kuongeza bidhaa:', err.message);
        return res.status(500).json({ error: 'Imeshindikana kuongeza bidhaa.' });
      }
      res.status(201).json({ message: 'Bidhaa imeongezwa kikamilifu!', productId: result.insertId });
    }
  );
});

// Update product details
app.put('/api/products/:productId', (req, res) => {
  const productId = req.params.productId;
  const { name, price } = req.body;
  db.query(
    'UPDATE products SET product_name = ?, product_cost = ? WHERE product_id = ?',
    [name, price, productId],
    (err, result) => {
      if (err) {
        console.error(' Kosa katika kusahihisha bidhaa:', err.message);
        return res.status(500).json({ error: 'Imeshindikana kusahihisha bidhaa.' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Bidhaa haikupatikana.' });
      }
      res.json({ success: true, message: 'Bidhaa imesasishwa kikamilifu.' });
    }
  );
});

// Delete a product
app.delete('/api/products/:productId', (req, res) => {
  const productId = req.params.productId;
  db.query('DELETE FROM products WHERE product_id = ?', [productId], (err, result) => {
    if (err) {
      console.error(' Kosa katika kufuta bidhaa:', err.message);
      return res.status(500).json({ error: 'Imeshindikana kufuta bidhaa.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Bidhaa haikupatikana.' });
    }
    res.json({ success: true, message: 'Bidhaa imefutwa kikamilifu.' });
  });
});

// Place a new order
app.post('/api/orders', (req, res) => {
  const { name, phoneNumber, location, productId, retailerId, product, retailer } = req.body;

  let finalProductId = productId;
  let finalRetailerId = retailerId;

  // Prioritize objects if provided
  if (product && product.product_id) {
    finalProductId = product.product_id;
  }
  else if (productId) {
    finalProductId = productId;
  }

  if (retailer && retailer.retailer_id) {
    finalRetailerId = retailer.retailer_id;
  } else if (retailerId) {
    finalRetailerId = retailerId;
  }

  // Validate the final IDs
  if (!finalProductId) {
    console.error(' Habari za bidhaa si sahihi');
    return res.status(400).json({ error: 'Taarifa za bidhaa si sahihi. Tafadhali toa productId au kitu cha bidhaa.' });
  }

  if (!finalRetailerId) {
    console.error(' Habari za mchuuzi si sahihi');
    return res.status(400).json({ error: 'Taarifa za mchuuzi si sahihi. Tafadhali toa retailerId au kitu cha mchuuzi.' });
  }

  db.query(
    'INSERT INTO orders (customer_name, phone_number, location, product_id, retailer_id) VALUES (?, ?, ?, ?, ?)',
    [name, phoneNumber, location, finalProductId, finalRetailerId],
    (err, result) => {
      if (err) {
        console.error(' Kosa katika kutuma agizo:', err.message);
        return res.status(500).json({ error: 'Imeshindikana kutuma agizo.' });
      }
      res.status(201).json({ message: 'Agizo limewekwa kikamilifu!', orderId: result.insertId });
    }
  );
});

// Get orders for a specific retailer (NEW ENDPOINT)
app.get('/api/retailers/:retailerId/orders', (req, res) => {
  const retailerId = req.params.retailerId;
  const customerNameFilter = req.query.customerName; // Optional filter from frontend

  let query = `
    SELECT
      o.order_id,
      o.customer_name,
      o.phone_number,
      o.location,
      o.order_status,
      p.product_name,
      p.product_cost,
      o.created_at
    FROM
      orders o
    JOIN
      products p ON o.product_id = p.product_id
    WHERE
      o.retailer_id = ?
  `;
  const params = [retailerId];

  if (customerNameFilter) {
    query += ` AND o.customer_name LIKE ?`;
    params.push(`%${customerNameFilter}%`);
  }

  // Order by creation date to show recent orders first
  query += ` ORDER BY o.created_at DESC`;

  db.query(query, params, (err, results) => {
    if (err) {
      console.error(' Kosa katika kupata maagizo ya mchuuzi:', err.message);
      return res.status(500).json({ error: 'Imeshindikana kupata maagizo ya mchuuzi.' });
    }
    res.json(results);
  });
});

// Endpoint to update order status (NEW ENDPOINT)
app.put('/api/orders/:orderId/status', (req, res) => {
  const orderId = req.params.orderId;
  const { status } = req.body; // 'approved' or 'rejected'

  // Validate status
  if (!['approved', 'rejected', 'pending', 'agizo limepitishwa'].includes(status)) { // Added 'agizo limepitishwa'
    return res.status(400).json({ error: 'Hali ya agizo si sahihi. Lazima iwe approved, rejected, pending, au agizo limepitishwa.' });
  }

  db.query(
    'UPDATE orders SET order_status = ? WHERE order_id = ?',
    [status, orderId],
    (err, result) => {
      if (err) {
        console.error(' Kosa katika kusasisha hali ya agizo:', err.message);
        return res.status(500).json({ error: 'Imeshindikana kusasisha hali ya agizo.' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Agizo halikupatikana.' });
      }
      res.json({ success: true, message: 'Hali ya agizo imesasishwa.' });
    }
  );
});


// Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Seva imeanza kwenye http://localhost:${PORT}`);
  console.log(`📱 Simulator ya USSD ipo kwenye http://localhost:${PORT}`);
});