import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { User } from '@/models/user';
import { Scheme } from '@/models/scheme';
import { Conversation } from '@/models/conversation';
import { FormSubmission } from '@/models/form-submission';
import { logger } from '@/utils/logger';

const cleanupTestData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/form-assistant'
    );
    logger.info('Connected to MongoDB');

    // Delete test users (except admin)
    const deletedUsers = await User.deleteMany({
      email: { $regex: /^user\d+@example\.com$/ },
    });
    logger.info(`Deleted ${deletedUsers.deletedCount} test users`);

    // Delete test schemes
    const deletedSchemes = await Scheme.deleteMany({
      name: { $regex: /^Test Scheme \d+$/ },
    });
    logger.info(`Deleted ${deletedSchemes.deletedCount} test schemes`);

    // Delete test conversations
    const deletedConversations = await Conversation.deleteMany({
      userId: { $in: deletedUsers.deletedIds },
    });
    logger.info(`Deleted ${deletedConversations.deletedCount} test conversations`);

    // Delete test form submissions
    const deletedSubmissions = await FormSubmission.deleteMany({
      userId: { $in: deletedUsers.deletedIds },
    });
    logger.info(`Deleted ${deletedSubmissions.deletedCount} test form submissions`);

    // Clean up test uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads', 'test');
    try {
      await fs.rm(uploadsDir, { recursive: true, force: true });
      logger.info('Cleaned up test uploads directory');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    logger.info('Test data cleanup completed');
  } catch (error) {
    logger.error('Test data cleanup error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

// Run cleanup
cleanupTestData(); 