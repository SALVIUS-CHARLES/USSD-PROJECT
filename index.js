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
  database: 'ussd_db',
  multipleStatements: true // Essential for daily-sales endpoint
});

db.connect(err => {
  if (err) {
    console.error('Kosa katika kuungana na database:', err.message);
    return;
  }
  console.log('Imefanikiwa kuungana na database');
});

// Serve frontend (index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get all retailers
app.get('/api/retailers', (req, res) => {
  db.query('SELECT retailer_id, name, phone_number, location, tin_number FROM retailers', (err, results) => {
    if (err) {
      console.error('Kosa katika kupata wachuuzi:', err.message);
      return res.status(500).json({ error: 'Imeshindikana kupata wachuuzi.' });
    }
    res.json(results);
  });
});

// Register a new retailer
app.post('/api/retailers', (req, res) => {
  const { name, phoneNumber, location, tinNumber } = req.body;

  if (!name || !phoneNumber || !location || !tinNumber) {
    return res.status(400).json({ error: 'Tafadhali jaza taarifa zote muhimu: jina, nambari ya simu, eneo, na TIN.' });
  }

  // Check if retailer with same name or TIN already exists
  db.query('SELECT * FROM retailers WHERE name = ? OR tin_number = ?', [name, tinNumber], (err, results) => {
    if (err) {
      console.error('Kosa wakati wa kuangalia mfanyabiashara:', err.message);
      return res.status(500).json({ error: 'Imeshindikana kusajili mfanyabiashara.' });
    }
    if (results.length > 0) {
      if (results[0].name === name) {
        return res.status(409).json({ error: 'Jina la mfanyabiashara tayari lipo.' });
      }
      if (results[0].tin_number === tinNumber) {
        return res.status(409).json({ error: 'Nambari ya TIN tayari imesajiliwa.' });
      }
    }

    db.query(
      'INSERT INTO retailers (name, phone_number, location, tin_number) VALUES (?, ?, ?, ?)',
      [name, phoneNumber, location, tinNumber],
      (err, result) => {
        if (err) {
          console.error('Kosa katika kusajili mfanyabiashara:', err.message);
          return res.status(500).json({ error: 'Imeshindikana kusajili mfanyabiashara.' });
        }
        res.status(201).json({ message: 'Mfanyabiashara amesajiliwa kikamilifu!', retailerId: result.insertId });
      }
    );
  });
});

// Retailer login
app.post('/api/retailers/login', (req, res) => {
  const { name, tinNumber } = req.body;

  if (!name || !tinNumber) {
    return res.status(400).json({ error: 'Jina la mfanyabiashara na TIN zinahitajika.' });
  }

  db.query('SELECT retailer_id, name, phone_number, location, tin_number FROM retailers WHERE name = ? AND tin_number = ?', [name, tinNumber], (err, results) => {
    if (err) {
      console.error('Kosa wakati wa kuingia kwa mfanyabiashara:', err.message);
      return res.status(500).json({ error: 'Imeshindikana kuingia.' });
    }
    if (results.length > 0) {
      res.json({ success: true, message: 'Umeingia kikamilifu!', retailer: results[0] });
    } else {
      res.status(401).json({ success: false, error: 'Jina la mtumiaji au TIN si sahihi.' });
    }
  });
});

// Get retailer details by ID
app.get('/api/retailers/:id', (req, res) => {
  const retailerId = req.params.id;
  db.query('SELECT retailer_id, name, phone_number, location, tin_number FROM retailers WHERE retailer_id = ?', [retailerId], (err, results) => {
    if (err) {
      console.error('Kosa wakati wa kupata maelezo ya mfanyabiashara:', err.message);
      return res.status(500).json({ error: 'Imeshindikana kupata maelezo ya mfanyabiashara.' });
    }
    if (results.length > 0) {
      res.json({ retailer: results[0] });
    } else {
      res.status(404).json({ error: 'Mfanyabiashara hakupatikana.' });
    }
  });
});

// Update retailer details
app.put('/api/retailers/:id', (req, res) => {
  const retailerId = req.params.id;
  const { name, phoneNumber, location, tinNumber } = req.body;

  if (!name || !phoneNumber || !location || !tinNumber) {
    return res.status(400).json({ error: 'Tafadhali jaza taarifa zote muhimu: jina, nambari ya simu, eneo, na TIN.' });
  }

  db.query(
    'UPDATE retailers SET name = ?, phone_number = ?, location = ?, tin_number = ? WHERE retailer_id = ?',
    [name, phoneNumber, location, tinNumber, retailerId],
    (err, result) => {
      if (err) {
        console.error('Kosa wakati wa kubadili maelezo ya mfanyabiashara:', err.message);
        return res.status(500).json({ error: 'Imeshindikana kubadili maelezo ya mfanyabiashara.' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Mfanyabiashara hakupatikana.' });
      }
      res.json({ success: true, message: 'Maelezo ya mfanyabiashara yamebadilishwa kikamilifu!' });
    }
  );
});

// Get products by retailer ID
app.get('/api/products/:retailerId', (req, res) => {
  const retailerId = req.params.retailerId;
  db.query('SELECT product_id, product_name, product_cost FROM products WHERE retailer_id = ?', [retailerId], (err, results) => {
    if (err) {
      console.error('Kosa katika kupata bidhaa:', err.message);
      return res.status(500).json({ error: 'Imeshindikana kupata bidhaa.' });
    }
    res.json(results);
  });
});

// Add a new product
app.post('/api/products', (req, res) => {
  const { name, price, retailerId } = req.body;
  if (!name || !price || !retailerId) {
    return res.status(400).json({ error: 'Jina la bidhaa, bei, na kitambulisho cha mfanyabiashara vinahitajika.' });
  }

  db.query(
    'INSERT INTO products (product_name, product_cost, retailer_id) VALUES (?, ?, ?)',
    [name, parseFloat(price), retailerId], // Ensure price is stored as number
    (err, result) => {
      if (err) {
        console.error('Kosa katika kuongeza bidhaa:', err.message);
        return res.status(500).json({ error: 'Imeshindikana kuongeza bidhaa.' });
      }
      res.status(201).json({ message: 'Bidhaa imeongezwa kikamilifu!', productId: result.insertId });
    }
  );
});

// Update a product
app.put('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  const { name, price } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Jina la bidhaa na bei vinahitajika.' });
  }

  db.query(
    'UPDATE products SET product_name = ?, product_cost = ? WHERE product_id = ?',
    [name, parseFloat(price), productId], // Ensure price is stored as number
    (err, result) => {
      if (err) {
        console.error('Kosa wakati wa kubadili bidhaa:', err.message);
        return res.status(500).json({ error: 'Imeshindikana kubadili bidhaa.' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Bidhaa haikupatikana.' });
      }
      res.json({ message: 'Bidhaa imebadilishwa kikamilifu!' });
    }
  );
});

// Delete a product
app.delete('/api/products/:id', (req, res) => {
  const productId = req.params.id;

  db.query('DELETE FROM products WHERE product_id = ?', [productId], (err, result) => {
    if (err) {
      console.error('Kosa wakati wa kufuta bidhaa:', err.message);
      return res.status(500).json({ error: 'Imeshindikana kufuta bidhaa.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Bidhaa haikupatikana.' });
    }
    res.json({ message: 'Bidhaa imefutwa kikamilifu!' });
  });
});

// Place a new order (updated with proper numeric handling)
app.post('/api/orders', (req, res) => {
  const { name, phoneNumber, location, retailerId, items } = req.body;

  if (!name || !phoneNumber || !location || !retailerId || !items || items.length === 0) {
    return res.status(400).json({ error: 'Taarifa zote za agizo (jina, simu, eneo, mfanyabiashara, na bidhaa) zinahitajika.' });
  }

  db.beginTransaction(err => {
    if (err) {
      console.error('Kosa kuanza transaction:', err.message);
      return res.status(500).json({ error: 'Imeshindikana kutuma agizo.' });
    }

    // First, check if customer exists, if not, create new customer
    db.query('SELECT customer_id FROM customers WHERE phone_number = ?', [phoneNumber], (err, results) => {
      if (err) {
        return db.rollback(() => {
          console.error('Kosa kuangalia mteja:', err.message);
          res.status(500).json({ error: 'Imeshindikana kutuma agizo.' });
        });
      }

      let customerId;
      if (results.length > 0) {
        customerId = results[0].customer_id;
      } else {
        // Create new customer
        db.query('INSERT INTO customers (name, phone_number, location) VALUES (?, ?, ?)', 
          [name, phoneNumber, location], 
          (err, result) => {
            if (err) {
              return db.rollback(() => {
                console.error('Kosa kusajili mteja mpya:', err.message);
                res.status(500).json({ error: 'Imeshindikana kusajili mteja mpya.' });
              });
            }
            customerId = result.insertId;
            proceedWithOrderInsertion(customerId);
          }
        );
      }

      if (customerId) {
        proceedWithOrderInsertion(customerId);
      }
    });

    function proceedWithOrderInsertion(customerId) {
      // Insert into orders table
      db.query(
        'INSERT INTO orders (customer_id, retailer_id, order_status) VALUES (?, ?, ?)',
        [customerId, retailerId, 'agizo jipya'],
        (err, orderResult) => {
          if (err) {
            return db.rollback(() => {
              console.error('Kosa kuweka agizo:', err.message);
              res.status(500).json({ error: 'Imeshindikana kutuma agizo.' });
            });
          }

          const orderId = orderResult.insertId;
          const orderItemsData = items.map(item => [
            orderId, 
            item.productId, 
            item.quantity, 
            parseFloat(item.price) // Ensure price is stored as number
          ]);

          // Insert into order_items table
          db.query(
            'INSERT INTO order_items (order_id, product_id, quantity, item_price) VALUES ?',
            [orderItemsData],
            (err) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Kosa kuweka bidhaa za agizo:', err.message);
                  res.status(500).json({ error: 'Imeshindikana kutuma agizo.' });
                });
              }

              db.commit(err => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Kosa kucommit transaction:', err.message);
                    res.status(500).json({ error: 'Imeshindikana kutuma agizo.' });
                  });
                }
                res.status(201).json({ message: 'Agizo limetumwa kikamilifu!', orderId: orderId });
              });
            }
          );
        }
      );
    }
  });
});

// Get all orders for a retailer with detailed information (updated)
app.get('/api/retailers/:retailerId/orders', (req, res) => {
  const retailerId = req.params.retailerId;
  const customerName = req.query.customerName;

  // Validate retailerId
  if (isNaN(retailerId)) {
    return res.status(400).json({ error: 'ID ya mfanyabiashara si sahihi' });
  }

  let query = `
    SELECT 
      o.order_id,
      c.name AS customer_name,
      c.phone_number,
      c.location,
      o.order_status,
      oi.product_id,
      p.product_name,
      oi.quantity,
      oi.item_price,
      o.created_at,
      r.name AS retailer_name,
      r.retailer_id
    FROM orders o
    JOIN customers c ON o.customer_id = c.customer_id
    JOIN order_items oi ON o.order_id = oi.order_id
    JOIN products p ON oi.product_id = p.product_id
    JOIN retailers r ON o.retailer_id = r.retailer_id
    WHERE o.retailer_id = ?
  `;

  let params = [retailerId];

  if (customerName) {
    query += ' AND c.name LIKE ?';
    params.push(`%${customerName}%`);
  }

  query += ' ORDER BY o.created_at DESC';

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        error: 'Imeshindikana kupata maagizo',
        details: err.message
      });
    }

    // Group orders by order_id for better structure
    const groupedOrders = results.reduce((acc, item) => {
      if (!acc[item.order_id]) {
        acc[item.order_id] = {
          order_id: item.order_id,
          customer_name: item.customer_name,
          phone_number: item.phone_number,
          location: item.location,
          order_status: item.order_status,
          created_at: item.created_at,
          retailer_name: item.retailer_name,
          retailer_id: item.retailer_id,
          items: []
        };
      }
      acc[item.order_id].items.push({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        item_price: parseFloat(item.item_price) // Ensure price is number
      });
      return acc;
    }, {});

    res.json(Object.values(groupedOrders));
  });
});

// Update order status
app.put('/api/orders/:orderId/status', (req, res) => {
  const orderId = req.params.orderId;
  const { status } = req.body;

  // Validate input
  if (!status) {
    return res.status(400).json({ error: 'Hali ya agizo inahitajika' });
  }

  const validStatuses = ['agizo jipya', 'agizo limepitishwa', 'agizo limekataliwa', 'agizo limekamilika'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Hali si sahihi',
      valid_statuses: validStatuses
    });
  }

  db.query(
    'UPDATE orders SET order_status = ? WHERE order_id = ?',
    [status, orderId],
    (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          error: 'Imeshindikana kubadili hali ya agizo',
          details: err.message
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Agizo halikupatikana' });
      }

      res.json({
        success: true,
        message: `Hali ya agizo imebadilishwa kuwa: ${status}`,
        order_id: orderId,
        new_status: status
      });
    }
  );
});

// Get daily sales report for a retailer
app.get('/api/retailers/:retailerId/daily-sales', (req, res) => {
  const retailerId = req.params.retailerId;
  let date = req.query.date || new Date().toISOString().split('T')[0];

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      error: 'Muundo wa tarehe si sahihi',
      example: '2023-05-15'
    });
  }

  // Validate retailerId
  if (isNaN(retailerId)) {
    return res.status(400).json({ error: 'ID ya mfanyabiashara si sahihi' });
  }

  const query = `
    -- Overall sales for the day
    SELECT 
      COALESCE(SUM(oi.item_price * oi.quantity), 0) AS total_sales,
      COUNT(DISTINCT o.order_id) AS total_orders
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    WHERE o.retailer_id = ? 
    AND DATE(o.created_at) = ?
    AND o.order_status = 'agizo limekamilika';
    
    -- Product-wise sales
    SELECT
      p.product_name,
      COALESCE(SUM(oi.quantity), 0) AS quantity_sold,
      COALESCE(SUM(oi.item_price * oi.quantity), 0) AS total_product_cost
    FROM orders o
    JOIN order_items oi ON o.order_id = oi.order_id
    JOIN products p ON oi.product_id = p.product_id
    WHERE o.retailer_id = ?
    AND DATE(o.created_at) = ?
    AND o.order_status = 'agizo limekamilika'
    GROUP BY p.product_name
    ORDER BY quantity_sold DESC;
  `;

  db.query(query, [retailerId, date, retailerId, date], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        error: 'Imeshindikana kupata mauzo ya siku',
        details: err.message
      });
    }

    const response = {
      date: date,
      overallSales: {
        total_sales: parseFloat(results[0][0].total_sales),
        total_orders: results[0][0].total_orders
      },
      productSales: results[1].map(item => ({
        product_name: item.product_name,
        quantity_sold: item.quantity_sold,
        total_product_cost: parseFloat(item.total_product_cost)
      }))
    };

    res.json(response);
  });
});

// Get customer's past orders by phone number
app.get('/api/customer-orders/:phoneNumber', (req, res) => {
  const phoneNumber = req.params.phoneNumber;

  const query = `
    SELECT
        o.order_id,
        c.customer_id,
        c.name AS customer_name,
        r.name AS retailer_name,
        o.order_status,
        o.created_at,
        oi.product_id,
        p.product_name,
        oi.quantity,
        oi.item_price AS product_cost
    FROM
        orders o
    JOIN
        customers c ON o.customer_id = c.customer_id
    JOIN
        retailers r ON o.retailer_id = r.retailer_id
    JOIN
        order_items oi ON o.order_id = oi.order_id
    JOIN
        products p ON oi.product_id = p.product_id
    WHERE
        c.phone_number = ?
    ORDER BY
        o.created_at DESC;
  `;

  db.query(query, [phoneNumber], (err, results) => {
    if (err) {
      console.error('Kosa wakati wa kupata maagizo ya mteja:', err.message);
      return res.status(500).json({ error: 'Imeshindikana kupata maagizo ya mteja.' });
    }

    // Group items by order to return a cleaner structure
    const groupedOrders = results.reduce((acc, item) => {
      if (!acc[item.order_id]) {
        acc[item.order_id] = {
          order_id: item.order_id,
          customer_id: item.customer_id,
          customer_name: item.customer_name,
          retailer_name: item.retailer_name,
          retailer_id: item.retailer_id,
          order_status: item.order_status,
          created_at: item.created_at,
          items: []
        };
      }
      acc[item.order_id].items.push({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        product_cost: parseFloat(item.product_cost) // Ensure price is number
      });
      return acc;
    }, {});

    res.json(Object.values(groupedOrders));
  });
});

// Submit feedback for a product
app.post('/api/feedback/product', (req, res) => {
  const { productId, customerId, orderId, feedback } = req.body;

  if (!productId || !customerId || !orderId || !feedback) {
    return res.status(400).json({ error: 'Bidhaa, mteja, agizo, na maoni vinahitajika.' });
  }

  db.query(
    'INSERT INTO feedback (customer_id, product_id, order_id, feedback_text, feedback_type) VALUES (?, ?, ?, ?, ?)',
    [customerId, productId, orderId, feedback, 'product'],
    (err, result) => {
      if (err) {
        console.error('Kosa wakati wa kutuma maoni ya bidhaa:', err.message);
        return res.status(500).json({ error: 'Imeshindikana kutuma maoni ya bidhaa.' });
      }
      res.status(201).json({ message: 'Maoni ya bidhaa yametumwa kikamilifu!', feedbackId: result.insertId });
    }
  );
});

// Submit feedback for a retailer
app.post('/api/feedback/retailer', (req, res) => {
  const { retailerId, customerId, orderId, feedback } = req.body;

  if (!retailerId || !customerId || !orderId || !feedback) {
    return res.status(400).json({ error: 'Mfanyabiashara, mteja, agizo, na maoni vinahitajika.' });
  }

  db.query(
    'INSERT INTO feedback (customer_id, retailer_id, order_id, feedback_text, feedback_type) VALUES (?, ?, ?, ?, ?)',
    [customerId, retailerId, orderId, feedback, 'retailer'],
    (err, result) => {
      if (err) {
        console.error('Kosa wakati wa kutuma maoni ya mfanyabiashara:', err.message);
        return res.status(500).json({ error: 'Imeshindikana kutuma maoni ya mfanyabiashara.' });
      }
      res.status(201).json({ message: 'Maoni ya mfanyabiashara yametumwa kikamilifu!', feedbackId: result.insertId });
    }
  );
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Seva imeanza kwenye http://localhost:${PORT}`);
  console.log(`📱 Simulator ya USSD ipo kwenye http://localhost:${PORT}`);
});