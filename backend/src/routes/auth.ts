import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { User } from '@/models/user';
import { asyncHandler } from '@/middleware/error';
import { verifyToken } from '@/middleware/auth';
import { isValidAadhaar, isValidPhone } from '@/utils/validation';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  aadhaarNumber: z.string().refine(isValidAadhaar, 'Invalid Aadhaar number'),
  phoneNumber: z.string().refine(isValidPhone, 'Invalid phone number'),
  preferredLanguage: z.enum([
    'hi',
    'bn',
    'te',
    'ta',
    'mr',
    'gu',
    'kn',
    'ml',
    'pa',
    'or',
  ]),
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string(),
});

// Generate tokens
const generateTokens = (userId: string) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'your-jwt-secret',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    }
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret',
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    }
  );

  return { accessToken, refreshToken };
};

// Register route
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: data.email },
        { aadhaarNumber: data.aadhaarNumber },
        { phoneNumber: data.phoneNumber },
      ],
    });

    if (existingUser) {
      if (existingUser.email === data.email) {
        throw new Error('Email already registered');
      }
      if (existingUser.aadhaarNumber === data.aadhaarNumber) {
        throw new Error('Aadhaar number already registered');
      }
      if (existingUser.phoneNumber === data.phoneNumber) {
        throw new Error('Phone number already registered');
      }
    }

    // Create user
    const user = await User.create(data);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
      },
    });
  })
);

// Login route
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
      },
    });
  })
);

// Refresh token route
router.post(
  '/refresh-token',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      throw new Error('No refresh token provided');
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret'
    ) as jwt.JwtPayload;

    // Get user
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new tokens
    const tokens = generateTokens(user._id);

    // Set new refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      token: tokens.accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
      },
    });
  })
);

// Logout route
router.post(
  '/logout',
  verifyToken,
  asyncHandler(async (req, res) => {
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  })
);

// Get current user route
router.get(
  '/me',
  verifyToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new Error('User not found');
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
      },
    });
  })
);

export default router; 