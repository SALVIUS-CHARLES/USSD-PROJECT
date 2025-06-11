const express = require('express');
const mysql = require('mysql2'); // mysql2 supports promises, which is good
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
  const { name, phoneNumber, location, tinNumber } = req.body;
  db.query(
    'INSERT INTO retailers (name, phone_number, location, tin_number) VALUES (?, ?, ?, ?)',
    [name, phoneNumber, location, tinNumber],
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
  const { name, tinNumber } = req.body;
  db.query(
    'SELECT retailer_id, name, tin_number, phone_number, location FROM retailers WHERE name = ? AND tin_number = ?', // Added phone_number, location for edit
    [name, tinNumber],
    (err, results) => {
      if (err) {
        console.error(' Kosa la kuingia kwa mchuuzi:', err.message);
        return res.status(500).json({ error: 'Kosa la seva. Tafadhali jaribu tena.' });
      }
      if (results.length > 0) {
        res.json({ success: true, message: 'Umeingia kwa mafanikio.', retailer: results[0] });
      } else {
        res.status(401).json({ success: false, error: 'Jina au Nambari ya TIN si sahihi.' });
      }
    }
  );
});

// Update retailer details
app.put('/api/retailers/:retailerId', (req, res) => {
  const retailerId = req.params.retailerId;
  const { name, phoneNumber, location, tinNumber } = req.body;
  db.query(
    'UPDATE retailers SET name = ?, phone_number = ?, location = ?, tin_number = ? WHERE retailer_id = ?',
    [name, phoneNumber, location, tinNumber, retailerId],
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

// Place a new order (MODIFIED TO HANDLE MULTIPLE ITEMS)
app.post('/api/orders', async (req, res) => {
  const { name, phoneNumber, location, retailerId, items } = req.body; // 'items' is an array of {productId, quantity, price}

  if (!retailerId || !items || items.length === 0) {
    return res.status(400).json({ error: 'Taarifa za agizo si sahihi. Hakikisha kuna retailerId na bidhaa.' });
  }

  try {
    // Start a transaction for atomicity
    await db.promise().beginTransaction();

    // 1. Insert into orders table
    const [orderResult] = await db.promise().query(
      'INSERT INTO orders (customer_name, phone_number, location, retailer_id) VALUES (?, ?, ?, ?)',
      [name, phoneNumber, location, retailerId]
    );
    const orderId = orderResult.insertId;

    // 2. Insert into order_items table for each item
    for (const item of items) {
      const { productId, quantity, price } = item;
      if (!productId || !quantity || quantity <= 0 || !price || price < 0) {
        await db.promise().rollback();
        return res.status(400).json({ error: 'Maelezo ya bidhaa si sahihi kwenye mkokoteni.' });
      }
      await db.promise().query(
        'INSERT INTO order_items (order_id, product_id, quantity, item_price) VALUES (?, ?, ?, ?)',
        [orderId, productId, quantity, price]
      );
    }

    // Commit the transaction
    await db.promise().commit();
    res.status(201).json({ message: 'Agizo limewekwa kikamilifu!', orderId: orderId });

  } catch (err) {
    // Rollback in case of any error
    await db.promise().rollback();
    console.error(' Kosa katika kutuma agizo:', err.message);
    res.status(500).json({ error: 'Imeshindikana kutuma agizo. Tafadhali jaribu tena.' });
  }
});

// Get orders for a specific retailer (MODIFIED TO FETCH ALL ORDER ITEMS - NO JSON_ARRAYAGG)
app.get('/api/retailers/:retailerId/orders', (req, res) => {
  const retailerId = req.params.retailerId;
  const customerNameFilter = req.query.customerName;

  let query = `
    SELECT
      o.order_id,
      o.customer_name,
      o.phone_number,
      o.location,
      o.order_status,
      o.created_at,
      p.product_name,
      oi.item_price,
      oi.quantity
    FROM
      orders o
    JOIN
      order_items oi ON o.order_id = oi.order_id
    JOIN
      products p ON oi.product_id = p.product_id
    WHERE
      o.retailer_id = ?
  `;
  const params = [retailerId];

  if (customerNameFilter) {
    query += ` AND o.customer_name LIKE ?`;
    params.push(`%${customerNameFilter}%`);
  }

  query += ` ORDER BY o.created_at DESC, o.order_id, p.product_name;`; // Order to help grouping

  db.query(query, params, (err, results) => {
    if (err) {
      console.error(' Kosa katika kupata maagizo ya mchuuzi:', err.message);
      return res.status(500).json({ error: 'Imeshindikana kupata maagizo ya mchuuzi.' });
    }

    // Manually group the results in Node.js
    const ordersMap = new Map();

    results.forEach(row => {
      if (!ordersMap.has(row.order_id)) {
        ordersMap.set(row.order_id, {
          order_id: row.order_id,
          customer_name: row.customer_name,
          phone_number: row.phone_number,
          location: row.location,
          order_status: row.order_status,
          created_at: row.created_at,
          items: []
        });
      }
      ordersMap.get(row.order_id).items.push({
        product_name: row.product_name,
        product_cost: row.item_price,
        quantity: row.quantity
      });
    });

    const groupedOrders = Array.from(ordersMap.values());
    res.json(groupedOrders);
  });
});

// Endpoint to update order status
app.put('/api/orders/:orderId/status', (req, res) => {
  const orderId = req.params.orderId;
  const { status } = req.body;

  if (!['approved', 'rejected', 'pending', 'agizo limepitishwa'].includes(status)) {
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