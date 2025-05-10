const { geminiModel } = require('../config/gemini');
const supabase = require('../config/supabase'); // Import supabase client
const platformService = require('../services/platformService'); // Import platform service
const platformStrategies = require('../services/platformStrategies'); // Import strategies

const BRAND_PROFILES_TABLE = 'brand_profiles';

/**
 * Helper function to fetch brand profile
 */
async function fetchBrandProfile(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from(BRAND_PROFILES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('Error fetching brand profile for suggestions:', error);
      return null; // Return null on error, let the suggestion function handle it
    }
    return data;
  } catch (fetchError) {
    console.error('Exception fetching brand profile:', fetchError);
    return null;
  }
}

/**
 * Content Controller for handling AI generation and posting
 */
const contentController = {
  /**
   * Generate content using Gemini based on a user prompt
   * @param {Object} req - Express request object. Expects { prompt: string } in body.
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  generateContent: async (req, res, next) => {
    const { prompt, brandProfile } = req.body; // Optionally accept pre-fetched profile
    const userId = req.user?.id;
    
    // Basic Input Validation
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ message: 'Prompt is required and must be a non-empty string.' });
    }
    
    // Check if Gemini Model is available
    if (!geminiModel) {
      return res.status(503).json({ message: 'AI Content Generation Service is not available.' });
    }
    
    console.log(`Received content generation request with prompt: "${prompt.substring(0, 100)}..."`);
    
    try {
      // Fetch brand profile if not provided and user is authenticated
      let profile = brandProfile;
      if (!profile && userId) {
         console.log(`Fetching brand profile for user ${userId} to enhance generation.`);
         profile = await fetchBrandProfile(userId);
      }

      // Replace [Brand Name] placeholder in the prompt if profile and profile_name exist
      let userPrompt = prompt; // Use a new variable to avoid modifying the original req.body.prompt
      if (profile && profile.profile_name) {
          console.log(`Replacing '[Brand Name]' placeholder with actual brand name: "${profile.profile_name}"`);
          // Use case-insensitive regex replacement
          userPrompt = userPrompt.replace(/\[Brand Name\]/gi, profile.profile_name); 
      }

      // Construct the prompt for the AI, incorporating brand profile if available
      let fullPrompt = `Generate a marketing text based on the following request: ${userPrompt}`;
      if (profile) {
          // Using a clear structure for the AI
          fullPrompt = `**Brand Profile Context:**
- Brand Name: ${profile.profile_name || 'Not specified'}
- Brand Keywords: ${profile.brand_keywords?.join(', ') || 'Not specified'}
- Target Audience: ${profile.target_audience || 'General public'}
- Brand Tone: ${profile.brand_tone?.join(', ') || 'Neutral'}
- Communication Style: ${profile.communication_style || 'Not specified'}
- Industry: ${profile.industry || 'Not specified'}
- Brand Mission: ${profile.brand_mission || 'Not specified'}
- Words to Avoid: ${profile.negative_keywords?.join(', ') || 'None'}

**User Request:**
${userPrompt}

**Generated Marketing Text:**
`; // Added labels for clarity and a final instruction
      }
      
      const result = await geminiModel.generateContent(fullPrompt);
      const response = await result.response;
      const generatedText = response.text();
      
      console.log(`Generated content: "${generatedText.substring(0, 100)}..."`);
      
      // Send the generated text back to the client
      res.json({ generatedText });
      
    } catch (error) {
      console.error('Error calling Gemini API for content generation:', error);
      // Handle potential specific errors from Gemini if needed
      if (error.message && error.message.includes('API key not valid')){
         return res.status(401).json({ message: 'AI API key is invalid or missing.' });
      } else if (error.message && error.message.includes('quota')) {
         return res.status(429).json({ message: 'AI API quota exceeded.' });
      }
      // Pass a generic server error to the main error handler
      next(new Error('Failed to generate content using AI')); 
    }
  },

  /**
   * Suggest content ideas based on brand profile and optional goals
   */
  suggestIdeas: async (req, res, next) => {
    const userId = req.user?.id;
    const { topic, goal } = req.body; // Optional topic or goal from user

    if (!userId) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!geminiModel) {
      return res.status(503).json({ message: 'AI Content Generation Service is not available.' });
    }

    console.log(`Received suggest ideas request for user ${userId}. Topic: ${topic}, Goal: ${goal}`);

    try {
        // Fetch the user's brand profile
        const profile = await fetchBrandProfile(userId);

        if (!profile) {
             console.warn(`User ${userId} has no brand profile. Suggesting generic ideas.`);
             // Fallback or return error? For now, provide generic prompt
        }

        // Construct the prompt for Gemini
        let ideaPrompt = `You are an AI assistant helping generate content ideas for marketing.

`;

        if (profile) {
            ideaPrompt += `Consider the following brand profile:
- Industry: ${profile.industry || 'Unknown'}
- Tone: ${profile.brand_tone?.join(', ') || 'neutral'}
- Keywords: ${profile.brand_keywords?.join(', ') || 'general'}
- Target Audience: ${profile.target_audience || 'general public'}
- Brand Mission: ${profile.brand_mission || 'Not specified'}
- Avoid: ${profile.negative_keywords?.join(', ') || 'none'}

`;
        }

        if (goal) {
            ideaPrompt += `The current marketing goal is: ${goal}
`;
        }
        if (topic) {
            ideaPrompt += `The user wants ideas related to the topic: ${topic}
`;
        }

        ideaPrompt += `
Please suggest 5 distinct and creative content ideas (e.g., blog post titles, social media post themes, campaign slogans) suitable for this brand. Provide only the list of ideas, each on a new line.`;

        console.log("Sending prompt to Gemini for idea suggestion...");
        const result = await geminiModel.generateContent(ideaPrompt);
        const response = await result.response;
        const suggestionsText = response.text();

        // Parse the suggestions (assuming Gemini returns a list, potentially numbered or bulleted)
        const suggestions = suggestionsText.split('\n')
                             .map(s => s.replace(/^[\*\-\d\.\s]+/, '').trim()) // Remove list markers
                             .filter(s => s.length > 0); // Remove empty lines

        console.log(`Generated ${suggestions.length} content ideas.`);
        res.json({ suggestions });

    } catch (error) {
        console.error('Error calling Gemini API for idea suggestion:', error);
        // ... (add specific error handling like in generateContent) ...
        next(new Error('Failed to suggest content ideas using AI'));
    }
  },

  /**
   * Post content to specified platforms
   */
  postContent: async (req, res, next) => {
    const userId = req.user?.id;
    const { message, platforms } = req.body; // Expecting { message: "...", platforms: ["facebook", "instagram"] }

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: 'Content message is required.' });
    }
    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ message: 'Target platform(s) are required.' });
    }
    
    if (!supabase) {
      return res.status(503).json({ message: 'Database service not available.' });
    }

    console.log(`Received request to post content to platforms: ${platforms.join(', ')}`);
    
    const results = [];
    let hasErrors = false;

    // Process each platform sequentially for clearer error handling
    for (const platformType of platforms) {
      let platformData;
      try {
        // 1. Check if strategy exists and has postContent method
        if (!platformStrategies[platformType] || typeof platformStrategies[platformType].postContent !== 'function') {
            throw new Error(`Posting to platform '${platformType}' is not supported.`);
        }
        
        // 2. Fetch platform connection details (including token)
        console.log(`Fetching connection details for ${platformType}...`);
        // Use the logic from platformService.getPlatformAccountInfo, but get full data
        // Note: This might refresh the token if needed
        const { data: fetchedPlatform, error: fetchError } = await supabase
            .from('platforms') // Direct query for simplicity here, could use service
            .select('*')
            .eq('user_id', userId)
            .eq('platform_type', platformType)
            .eq('is_active', true)
            .single(); 
            
        if (fetchError || !fetchedPlatform) {
            throw new Error(`User is not connected to ${platformType} or connection is inactive.`);
        }
        platformData = fetchedPlatform;
        
        // 3. Call the platform strategy's postContent method
        console.log(`Posting content to ${platformType}...`);
        const postResult = await platformStrategies[platformType].postContent(userId, platformData, { message });
        
        results.push({ platform: platformType, success: true, ...postResult });
        console.log(`Successfully posted to ${platformType}. Result:`, postResult);

      } catch (error) {
        hasErrors = true;
        const errorMessage = error.message || `Failed to post to ${platformType}.`;
        console.error(`Error posting to ${platformType}:`, errorMessage);
        results.push({ platform: platformType, success: false, error: errorMessage });
        // Optional: Stop on first error? Or try all platforms?
        // break; // Uncomment to stop on first error
      }
    }

    // Determine overall status code
    const statusCode = hasErrors ? (results.some(r => !r.success) ? 500 : 207) : 200; // 207 Multi-Status if some failed
    
    res.status(statusCode).json({ 
        message: hasErrors ? 'Completed posting attempt with one or more errors.' : 'Content posted successfully to all selected platforms.',
        results 
    });
  },
  
  // Placeholder for future scheduling endpoint
  scheduleContent: async (req, res, next) => {
    // TODO: Implement scheduling logic
    res.status(501).json({ message: 'Scheduling functionality not yet implemented.' });
  }
};

module.exports = contentController; 