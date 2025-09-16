// Refund API endpoints
const express = require('express');
const { authenticateToken } = require('./auth');

// สร้าง router function ที่รับ db connection
function createRefundRoutes(db) {
  const router = express.Router();

// Get all refunds
router.get('/', authenticateToken, (req, res) => {
  const { status, customer_id, order_id } = req.query;
  let query = 'SELECT r.*, c.name as customer_name, o.order_number, u1.name as requested_by_name, u2.name as approved_by_name FROM refunds r LEFT JOIN customers c ON r.customer_id = c.id LEFT JOIN orders o ON r.order_id = o.id LEFT JOIN users u1 ON r.requested_by = u1.id LEFT JOIN users u2 ON r.approved_by = u2.id WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND r.status = ?';
    params.push(status);
  }
  if (customer_id) {
    query += ' AND r.customer_id = ?';
    params.push(customer_id);
  }
  if (order_id) {
    query += ' AND r.order_id = ?';
    params.push(order_id);
  }

  query += ' ORDER BY r.created_at DESC';

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Get single refund
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT r.*, 
           c.name as customer_name, c.email as customer_email,
           o.order_number, o.total_amount as order_amount,
           u1.name as requested_by_name, 
           u2.name as approved_by_name
    FROM refunds r 
    LEFT JOIN customers c ON r.customer_id = c.id 
    LEFT JOIN orders o ON r.order_id = o.id 
    LEFT JOIN users u1 ON r.requested_by = u1.id 
    LEFT JOIN users u2 ON r.approved_by = u2.id 
    WHERE r.id = ?
  `;

  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Refund not found' });
    res.json(results[0]);
  });
});

// Create new refund request
router.post('/', authenticateToken, (req, res) => {
  const {
    order_id,
    customer_id,
    refund_amount,
    refund_reason,
    refund_type = 'FULL',
    refund_method = 'BANK_TRANSFER',
    bank_account_name,
    bank_account_number,
    bank_name,
    notes
  } = req.body;

  const refundData = {
    order_id,
    customer_id,
    refund_amount,
    refund_reason,
    refund_type,
    refund_method,
    bank_account_name,
    bank_account_number,
    bank_name,
    notes,
    requested_by: req.user.id,
    status: 'PENDING'
  };

  db.query('INSERT INTO refunds SET ?', refundData, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ 
      id: result.insertId, 
      message: 'Refund request created successfully',
      ...refundData 
    });
  });
});

// Update refund status (approve/reject)
router.put('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status, notes, refund_reference } = req.body;

  if (!['APPROVED', 'REJECTED', 'COMPLETED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const updateData = {
    status,
    notes,
    approved_by: req.user.id,
    updated_at: new Date()
  };

  if (status === 'COMPLETED' && refund_reference) {
    updateData.refund_reference = refund_reference;
    updateData.processed_at = new Date();
  }

  db.query('UPDATE refunds SET ? WHERE id = ?', [updateData, id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Refund not found' });
    res.json({ 
      message: `Refund ${status.toLowerCase()} successfully`,
      affectedRows: result.affectedRows 
    });
  });
});

// Update refund details
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const allowedFields = [
    'refund_amount', 'refund_reason', 'refund_type', 'refund_method',
    'bank_account_name', 'bank_account_number', 'bank_name', 'notes'
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

  updateData.updated_at = new Date();

  db.query('UPDATE refunds SET ? WHERE id = ? AND status = "PENDING"', [updateData, id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Refund not found or cannot be updated (not in PENDING status)' });
    }
    res.json({ 
      message: 'Refund updated successfully',
      affectedRows: result.affectedRows 
    });
  });
});

// Delete refund (only if PENDING)
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM refunds WHERE id = ? AND status = "PENDING"', [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Refund not found or cannot be deleted (not in PENDING status)' });
    }
    res.json({ 
      message: 'Refund deleted successfully',
      affectedRows: result.affectedRows 
    });
  });
});

  return router;
}

module.exports = createRefundRoutes;
