import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = env.VITE_SUPABASE_URL || 'https://ixirytvbygcwfmdctgoz.supabase.co';
  const serviceKey = env.VITE_SUPABASE_SERVICE_KEY || '';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5180,
      strictPort: true,
      proxy: {
        '/supabase-admin': {
          target: supabaseUrl,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/supabase-admin/, ''),
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'User-Agent': 'TechAds-Server-Proxy/1.0'
          }
        }
      }
    }
  };
});


