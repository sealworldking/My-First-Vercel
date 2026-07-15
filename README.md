# GROQ Chat

Groq API 기반 채팅 웹앱. 텍스트 대화, 이미지 업로드/인식, 텍스트 파일 첨부를 지원한다.
프론트엔드(React + Vite)와 백엔드(Vercel 서버리스 함수)가 한 폴더 안에 있어 이 레포 하나로 완결된다.

## 구조

```
.
├── api/
│   └── chat.js        # 서버리스 함수 → /api/chat (Groq API 프록시)
├── src/
│   ├── App.jsx        # 채팅 UI
│   ├── App.css
│   └── assets/        # clip.png 등
├── index.html
├── vite.config.js
├── package.json
├── .env.example       # 환경변수 견본
└── .gitignore
```

- **텍스트 요청** → `llama-3.1-8b-instant`
- **이미지 첨부** → `meta-llama/llama-4-scout-17b-16e-instruct` (비전) 자동 전환
- 이미지 생성은 Groq이 지원하지 않아 미포함 (인식/설명만).

## 사전 준비

Groq API 키 발급: https://console.groq.com/keys

```bash
cp .env.example .env
# .env 를 열어 GROQ_API_KEY 에 실제 키 입력
```

## 로컬 실행

로컬 개발은 Vercel CLI로 프론트와 함수를 함께 띄운다.

```bash
npm install
npm i -g vercel      # 최초 1회
vercel dev
```

`vercel dev`가 `.env`의 `GROQ_API_KEY`를 읽어 함수에 주입한다.
브라우저에서 안내된 로컬 주소(기본 http://localhost:3000)로 접속.

> 순수 프론트만 확인할 때는 `npm run dev`로도 뜨지만, 이 경우 `/api/chat`
> 함수가 실행되지 않아 채팅 응답은 동작하지 않는다. 전체 동작 확인은 `vercel dev`.

## 배포 (Vercel)

```bash
vercel                          # 최초: 프로젝트 생성 + 링크
vercel env add GROQ_API_KEY     # 키 등록 (Production/Preview/Development 전체 선택)
vercel --prod                   # 프로덕션 배포 (키 반영을 위해 재배포 필수)
```

환경변수 등록 후에는 반드시 `vercel --prod`로 재배포해야 키가 적용된다.
(재배포 없이 키만 추가하면 `Invalid API Key`가 뜬다.)

## 참고 / 제약

- 무료 서버리스는 요청 본문 **4.5MB** 한도 → 큰 이미지(base64)는 실패할 수 있다.
- 함수는 요청 시에만 실행되므로 첫 요청에 콜드 스타트(약 1초)가 있을 수 있다.
- 대화 기록은 브라우저 메모리에만 존재한다. 새로고침 또는 "새 채팅 시작"으로 초기화.
