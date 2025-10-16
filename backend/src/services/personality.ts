/**
 * Personality Service
 * Manages AI personality presets and dynamic prompt generation
 */

import { PERSONALITY_PRESETS, type Personality, type PersonalityId, type PersonalityUpdateRequest } from '../types/personality';

export class PersonalityService {
  private currentPersonality: Personality;
  private customizations: Map<string, any> = new Map();

  constructor(initialPersonalityId: PersonalityId = 'friendly') {
    this.currentPersonality = PERSONALITY_PRESETS[initialPersonalityId];
  }

  /**
   * Get all available personality presets
   */
  getAllPersonalities(): Personality[] {
    return Object.values(PERSONALITY_PRESETS);
  }

  /**
   * Get a specific personality by ID
   */
  getPersonality(id: PersonalityId): Personality | null {
    return PERSONALITY_PRESETS[id] || null;
  }

  /**
   * Get the current active personality
   */
  getCurrentPersonality(): Personality {
    return this.currentPersonality;
  }

  /**
   * Switch to a different personality
   */
  switchPersonality(personalityId: PersonalityId): Personality {
    const personality = PERSONALITY_PRESETS[personalityId];
    if (!personality) {
      throw new Error(`Personality '${personalityId}' not found`);
    }
    this.currentPersonality = personality;
    return personality;
  }

  /**
   * Update personality with customizations
   */
  updatePersonality(request: PersonalityUpdateRequest): Personality {
    const { personalityId, customizations } = request;
    
    // Switch to the new personality
    this.switchPersonality(personalityId);

    // Apply customizations if provided
    if (customizations) {
      if (customizations.voiceSpeed !== undefined) {
        this.currentPersonality.voiceSettings.speed = customizations.voiceSpeed;
      }
      if (customizations.voicePitch !== undefined) {
        this.currentPersonality.voiceSettings.pitch = customizations.voicePitch;
      }
      if (customizations.responseLength !== undefined) {
        this.currentPersonality.conversationStyle.responseLength = customizations.responseLength;
      }
    }

    return this.currentPersonality;
  }

  /**
   * Generate system prompt for OpenAI with current personality
   */
  generateSystemPrompt(additionalContext?: string): string {
    let prompt = this.currentPersonality.systemPrompt;

    if (additionalContext) {
      prompt += `\n\nAdditional context: ${additionalContext}`;
    }

    return prompt;
  }

  /**
   * Get voice settings for current personality
   */
  getVoiceSettings() {
    return this.currentPersonality.voiceSettings;
  }

  /**
   * Get conversation style for current personality
   */
  getConversationStyle() {
    return this.currentPersonality.conversationStyle;
  }

  /**
   * Generate transition prompt when switching personalities
   */
  generateTransitionPrompt(fromPersonalityId: PersonalityId, toPersonalityId: PersonalityId): string {
    const fromPersonality = PERSONALITY_PRESETS[fromPersonalityId];
    const toPersonality = PERSONALITY_PRESETS[toPersonalityId];

    return `The conversation style is now transitioning from ${fromPersonality.name} to ${toPersonality.name}. 
Smoothly adjust your tone and style to match the new personality: ${toPersonality.description}
Continue the conversation naturally with this new personality.`;
  }

  /**
   * Get personality preview/demo response
   */
  getPersonalityPreview(personalityId: PersonalityId): string {
    const personality = PERSONALITY_PRESETS[personalityId];
    if (!personality) {
      return 'Personality not found';
    }

    const previews: Record<PersonalityId, string> = {
      friendly: "Hi there! 😊 I'm so glad you're here! I'm your friendly companion, and I'm here to listen, support, and chat about anything on your mind. How are you feeling today?",
      professional: "Good day. I'm your professional assistant, ready to help you with tasks, provide information, and support your productivity goals. How may I assist you today?",
      playful: "Hey hey! 🎉 What's up, friend? I'm your playful buddy, ready to have some fun and make your day more interesting! What adventure should we go on today? 😄",
    };

    return previews[personalityId] || personality.description;
  }

  /**
   * Validate personality configuration
   */
  validatePersonality(personality: Partial<Personality>): boolean {
    if (!personality.id || !personality.name || !personality.systemPrompt) {
      return false;
    }

    if (personality.voiceSettings) {
      const { speed, pitch } = personality.voiceSettings;
      if (speed && (speed < 0.5 || speed > 2.0)) return false;
      if (pitch && (pitch < 0.5 || pitch > 2.0)) return false;
    }

    if (personality.conversationStyle) {
      const { emotiveness } = personality.conversationStyle;
      if (emotiveness && (emotiveness < 1 || emotiveness > 10)) return false;
    }

    return true;
  }

  /**
   * Get personality statistics
   */
  getPersonalityStats() {
    return {
      totalPersonalities: Object.keys(PERSONALITY_PRESETS).length,
      currentPersonality: this.currentPersonality.id,
      availablePersonalities: Object.keys(PERSONALITY_PRESETS),
    };
  }
}

// Singleton instance
export const personalityService = new PersonalityService();

