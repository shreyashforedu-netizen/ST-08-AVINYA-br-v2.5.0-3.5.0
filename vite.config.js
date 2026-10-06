import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import cesium from 'vite-plugin-cesium'
import { spawn } from 'child_process'

function orbitalEnginePlugin() {
  return {
    name: 'orbital-engine-api',
    configureServer(server) {
      server.middlewares.use('/api/import-tle', (req, res, next) => {
        if (req.method !== 'POST') return next();
        
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const limit = data.limit || 40;
            const group = data.group || 'ACTIVE';
            
            console.log(`\n[Orbital Engine API] Streaming TLE import for Group: ${group}, Limit: ${limit}...`);
            
            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Transfer-Encoding', 'chunked');
            
            // Run the python script using the Windows 'py' launcher
            const pyProcess = spawn('py', ['orbital-engine/main.py', '--limit', limit.toString(), '--group', group]);
            
            pyProcess.stdout.on('data', (chunk) => {
              res.write(chunk.toString());
            });
            
            pyProcess.stderr.on('data', (chunk) => {
              res.write(chunk.toString());
            });
            
            pyProcess.on('close', (code) => {
              console.log(`[Orbital Engine API] Process finished with code ${code}. Vite will hot-reload JSON.`);
              res.end();
            });
            
          // eslint-disable-next-line no-unused-vars
          } catch (e) {
            res.statusCode = 400;
            res.end('Invalid JSON body');
          }
        });
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    cesium(),
    orbitalEnginePlugin()
  ],
})
