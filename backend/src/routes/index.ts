import { Express } from 'express';
import authRoutes from './auth';
import userRoutes from './user';
import schemeRoutes from './scheme';
import chatRoutes from './chat';
import formRoutes from './form';
import analyticsRoutes from './analytics';
import aiConfigRoutes from './ai-config';
import whatsappRoutes from './whatsapp';
import { verifyToken, checkRole } from '@/middleware/auth';
import { notFound } from '@/middleware/error';

export const setupRoutes = (app: Express) => {
  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', verifyToken, userRoutes);
  app.use('/api/schemes', verifyToken, schemeRoutes);
  app.use('/api/chat', verifyToken, chatRoutes);
  app.use('/api/forms', verifyToken, formRoutes);
  app.use('/api/analytics', verifyToken, checkRole(['admin']), analyticsRoutes);
  app.use('/api/ai-config', verifyToken, checkRole(['admin']), aiConfigRoutes);

  // WhatsApp webhook
  app.use('/webhook/whatsapp', whatsappRoutes);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Handle 404
  app.use(notFound);
}; 