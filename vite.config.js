import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'safari15' // iOS 15+ WKWebView compatibility (supports import.meta)
  }
})