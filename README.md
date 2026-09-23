# DOPAMIN AWARDS · 기존 DOTT Supabase 같이 쓰는 최종 버전

이 버전은 새 Supabase 프로젝트를 만들지 않습니다. **현재 DOTT가 쓰는 Supabase 프로젝트 안에 어워즈 전용 `awards_*` 테이블만 추가**합니다.

## 절대 안 건드리는 것
`supabase.sql`은 기존 DOTT 테이블을 수정하거나 삭제하지 않습니다. 새로 만드는 핵심 객체는 아래뿐입니다.

- `awards_questions`
- `awards_submissions`
- `awards_answers`
- `awards_admins`
- `awards_settings`
- `is_awards_admin()`
- `submit_awards_vote()`

## 관리자 PIN
- 사이트에서 입력: `0924`
- Supabase Auth 관리자 계정 실제 비밀번호: `Dopamin!0924`
- 내부 인증 이메일: `dopamin.admin@example.com`

> 화면에는 PIN 4자리만 입력합니다. 다만 4자리 PIN은 행사 운영용 간단 잠금이며 강한 보안 수단은 아닙니다.

## 1. 기존 DOTT Supabase 열기
1. Supabase Dashboard에 로그인합니다.
2. **DOTT가 현재 연결되어 있는 기존 프로젝트**를 선택합니다.
3. 새 프로젝트는 만들지 않습니다.

## 2. 어워즈 테이블 추가
1. 왼쪽 `SQL Editor`
2. `New query`
3. 이 폴더의 `supabase.sql` 전체 복사
4. 붙여넣기 후 `Run`
5. `Table Editor`에서 아래 5개가 새로 생겼는지 확인
   - awards_questions
   - awards_submissions
   - awards_answers
   - awards_admins
   - awards_settings

기존 DOTT 테이블은 그대로 남아 있어야 정상입니다.

## 3. 어워즈 관리자 Auth 계정 생성
1. `Authentication` > `Users`
2. 새 사용자 추가
3. Email: `dopamin.admin@example.com`
4. Password: `Dopamin!0924`
5. 이메일 확인 상태로 생성합니다.
6. 생성된 사용자의 UUID(User ID)를 복사합니다.

그 다음 SQL Editor에서 아래만 실행합니다.

```sql
insert into public.awards_admins(user_id)
values ('여기에_복사한_UUID')
on conflict do nothing;
```

## 4. 기존 DOTT 프로젝트 URL / Publishable key 넣기
Supabase 프로젝트 `Connect` 화면에서 다음 두 값을 확인합니다.

- Project URL
- Publishable key (`sb_publishable_...`)

`config.js`를 열어 넣습니다.

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://프로젝트주소.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_여기에키"
};
```

**Secret key(`sb_secret_...`)는 절대로 넣지 마세요.**

DOTT와 같은 Supabase 프로젝트를 쓰므로 Project URL은 같아도 괜찮습니다. 어워즈 웹페이지는 `awards_*` 테이블만 사용합니다.

## 5. GitHub Pages에 어워즈 사이트 별도 배포
DOTT repository를 수정할 필요 없습니다.

1. GitHub에 새 repository 생성: 예) `dopamin-awards`
2. 이 폴더 안의 파일을 repository 최상단에 업로드
3. `Settings` > `Pages`
4. `Deploy from a branch`
5. `main` / `/(root)` 선택 후 Save

## 6. 실제 테스트
1. 새 GitHub Pages 주소로 접속
2. 테스트 이름으로 투표 1건 제출
3. 우측 상단 `관리자`
4. PIN `0924`
5. 결과에 방금 투표가 뜨는지 확인
6. 질문 하나 수정 후 공개 페이지 새로고침 → 변경 반영 확인
7. 관리자 설정에서 테스트 투표 내역 삭제

## 중요
- DOTT와 어워즈는 **사이트 주소/코드는 별개**, **Supabase 프로젝트만 공유**합니다.
- `awards_*` 테이블만 만지므로 DOTT 일정/공지/게임 목록 데이터와 섞이지 않습니다.
- 같은 Supabase Auth를 공유하므로 Authentication > Users에는 어워즈 관리자 계정이 추가됩니다. 기존 사용자 계정은 건드리지 않습니다.
