import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '@/models/user';
import { Scheme } from '@/models/scheme';
import { Conversation } from '@/models/conversation';
import { FormSubmission } from '@/models/form-submission';
import { logger } from '@/utils/logger';

const generateTestData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/form-assistant'
    );
    logger.info('Connected to MongoDB');

    // Create test users
    const users = await Promise.all(
      Array.from({ length: 10 }).map(async (_, i) => {
        const user = await User.create({
          name: `Test User ${i + 1}`,
          email: `user${i + 1}@example.com`,
          password: 'password123',
          role: 'user',
          aadhaarNumber: `${123456789000 + i}`,
          phoneNumber: `+91987654321${i}`,
          preferredLanguage: ['hi', 'bn', 'te', 'ta', 'mr'][i % 5],
        });
        return user;
      })
    );
    logger.info('Created test users');

    // Create test schemes
    const schemes = await Promise.all(
      Array.from({ length: 5 }).map(async (_, i) => {
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) throw new Error('Admin user not found');

        const scheme = await Scheme.create({
          name: `Test Scheme ${i + 1}`,
          description: `This is a test scheme ${i + 1} for development purposes.`,
          eligibilityCriteria: [
            'Must be a resident of India',
            'Age between 18-60 years',
            'Annual income below 5 lakhs',
          ],
          formFields: [
            {
              name: 'fullName',
              label: 'Full Name',
              type: 'text',
              required: true,
            },
            {
              name: 'age',
              label: 'Age',
              type: 'number',
              required: true,
              validationRules: {
                min: 18,
                max: 60,
              },
            },
            {
              name: 'income',
              label: 'Annual Income',
              type: 'number',
              required: true,
              validationRules: {
                max: 500000,
              },
            },
            {
              name: 'occupation',
              label: 'Occupation',
              type: 'select',
              required: true,
              options: [
                'Farmer',
                'Self-employed',
                'Daily wage worker',
                'Other',
              ],
            },
          ],
          conversationTemplate: 'Hello! I will help you fill out the form for {scheme_name}. Please tell me your full name to begin.',
          supportingDocuments: [
            'Aadhaar Card',
            'Income Certificate',
            'Age Proof',
          ],
          isActive: true,
          createdBy: admin._id,
        });
        return scheme;
      })
    );
    logger.info('Created test schemes');

    // Create test conversations
    const conversations = await Promise.all(
      users.flatMap((user) =>
        schemes.slice(0, 2).map(async (scheme) => {
          const conversation = await Conversation.create({
            userId: user._id,
            schemeId: scheme._id,
            platform: Math.random() > 0.5 ? 'web' : 'whatsapp',
            status: ['active', 'completed', 'abandoned'][
              Math.floor(Math.random() * 3)
            ],
            messages: [
              {
                content: scheme.conversationTemplate.replace(
                  '{scheme_name}',
                  scheme.name
                ),
                sender: 'ai',
                language: user.preferredLanguage,
                confidence: 0.95,
                timestamp: new Date(),
              },
              {
                content: user.name,
                sender: 'user',
                language: user.preferredLanguage,
                timestamp: new Date(),
              },
            ],
            formData: {
              fullName: user.name,
              age: Math.floor(Math.random() * 42) + 18,
              income: Math.floor(Math.random() * 400000) + 100000,
              occupation: ['Farmer', 'Self-employed', 'Daily wage worker', 'Other'][
                Math.floor(Math.random() * 4)
              ],
            },
            lastMessageAt: new Date(),
            completedAt:
              Math.random() > 0.5 ? new Date() : undefined,
          });
          return conversation;
        })
      )
    );
    logger.info('Created test conversations');

    // Create test form submissions
    await Promise.all(
      conversations
        .filter((conv) => conv.status === 'completed')
        .map(async (conversation) => {
          const submission = await FormSubmission.create({
            userId: conversation.userId,
            schemeId: conversation.schemeId,
            conversationId: conversation._id,
            formData: conversation.formData,
            documents: [
              {
                name: 'aadhaar.pdf',
                path: '/uploads/test/aadhaar.pdf',
                mimeType: 'application/pdf',
                size: 1024 * 1024,
                uploadedAt: new Date(),
              },
              {
                name: 'income.pdf',
                path: '/uploads/test/income.pdf',
                mimeType: 'application/pdf',
                size: 1024 * 512,
                uploadedAt: new Date(),
              },
            ],
            status: ['pending', 'approved', 'rejected'][
              Math.floor(Math.random() * 3)
            ],
            accuracy: Math.random() * 0.3 + 0.7,
            verificationStatus: ['pending', 'verified', 'failed'][
              Math.floor(Math.random() * 3)
            ],
            submittedAt: new Date(),
          });
          return submission;
        })
    );
    logger.info('Created test form submissions');

    logger.info('Test data generation completed');
  } catch (error) {
    logger.error('Test data generation error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

// Run generation
generateTestData(); 