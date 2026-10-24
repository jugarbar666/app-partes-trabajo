import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

function detectCurrentBranch(): string {
  if (process.env.VITE_BRANCH) return process.env.VITE_BRANCH
  if (process.env.BRANCH) return process.env.BRANCH // Netlify
  if (process.env.HEAD) return process.env.HEAD     // Netlify
  if (process.env.VERCEL_GIT_COMMIT_REF) return process.env.VERCEL_GIT_COMMIT_REF
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

const currentBranch = detectCurrentBranch()
const isFontaneriaProduction = currentBranch === 'empresa-fontaneria-roma'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_GIT_BRANCH__: JSON.stringify(currentBranch),
    __SHOW_MOBILE_SIMULATOR__: JSON.stringify(!isFontaneriaProduction),
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
