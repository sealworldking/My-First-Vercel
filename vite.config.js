import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// 로컬 개발은 `vercel dev`로 실행 — 프론트와 api/chat.js 함수를 한 포트에서
// 함께 서빙하므로 /api 프록시가 필요 없다. (배포도 동일하게 함수가 처리)
export default defineConfig({
  plugins: [react()],
})
