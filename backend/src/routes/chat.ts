import { Router } from 'express';
import { z } from 'zod';
import { Conversation } from '@/models/conversation';
import { Scheme } from '@/models/scheme';
import { asyncHandler } from '@/middleware/error';
import { isValidObjectId } from '@/utils/validation';
import { processMessage } from '@/services/ai';
import { emitTyping } from '@/socket';

const router = Router();

// Validation schemas
const startConversationSchema = z.object({
  schemeId: z.string().refine(isValidObjectId, 'Invalid scheme ID'),
  platform: z.enum(['web', 'whatsapp']).default('web'),
});

const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message is required'),
});

// Start a new conversation
router.post(
  '/start',
  asyncHandler(async (req, res) => {
    const { schemeId, platform } = startConversationSchema.parse(req.body);

    // Check if scheme exists and is active
    const scheme = await Scheme.findOne({ _id: schemeId, isActive: true });
    if (!scheme) {
      throw new Error('Scheme not found or inactive');
    }

    // Check for existing active conversation
    const existingConversation = await Conversation.findOne({
      userId: req.user.id,
      schemeId,
      status: 'active',
    });

    if (existingConversation) {
      return res.json({ conversation: existingConversation });
    }

    // Create new conversation
    const conversation = await Conversation.create({
      userId: req.user.id,
      schemeId,
      platform,
      messages: [],
      status: 'active',
      formData: {},
    });

    // Process initial message based on scheme template
    const initialMessage = await processMessage(
      conversation._id,
      scheme.conversationTemplate,
      req.user.preferredLanguage
    );

    // Add initial message to conversation
    conversation.messages.push({
      content: initialMessage.content,
      sender: 'ai',
      language: req.user.preferredLanguage,
      confidence: initialMessage.confidence,
      timestamp: new Date(),
    });

    await conversation.save();

    res.status(201).json({ conversation });
  })
);

// Send message in conversation
router.post(
  '/:conversationId/message',
  asyncHandler(async (req, res) => {
    const { conversationId } = z
      .object({
        conversationId: z.string().refine(isValidObjectId, 'Invalid conversation ID'),
      })
      .parse(req.params);

    const { message } = sendMessageSchema.parse(req.body);

    // Get conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user.id,
      status: 'active',
    }).populate('schemeId');

    if (!conversation) {
      throw new Error('Conversation not found or inactive');
    }

    // Add user message
    conversation.messages.push({
      content: message,
      sender: 'user',
      language: req.user.preferredLanguage,
      timestamp: new Date(),
    });

    await conversation.save();

    // Emit typing indicator
    emitTyping(conversationId);

    // Process message with AI
    const aiResponse = await processMessage(
      conversationId,
      message,
      req.user.preferredLanguage,
      conversation.messages
    );

    // Add AI response
    conversation.messages.push({
      content: aiResponse.content,
      sender: 'ai',
      language: req.user.preferredLanguage,
      confidence: aiResponse.confidence,
      timestamp: new Date(),
    });

    // Update form data if provided by AI
    if (aiResponse.formData) {
      conversation.formData = {
        ...conversation.formData,
        ...aiResponse.formData,
      };
    }

    // Check if conversation is complete
    if (aiResponse.isComplete) {
      conversation.status = 'completed';
      conversation.completedAt = new Date();
    }

    await conversation.save();

    res.json({ conversation });
  })
);

// Get conversation history
router.get(
  '/:conversationId/history',
  asyncHandler(async (req, res) => {
    const { conversationId } = z
      .object({
        conversationId: z.string().refine(isValidObjectId, 'Invalid conversation ID'),
      })
      .parse(req.params);

    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user.id,
    }).populate('schemeId');

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    res.json({ conversation });
  })
);

// Get user's conversations
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 10 } = req.query;

    const query: any = { userId: req.user.id };

    if (status) {
      query.status = status;
    }

    const [conversations, total] = await Promise.all([
      Conversation.find(query)
        .sort({ lastMessageAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .populate('schemeId', 'name'),
      Conversation.countDocuments(query),
    ]);

    res.json({
      conversations,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

// Abandon conversation
router.patch(
  '/:conversationId/abandon',
  asyncHandler(async (req, res) => {
    const { conversationId } = z
      .object({
        conversationId: z.string().refine(isValidObjectId, 'Invalid conversation ID'),
      })
      .parse(req.params);

    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user.id,
      status: 'active',
    });

    if (!conversation) {
      throw new Error('Conversation not found or already completed/abandoned');
    }

    conversation.status = 'abandoned';
    await conversation.save();

    res.json({ conversation });
  })
);

export default router; 