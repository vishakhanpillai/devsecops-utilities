import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Allow internal / self-signed SSL certificates commonly used in on-premise SonarQube servers
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function formatProxyError(err: any, targetUrl: string): string {
  const cause = err?.cause;
  const causeCode = cause?.code || '';
  const causeMsg = cause?.message || '';

  if (causeCode === 'ECONNREFUSED' || causeMsg.includes('ECONNREFUSED')) {
    return `Connection refused at "${targetUrl}". SonarQube is not running at this address or the port is closed.`;
  }
  if (causeCode === 'ENOTFOUND' || causeMsg.includes('ENOTFOUND') || causeMsg.includes('getaddrinfo')) {
    return `Cannot resolve hostname for "${targetUrl}". Please check for typos in the Sonar server URL.`;
  }
  if (causeCode === 'ETIMEDOUT' || causeMsg.includes('ETIMEDOUT')) {
    return `Connection to "${targetUrl}" timed out. Ensure your VPN or network firewall allows access to this server.`;
  }
  if (causeMsg.includes('certificate') || causeCode.includes('CERT') || causeMsg.includes('self-signed')) {
    return `SSL/TLS certificate error connecting to "${targetUrl}": ${causeMsg}`;
  }

  const detail = causeMsg || causeCode || err?.message || 'Unknown network error';
  return `Failed to connect to "${targetUrl}": ${detail}`;
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});
