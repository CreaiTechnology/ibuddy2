const supabase = require('../config/supabase');

const PROFILES_TABLE = 'brand_profiles';

/**
 * Controller for managing Brand Profiles
 */
const brandProfileController = {

  /**
   * Get the brand profile for the authenticated user
   */
  getProfile: async (req, res, next) => {
    const userId = req.user?.id; // Assumes authMiddleware populates req.user
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!supabase) {
        return res.status(503).json({ message: 'Database service not available.' });
    }

    try {
      const { data, error } = await supabase
        .from(PROFILES_TABLE)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle as user might not have a profile yet

      if (error) throw error;

      if (!data) {
        // It's not an error if profile doesn't exist, return empty object or default
        return res.status(200).json({ message: 'No brand profile found for this user.', profile: null });
      }

      res.status(200).json({ profile: data });

    } catch (error) {
      console.error('Error fetching brand profile:', error);
      next(error);
    }
  },

  /**
   * Create or update the brand profile for the authenticated user
   */
  upsertProfile: async (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!supabase) {
      return res.status(503).json({ message: 'Database service not available.' });
    }

    // Extract allowed fields from request body
    const { 
      profile_name,
      brand_keywords,
      target_audience,
      brand_tone,
      brand_mission,
      negative_keywords,
      communication_style,
      industry,
      preferred_length,
      brand_description
     } = req.body;

    // Basic validation (can be enhanced)
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: 'No profile data provided.' });
    }
     
    // Data for upsert - Explicitly map fields to prevent unwanted data injection
    const profileData = {
      user_id: userId,
      profile_name: profile_name !== undefined ? profile_name : null,
      brand_keywords: brand_keywords !== undefined ? brand_keywords : null,
      target_audience: target_audience !== undefined ? target_audience : null,
      brand_tone: brand_tone !== undefined ? brand_tone : null,
      brand_mission: brand_mission !== undefined ? brand_mission : null,
      negative_keywords: negative_keywords !== undefined ? negative_keywords : null,
      communication_style: communication_style !== undefined ? communication_style : null,
      industry: industry !== undefined ? industry : null,
      preferred_length: preferred_length !== undefined ? preferred_length : null,
      brand_description: brand_description !== undefined ? brand_description : null,
      updated_at: new Date().toISOString() // Manually set updated_at
    };
    
    // Remove null fields if you prefer Supabase defaults (or handle nulls appropriately)
    Object.keys(profileData).forEach(key => profileData[key] === undefined && delete profileData[key]);
    
    try {
      // Upsert based on the unique user_id constraint
      const { data, error } = await supabase
        .from(PROFILES_TABLE)
        .upsert(profileData, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;

      res.status(200).json({ message: 'Brand profile saved successfully.', profile: data });

    } catch (error) {
      console.error('Error saving brand profile:', error);
      next(error);
    }
  }
};

module.exports = brandProfileController; 