/**
 * Export Service
 * Handles conversation export in multiple formats (JSON, Markdown, Text)
 */

import { db } from '../db';
import { conversations, messages } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export type ExportFormat = 'json' | 'markdown' | 'text';

interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
}

export class ExportService {
  /**
   * Export a single conversation
   */
  async exportConversation(conversationId: string, options: ExportOptions): Promise<string> {
    // Fetch conversation with messages
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conversation || conversation.length === 0) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const conversationData = conversation[0];

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);

    switch (options.format) {
      case 'json':
        return this.exportAsJSON(conversationData, conversationMessages, options);
      case 'markdown':
        return this.exportAsMarkdown(conversationData, conversationMessages, options);
      case 'text':
        return this.exportAsText(conversationData, conversationMessages, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export multiple conversations
   */
  async exportMultipleConversations(
    conversationIds: string[],
    options: ExportOptions
  ): Promise<string> {
    const exports = await Promise.all(
      conversationIds.map((id) => this.exportConversation(id, options))
    );

    if (options.format === 'json') {
      return JSON.stringify(exports.map((e) => JSON.parse(e)), null, 2);
    }

    return exports.join('\n\n---\n\n');
  }

  /**
   * Export all conversations for a user
   */
  async exportAllConversations(userId: string, options: ExportOptions): Promise<string> {
    const userConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.startedAt));

    const conversationIds = userConversations.map((c) => c.id);
    return this.exportMultipleConversations(conversationIds, options);
  }

  /**
   * Export as JSON format
   */
  private exportAsJSON(conversation: any, msgs: any[], options: ExportOptions): string {
    const data: any = {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        startedAt: conversation.startedAt,
        lastActivityAt: conversation.lastActivityAt,
      },
      messages: msgs.map((msg) => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        type: msg.type,
        emotion: msg.emotion,
        timestamp: options.includeTimestamps ? msg.timestamp : undefined,
        audioUrl: msg.audioUrl,
      })),
    };

    if (options.includeMetadata) {
      data.conversation.metadata = conversation.metadata;
      data.messages = data.messages.map((msg: any, idx: number) => ({
        ...msg,
        metadata: msgs[idx].metadata,
      }));
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Export as Markdown format
   */
  private exportAsMarkdown(conversation: any, msgs: any[], options: ExportOptions): string {
    let markdown = `# ${conversation.title}\n\n`;

    if (options.includeMetadata) {
      markdown += `**Started:** ${new Date(conversation.startedAt).toLocaleString()}\n`;
      markdown += `**Last Activity:** ${new Date(conversation.lastActivityAt).toLocaleString()}\n`;
      markdown += `**Messages:** ${msgs.length}\n\n`;
      markdown += `---\n\n`;
    }

    msgs.forEach((msg) => {
      const sender = msg.sender === 'user' ? '**You**' : '**AI Companion**';
      const emotion = msg.emotion ? ` _(${msg.emotion})_` : '';
      const timestamp = options.includeTimestamps
        ? ` - _${new Date(msg.timestamp).toLocaleString()}_`
        : '';

      markdown += `${sender}${emotion}${timestamp}\n\n`;
      markdown += `${msg.content}\n\n`;

      if (msg.audioUrl) {
        markdown += `🎵 [Audio Message](${msg.audioUrl})\n\n`;
      }

      markdown += `---\n\n`;
    });

    return markdown;
  }

  /**
   * Export as plain text format
   */
  private exportAsText(conversation: any, msgs: any[], options: ExportOptions): string {
    let text = `${conversation.title}\n`;
    text += `${'='.repeat(conversation.title.length)}\n\n`;

    if (options.includeMetadata) {
      text += `Started: ${new Date(conversation.startedAt).toLocaleString()}\n`;
      text += `Last Activity: ${new Date(conversation.lastActivityAt).toLocaleString()}\n`;
      text += `Messages: ${msgs.length}\n\n`;
      text += `${'-'.repeat(50)}\n\n`;
    }

    msgs.forEach((msg, index) => {
      const sender = msg.sender === 'user' ? 'You' : 'AI Companion';
      const emotion = msg.emotion ? ` (${msg.emotion})` : '';
      const timestamp = options.includeTimestamps
        ? ` - ${new Date(msg.timestamp).toLocaleString()}`
        : '';

      text += `[${index + 1}] ${sender}${emotion}${timestamp}\n`;
      text += `${msg.content}\n`;

      if (msg.audioUrl) {
        text += `Audio: ${msg.audioUrl}\n`;
      }

      text += `\n`;
    });

    return text;
  }

  /**
   * Get export filename
   */
  getExportFilename(conversationTitle: string, format: ExportFormat): string {
    const sanitizedTitle = conversationTitle
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .substring(0, 50);
    const timestamp = new Date().toISOString().split('T')[0];
    return `conversation_${sanitizedTitle}_${timestamp}.${format}`;
  }

  /**
   * Get MIME type for format
   */
  getMimeType(format: ExportFormat): string {
    const mimeTypes: Record<ExportFormat, string> = {
      json: 'application/json',
      markdown: 'text/markdown',
      text: 'text/plain',
    };
    return mimeTypes[format];
  }
}

export const exportService = new ExportService();

