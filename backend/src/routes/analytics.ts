import { Router } from 'express';
import { asyncHandler } from '@/middleware/error';
import { FormSubmission } from '@/models/form-submission';
import { Conversation } from '@/models/conversation';
import { User } from '@/models/user';
import { Scheme } from '@/models/scheme';
import { getActiveConnections, getActiveUsers } from '@/socket';

const router = Router();

// Get overview statistics
router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const [
      totalUsers,
      totalSchemes,
      totalSubmissions,
      totalConversations,
      activeUsers,
      activeConnections,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Scheme.countDocuments(),
      FormSubmission.countDocuments(),
      Conversation.countDocuments(),
      getActiveUsers(),
      getActiveConnections(),
    ]);

    // Get submission status counts
    const [pendingSubmissions, approvedSubmissions, rejectedSubmissions] =
      await Promise.all([
        FormSubmission.countDocuments({ status: 'pending' }),
        FormSubmission.countDocuments({ status: 'approved' }),
        FormSubmission.countDocuments({ status: 'rejected' }),
      ]);

    // Get conversation status counts
    const [
      activeConversations,
      completedConversations,
      abandonedConversations,
    ] = await Promise.all([
      Conversation.countDocuments({ status: 'active' }),
      Conversation.countDocuments({ status: 'completed' }),
      Conversation.countDocuments({ status: 'abandoned' }),
    ]);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      schemes: {
        total: totalSchemes,
      },
      submissions: {
        total: totalSubmissions,
        pending: pendingSubmissions,
        approved: approvedSubmissions,
        rejected: rejectedSubmissions,
      },
      conversations: {
        total: totalConversations,
        active: activeConversations,
        completed: completedConversations,
        abandoned: abandonedConversations,
      },
      realtime: {
        activeConnections,
        activeUsers,
      },
    });
  })
);

// Get conversation metrics
router.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const query: any = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    // Get conversation metrics by status
    const conversationsByStatus = await Conversation.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get conversation metrics by platform
    const conversationsByPlatform = await Conversation.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get average conversation duration
    const averageDuration = await Conversation.aggregate([
      {
        $match: {
          ...query,
          status: 'completed',
          completedAt: { $exists: true },
        },
      },
      {
        $project: {
          duration: {
            $subtract: ['$completedAt', '$createdAt'],
          },
        },
      },
      {
        $group: {
          _id: null,
          averageDuration: { $avg: '$duration' },
        },
      },
    ]);

    // Get conversation metrics by scheme
    const conversationsByScheme = await Conversation.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$schemeId',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'schemes',
          localField: '_id',
          foreignField: '_id',
          as: 'scheme',
        },
      },
      {
        $unwind: '$scheme',
      },
      {
        $project: {
          schemeName: '$scheme.name',
          count: 1,
        },
      },
    ]);

    res.json({
      byStatus: conversationsByStatus,
      byPlatform: conversationsByPlatform,
      byScheme: conversationsByScheme,
      averageDuration: averageDuration[0]?.averageDuration || 0,
    });
  })
);

// Get form submission metrics
router.get(
  '/forms',
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const query: any = {};
    if (startDate && endDate) {
      query.submittedAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    // Get submission metrics by status
    const submissionsByStatus = await FormSubmission.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get submission metrics by verification status
    const submissionsByVerification = await FormSubmission.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$verificationStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get average accuracy
    const averageAccuracy = await FormSubmission.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          averageAccuracy: { $avg: '$accuracy' },
        },
      },
    ]);

    // Get submission metrics by scheme
    const submissionsByScheme = await FormSubmission.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$schemeId',
          count: { $sum: 1 },
          averageAccuracy: { $avg: '$accuracy' },
        },
      },
      {
        $lookup: {
          from: 'schemes',
          localField: '_id',
          foreignField: '_id',
          as: 'scheme',
        },
      },
      {
        $unwind: '$scheme',
      },
      {
        $project: {
          schemeName: '$scheme.name',
          count: 1,
          averageAccuracy: 1,
        },
      },
    ]);

    res.json({
      byStatus: submissionsByStatus,
      byVerification: submissionsByVerification,
      byScheme: submissionsByScheme,
      averageAccuracy: averageAccuracy[0]?.averageAccuracy || 0,
    });
  })
);

// Get language metrics
router.get(
  '/languages',
  asyncHandler(async (req, res) => {
    // Get user language preferences
    const userLanguages = await User.aggregate([
      {
        $group: {
          _id: '$preferredLanguage',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get conversation language metrics
    const conversationLanguages = await Conversation.aggregate([
      { $unwind: '$messages' },
      {
        $group: {
          _id: '$messages.language',
          messageCount: { $sum: 1 },
          averageConfidence: { $avg: '$messages.confidence' },
        },
      },
    ]);

    // Get language success rates
    const languageSuccess = await Conversation.aggregate([
      {
        $match: {
          status: 'completed',
        },
      },
      { $unwind: '$messages' },
      {
        $group: {
          _id: '$messages.language',
          totalConversations: { $sum: 1 },
          successfulConversations: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          successRate: {
            $divide: ['$successfulConversations', '$totalConversations'],
          },
        },
      },
    ]);

    res.json({
      userPreferences: userLanguages,
      conversationMetrics: conversationLanguages,
      successRates: languageSuccess,
    });
  })
);

export default router; 