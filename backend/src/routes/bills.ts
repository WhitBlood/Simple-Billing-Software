import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { billLimiter } from '../middleware/rateLimiter';

const router = Router();

// ─── CREATE BILL ────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  billLimiter,
  [
    body('customerName').trim().notEmpty().escape().withMessage('Customer name is required'),
    body('customerPhone').trim().escape().optional(),
    body('paymentMethod').isIn(['cash', 'card', 'upi', 'online']).withMessage('Invalid payment method'),
    body('taxRate').isFloat({ min: 0, max: 100 }).withMessage('Invalid tax rate'),
    body('discountRate').isFloat({ min: 0, max: 100 }).withMessage('Invalid discount rate'),
    body('items').isArray({ min: 1 }).withMessage('At least one item required'),
    body('items.*.name').trim().notEmpty().escape().withMessage('Item name required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Price must be positive'),
    body('finalized').isBoolean().withMessage('Finalized flag required'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { customerName, customerPhone, paymentMethod, taxRate, discountRate, items, finalized } = req.body;

      // Generate bill number
      const ts = Date.now().toString(36).toUpperCase();
      const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
      const billNumber = `BF-${ts}-${rand}`;

      // Calculate totals
      const billItems = items.map((item: { name: string; quantity: number; unitPrice: number }) => ({
        id: uuidv4(),
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
      }));

      const subtotal = billItems.reduce((s: number, i: { totalPrice: number }) => s + i.totalPrice, 0);
      const discountAmount = (subtotal * discountRate) / 100;
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = (taxableAmount * taxRate) / 100;
      const grandTotal = taxableAmount + taxAmount;

      const billId = uuidv4();
      const now = new Date();
      const date = now.toISOString().split('T')[0];
      const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Get store info
      const userResult = await query('SELECT store_name, store_address FROM users WHERE id = $1', [req.userId]);
      const store = userResult.rows[0] || { store_name: '', store_address: '' };

      // Insert bill
      await query(
        `INSERT INTO bills (id, bill_number, date, time, store_name, store_address,
         customer_name, customer_phone, subtotal, tax_rate, tax_amount,
         discount_rate, discount_amount, grand_total, payment_method,
         finalized, created_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())`,
        [
          billId, billNumber, date, time, store.store_name, store.store_address,
          customerName, customerPhone || '', subtotal, taxRate, taxAmount,
          discountRate, discountAmount, grandTotal, paymentMethod,
          finalized, req.userId,
        ]
      );

      // Insert items
      for (const item of billItems) {
        await query(
          `INSERT INTO bill_items (id, bill_id, name, quantity, unit_price, total_price)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [item.id, billId, item.name, item.quantity, item.unitPrice, item.totalPrice]
        );
      }

      res.status(201).json({
        id: billId,
        billNumber,
        date,
        time,
        storeName: store.store_name,
        storeAddress: store.store_address,
        customerName,
        customerPhone: customerPhone || '',
        items: billItems,
        subtotal,
        taxRate,
        taxAmount,
        discountRate,
        discountAmount,
        grandTotal,
        paymentMethod,
        finalized,
        createdBy: req.userId,
        createdAt: now.toISOString(),
      });
    } catch (err) {
      console.error('Create bill error:', err);
      res.status(500).json({ error: 'Failed to create bill' });
    }
  }
);

// ─── GET ALL BILLS ──────────────────────────────────────────
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM bills WHERE created_by = $1 ORDER BY created_at DESC`,
      [req.userId]
    );

    const bills = [];
    for (const row of result.rows) {
      const itemsResult = await query('SELECT * FROM bill_items WHERE bill_id = $1', [row.id]);
      bills.push({
        id: row.id,
        billNumber: row.bill_number,
        date: row.date,
        time: row.time,
        storeName: row.store_name,
        storeAddress: row.store_address,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        items: itemsResult.rows.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          unitPrice: parseFloat(i.unit_price),
          totalPrice: parseFloat(i.total_price),
        })),
        subtotal: parseFloat(row.subtotal),
        taxRate: parseFloat(row.tax_rate),
        taxAmount: parseFloat(row.tax_amount),
        discountRate: parseFloat(row.discount_rate),
        discountAmount: parseFloat(row.discount_amount),
        grandTotal: parseFloat(row.grand_total),
        paymentMethod: row.payment_method,
        finalized: row.finalized,
        createdBy: row.created_by,
        createdAt: row.created_at,
      });
    }

    res.json(bills);
  } catch (err) {
    console.error('Get bills error:', err);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// ─── GET SINGLE BILL ────────────────────────────────────────
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT * FROM bills WHERE id = $1 AND created_by = $2', [req.params.id, req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });

    const row = result.rows[0];
    const itemsResult = await query('SELECT * FROM bill_items WHERE bill_id = $1', [row.id]);

    res.json({
      id: row.id,
      billNumber: row.bill_number,
      date: row.date,
      time: row.time,
      storeName: row.store_name,
      storeAddress: row.store_address,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      items: itemsResult.rows.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        unitPrice: parseFloat(i.unit_price),
        totalPrice: parseFloat(i.total_price),
      })),
      subtotal: parseFloat(row.subtotal),
      taxRate: parseFloat(row.tax_rate),
      taxAmount: parseFloat(row.tax_amount),
      discountRate: parseFloat(row.discount_rate),
      discountAmount: parseFloat(row.discount_amount),
      grandTotal: parseFloat(row.grand_total),
      paymentMethod: row.payment_method,
      finalized: row.finalized,
      createdBy: row.created_by,
      createdAt: row.created_at,
    });
  } catch (err) {
    console.error('Get bill error:', err);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

// ─── FINALIZE BILL ──────────────────────────────────────────
router.patch('/:id/finalize', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT finalized FROM bills WHERE id = $1 AND created_by = $2', [req.params.id, req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });
    if (result.rows[0].finalized) return res.status(400).json({ error: 'Bill is already finalized' });

    await query('UPDATE bills SET finalized = true WHERE id = $1', [req.params.id]);
    res.json({ message: 'Bill finalized successfully' });
  } catch (err) {
    console.error('Finalize error:', err);
    res.status(500).json({ error: 'Failed to finalize bill' });
  }
});

export default router;
