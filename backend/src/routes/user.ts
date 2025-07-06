import { Router } from 'express';
import { z } from 'zod';
import { User } from '@/models/user';
import { asyncHandler } from '@/middleware/error';
import { isValidPhone } from '@/utils/validation';
import mongoose from 'mongoose';

const router = Router();

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phoneNumber: z
    .string()
    .refine(isValidPhone, 'Invalid phone number')
    .optional(),
  preferredLanguage: z
    .enum(['hi', 'bn', 'te', 'ta', 'mr', 'gu', 'kn', 'ml', 'pa', 'or'])
    .optional(),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// Get user profile
router.get(
  '/profile',
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
        aadhaarNumber: user.aadhaarNumber,
        phoneNumber: user.phoneNumber,
        preferredLanguage: user.preferredLanguage,
      },
    });
  })
);

// Update user profile
router.patch(
  '/profile',
  asyncHandler(async (req, res) => {
    const data = updateProfileSchema.parse(req.body);

    // Check if phone number is unique
    if (data.phoneNumber) {
      const existingUser = await User.findOne({
        phoneNumber: data.phoneNumber,
        _id: { $ne: req.user.id },
      });
      if (existingUser) {
        throw new Error('Phone number already registered');
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: data },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        aadhaarNumber: user.aadhaarNumber,
        phoneNumber: user.phoneNumber,
        preferredLanguage: user.preferredLanguage,
      },
    });
  })
);

// Update password
router.patch(
  '/password',
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = updatePasswordSchema.parse(req.body);

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  })
);

// Update language preference
router.patch(
  '/language',
  asyncHandler(async (req, res) => {
    const { language } = z
      .object({
        language: z.enum([
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
      })
      .parse(req.body);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { preferredLanguage: language } },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        aadhaarNumber: user.aadhaarNumber,
        phoneNumber: user.phoneNumber,
        preferredLanguage: user.preferredLanguage,
      },
    });
  })
);

// Get user statistics
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new Error('User not found');
    }

    // Get user's form submissions count
    const submissionsCount = await mongoose
      .model('FormSubmission')
      .countDocuments({ userId: user._id });

    // Get user's active conversations count
    const activeConversationsCount = await mongoose
      .model('Conversation')
      .countDocuments({ userId: user._id, status: 'active' });

    // Get user's completed forms count
    const completedFormsCount = await mongoose
      .model('FormSubmission')
      .countDocuments({
        userId: user._id,
        status: 'approved',
      });

    res.json({
      stats: {
        submissionsCount,
        activeConversationsCount,
        completedFormsCount,
      },
    });
  })
);

export default router; 