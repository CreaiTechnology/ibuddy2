const fs = require('fs');
const path = require('path');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = '.env';

// Define the expected variables
const requiredVars = [
  { name: 'SUPABASE_URL', prompt: 'Enter your Supabase Project URL: ' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', prompt: 'Enter your Supabase Service Role Key: ' },
  { name: 'GEMINI_API_KEY', prompt: 'Enter your Google AI Studio API Key (Gemini): ' },
  { name: 'JWT_SECRET', prompt: 'Enter a secure JWT Secret Key: ' },
  // MOCK_USER_ID removed as per previous discussion, auth should handle this
  // BYPASS_AUTH is optional and defaults to false if not set
  // NODE_ENV is typically set by the environment/process manager
];

let envContent = '';

function askQuestion(index) {
  if (index >= requiredVars.length) {
    readline.question('Bypass authentication for development? (yes/no, default: no): ', (bypass) => {
      envContent += '# Set to true to bypass authentication middleware for local development\n';
      envContent += `BYPASS_AUTH=${bypass.toLowerCase() === 'yes' ? 'true' : 'false'}\n`;

      readline.question('Set NODE_ENV to development? (yes/no, default: yes): ', (nodeEnv) => {
        envContent += '# Node environment (development, production)\n';
        envContent += `NODE_ENV=${nodeEnv.toLowerCase() === 'no' ? 'production' : 'development'}\n`;

        // Add a newline for separation
        envContent += '\n# Optional: Add any other environment variables below\n';

        fs.writeFile(envPath, envContent, (err) => {
          if (err) {
            console.error('Error writing .env file:', err);
          } else {
            console.log(`.env file created successfully at ${envPath}`);
          }
          readline.close();
        });
      });
    });
    return;
  }

  const variable = requiredVars[index];
  readline.question(variable.prompt, (answer) => {
    if (!answer) {
      console.warn(`Warning: No value provided for ${variable.name}.`);
    }
    envContent += `${variable.name}=${answer}\n`;
    askQuestion(index + 1);
  });
}

console.log('Starting .env file creation process...');
askQuestion(0); 