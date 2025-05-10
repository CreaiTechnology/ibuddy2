const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
let geminiModel = null;

if (!apiKey) {
  console.warn("⚠️ Warning: GEMINI_API_KEY not found in environment variables. AI content generation will not work.");
} else {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    // Specify the model you want to use
    // NOTE: Make sure 'gemini-2.0-flash-lite' is a valid model identifier.
    // Common patterns for Gemini models include 'gemini-2.0-flash-lite', 'gemini-1.5-pro-latest', etc.
    const modelName = "gemini-2.0-flash-lite"; 
    geminiModel = genAI.getGenerativeModel({ model: modelName });
    console.log(`✅ Gemini AI client initialized successfully with model: ${modelName}.`);
  } catch (error) {
    console.error("❌ Error initializing Gemini AI client:", error.message);
    // Optionally prevent server start in production if Gemini is critical
    // if (process.env.NODE_ENV === 'production') { process.exit(1); }
  }
}

module.exports = { 
  genAI, 
  geminiModel 
}; 