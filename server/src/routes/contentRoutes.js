const express = require('express');
const router = express.Router();
// const contentController = require('../controllers/contentController'); // Removed controller dependency
// const authMiddleware = require('../middleware/auth'); // Auth is applied in index.js now

/**
 * @route   POST /api/content/generate
 * @desc    Generate content based on input parameters using Gemini
 * @access  Private (Middleware applied in index.js)
 */
router.post('/generate', async (req, res) => {
    const { topic, platform, tone, length, customInstructions } = req.body;
    const geminiModel = req.geminiModel; // Get model from middleware

    // Basic validation
    if (!geminiModel) {
        return res.status(500).json({ message: 'Content generation service is currently unavailable.' });
    }
    if (!topic) {
        return res.status(400).json({ message: 'Topic is required for content generation.' });
    }

    try {
        // Construct the prompt for Gemini
        let prompt = `Generate content about "${topic}".`;
        if (platform) prompt += ` Suitable for the ${platform} platform.`;
        if (tone) prompt += ` The tone should be ${tone}.`;
        if (length) prompt += ` Aim for a length of approximately ${length}.`;
        if (customInstructions) prompt += ` Additional instructions: ${customInstructions}`;
        
        prompt += `\n\nPlease generate the content now:`;
        
        console.log("Generated Prompt:", prompt);

        // Call Gemini API
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        const generatedText = response.text();

        console.log("Gemini Response Text:", generatedText);
        
        res.json({ generatedContent: generatedText });

    } catch (error) {
        console.error('Error generating content with Gemini:', error);
        let errorMessage = 'Failed to generate content.';
        // Check for specific Gemini error types if needed
        if (error.message.includes('SAFETY')) {
            errorMessage = 'Content generation blocked due to safety settings.';
        } else if (error.message.includes('API key not valid')) {
             errorMessage = 'Content generation service configuration error.';
        }
        res.status(500).json({ message: errorMessage });
    }
});

/**
 * @route   POST /api/content/suggest-ideas
 * @desc    Suggest content ideas based on brand profile and goals
 * @access  Private
 */
// Example: Placeholder, needs implementation using geminiModel
router.post('/suggest-ideas', (req, res) => {
    res.status(501).json({ message: 'Idea suggestion not implemented yet.' });
});

/**
 * @route   POST /api/content/post
 * @desc    Post content to specified platforms
 * @access  Private
 */
// Implement the actual posting logic
router.post('/post', async (req, res) => {
    const { message, platforms } = req.body;
    // IMPORTANT: Ensure authMiddleware correctly adds user info to req.user
    const userId = req.user?.id; 

    if (!userId) {
        // This case might indicate an issue with how authMiddleware is applied or works
        console.error('Error in /api/content/post: req.user not found. Check authMiddleware.');
        return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!message || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
        return res.status(400).json({ message: 'Message content and a list of target platforms are required.' });
    }

    // Only attempt to require the service if it exists
    let platformService;
    try {
        platformService = require('../services/platformService'); 
    } catch (e) {
        console.error("Failed to load platformService:", e);
        return res.status(500).json({ message: 'Platform posting service is unavailable.' });
    }
    
    const results = [];
    let hasErrors = false;
    
    // Process posting requests for each platform
    // Using Promise.all allows parallel processing, which can be faster
    await Promise.all(platforms.map(async (platform) => {
        try {
            console.log(`Attempting post to ${platform} for user ${userId}`);
            const result = await platformService.postContent(userId, platform, message);
            results.push(result);
            if (!result.success) {
                hasErrors = true;
                console.warn(`Posting to ${platform} failed:`, result.error);
            }
        } catch (error) {
            console.error(`Unhandled error posting to ${platform} for user ${userId}:`, error);
            results.push({ 
                success: false, 
                platform: platform, 
                error: error.message || 'Internal server error during posting process.' 
            });
            hasErrors = true;
        }
    }));

    console.log('Final posting results for user ', userId, results);

    // Determine overall status code based on results
    const statusCode = hasErrors ? 207 : 200; // 207 Multi-Status indicates partial success/failure
    const responseMessage = hasErrors 
        ? 'Content posting process completed, but one or more platforms failed.' 
        : 'Content posted successfully to all selected platforms.';

    res.status(statusCode).json({ 
        message: responseMessage,
        results: results // Send detailed results back to the client
    });
});

/**
 * @route   POST /api/content/schedule
 * @desc    Schedule content for future posting
 * @access  Private
 */
// Example: Placeholder, needs implementation
router.post('/schedule', (req, res) => {
    res.status(501).json({ message: 'Content scheduling not implemented yet.' });
});

// Add other content-related routes here (e.g., for drafts, ideas)

module.exports = router; 