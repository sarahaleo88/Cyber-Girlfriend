/**
 * Personality API Routes
 * Handles personality selection, switching, and configuration
 */

import { Hono } from 'hono';
import { personalityService } from '../services/personality';
import type { PersonalityId, PersonalityUpdateRequest } from '../types/personality';

const personality = new Hono();

/**
 * GET /api/personality
 * Get all available personality presets
 */
personality.get('/', (c) => {
  try {
    const personalities = personalityService.getAllPersonalities();
    return c.json({
      success: true,
      data: personalities,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching personalities:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch personalities',
      timestamp: new Date(),
    }, 500);
  }
});

/**
 * GET /api/personality/current
 * Get the current active personality
 */
personality.get('/current', (c) => {
  try {
    const current = personalityService.getCurrentPersonality();
    return c.json({
      success: true,
      data: current,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching current personality:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch current personality',
      timestamp: new Date(),
    }, 500);
  }
});

/**
 * GET /api/personality/:id
 * Get a specific personality by ID
 */
personality.get('/:id', (c) => {
  try {
    const id = c.req.param('id') as PersonalityId;
    const personalityData = personalityService.getPersonality(id);
    
    if (!personalityData) {
      return c.json({
        success: false,
        error: `Personality '${id}' not found`,
        timestamp: new Date(),
      }, 404);
    }

    return c.json({
      success: true,
      data: personalityData,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching personality:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch personality',
      timestamp: new Date(),
    }, 500);
  }
});

/**
 * GET /api/personality/:id/preview
 * Get a preview/demo message for a personality
 */
personality.get('/:id/preview', (c) => {
  try {
    const id = c.req.param('id') as PersonalityId;
    const preview = personalityService.getPersonalityPreview(id);
    
    return c.json({
      success: true,
      data: {
        personalityId: id,
        preview,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching personality preview:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch personality preview',
      timestamp: new Date(),
    }, 500);
  }
});

/**
 * POST /api/personality/switch
 * Switch to a different personality
 */
personality.post('/switch', async (c) => {
  try {
    const body = await c.req.json();
    const { personalityId } = body;

    if (!personalityId) {
      return c.json({
        success: false,
        error: 'personalityId is required',
        timestamp: new Date(),
      }, 400);
    }

    const newPersonality = personalityService.switchPersonality(personalityId);
    
    return c.json({
      success: true,
      data: newPersonality,
      message: `Switched to ${newPersonality.name}`,
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error switching personality:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to switch personality',
      timestamp: new Date(),
    }, 400);
  }
});

/**
 * PUT /api/personality/update
 * Update personality with customizations
 */
personality.put('/update', async (c) => {
  try {
    const body: PersonalityUpdateRequest = await c.req.json();
    
    if (!body.personalityId) {
      return c.json({
        success: false,
        error: 'personalityId is required',
        timestamp: new Date(),
      }, 400);
    }

    const updatedPersonality = personalityService.updatePersonality(body);
    
    return c.json({
      success: true,
      data: updatedPersonality,
      message: 'Personality updated successfully',
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('Error updating personality:', error);
    return c.json({
      success: false,
      error: error.message || 'Failed to update personality',
      timestamp: new Date(),
    }, 400);
  }
});

/**
 * GET /api/personality/stats
 * Get personality system statistics
 */
personality.get('/stats', (c) => {
  try {
    const stats = personalityService.getPersonalityStats();
    return c.json({
      success: true,
      data: stats,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching personality stats:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch personality stats',
      timestamp: new Date(),
    }, 500);
  }
});

export default personality;

