import axios from 'axios';
import { logger } from '@/utils/logger';
import { User } from '@/models/user';
import { Conversation } from '@/models/conversation';
import { processMessage } from './ai';

// Initialize WhatsApp client
const whatsappClient = axios.create({
  baseURL: 'https://graph.facebook.com/v17.0',
  headers: {
    Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// Send WhatsApp message
export const sendWhatsAppMessage = async (
  to: string,
  message: string
): Promise<void> => {
  try {
    await whatsappClient.post(`/${process.env.WHATSAPP_PHONE_NUMBER}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        body: message,
      },
    });
  } catch (error) {
    logger.error('WhatsApp message send error:', error);
    throw error;
  }
};

// Send WhatsApp template message
export const sendWhatsAppTemplate = async (
  to: string,
  template: string,
  components: any[]
): Promise<void> => {
  try {
    await whatsappClient.post(`/${process.env.WHATSAPP_PHONE_NUMBER}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: template,
        language: {
          code: 'en', // Default to English
        },
        components,
      },
    });
  } catch (error) {
    logger.error('WhatsApp template send error:', error);
    throw error;
  }
};

// Send WhatsApp document
export const sendWhatsAppDocument = async (
  to: string,
  documentUrl: string,
  caption?: string
): Promise<void> => {
  try {
    await whatsappClient.post(`/${process.env.WHATSAPP_PHONE_NUMBER}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'document',
      document: {
        link: documentUrl,
        caption,
      },
    });
  } catch (error) {
    logger.error('WhatsApp document send error:', error);
    throw error;
  }
};

// Handle incoming WhatsApp message
export const handleWhatsAppMessage = async (
  message: any
): Promise<void> => {
  try {
    const {
      from,
      text,
      timestamp,
    } = message;

    // Get user by phone number
    const user = await User.findOne({ phoneNumber: from });
    if (!user) {
      // Send registration instructions
      await sendWhatsAppTemplate(from, 'registration_required', []);
      return;
    }

    // Get active conversation or create new one
    let conversation = await Conversation.findOne({
      userId: user._id,
      platform: 'whatsapp',
      status: 'active',
    });

    if (!conversation) {
      // Send scheme selection template
      await sendWhatsAppTemplate(from, 'select_scheme', []);
      return;
    }

    // Add user message to conversation
    conversation.messages.push({
      content: text.body,
      sender: 'user',
      language: user.preferredLanguage,
      timestamp: new Date(timestamp * 1000),
    });

    await conversation.save();

    // Process message with AI
    const response = await processMessage(
      conversation._id.toString(),
      text.body,
      user.preferredLanguage,
      conversation.messages
    );

    // Add AI response to conversation
    conversation.messages.push({
      content: response.content,
      sender: 'ai',
      language: user.preferredLanguage,
      confidence: response.confidence,
      timestamp: new Date(),
    });

    // Update form data if provided
    if (response.formData) {
      conversation.formData = {
        ...conversation.formData,
        ...response.formData,
      };
    }

    // Check if conversation is complete
    if (response.isComplete) {
      conversation.status = 'completed';
      conversation.completedAt = new Date();

      // Send completion message
      await sendWhatsAppTemplate(from, 'conversation_complete', [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: conversation.schemeId.toString(),
            },
          ],
        },
      ]);
    }

    await conversation.save();

    // Send AI response
    await sendWhatsAppMessage(from, response.content);
  } catch (error) {
    logger.error('WhatsApp message handler error:', error);
    throw error;
  }
};

// Handle WhatsApp status updates
export const handleWhatsAppStatus = async (
  status: any
): Promise<void> => {
  try {
    const {
      id,
      status: messageStatus,
      timestamp,
    } = status;

    logger.info('WhatsApp status update:', {
      messageId: id,
      status: messageStatus,
      timestamp,
    });

    // TODO: Update message delivery status in database
  } catch (error) {
    logger.error('WhatsApp status handler error:', error);
    throw error;
  }
};

// Verify WhatsApp webhook
export const verifyWhatsAppWebhook = (
  mode: string,
  token: string,
  challenge: string
): string | null => {
  if (
    mode === 'subscribe' &&
    token === process.env.WHATSAPP_WEBHOOK_TOKEN
  ) {
    return challenge;
  }
  return null;
};

// Send form submission notification
export const sendFormSubmissionNotification = async (
  phoneNumber: string,
  schemeName: string,
  status: string
): Promise<void> => {
  try {
    await sendWhatsAppTemplate(phoneNumber, 'form_submission_status', [
      {
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: schemeName,
          },
          {
            type: 'text',
            text: status,
          },
        ],
      },
    ]);
  } catch (error) {
    logger.error('WhatsApp notification error:', error);
    throw error;
  }
};

// Send document verification reminder
export const sendDocumentVerificationReminder = async (
  phoneNumber: string,
  schemeName: string,
  documentName: string
): Promise<void> => {
  try {
    await sendWhatsAppTemplate(phoneNumber, 'document_verification_reminder', [
      {
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: schemeName,
          },
          {
            type: 'text',
            text: documentName,
          },
        ],
      },
    ]);
  } catch (error) {
    logger.error('WhatsApp reminder error:', error);
    throw error;
  }
}; 