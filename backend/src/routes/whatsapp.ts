import { Router } from 'express';
import { asyncHandler } from '@/middleware/error';
import {
  handleWhatsAppMessage,
  handleWhatsAppStatus,
  verifyWhatsAppWebhook,
} from '@/services/whatsapp';
import { logger } from '@/utils/logger';

const router = Router();

// Verify webhook
router.get(
  '/',
  (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const response = verifyWhatsAppWebhook(
      mode as string,
      token as string,
      challenge as string
    );

    if (response) {
      res.status(200).send(response);
    } else {
      res.sendStatus(403);
    }
  }
);

// Handle webhook events
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { object, entry } = req.body;

    // Verify webhook source
    if (object !== 'whatsapp_business_account') {
      res.sendStatus(404);
      return;
    }

    try {
      for (const e of entry) {
        for (const change of e.changes) {
          const { value } = change;

          // Handle messages
          if (value.messages) {
            for (const message of value.messages) {
              logger.info('Received WhatsApp message:', message);
              await handleWhatsAppMessage(message);
            }
          }

          // Handle status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              logger.info('Received WhatsApp status:', status);
              await handleWhatsAppStatus(status);
            }
          }
        }
      }

      res.sendStatus(200);
    } catch (error) {
      logger.error('WhatsApp webhook error:', error);
      res.sendStatus(500);
    }
  })
);

export default router; 