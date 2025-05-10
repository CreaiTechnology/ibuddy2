/**
 * Development environment startup script
 * Runs all services in development mode concurrently
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Define services to start
const services = [
  {
    name: 'API Gateway',
    directory: 'api-gateway',
    command: 'npm',
    args: ['run', 'dev'],
    color: '\x1b[36m', // Cyan
    ready: (data) => data.includes('API Gateway running on port')
  },
  {
    name: 'Core Service',
    directory: 'core-service',
    command: 'npm',
    args: ['run', 'dev'],
    color: '\x1b[32m', // Green
    ready: (data) => data.includes('Core Service running on port')
  },
  {
    name: 'AI Service',
    directory: 'ai-service',
    command: 'npm',
    args: ['run', 'dev'],
    color: '\x1b[35m', // Magenta
    ready: (data) => data.includes('AI Service running on port')
  },
  {
    name: 'Client',
    directory: 'client',
    command: 'npm',
    args: ['start'],
    color: '\x1b[33m', // Yellow
    ready: (data) => data.includes('Compiled successfully') || data.includes('webpack compiled')
  }
];

// Reset color code
const resetColor = '\x1b[0m';

// Track ready services
const readyServices = new Set();
const startTime = Date.now();

/**
 * Format a log message with service name, color and timestamp
 * @param {string} serviceName - The service name
 * @param {string} color - The color code
 * @param {string} data - The log data
 * @returns {string} Formatted log message
 */
function formatLogMessage(serviceName, color, data) {
  const timestamp = new Date().toISOString().substring(11, 19);
  return `${color}[${timestamp}][${serviceName}]${resetColor} ${data}`;
}

/**
 * Check if all services are ready
 */
function checkAllServicesReady() {
  if (readyServices.size === services.length) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n\x1b[42m\x1b[30m All services started successfully in ${totalTime}s! \x1b[0m\n`);
    
    // Print service URLs
    console.log('\x1b[1mService URLs:\x1b[0m');
    console.log('- API Gateway: \x1b[36mhttp://localhost:3000\x1b[0m');
    console.log('- Core Service: \x1b[32mhttp://localhost:3001\x1b[0m');
    console.log('- AI Service: \x1b[35mhttp://localhost:3002\x1b[0m');
    console.log('- Client App: \x1b[33mhttp://localhost:8080\x1b[0m');
    console.log('\nPress Ctrl+C to stop all services.\n');
  }
}

/**
 * Start a service
 * @param {Object} service - Service configuration
 */
function startService(service) {
  const { name, directory, command, args, color, ready } = service;
  
  console.log(`${color}Starting ${name}...${resetColor}`);
  
  // Check if directory exists
  const serviceDir = path.join(__dirname, '..', directory);
  if (!fs.existsSync(serviceDir)) {
    console.error(`${color}[ERROR] Directory for ${name} does not exist: ${serviceDir}${resetColor}`);
    process.exit(1);
  }
  
  // Start the service
  const child = spawn(command, args, {
    cwd: serviceDir,
    shell: true
  });
  
  // Handle stdout
  child.stdout.on('data', (data) => {
    const message = data.toString().trim();
    
    // Check if service is ready
    if (!readyServices.has(name) && ready(message)) {
      readyServices.add(name);
      console.log(`\n${color}✓ ${name} is ready!${resetColor}\n`);
      checkAllServicesReady();
    }
    
    // Log each line separately
    message.split('\n').forEach(line => {
      if (line.trim()) {
        console.log(formatLogMessage(name, color, line));
      }
    });
  });
  
  // Handle stderr
  child.stderr.on('data', (data) => {
    const message = data.toString().trim();
    
    // Log each line separately
    message.split('\n').forEach(line => {
      if (line.trim()) {
        console.log(formatLogMessage(name, color, `ERROR: ${line}`));
      }
    });
  });
  
  // Handle exit
  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`\n${color}[ERROR] ${name} exited with code ${code}${resetColor}`);
    } else {
      console.log(`\n${color}${name} stopped${resetColor}`);
    }
    
    // Remove from ready services
    readyServices.delete(name);
  });
  
  // Keep track of child processes to kill on exit
  return child;
}

/**
 * Check if environment files exist
 */
function checkEnvironmentFiles() {
  let allFilesExist = true;
  
  services.forEach(service => {
    const envPath = path.join(__dirname, '..', service.directory, '.env');
    const envExamplePath = path.join(__dirname, '..', service.directory, 'env.example');
    
    if (!fs.existsSync(envPath)) {
      allFilesExist = false;
      console.error(`${service.color}[WARNING] .env file not found for ${service.name}${resetColor}`);
      
      if (fs.existsSync(envExamplePath)) {
        console.log(`${service.color}[INFO] Copy env.example to .env in ${service.directory} directory${resetColor}`);
      }
    }
  });
  
  if (!allFilesExist) {
    console.log('\n\x1b[43m\x1b[30m Warning: Some .env files are missing. Services may not start correctly. \x1b[0m\n');
  }
}

/**
 * Main function
 */
function main() {
  console.log('\n\x1b[1m=== Starting ibuddy2 Development Environment ===\x1b[0m\n');
  
  // Check environment files
  checkEnvironmentFiles();
  
  // Start all services
  const children = services.map(startService);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nGracefully shutting down services...');
    
    children.forEach((child, index) => {
      console.log(`${services[index].color}Stopping ${services[index].name}...${resetColor}`);
      child.kill();
    });
    
    console.log('\nAll services stopped. Goodbye!');
    process.exit(0);
  });
}

// Run the script
main(); 