import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Strip crossorigin attributes — WKWebView's capacitor:// scheme doesn't return CORS headers
const removeCrossorigin = () => ({
  name: 'remove-crossorigin',
  transformIndexHtml(html) {
    return html.replace(/ crossorigin/g, '');
  }
});

export default defineConfig({
  plugins: [react(), removeCrossorigin()],
  base: './',
  build: {
    target: 'safari15', // iOS 15+ WKWebView compatibility (supports import.meta)
    modulePreload: false
  }
})