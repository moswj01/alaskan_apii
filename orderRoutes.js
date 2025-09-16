// Order API endpoints
const express = require('express');
const { authenticateToken } = require('./auth');

// สร้าง router function ที่รับ db connection
function createOrderRoutes(db) {
  const router = express.Router();

  // Get all orders
  router.get('/', authenticateToken, (req, res) => {
    const { status, customer_id, game_id, product_id, server_name, player_uid } = req.query;
    let query = `
      SELECT o.*, 
             c.name as customer_name, c.email as customer_email,
             g.name as game_name,
             p.name as product_name, p.price as product_price
      FROM orders o 
      LEFT JOIN customers c ON o.customer_id = c.id 
      LEFT JOIN games g ON o.game_id = g.id
      LEFT JOIN products p ON o.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }
    if (customer_id) {
      query += ' AND o.customer_id = ?';
      params.push(customer_id);
    }
    if (game_id) {
      query += ' AND o.game_id = ?';
      params.push(game_id);
    }
    if (product_id) {
      query += ' AND o.product_id = ?';
      params.push(product_id);
    }
    if (server_name) {
      query += ' AND o.server_name LIKE ?';
      params.push(`%${server_name}%`);
    }
    if (player_uid) {
      query += ' AND o.player_uid LIKE ?';
      params.push(`%${player_uid}%`);
    }

    query += ' ORDER BY o.created_at DESC';

    db.query(query, params, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    });
  });

  // Get single order with details
  router.get('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const orderQuery = `
      SELECT o.*, 
             c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             g.name as game_name, g.platform as game_platform,
             p.name as product_name, p.price as product_price, p.description as product_description
      FROM orders o 
      LEFT JOIN customers c ON o.customer_id = c.id 
      LEFT JOIN games g ON o.game_id = g.id
      LEFT JOIN products p ON o.product_id = p.id
      WHERE o.id = ?
    `;

    db.query(orderQuery, [id], (err, orderResults) => {
      if (err) return res.status(500).json({ error: err.message });
      if (orderResults.length === 0) return res.status(404).json({ error: 'Order not found' });

      const order = orderResults[0];
      res.json(order);
    });
  });

  // Create new order
  router.post('/', authenticateToken, (req, res) => {
    const {
      customer_id,
      game_id,
      product_id,
      player_uid,
      server_name,
      quantity = 1,
      order_number,
      status = 'PENDING',
      payment_method,
      notes
    } = req.body;

    // Check required fields
    if (!customer_id || !product_id || !player_uid || !quantity) {
      return res.status(400).json({ 
        error: 'Missing required fields: customer_id, product_id, player_uid, quantity' 
      });
    }

    // Get product price to calculate total
    db.query('SELECT price FROM products WHERE id = ?', [product_id], (err, productResults) => {
      if (err) return res.status(500).json({ error: err.message });
      if (productResults.length === 0) return res.status(404).json({ error: 'Product not found' });

      const unit_price = productResults[0].price;
      const total_amount = unit_price * quantity;

      // Generate order number if not provided
      const generateOrderNumber = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000000)+Math.random().toString().padStart(6, '0');
        return `ORD-${year}${month}${day}${minutes}${seconds}-${random}`;
      };

      const orderData = {
        customer_id,
        player_uid,
        server_name,
        product_id,
        quantity,
        unit_price,
        total_amount,
        order_no: order_number || generateOrderNumber(),
        status,
        created_by: req.user.id
      };

      // Add optional fields if they exist
      if (game_id) orderData.game_id = game_id;
      if (payment_method) orderData.payment_method = payment_method;
      if (notes) orderData.notes = notes;

      db.query('INSERT INTO orders SET ?', orderData, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ 
          id: result.insertId, 
          message: 'Order created successfully',
          ...orderData
        });
      });
    });
  });

  // Update order status
  router.put('/:id/status', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData = { status };
    
    // Add notes only if it exists and the column exists in the table
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    db.query('UPDATE orders SET ? WHERE id = ?', [updateData, id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
      res.json({ 
        message: `Order status updated to ${status}`,
        affectedRows: result.affectedRows 
      });
    });
  });

  // Update order details
  router.put('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const allowedFields = [
      'player_uid', 'server_name', 'quantity', 
      'payment_method', 'notes', 'product_id'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // If quantity or product_id changed, recalculate total_amount
    if (updateData.quantity || updateData.product_id) {
      // Get current order data
      db.query('SELECT product_id, quantity FROM orders WHERE id = ?', [id], (err, orderResults) => {
        if (err) return res.status(500).json({ error: err.message });
        if (orderResults.length === 0) return res.status(404).json({ error: 'Order not found' });

        const currentOrder = orderResults[0];
        const newProductId = updateData.product_id || currentOrder.product_id;
        const newQuantity = updateData.quantity || currentOrder.quantity;

        // Get product price
        db.query('SELECT price FROM products WHERE id = ?', [newProductId], (err, productResults) => {
          if (err) return res.status(500).json({ error: err.message });
          if (productResults.length === 0) return res.status(404).json({ error: 'Product not found' });

          const unit_price = productResults[0].price;
          updateData.unit_price = unit_price;
          updateData.total_amount = unit_price * newQuantity;
          updateData.updated_at = new Date();

          db.query('UPDATE orders SET ? WHERE id = ? AND status IN ("PENDING", "CONFIRMED")', [updateData, id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) {
              return res.status(404).json({ error: 'Order not found or cannot be updated (invalid status)' });
            }
            res.json({ 
              message: 'Order updated successfully',
              affectedRows: result.affectedRows 
            });
          });
        });
      });
    } else {
      updateData.updated_at = new Date();

      db.query('UPDATE orders SET ? WHERE id = ?', [updateData, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
        res.json({ 
          message: 'Order updated successfully',
          affectedRows: result.affectedRows 
        });
      });
    }
  });

  // Delete order (only if PENDING or CANCELLED)
  router.delete('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.query('SELECT status FROM orders WHERE id = ?', [id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ error: 'Order not found' });

      const status = results[0].status;
      if (!['PENDING', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ 
          error: 'Cannot delete order. Only PENDING or CANCELLED orders can be deleted.' 
        });
      }

      // Start transaction to delete order and items
      db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Delete order items first
        db.query('DELETE FROM order_items WHERE order_id = ?', [id], (err) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ error: err.message });
            });
          }

          // Delete order
          db.query('DELETE FROM orders WHERE id = ?', [id], (err, result) => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ error: err.message });
              });
            }

            db.commit((err) => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ error: err.message });
                });
              }
              res.json({ 
                message: 'Order deleted successfully',
                affectedRows: result.affectedRows 
              });
            });
          });
        });
      });
    });
  });

  // Get order statistics
  router.get('/stats/summary', authenticateToken, (req, res) => {
    const { date_from, date_to } = req.query;
    let dateFilter = '';
    const params = [];

    if (date_from && date_to) {
      dateFilter = 'WHERE DATE(created_at) BETWEEN ? AND ?';
      params.push(date_from, date_to);
    } else if (date_from) {
      dateFilter = 'WHERE DATE(created_at) >= ?';
      params.push(date_from);
    } else if (date_to) {
      dateFilter = 'WHERE DATE(created_at) <= ?';
      params.push(date_to);
    }

    const query = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_orders,
        SUM(CASE WHEN status = 'COMPLETED' THEN total_amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN status = 'COMPLETED' THEN total_amount ELSE NULL END) as avg_order_value
      FROM orders ${dateFilter}
    `;

    db.query(query, params, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results[0]);
    });
  });

  return router;
}

module.exports = createOrderRoutes;
