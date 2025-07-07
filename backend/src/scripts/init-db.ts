import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '@/models/user';
import { AIConfig } from '@/models/ai-config';
import { logger } from '@/utils/logger';

const initDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/form-assistant'
    );
    logger.info('Connected to MongoDB');

    // Create default admin user
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({
        name: 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        role: 'admin',
        aadhaarNumber: '123456789012', // Placeholder
        phoneNumber: '+919876543210', // Placeholder
        preferredLanguage: 'hi',
      });
      logger.info('Created default admin user');
    }

    // Create default AI configuration
    const configExists = await AIConfig.findOne();
    if (!configExists) {
      const admin = await User.findOne({ role: 'admin' });
      if (!admin) {
        throw new Error('Admin user not found');
      }

      await AIConfig.create({
        sarvam: {
          apiKey: process.env.SARVAM_API_KEY || 'your-sarvam-api-key',
          baseUrl: process.env.SARVAM_BASE_URL || 'https://api.sarvam.ai',
          model: process.env.SARVAM_CHAT_MODEL || 'multilingual-chat-v1',
          temperature: 0.7,
          maxTokens: 1000,
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        openai: {
          apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
          model: 'gpt-4',
          temperature: 0.5,
          maxTokens: 2000,
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        confidenceThreshold: 0.8,
        fallbackStrategy: 'clarify',
        maxRetries: 3,
        timeoutMs: 30000,
        cacheEnabled: true,
        cacheTTL: 3600,
        updatedBy: admin._id,
      });
      logger.info('Created default AI configuration');
    }

    // Create indexes
    await Promise.all([
      // User indexes
      User.collection.createIndex({ email: 1 }, { unique: true }),
      User.collection.createIndex({ aadhaarNumber: 1 }, { unique: true }),
      User.collection.createIndex({ phoneNumber: 1 }, { unique: true }),
      User.collection.createIndex({ role: 1 }),
      User.collection.createIndex({ preferredLanguage: 1 }),

      // Scheme indexes
      mongoose.model('Scheme').collection.createIndex({ name: 1 }, { unique: true }),
      mongoose.model('Scheme').collection.createIndex({ isActive: 1 }),
      mongoose.model('Scheme').collection.createIndex({ createdAt: -1 }),

      // Conversation indexes
      mongoose.model('Conversation').collection.createIndex({ userId: 1, status: 1 }),
      mongoose.model('Conversation').collection.createIndex({ schemeId: 1 }),
      mongoose.model('Conversation').collection.createIndex({ lastMessageAt: -1 }),
      mongoose.model('Conversation').collection.createIndex({ createdAt: -1 }),

      // Form submission indexes
      mongoose.model('FormSubmission').collection.createIndex({ userId: 1, status: 1 }),
      mongoose.model('FormSubmission').collection.createIndex({ schemeId: 1 }),
      mongoose.model('FormSubmission').collection.createIndex({ conversationId: 1 }),
      mongoose.model('FormSubmission').collection.createIndex({ submittedAt: -1 }),
      mongoose.model('FormSubmission').collection.createIndex({ verificationStatus: 1 }),

      // AI config indexes
      AIConfig.collection.createIndex({ updatedAt: -1 }),
    ]);
    logger.info('Created database indexes');

    logger.info('Database initialization completed');
  } catch (error) {
    logger.error('Database initialization error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

// Run initialization
initDatabase(); 