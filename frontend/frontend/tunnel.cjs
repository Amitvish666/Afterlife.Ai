const { spawn, execSync } = require('child_process');

console.log("Starting secure tunnel to local Ollama on port 11434...");
const lt = spawn('npx', ['localtunnel', '--port', '11434'], { shell: true });

lt.stdout.on('data', (data) => {
  const output = data.toString().trim();
  console.log(output);
  
  const match = output.match(/your url is: (https:\/\/[^\s]+)/);
  if (match) {
    const url = match[1];
    console.log(`\n=================================================`);
    console.log(`✅ Tunnel established at: ${url}`);
    console.log(`=================================================\n`);
    
    console.log("Updating Vercel environment variable OLLAMA_BASE_URL...");
    try {
      // Set for production
      execSync(`npx vercel env add OLLAMA_BASE_URL production --value ${url} --yes --force`, { stdio: 'inherit' });
      // Set for development
      execSync(`npx vercel env add OLLAMA_BASE_URL development --value ${url} --yes --force`, { stdio: 'inherit' });
      
      console.log("\n✅ Vercel environment variables updated!");
      console.log("⚠️  IMPORTANT: Keep this terminal window open to keep the tunnel alive.");
      console.log("👉  In a separate terminal, run 'npx vercel --prod' to redeploy the frontend so it picks up the new URL.");
    } catch (e) {
      console.error("\n❌ Failed to update Vercel env var automatically.");
      console.log(`Please go to your Vercel Dashboard -> Settings -> Environment Variables`);
      console.log(`Set OLLAMA_BASE_URL to: ${url}`);
    }
  }
});

lt.stderr.on('data', (data) => {
  console.error(`Tunnel error: ${data}`);
});

lt.on('close', (code) => {
  console.log(`Tunnel closed with code ${code}`);
});
