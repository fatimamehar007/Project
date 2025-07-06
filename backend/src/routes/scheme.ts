import { Router } from 'express';
import { z } from 'zod';
import { Scheme } from '@/models/scheme';
import { asyncHandler } from '@/middleware/error';
import { checkRole } from '@/middleware/auth';
import { isValidObjectId } from '@/utils/validation';
import mongoose from 'mongoose';

const router = Router();

// Validation schemas
const formFieldSchema = z.object({
  name: z.string().min(1, 'Field name is required'),
  label: z.string().min(1, 'Field label is required'),
  type: z.enum(['text', 'number', 'date', 'select', 'file']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  validationRules: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
});

const schemeSchema = z.object({
  name: z.string().min(1, 'Scheme name is required'),
  description: z.string().min(1, 'Description is required'),
  eligibilityCriteria: z
    .array(z.string())
    .min(1, 'At least one eligibility criterion is required'),
  formFields: z
    .array(formFieldSchema)
    .min(1, 'At least one form field is required'),
  conversationTemplate: z.string().min(1, 'Conversation template is required'),
  supportingDocuments: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

// Get all schemes
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, isActive, page = 1, limit = 10 } = req.query;

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const [schemes, total] = await Promise.all([
      Scheme.find(query)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .populate('createdBy', 'name'),
      Scheme.countDocuments(query),
    ]);

    res.json({
      schemes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// Get scheme by ID
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = z
      .object({ id: z.string().refine(isValidObjectId, 'Invalid scheme ID') })
      .parse(req.params);

    const scheme = await Scheme.findById(id).populate('createdBy', 'name');
    if (!scheme) {
      throw new Error('Scheme not found');
    }

    res.json({ scheme });
  })
);

// Create scheme (admin only)
router.post(
  '/',
  checkRole(['admin']),
  asyncHandler(async (req, res) => {
    const data = schemeSchema.parse(req.body);

    // Validate select field options
    data.formFields.forEach((field) => {
      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        throw new Error(`Select field "${field.label}" must have at least one option`);
      }
    });

    const scheme = await Scheme.create({
      ...data,
      createdBy: req.user.id,
    });

    res.status(201).json({ scheme });
  })
);

// Update scheme (admin only)
router.patch(
  '/:id',
  checkRole(['admin']),
  asyncHandler(async (req, res) => {
    const { id } = z
      .object({ id: z.string().refine(isValidObjectId, 'Invalid scheme ID') })
      .parse(req.params);

    const data = schemeSchema.partial().parse(req.body);

    // Validate select field options
    data.formFields?.forEach((field) => {
      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        throw new Error(`Select field "${field.label}" must have at least one option`);
      }
    });

    const scheme = await Scheme.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    ).populate('createdBy', 'name');

    if (!scheme) {
      throw new Error('Scheme not found');
    }

    res.json({ scheme });
  })
);

// Delete scheme (admin only)
router.delete(
  '/:id',
  checkRole(['admin']),
  asyncHandler(async (req, res) => {
    const { id } = z
      .object({ id: z.string().refine(isValidObjectId, 'Invalid scheme ID') })
      .parse(req.params);

    const scheme = await Scheme.findByIdAndDelete(id);
    if (!scheme) {
      throw new Error('Scheme not found');
    }

    res.json({ message: 'Scheme deleted successfully' });
  })
);

// Toggle scheme status (admin only)
router.patch(
  '/:id/toggle',
  checkRole(['admin']),
  asyncHandler(async (req, res) => {
    const { id } = z
      .object({ id: z.string().refine(isValidObjectId, 'Invalid scheme ID') })
      .parse(req.params);

    const scheme = await Scheme.findById(id);
    if (!scheme) {
      throw new Error('Scheme not found');
    }

    scheme.isActive = !scheme.isActive;
    await scheme.save();

    res.json({ scheme });
  })
);

// Get scheme statistics (admin only)
router.get(
  '/:id/stats',
  checkRole(['admin']),
  asyncHandler(async (req, res) => {
    const { id } = z
      .object({ id: z.string().refine(isValidObjectId, 'Invalid scheme ID') })
      .parse(req.params);

    const scheme = await Scheme.findById(id);
    if (!scheme) {
      throw new Error('Scheme not found');
    }

    // Get scheme statistics
    const [
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      activeConversations,
    ] = await Promise.all([
      mongoose.model('FormSubmission').countDocuments({ schemeId: id }),
      mongoose
        .model('FormSubmission')
        .countDocuments({ schemeId: id, status: 'pending' }),
      mongoose
        .model('FormSubmission')
        .countDocuments({ schemeId: id, status: 'approved' }),
      mongoose
        .model('FormSubmission')
        .countDocuments({ schemeId: id, status: 'rejected' }),
      mongoose
        .model('Conversation')
        .countDocuments({ schemeId: id, status: 'active' }),
    ]);

    res.json({
      stats: {
        totalSubmissions,
        pendingSubmissions,
        approvedSubmissions,
        rejectedSubmissions,
        activeConversations,
      },
    });
  })
);

export default router; 