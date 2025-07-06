import { Router } from 'express';
import { z } from 'zod';
import { AIConfig } from '@/models/ai-config';
import { asyncHandler } from '@/middleware/error';
import { processMessage } from '@/services/ai';

const router = Router();

// Validation schema
const aiConfigSchema = z.object({
  sarvam: z.object({
    apiKey: z.string().min(1, 'Sarvam API key is required'),
    baseUrl: z.string().url('Invalid Sarvam base URL'),
    model: z.string().min(1, 'Sarvam model is required'),
    temperature: z.number().min(0).max(1),
    maxTokens: z.number().min(1),
    topP: z.number().min(0).max(1),
    frequencyPenalty: z.number().min(-2).max(2),
    presencePenalty: z.number().min(-2).max(2),
  }),
  openai: z.object({
    apiKey: z.string().min(1, 'OpenAI API key is required'),
    model: z.string().min(1, 'OpenAI model is required'),
    temperature: z.number().min(0).max(1),
    maxTokens: z.number().min(1),
    topP: z.number().min(0).max(1),
    frequencyPenalty: z.number().min(-2).max(2),
    presencePenalty: z.number().min(-2).max(2),
  }),
  confidenceThreshold: z.number().min(0).max(1),
  fallbackStrategy: z.enum(['retry', 'clarify', 'human']),
  maxRetries: z.number().min(0),
  timeoutMs: z.number().min(1000),
  cacheEnabled: z.boolean(),
  cacheTTL: z.number().min(0),
});

// Get current configuration
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const config = await AIConfig.findOne().sort({ updatedAt: -1 });
    if (!config) {
      throw new Error('AI configuration not found');
    }

    res.json({ config });
  })
);

// Update configuration
router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const data = aiConfigSchema.partial().parse(req.body);

    // Get current config
    let config = await AIConfig.findOne().sort({ updatedAt: -1 });

    if (!config) {
      // Create initial config
      config = await AIConfig.create({
        ...data,
        updatedBy: req.user.id,
      });
    } else {
      // Update existing config
      Object.assign(config, data);
      config.updatedBy = req.user.id;
      await config.save();
    }

    res.json({ config });
  })
);

// Test configuration
router.post(
  '/test',
  asyncHandler(async (req, res) => {
    const { message, language } = z
      .object({
        message: z.string().min(1, 'Test message is required'),
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

    // Process test message
    const response = await processMessage(
      'test',
      message,
      language
    );

    res.json({
      success: true,
      response,
    });
  })
);

// Get configuration history
router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    const [configs, total] = await Promise.all([
      AIConfig.find()
        .sort({ updatedAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .populate('updatedBy', 'name'),
      AIConfig.countDocuments(),
    ]);

    res.json({
      configs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// Get configuration metrics
router.get(
  '/metrics',
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const query: any = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    // Get average confidence scores
    const confidenceMetrics = await mongoose
      .model('Conversation')
      .aggregate([
        {
          $match: {
            ...query,
            'messages.confidence': { $exists: true },
          },
        },
        { $unwind: '$messages' },
        {
          $group: {
            _id: null,
            averageConfidence: { $avg: '$messages.confidence' },
            minConfidence: { $min: '$messages.confidence' },
            maxConfidence: { $max: '$messages.confidence' },
          },
        },
      ]);

    // Get fallback strategy usage
    const fallbackMetrics = await mongoose
      .model('Conversation')
      .aggregate([
        {
          $match: {
            ...query,
            'messages.confidence': { $lt: 0.8 }, // Below threshold
          },
        },
        {
          $group: {
            _id: null,
            totalFallbacks: { $sum: 1 },
            averageFallbackConfidence: {
              $avg: '$messages.confidence',
            },
          },
        },
      ]);

    // Get cache hit rate
    const cacheMetrics = await mongoose
      .model('Conversation')
      .aggregate([
        {
          $match: query,
        },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            cacheHits: {
              $sum: {
                $cond: [
                  { $eq: ['$messages.fromCache', true] },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            hitRate: {
              $divide: ['$cacheHits', '$totalRequests'],
            },
          },
        },
      ]);

    res.json({
      confidence: confidenceMetrics[0] || {
        averageConfidence: 0,
        minConfidence: 0,
        maxConfidence: 0,
      },
      fallback: fallbackMetrics[0] || {
        totalFallbacks: 0,
        averageFallbackConfidence: 0,
      },
      cache: cacheMetrics[0] || {
        hitRate: 0,
      },
    });
  })
);

export default router; 