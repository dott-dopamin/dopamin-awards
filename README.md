# DOPAMIN AWARDS · 공유 Supabase 최종 버전

이 버전은 새 Supabase 프로젝트를 만들지 않습니다. **기존 DOTT / jei-dashboard가 쓰는 Supabase 프로젝트 안에 어워즈 전용 `awards_*` 테이블만 추가**합니다.

## 이번 버전 핵심 변경
- 회원 명단을 **관리자 페이지에서 한 번에 붙여넣기**할 수 있습니다.
- 공개 투표 화면에서는 **등록된 회원 이름만 검색/입력**할 수 있습니다.
- 그래서 `홍길동 / 길동 / 길동이`처럼 표가 분산되는 문제를 막을 수 있습니다.

> 이전 버전을 이미 사용 중이라면, 이 폴더의 **`supabase.sql` 전체를 다시 실행**해 주세요. 기존 DOTT/jei 데이터는 건드리지 않고, `awards_members` 테이블과 최신 함수/정책만 추가·업데이트합니다.

## 절대 안 건드리는 것
`supabase.sql`은 기존 프로젝트의 다른 테이블을 수정하거나 삭제하지 않습니다. 이번 사이트가 사용하는 핵심 객체는 아래뿐입니다.

- `awards_questions`
- `awards_members`
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

## 1. 기존 Supabase 프로젝트 열기
1. Supabase Dashboard 로그인
2. 어워즈와 같이 쓸 기존 프로젝트 선택
3. 새 프로젝트는 만들지 않음

## 2. 최신 SQL 다시 실행
1. 왼쪽 `SQL Editor`
2. `New query`
3. 이 폴더의 `supabase.sql` 전체 복사
4. 붙여넣기 후 `Run`
5. `Table Editor`에서 아래 6개 확인
   - `awards_questions`
   - `awards_members`
   - `awards_submissions`
   - `awards_answers`
   - `awards_admins`
   - `awards_settings`

## 3. 어워즈 관리자 계정
이미 만들었다면 다시 만들 필요 없습니다. 없으면 아래처럼 생성하세요.

1. `Authentication` > `Users`
2. 새 사용자 추가
3. Email: `dopamin.admin@example.com`
4. Password: `Dopamin!0924`
5. 이메일 확인 상태로 생성
6. 생성된 사용자의 UUID(User ID)를 복사

그 다음 SQL Editor에서 아래 실행:

```sql
insert into public.awards_admins(user_id)
values ('여기에_복사한_UUID')
on conflict do nothing;
```

## 4. config.js 연결
이미 연결 완료본을 쓰고 있으면 이 단계는 건너뛰어도 됩니다.

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://프로젝트주소.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_여기에키"
};
```

**Secret key(`sb_secret_...`)는 절대 넣지 마세요.**

## 5. 회원 명단 등록
1. 관리자 로그인 (`0924`)
2. `회원 명단` 탭 이동
3. 이름을 한 줄에 한 명씩 붙여넣기
4. `명단 저장`

예시:

```text
홍길동
김철수
이영희
남궁민수
```

저장 후에는 공개 투표 페이지에서 **등록된 회원 이름만** 투표자 이름 / 답변 이름으로 사용할 수 있습니다.

## 6. 배포
1. GitHub repository 생성 또는 기존 어워즈 저장소 사용
2. 이 폴더 안 파일들로 덮어쓰기 업로드
3. GitHub Pages 유지

## 7. 최종 테스트
1. 공개 페이지 접속
2. 테스트 투표 1건 제출
3. 관리자 로그인
4. 결과 확인
5. 시상식 화면 확인
6. 테스트 투표 초기화

## 중요
- 사이트 주소와 코드는 DOTT와 **별도**입니다.
- Supabase 프로젝트만 **공유**합니다.
- 회원 명단은 `awards_members` 테이블에만 저장되며, 기존 다른 프로젝트 데이터와 섞이지 않습니다.
