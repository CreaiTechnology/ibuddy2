import appointmentRoutes from './routes/appointmentRoutes.js';
import platformRoutes from './routes/platformRoutes.js';
import userRoutes from './routes/userRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import mapDataRoutes from './routes/mapDataRoutes.js';
import routeOptimizationRoutes from './routes/routeRoutes.js';

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/platforms', platformRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/appointments', mapDataRoutes);
app.use('/api/routes', routeOptimizationRoutes); 