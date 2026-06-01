import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { getSecrets } from '../config/secrets';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// ─── REGISTER ───────────────────────────────────────────────
router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().escape().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('storeName').trim().notEmpty().escape().withMessage('Store name is required'),
    body('storeAddress').trim().escape().optional(),
    body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit phone required'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { name, email, password, storeName, storeAddress, phone } = req.body;

      // Check duplicate
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const id = uuidv4();
      const hashedPassword = await bcrypt.hash(password, 12);

      await query(
        `INSERT INTO users (id, name, email, password, store_name, store_address, phone, role, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [id, name, email, hashedPassword, storeName, storeAddress || '', phone, 'admin']
      );

      res.status(201).json({ message: 'Account created successfully. Please sign in.' });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// ─── LOGIN ──────────────────────────────────────────────────
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { email, password } = req.body;
      const result = await query('SELECT * FROM users WHERE email = $1', [email]);

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const secrets = await getSecrets();
      const token = jwt.sign(
        { id: user.id, role: user.role },
        secrets.JWT_SECRET,
        { expiresIn: secrets.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          storeName: user.store_name,
          storeAddress: user.store_address,
          phone: user.phone,
          role: user.role,
          createdAt: user.created_at,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// ─── GET PROFILE ────────────────────────────────────────────
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT id, name, email, store_name, store_address, phone, role, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const u = result.rows[0];
    res.json({
      id: u.id,
      name: u.name,
      email: u.email,
      storeName: u.store_name,
      storeAddress: u.store_address,
      phone: u.phone,
      role: u.role,
      createdAt: u.created_at,
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ─── UPDATE PROFILE ─────────────────────────────────────────
router.put(
  '/me',
  authenticate,
  [
    body('name').trim().notEmpty().escape().withMessage('Name is required'),
    body('storeName').trim().notEmpty().escape().withMessage('Store name is required'),
    body('storeAddress').trim().escape().optional(),
    body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid phone required'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { name, storeName, storeAddress, phone } = req.body;
      await query(
        'UPDATE users SET name=$1, store_name=$2, store_address=$3, phone=$4 WHERE id=$5',
        [name, storeName, storeAddress || '', phone, req.userId]
      );

      res.json({ message: 'Profile updated' });
    } catch (err) {
      console.error('Update profile error:', err);
      res.status(500).json({ error: 'Update failed' });
    }
  }
);

export default router;
