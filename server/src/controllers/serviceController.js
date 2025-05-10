const dbService = require('../services/dbService'); // Assuming dbService handles DB operations

// GET /api/services
exports.getAllServices = async (req, res, next) => {
    console.log("Controller: getAllServices called");
    try {
        // The actual user ID might be needed if services are user-specific
        // const userId = req.user.id; 
        
        // Call the database service to fetch services
        const services = await dbService.fetchAllServices(); 
        
        res.status(200).json(services);
    } catch (error) {
        console.error("Error in getAllServices:", error);
        // Pass the error to the centralized error handler in index.js
        next(error); 
    }
};

// Add other service controller functions here later if needed 