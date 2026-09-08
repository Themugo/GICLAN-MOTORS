// ============================================================
// KAYAD COMMUNICATIONS & COLLABORATION HUB
// UNIFIED COMMUNICATIONS SERVICE
// ============================================================

import db from '../../db/index.js';
import { AppError } from '../../utils/AppError.js';
import { logInfo, logError } from '../../utils/logger.js';
import crypto from 'crypto';

/**
 * Communications Service
 * Unified communication layer for the KAYAD ecosystem
 */
class CommunicationsService {

  // ============================================================
  // CONVERSATION MANAGEMENT
  // ============================================================

  /**
   * Get or create conversation for context
   */
  async getOrCreateConversation(contextType, contextId, conversationType, participants, options = {}) {
    // Check if conversation exists
    let conversation = await db.findOne('conversations', {
      context_type: contextType,
      context_id: contextId,
      conversation_type: conversationType,
    });

    if (conversation) {
      // Add new participants if any
      if (participants?.length > 0) {
        const existingIds = conversation.participants.map(p => p.user_id);
        const newParticipants = participants.filter(p => !existingIds.includes(p.user_id));
        if (newParticipants.length > 0) {
          conversation.participants = [
            ...conversation.participants,
            ...newParticipants.map(p => ({ ...p, joined_at: new Date() })),
          ];
          await db.update('conversations', conversation.id, {
            participants: conversation.participants,
            updated_at: new Date(),
          });
        }
      }
      return conversation;
    }

    // Create new conversation
    const conversationCode = await this.generateConversationCode();

    conversation = await db.create('conversations', {
      conversation_code: conversationCode,
      context_type: contextType,
      context_id: contextId,
      conversation_type: conversationType,
      participants: participants?.map(p => ({ ...p, joined_at: new Date() })) || [],
      subject: options.subject,
      subject_entity_data: options.subjectEntityData || {},
      is_group: options.isGroup || false,
      is_internal: options.isInternal || false,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await this.logCommunicationEvent('conversation_created', 'conversation', conversation.id, null, {
      contextType,
      contextId,
      conversationType,
    });

    logInfo('Conversation created', { conversationCode, contextType });
    return conversation;
  }

  /**
   * Get conversation with messages
   */
  async getConversation(conversationId, options = {}) {
    const conversation = await db.findById('conversations', conversationId);
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    const messages = await db.find('messages',
      { conversation_id: conversationId },
      { sort: { sent_at: -1 }, limit: options.limit || 50 }
    );

    return {
      ...conversation,
      messages: messages.reverse(),
    };
  }

  /**
   * Get user's conversations (Smart Inbox)
   */
  async getUserInbox(userId, filters = {}) {
    const query = {
      participants: { $contains: [{ user_id: userId }] },
    };

    if (filters.contextType) query.context_type = filters.contextType;
    if (filters.status) query.status = filters.status;
    if (filters.conversationType) query.conversation_type = filters.conversationType;

    const conversations = await db.find('conversations', query, {
      sort: { last_message_at: -1 },
      limit: filters.limit || 50,
    });

    // Get unread counts
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.getUnreadCount(conv.id, userId);
        return { ...conv, unread_count: unreadCount };
      })
    );

    // Group by context type if requested
    if (filters.groupBy) {
      return this.groupConversations(conversationsWithUnread, filters.groupBy);
    }

    return conversationsWithUnread;
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(conversationId, userId) {
    const messages = await db.find('messages', { conversation_id: conversationId });

    return messages.filter(m => {
      const notFromUser = m.sender_id !== userId;
      const notRead = !m.read_by?.some(r => r.user_id === userId);
      return notFromUser && notRead;
    }).length;
  }

  /**
   * Group conversations
   */
  groupConversations(conversations, groupBy) {
    const grouped = {};
    conversations.forEach(conv => {
      const key = conv[groupBy] || 'other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(conv);
    });
    return grouped;
  }

  // ============================================================
  // MESSAGING
  // ============================================================

  /**
   * Send message
   */
  async sendMessage(conversationId, senderData, content, options = {}) {
    const conversation = await db.findById('conversations', conversationId);
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }

    // Verify sender is participant
    const isParticipant = conversation.participants.some(p => p.user_id === senderData.userId);
    if (!isParticipant && !conversation.is_internal) {
      throw new AppError('User is not a participant in this conversation', 403);
    }

    // Create message
    const message = await db.create('messages', {
      conversation_id: conversationId,
      sender_id: senderData.userId,
      sender_name: senderData.userName,
      sender_type: senderData.userType || 'user',
      sender_role: senderData.userRole,
      message_type: options.messageType || 'text',
      content,
      attachments: options.attachments || [],
      metadata: options.metadata || {},
      status: 'sent',
      read_by: [],
      sent_at: new Date(),
    });

    // Update conversation
    await db.update('conversations', conversationId, {
      last_message_at: new Date(),
      last_message_preview: content.substring(0, 100),
      updated_at: new Date(),
    });

    // Notify participants
    await this.notifyParticipants(conversation, message, senderData);

    // Log
    await this.logCommunicationEvent('message_sent', 'message', message.id, senderData.userId, {
      conversationId,
      contextType: conversation.context_type,
    });

    logInfo('Message sent', { conversationId, senderId: senderData.userId });
    return message;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(conversationId, userId) {
    const messages = await db.find('messages', { conversation_id: conversationId });

    for (const message of messages) {
      if (message.sender_id === userId) continue;

      const alreadyRead = message.read_by?.some(r => r.user_id === userId);
      if (!alreadyRead) {
        const readBy = [
          ...(message.read_by || []),
          { user_id: userId, read_at: new Date() },
        ];
        await db.update('messages', message.id, {
          read_by: readBy,
          read_at: new Date(),
          status: 'read',
        });
      }
    }

    return { success: true };
  }

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  /**
   * Create notification
   */
  async createNotification(notificationData) {
    const notification = await db.create('notifications', {
      recipient_id: notificationData.recipientId,
      recipient_email: notificationData.recipientEmail,
      notification_type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      context_type: notificationData.contextType,
      context_id: notificationData.contextId,
      action_url: notificationData.actionUrl,
      action_data: notificationData.actionData || {},
      channels: notificationData.channels || ['in_app'],
      priority: notificationData.priority || 'normal',
      status: 'unread',
      created_at: new Date(),
    });

    // Queue for delivery through channels
    await this.queueNotificationDelivery(notification);

    await this.logCommunicationEvent('notification_sent', 'notification', notification.id, null, {
      recipientId: notificationData.recipientId,
      type: notificationData.type,
    });

    return notification;
  }

  /**
   * Queue notification delivery
   */
  async queueNotificationDelivery(notification) {
    const channels = notification.channels || ['in_app'];

    if (channels.includes('email') && notification.recipient_email) {
      await db.create('email_queue', {
        recipient_id: notification.recipient_id,
        recipient_email: notification.recipient_email,
        subject: notification.title,
        body_text: notification.message,
        template_data: { notification_id: notification.id },
        status: 'pending',
        created_at: new Date(),
      });
    }

    if (channels.includes('sms') && notification.recipient_phone) {
      await db.create('sms_queue', {
        recipient_id: notification.recipient_id,
        recipient_phone: notification.recipient_phone,
        message: notification.message.substring(0, 160),
        status: 'pending',
        created_at: new Date(),
      });
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId, filters = {}) {
    const query = { recipient_id: userId };

    if (filters.status) query.status = filters.status;
    if (filters.type) query.notification_type = filters.type;

    return db.find('notifications', query, {
      sort: { created_at: -1 },
      limit: filters.limit || 50,
    });
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId, userId) {
    const notification = await db.findById('notifications', notificationId);
    if (!notification || notification.recipient_id !== userId) {
      throw new AppError('Notification not found', 404);
    }

    await db.update('notifications', notificationId, {
      status: 'read',
      read_at: new Date(),
    });

    return { success: true };
  }

  // ============================================================
  // AUTOMATED NOTIFICATIONS (System Triggers)
  // ============================================================

  /**
   * Trigger vehicle saved notification
   */
  async notifyVehicleSaved(userId, vehicleData) {
    return this.createNotification({
      recipientId: userId,
      type: 'vehicle_saved',
      title: 'Vehicle Saved',
      message: `You've saved ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}. We'll notify you of any price changes or updates.`,
      contextType: 'listing',
      contextId: vehicleData.listingId,
      actionUrl: `/listings/${vehicleData.listingId}`,
      channels: ['in_app', 'email'],
    });
  }

  /**
   * Trigger price drop notification
   */
  async notifyPriceDrop(userId, vehicleData, oldPrice, newPrice) {
    return this.createNotification({
      recipientId: userId,
      type: 'price_drop',
      title: 'Price Drop Alert!',
      message: `Good news! ${vehicleData.year} ${vehicleData.make} ${vehicleData.model} has dropped from KES ${oldPrice.toLocaleString()} to KES ${newPrice.toLocaleString()}.`,
      contextType: 'listing',
      contextId: vehicleData.listingId,
      actionUrl: `/listings/${vehicleData.listingId}`,
      channels: ['in_app', 'email'],
      priority: 'high',
    });
  }

  /**
   * Trigger inspection complete notification
   */
  async notifyInspectionComplete(userId, inspectionData) {
    return this.createNotification({
      recipientId: userId,
      type: 'inspection_complete',
      title: 'Inspection Report Ready',
      message: `The 150-point inspection for ${inspectionData.year} ${inspectionData.make} ${inspectionData.model} is complete. Grade: ${inspectionData.grade}`,
      contextType: 'inspection',
      contextId: inspectionData.inspectionId,
      actionUrl: `/inspections/${inspectionData.inspectionId}`,
      channels: ['in_app', 'email'],
      priority: 'high',
    });
  }

  /**
   * Trigger auction notification
   */
  async notifyAuctionEvent(userId, auctionData, eventType) {
    const eventMessages = {
      starting: `Auction starting soon: ${auctionData.vehicleName}`,
      ending: `Auction ending in 5 minutes: ${auctionData.vehicleName}`,
      outbid: `You've been outbid on ${auctionData.vehicleName}!`,
      won: `Congratulations! You won the auction for ${auctionData.vehicleName}!`,
    };

    return this.createNotification({
      recipientId: userId,
      type: `auction_${eventType}`,
      title: eventMessages[eventType] || `Auction Update: ${auctionData.vehicleName}`,
      message: auctionData.message || eventMessages[eventType],
      contextType: 'auction',
      contextId: auctionData.auctionId,
      actionUrl: `/auctions/${auctionData.auctionId}`,
      channels: ['in_app', 'email', 'push'],
      priority: eventType === 'won' || eventType === 'ending' ? 'high' : 'normal',
    });
  }

  /**
   * Trigger ownership transfer notification
   */
  async notifyOwnershipTransfer(userId, transferData) {
    return this.createNotification({
      recipientId: userId,
      type: 'ownership_transfer',
      title: 'Ownership Transfer Initiated',
      message: `The ownership transfer for ${transferData.year} ${transferData.make} ${transferData.model} (VIN: ${transferData.vin}) has been initiated.`,
      contextType: 'passport',
      contextId: transferData.passportId,
      actionUrl: `/passports/${transferData.passportId}`,
      channels: ['in_app', 'email'],
      priority: 'high',
    });
  }

  // ============================================================
  // AUTOMATED REMINDERS
  // ============================================================

  /**
   * Schedule reminder
   */
  async scheduleReminder(reminderData) {
    const reminderCode = await this.generateReminderCode();

    return db.create('automated_reminders', {
      reminder_code: reminderCode,
      reminder_type: reminderData.type,
      target_user_id: reminderData.userId,
      target_context_type: reminderData.contextType,
      target_context_id: reminderData.contextId,
      trigger_at: reminderData.triggerAt,
      repeat_interval: reminderData.repeatInterval,
      title: reminderData.title,
      message_template: reminderData.messageTemplate,
      template_data: reminderData.templateData || {},
      channels: reminderData.channels || ['in_app', 'email'],
      status: 'scheduled',
      created_at: new Date(),
    });
  }

  /**
   * Process due reminders
   */
  async processDueReminders() {
    const now = new Date();
    const dueReminders = await db.find('automated_reminders', {
      status: 'scheduled',
      trigger_at: { $lte: now },
    });

    for (const reminder of dueReminders) {
      try {
        // Create notification
        const notification = await this.createNotification({
          recipientId: reminder.target_user_id,
          type: `reminder_${reminder.reminder_type}`,
          title: reminder.title,
          message: this.interpolateTemplate(reminder.message_template, reminder.template_data),
          contextType: reminder.target_context_type,
          contextId: reminder.target_context_id,
          channels: reminder.channels,
          priority: 'normal',
        });

        // Update reminder
        await db.update('automated_reminders', reminder.id, {
          status: 'sent',
          executed_at: new Date(),
          notification_id: notification.id,
        });

        // Schedule repeat if applicable
        if (reminder.repeat_interval) {
          await this.scheduleRepeatReminder(reminder);
        }
      } catch (error) {
        logError('Reminder processing failed', { reminderId: reminder.id, error: error.message });
      }
    }

    return { processed: dueReminders.length };
  }

  /**
   * Schedule repeat reminder
   */
  async scheduleRepeatReminder(reminder) {
    const intervals = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
    };

    const nextTrigger = new Date(Date.now() + (intervals[reminder.repeat_interval] || intervals.daily));

    await this.scheduleReminder({
      type: reminder.reminder_type,
      userId: reminder.target_user_id,
      contextType: reminder.target_context_type,
      contextId: reminder.target_context_id,
      triggerAt: nextTrigger,
      repeatInterval: reminder.repeat_interval,
      title: reminder.title,
      messageTemplate: reminder.message_template,
      templateData: reminder.template_data,
      channels: reminder.channels,
    });
  }

  /**
   * Interpolate template variables
   */
  interpolateTemplate(template, data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  // ============================================================
  // TEAM CHANNELS (Internal Collaboration)
  // ============================================================

  /**
   * Create team channel
   */
  async createTeamChannel(channelData) {
    const channelCode = await this.generateChannelCode();

    return db.create('team_channels', {
      channel_code: channelCode,
      channel_name: channelData.name,
      team_type: channelData.teamType,
      team_id: channelData.teamId,
      members: channelData.members?.map(m => ({ ...m, joined_at: new Date() })) || [],
      is_private: channelData.isPrivate !== false,
      description: channelData.description,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  /**
   * Get team channels for user
   */
  async getUserTeamChannels(userId) {
    const channels = await db.find('team_channels', { status: 'active' });
    return channels.filter(c =>
      c.members?.some(m => m.user_id === userId)
    );
  }

  // ============================================================
  // FILE SHARING
  // ============================================================

  /**
   * Upload file reference
   */
  async uploadFile(fileData, uploaderData) {
    const file = await db.create('message_files', {
      file_name: fileData.fileName,
      file_type: fileData.fileType,
      file_size: fileData.fileSize,
      file_url: fileData.fileUrl,
      file_path: fileData.filePath,
      uploaded_by: uploaderData.userId,
      uploaded_by_name: uploaderData.userName,
      context_type: fileData.contextType,
      context_id: fileData.contextId,
      visibility: fileData.visibility || 'private',
      allowed_roles: fileData.allowedRoles || [],
      status: 'active',
      created_at: new Date(),
    });

    await this.logCommunicationEvent('file_uploaded', 'file', file.id, uploaderData.userId, {
      fileName: fileData.fileName,
      contextType: fileData.contextType,
    });

    return file;
  }

  /**
   * Get file with permission check
   */
  async getFile(fileId, userId, userRole) {
    const file = await db.findById('message_files', fileId);
    if (!file) {
      throw new AppError('File not found', 404);
    }

    // Check permissions
    if (file.visibility === 'private' && file.uploaded_by !== userId) {
      throw new AppError('Access denied', 403);
    }

    if (file.visibility === 'conversation') {
      const conversation = await db.findById('conversations', file.context_id);
      if (!conversation?.participants.some(p => p.user_id === userId)) {
        throw new AppError('Access denied', 403);
      }
    }

    return file;
  }

  // ============================================================
  // COMMUNICATION TEMPLATES
  // ============================================================

  /**
   * Initialize default templates
   */
  async initializeDefaultTemplates() {
    const templates = [
      {
        template_code: 'inspection_complete',
        template_name: 'Inspection Complete',
        template_category: 'inspection',
        channels: ['email', 'in_app'],
        subject_template: 'Your Inspection Report is Ready - {{vehicle_name}}',
        title_template: 'Inspection Complete',
        body_template: 'Hello {{user_name}},\n\nYour 150-point inspection for {{vehicle_name}} (VIN: {{vin}}) is complete.\n\nResults:\n- Overall Grade: {{grade}}\n- Overall Score: {{score}}/100\n\nView your full report: {{report_url}}\n\nThank you for using KAYAD.',
        variables: [
          { name: 'user_name', required: true, type: 'string' },
          { name: 'vehicle_name', required: true, type: 'string' },
          { name: 'vin', required: true, type: 'string' },
          { name: 'grade', required: true, type: 'string' },
          { name: 'score', required: true, type: 'number' },
          { name: 'report_url', required: true, type: 'url' },
        ],
        is_system: true,
      },
      {
        template_code: 'auction_win',
        template_name: 'Auction Win Notification',
        template_category: 'auction',
        channels: ['email', 'in_app', 'sms'],
        subject_template: 'Congratulations! You Won - {{vehicle_name}}',
        title_template: 'Auction Won!',
        body_template: 'Congratulations {{user_name}}!\n\nYou are the winning bidder for {{vehicle_name}} at {{auction_name}}.\n\nWinning Bid: KES {{winning_bid}}\n\nNext steps:\n1. Complete payment\n2. Arrange collection/delivery\n\nComplete payment: {{payment_url}}',
        variables: [
          { name: 'user_name', required: true, type: 'string' },
          { name: 'vehicle_name', required: true, type: 'string' },
          { name: 'auction_name', required: true, type: 'string' },
          { name: 'winning_bid', required: true, type: 'number' },
          { name: 'payment_url', required: true, type: 'url' },
        ],
        is_system: true,
      },
    ];

    for (const template of templates) {
      const existing = await db.findOne('communication_templates', { template_code: template.template_code });
      if (!existing) {
        await db.create('communication_templates', {
          ...template,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
  }

  /**
   * Render template
   */
  async renderTemplate(templateCode, variables) {
    const template = await db.findOne('communication_templates', { template_code: templateCode });
    if (!template) {
      throw new AppError('Template not found', 404);
    }

    return {
      subject: this.interpolateTemplate(template.subject_template || '', variables),
      title: this.interpolateTemplate(template.title_template || '', variables),
      body: this.interpolateTemplate(template.body_template, variables),
      channels: template.channels,
    };
  }

  // ============================================================
  // UTILITIES
  // ============================================================

  /**
   * Generate conversation code
   */
  async generateConversationCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `KAYAD-Conv-${timestamp.slice(-6)}${random}`;
  }

  /**
   * Generate reminder code
   */
  async generateReminderCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `KAYAD-Rem-${timestamp.slice(-6)}${random}`;
  }

  /**
   * Generate channel code
   */
  async generateChannelCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `KAYAD-Chan-${timestamp.slice(-6)}${random}`;
  }

  /**
   * Notify conversation participants
   */
  async notifyParticipants(conversation, message, senderData) {
    for (const participant of conversation.participants) {
      if (participant.user_id === senderData.userId) continue;

      await this.createNotification({
        recipientId: participant.user_id,
        type: 'new_message',
        title: `New message from ${senderData.userName}`,
        message: message.content.substring(0, 100),
        contextType: 'conversation',
        contextId: conversation.id,
        actionUrl: `/messages/${conversation.id}`,
        channels: ['in_app'],
      });
    }
  }

  /**
   * Log communication event
   */
  async logCommunicationEvent(actionType, entityType, entityId, actorId, details) {
    await db.create('communication_audit_log', {
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      actor_id: actorId,
      details,
      created_at: new Date(),
    });
  }

  /**
   * Get communication stats
   */
  async getCommunicationStats(userId) {
    const [conversations, notifications, unreadNotifications] = await Promise.all([
      db.find('conversations', {
        participants: { $contains: [{ user_id: userId }] },
      }),
      db.find('notifications', { recipient_id: userId }),
      db.find('notifications', { recipient_id: userId, status: 'unread' }),
    ]);

    return {
      totalConversations: conversations.length,
      activeConversations: conversations.filter(c => c.status === 'active').length,
      totalNotifications: notifications.length,
      unreadNotifications: unreadNotifications.length,
    };
  }
}

export const communicationsService = new CommunicationsService();
export default communicationsService;
