# 채용 레이더

조건에 맞는 새 채용 공고를 텔레그램으로 알려주고, 관심 공고의 마감일을 알림(D-3·D-1·당일 오전 9시)과 캘린더 구독으로 챙겨주는 서비스.

현재 데이터 소스: 공공기관 채용정보(잡알리오, data.go.kr).

## 구조

```
QStash (1시간) ─▶ /api/cron/collect ─▶ 잡알리오 API ─▶ postings 저장/갱신
                                                    ├─ 새 공고 × 구독 조건 매칭 ─▶ notification_jobs('new')
                                                    └─ 마감일 변경 ─▶ 관심 등록자의 마감 알림 재예약
QStash (5분)   ─▶ /api/cron/dispatch ─▶ due job 선점(pending→sending) ─▶ 텔레그램 발송 (실패 시 5분 뒤 재시도, 3회 후 실패)
텔레그램       ─▶ /api/telegram/webhook ─▶ /start <토큰> 계정 연결 · [관심 등록] 버튼 · /stop
캘린더 앱      ─▶ /api/calendar/<토큰>.ics ─▶ 관심 공고 마감일
```

- `lib/` 도메인 로직(정규화·매칭·알림 일정·ICS·텔레그램 메시지)은 순수 함수, `lib/services/` 는 DB 작업
- 새 공고 알림은 공고 시작일이 3일 이내인 것만 보냄 (첫 수집 때 알림 폭탄 방지)

## 로컬 개발

Postgres 설치 없이 파일 기반 PGlite로 돌아간다.

```bash
cp .env.example .env.local       # DATABASE_URL=file:./.pglite 그대로
npm install
npm run db:migrate
npx tsx scripts/seed-local.ts    # 샘플 공고 5건 + 테스트 사용자
npm run dev
```

- PGlite는 한 프로세스만 열 수 있다. 시드·마이그레이션은 dev 서버를 끈 상태에서 실행
- 테스트: `npm test` (테스트마다 인메모리 PGlite에 마이그레이션 적용)

## 배포 체크리스트

1. **Neon**: 프로젝트 생성 → 연결 문자열을 `DATABASE_URL` 로 → `npm run db:migrate`
2. **Google OAuth**: Google Cloud Console에서 OAuth 클라이언트 생성
   - 승인된 리디렉션 URI: `https://<도메인>/api/auth/callback/google`
3. **잡알리오 API**: data.go.kr 에서 "재정경제부_공공기관 채용정보 조회서비스" 활용신청 (개발계정 자동승인, 하루 1,000회)
   - 일반 인증키(Decoding) 를 `ALIO_SERVICE_KEY` 로
4. **텔레그램 봇**: @BotFather → `/newbot` → 토큰과 봇 username 을 env 로. 배포 후 웹훅 등록:
   ```bash
   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
     -d "url=https://<도메인>/api/telegram/webhook" \
     -d "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
     -d 'allowed_updates=["message","callback_query","my_chat_member"]'
   ```
5. **Vercel**: 저장소 연결 → `.env.example` 의 변수 전부 설정 (`BETTER_AUTH_URL` 은 배포 도메인)
6. **Upstash QStash** 스케줄 2개 (헤더 `Upstash-Forward-Authorization: Bearer <CRON_SECRET>`)
   - `0 * * * *` → `POST https://<도메인>/api/cron/collect`
   - `*/5 * * * *` → `POST https://<도메인>/api/cron/dispatch`

## 다음 단계

- 사람인 API 수집기 추가 (승인 후 `lib/sources/saramin.ts` + `collect` 에 연결)
- 잡알리오 실제 응답으로 지역명 표기 확인 (설정 화면의 "서울/경기…" 약칭과 매칭되는지)
- 카카오 로그인 (이메일 수집에 비즈앱 전환 필요)
- 웹 푸시 / Expo 웹뷰 앱 + 네이티브 푸시
