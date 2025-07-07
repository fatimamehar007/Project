import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import { FormSubmission } from '@/models/form-submission';
import { Conversation } from '@/models/conversation';
import { Scheme } from '@/models/scheme';
import { asyncHandler } from '@/middleware/error';
import { checkRole } from '@/middleware/auth';
import { isValidObjectId, isValidFileType, isValidFileSize } from '@/utils/validation';
import { extractFormData } from '@/services/ai';
import { emitNotification } from '@/socket';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!isValidFileType(file.mimetype, allowedTypes)) {
      cb(new Error('Invalid file type'));
      return;
    }
    cb(null, true);
  },
});

// Submit form
router.post(
  '/:conversationId/submit',
  upload.array('documents'),
  asyncHandler(async (req, res) => {
    const { conversationId } = z
      .object({
        conversationId: z.string().refine(isValidObjectId, 'Invalid conversation ID'),
      })
      .parse(req.params);

    // Get conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user.id,
    }).populate('schemeId');

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Get scheme
    const scheme = await Scheme.findById(conversation.schemeId);
    if (!scheme) {
      throw new Error('Scheme not found');
    }

    // Extract form data from conversation
    const formData = await extractFormData(conversation.messages);

    // Validate required fields
    const missingFields = scheme.formFields
      .filter((field) => field.required && !formData[field.name])
      .map((field) => field.label);

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required fields: ${missingFields.join(', ')}`
      );
    }

    // Process uploaded documents
    const files = req.files as Express.Multer.File[];
    const documents = files.map((file) => ({
      name: file.originalname,
      path: file.path,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
    }));

    // Create form submission
    const submission = await FormSubmission.create({
      userId: req.user.id,
      schemeId: scheme._id,
      conversationId,
      formData,
      documents,
      accuracy: 0.9, // TODO: Calculate actual accuracy
      status: 'pending',
      verificationStatus: 'pending',
      submittedAt: new Date(),
    });

    // Update conversation status
    conversation.status = 'completed';
    conversation.completedAt = new Date();
    await conversation.save();

    // Notify admin
    const admins = await mongoose
      .model('User')
      .find({ role: 'admin' })
      .select('_id');

    admins.forEach((admin) => {
      emitNotification(admin._id.toString(), {
        type: 'form_submission',
        title: 'New Form Submission',
        message: `New submission for ${scheme.name}`,
        data: {
          submissionId: submission._id,
          schemeName: scheme.name,
          userName: req.user.name,
        },
      });
    });

    res.status(201).json({ submission });
  })
);

// Get user's submissions
router.get(
  '/submissions',
  asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 10 } = req.query;

    const query: any = { userId: req.user.id };

    if (status) {
      query.status = status;
    }

    const [submissions, total] = await Promise.all([
      FormSubmission.find(query)
        .sort({ submittedAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .populate('schemeId', 'name'),
      FormSubmission.countDocuments(query),
    ]);

    res.json({
      submissions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// Get submission by ID
router.get(
  '/submissions/:id',
  asyncHandler(async (req, res) => {
    const { id } = z
      .object({ id: z.string().refine(isValidObjectId, 'Invalid submission ID') })
      .parse(req.params);

    const submission = await FormSubmission.findOne({
      _id: id,
      userId: req.user.id,
    })
      .populate('schemeId', 'name formFields')
      .populate('conversationId', 'messages');

    if (!submission) {
      throw new Error('Submission not found');
    }

    res.json({ submission });
  })
);

// Verify submission (admin only)
router.patch(
  '/submissions/:id/verify',
  checkRole(['admin']),
  asyncHandler(async (req, res) => {
    const { id } = z
      .object({ id: z.string().refine(isValidObjectId, 'Invalid submission ID') })
      .parse(req.params);

    const { status, remarks } = z
      .object({
        status: z.enum(['verified', 'failed']),
        remarks: z.string().optional(),
      })
      .parse(req.body);

    const submission = await FormSubmission.findById(id);
    if (!submission) {
      throw new Error('Submission not found');
    }

    submission.verificationStatus = status;
    submission.verificationDetails = {
      verifiedAt: new Date(),
      verifiedBy: req.user.id,
      remarks,
    };

    await submission.save();

    // Notify user
    emitNotification(submission.userId.toString(), {
      type: 'submission_verified',
      title: 'Submission Verified',
      message: `Your submission for ${submission.schemeId} has been ${status}`,
      data: {
        submissionId: submission._id,
        status,
        remarks,
      },
    });

    res.json({ submission });
  })
);

// Update submission status (admin only)
router.patch(
  '/submissions/:id/status',
  checkRole(['admin']),
  asyncHandler(async (req, res) => {
    const { id } = z
      .object({ id: z.string().refine(isValidObjectId, 'Invalid submission ID') })
      .parse(req.params);

    const { status } = z
      .object({
        status: z.enum(['pending', 'approved', 'rejected']),
      })
      .parse(req.body);

    const submission = await FormSubmission.findById(id);
    if (!submission) {
      throw new Error('Submission not found');
    }

    submission.status = status;
    await submission.save();

    // Notify user
    emitNotification(submission.userId.toString(), {
      type: 'submission_status',
      title: 'Submission Status Updated',
      message: `Your submission status has been updated to ${status}`,
      data: {
        submissionId: submission._id,
        status,
      },
    });

    res.json({ submission });
  })
);

export default router; 