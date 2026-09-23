const cfg = window.APP_CONFIG || {};
const SUPABASE_KEY = cfg.SUPABASE_PUBLISHABLE_KEY || cfg.SUPABASE_ANON_KEY;
const isConfigured = Boolean(
  cfg.SUPABASE_URL && SUPABASE_KEY &&
  !String(cfg.SUPABASE_URL).includes('YOUR_') &&
  !String(SUPABASE_KEY).includes('YOUR_')
);
const sb = isConfigured ? supabase.createClient(cfg.SUPABASE_URL, SUPABASE_KEY) : null;

const ADMIN_AUTH_EMAIL = 'dopamin.admin@example.com';
const ADMIN_PASSWORD_PREFIX = 'Dopamin!';
const DEFAULT_QUESTIONS = [
  { award_name: '천사 그 잡채상 😇', title: '가장 친절한 사람은?', sort_order: 1, is_active: true },
  { award_name: '웃음버튼상 😂', title: '가장 웃긴 사람은?', sort_order: 2, is_active: true },
  { award_name: '올해의 인간 비타민상 ✨', title: '올해 가장 기억에 남는 사람은?', sort_order: 3, is_active: true }
];

const $ = (id) => document.getElementById(id);
const els = {
  voteView: $('voteView'), adminLoginView: $('adminLoginView'), adminView: $('adminView'), ceremonyView: $('ceremonyView'),
  voteForm: $('voteForm'), voterName: $('voterName'), submitBtn: $('submitBtn'), repeatRuleNotice: $('repeatRuleNotice'),
  adminEntry: $('adminEntry'), adminPin: $('adminPin'), loginBtn: $('loginBtn'), backToVoteBtn: $('backToVoteBtn'),
  goVoteBtn: $('goVoteBtn'), logoutBtn: $('logoutBtn'), ceremonyBtn: $('ceremonyBtn'),
  newAwardName: $('newAwardName'), newQuestion: $('newQuestion'), addQuestionBtn: $('addQuestionBtn'), questionList: $('questionList'),
  memberBulkInput: $('memberBulkInput'), saveMembersBtn: $('saveMembersBtn'),
  memberPreviewList: $('memberPreviewList'), memberCountBadge: $('memberCountBadge'), memberCountText: $('memberCountText'),
  resultsList: $('resultsList'), toast: $('toast'), closedNotice: $('closedNotice'), voteContent: $('voteContent'),
  voteCountBadge: $('voteCountBadge'), toggleVotingBtn: $('toggleVotingBtn'), toggleRepeatBtn: $('toggleRepeatBtn'),
  resetVotesBtn: $('resetVotesBtn'), resetAllBtn: $('resetAllBtn'),
  ceremonyBackBtn: $('ceremonyBackBtn'), ceremonyProgress: $('ceremonyProgress'), ceremonyIntro: $('ceremonyIntro'),
  startCeremonyBtn: $('startCeremonyBtn'), ceremonyAwardContent: $('ceremonyAwardContent'), ceremonyNav: $('ceremonyNav'),
  ceremonyAwardName: $('ceremonyAwardName'), ceremonyQuestion: $('ceremonyQuestion'), winnerBox: $('winnerBox'),
  ceremonyWinner: $('ceremonyWinner'), ceremonyVotes: $('ceremonyVotes'), revealWinnerBtn: $('revealWinnerBtn'),
  prevAwardBtn: $('prevAwardBtn'), nextAwardBtn: $('nextAwardBtn')
};

let publicQuestions = [];
let publicMembers = [];
let settings = { voting_open: true, allow_repeat_nominee: true };
let adminQuestions = [];
let adminMembers = [];
let adminSubmissions = [];
let adminAnswers = [];
let ceremonyIndex = 0;
let ceremonyRevealed = false;
let ceremonyIntroMode = true;
let routeToken = 0;

function escapeHtml(str = '') {
  return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function normalizeName(str = '') {
  return String(str).trim().toLocaleLowerCase('ko-KR').replace(/\s+/g, '');
}
function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove('show'), 2400);
}
function showOnly(view) {
  [els.voteView, els.adminLoginView, els.adminView, els.ceremonyView].forEach(v => v.classList.add('hidden'));
  view.classList.remove('hidden');
  window.scrollTo(0, 0);
}
function goTo(section = '') {
  const hash = section ? `#${section}` : '';
  if (location.hash !== hash) location.hash = hash;
  else route();
}
function setBusy(button, busy, busyText, normalText) {
  button.disabled = busy;
  if (busyText && normalText) button.textContent = busy ? busyText : normalText;
}
function requireConfigured() {
  if (sb) return true;
  showToast('Supabase 연결이 아직 안 되어 있어요. config.js를 확인해주세요.');
  return false;
}
function memberMapFrom(list) {
  const map = new Map();
  list.forEach(member => map.set(normalizeName(member.name), member.name));
  return map;
}
function canonicalMemberName(input, list) {
  return memberMapFrom(list).get(normalizeName(input)) || '';
}
function closeAutocompleteMenus(except = null) {
  document.querySelectorAll('.autocomplete-menu').forEach(menu => {
    if (menu !== except) menu.classList.add('hidden');
  });
}

function ensureAutocompleteMenu(input) {
  const wrap = input.closest('.autocomplete-wrap') || input.parentElement;
  let menu = wrap.querySelector('.autocomplete-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.className = 'autocomplete-menu hidden';
    wrap.appendChild(menu);
  }
  return menu;
}

function bindMemberAutocomplete(input) {
  if (!input || input.dataset.autocompleteBound === '1') return;
  input.dataset.autocompleteBound = '1';
  const menu = ensureAutocompleteMenu(input);

  const renderMatches = () => {
    const q = normalizeName(input.value);
    if (!q) {
      menu.innerHTML = '';
      menu.classList.add('hidden');
      return;
    }
    const matches = publicMembers
      .filter(member => normalizeName(member.name).includes(q))
      .slice(0, 6);

    if (!matches.length) {
      menu.innerHTML = '<div class="autocomplete-empty">일치하는 회원이 없어요.</div>';
      menu.classList.remove('hidden');
      return;
    }

    menu.innerHTML = matches.map(member => `<button type="button" class="autocomplete-option" data-name="${escapeHtml(member.name)}">${escapeHtml(member.name)}</button>`).join('');
    menu.classList.remove('hidden');
    menu.querySelectorAll('.autocomplete-option').forEach(btn => {
      btn.addEventListener('mousedown', e => {
        e.preventDefault();
        input.value = btn.dataset.name;
        menu.classList.add('hidden');
      });
    });
  };

  input.addEventListener('input', renderMatches);
  input.addEventListener('focus', () => {
    closeAutocompleteMenus(menu);
    if (input.value.trim()) renderMatches();
  });
  input.addEventListener('blur', () => setTimeout(() => menu.classList.add('hidden'), 120));
}

function bindAllMemberAutocompletes() {
  bindMemberAutocomplete(els.voterName);
  document.querySelectorAll('.answer-input').forEach(bindMemberAutocomplete);
}


async function loadPublicData() {
  if (!requireConfigured()) {
    publicQuestions = [];
    publicMembers = [];
    renderVote();
    return false;
  }
  const [settingsRes, questionsRes, membersRes] = await Promise.all([
    sb.from('awards_settings').select('voting_open,allow_repeat_nominee').eq('id', 1).single(),
    sb.from('awards_questions').select('id,award_name,title,sort_order,is_active').eq('is_active', true).order('sort_order', { ascending: true }),
    sb.from('awards_members').select('id,name,sort_order,is_active').eq('is_active', true).order('sort_order', { ascending: true }).order('name', { ascending: true })
  ]);
  if (settingsRes.error || questionsRes.error || membersRes.error) {
    console.error(settingsRes.error || questionsRes.error || membersRes.error);
    showToast('투표 정보를 불러오지 못했어요.');
    return false;
  }
  settings = settingsRes.data || settings;
  publicQuestions = questionsRes.data || [];
  publicMembers = membersRes.data || [];
  renderVote();
  return true;
}

function renderVote() {
  els.closedNotice.classList.toggle('hidden', settings.voting_open);
  els.voteContent.classList.toggle('hidden', !settings.voting_open);
  els.repeatRuleNotice.classList.toggle('hidden', settings.allow_repeat_nominee);
  els.voteForm.innerHTML = '';

  if (!publicQuestions.length) {
    els.voteForm.innerHTML = '<div class="card empty">등록된 질문이 아직 없어요.</div>';
    els.submitBtn.disabled = true;
    return;
  }
  if (!publicMembers.length) {
    els.voteForm.innerHTML = '<div class="card empty">등록된 회원 명단이 아직 없어요. 관리자 페이지에서 회원 명단을 먼저 저장해주세요.</div>';
    els.submitBtn.disabled = true;
    return;
  }

  els.submitBtn.disabled = false;
  publicQuestions.forEach((q, i) => {
    const block = document.createElement('section');
    block.className = 'card question-card';
    block.innerHTML = `
      <div class="question-topline">
        <div class="q-number">${i + 1}</div>
        <div class="award-chip">${escapeHtml(q.award_name)}</div>
      </div>
      <h3>${escapeHtml(q.title)}</h3>
      <div class="autocomplete-wrap"><input class="input answer-input" data-question-id="${q.id}" type="text" maxlength="30" placeholder="이름을 입력하세요. (예: 홍길동 / 성을 포함한 전체 이름)" autocomplete="off" spellcheck="false" /><div class="autocomplete-menu hidden"></div></div>`;
    els.voteForm.appendChild(block);
  });
  bindAllMemberAutocompletes();
}

async function submitVote() {
  if (!requireConfigured()) return;
  if (!settings.voting_open) return showToast('현재 투표가 마감되어 있어요.');
  if (!publicMembers.length) return showToast('등록된 회원 명단이 없어요. 관리자에게 먼저 등록을 요청해주세요.');

  const voterInput = els.voterName.value.trim();
  if (!voterInput) return showToast('먼저 내 이름을 입력해주세요.');
  const voter = canonicalMemberName(voterInput, publicMembers);
  if (!voter) return showToast('내 이름은 등록된 회원 이름으로 정확히 입력해주세요.');

  const inputs = [...document.querySelectorAll('.answer-input')];
  if (!inputs.length) return showToast('등록된 질문이 없어요.');

  const answers = [];
  for (const input of inputs) {
    const raw = input.value.trim();
    if (!raw) return showToast('모든 질문에 이름을 입력해주세요.');
    const canonical = canonicalMemberName(raw, publicMembers);
    if (!canonical) return showToast('후보 이름은 등록된 회원 이름으로만 입력할 수 있어요.');
    answers.push({ question_id: input.dataset.questionId, answer_name: canonical });
  }

  if (!settings.allow_repeat_nominee) {
    const names = answers.map(a => normalizeName(a.answer_name));
    if (new Set(names).size !== names.length) return showToast('이번 투표는 같은 사람에게 여러 상을 줄 수 없어요.');
  }

  setBusy(els.submitBtn, true, '제출 중...', '투표 제출하기');
  const { error } = await sb.rpc('submit_awards_vote', { p_voter_name: voter, p_answers: answers });
  setBusy(els.submitBtn, false, '제출 중...', '투표 제출하기');
  if (error) {
    console.error(error);
    const m = String(error.message || '');
    if (m.includes('DUPLICATE_VOTER')) return showToast('이미 투표한 이름이에요.');
    if (m.includes('VOTING_CLOSED')) { await loadPublicData(); return showToast('투표가 마감되었어요.'); }
    if (m.includes('REPEAT_NOMINEE_NOT_ALLOWED')) return showToast('같은 사람에게 여러 상을 줄 수 없어요.');
    if (m.includes('INVALID_VOTER_NAME') || m.includes('INVALID_ANSWER_NAME') || m.includes('UNKNOWN_MEMBER')) return showToast('등록된 회원 이름만 사용할 수 있어요.');
    if (m.includes('ANSWER_COUNT_MISMATCH') || m.includes('INVALID_QUESTION')) { await loadPublicData(); return showToast('질문이 변경됐어요. 다시 확인해서 제출해주세요.'); }
    return showToast('제출 중 오류가 발생했어요.');
  }
  els.voterName.value = '';
  inputs.forEach(i => i.value = '');
  showToast('투표 완료! 신년회에서 결과 공개 🎉');
}

async function getAdminSession() {
  if (!sb) return false;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return false;
  const { data, error } = await sb.from('awards_admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (error || !data) {
    await sb.auth.signOut();
    return false;
  }
  return true;
}

async function login() {
  if (!requireConfigured()) return;
  const pin = els.adminPin.value.replace(/\D/g, '').slice(0, 4);
  els.adminPin.value = pin;
  if (pin.length !== 4) return showToast('4자리 숫자를 입력해주세요.');
  setBusy(els.loginBtn, true, '확인 중...', '관리자 로그인');
  const { error } = await sb.auth.signInWithPassword({
    email: ADMIN_AUTH_EMAIL,
    password: `${ADMIN_PASSWORD_PREFIX}${pin}`
  });
  if (error) {
    setBusy(els.loginBtn, false, '확인 중...', '관리자 로그인');
    els.adminPin.value = '';
    els.adminPin.focus();
    return showToast('관리자 비밀번호가 맞지 않아요.');
  }
  const ok = await getAdminSession();
  setBusy(els.loginBtn, false, '확인 중...', '관리자 로그인');
  if (!ok) return showToast('관리자 권한이 등록되지 않았어요.');
  els.adminPin.value = '';
  goTo('admin');
}

async function loadAdminData() {
  if (!requireConfigured()) return false;
  const [qRes, sRes, memberRes, subRes, aRes] = await Promise.all([
    sb.from('awards_questions').select('*').order('sort_order', { ascending: true }),
    sb.from('awards_settings').select('voting_open,allow_repeat_nominee').eq('id', 1).single(),
    sb.from('awards_members').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true }),
    sb.from('awards_submissions').select('id,voter_name,created_at').order('created_at', { ascending: true }),
    sb.from('awards_answers').select('submission_id,question_id,answer_name,created_at')
  ]);
  const err = qRes.error || sRes.error || memberRes.error || subRes.error || aRes.error;
  if (err) {
    console.error(err);
    showToast('관리자 데이터를 불러오지 못했어요.');
    return false;
  }
  adminQuestions = qRes.data || [];
  settings = sRes.data || settings;
  adminMembers = memberRes.data || [];
  adminSubmissions = subRes.data || [];
  adminAnswers = aRes.data || [];
  renderAdmin();
  return true;
}

function renderAdmin() {
  els.voteCountBadge.textContent = adminSubmissions.length;
  els.memberCountBadge.textContent = adminMembers.length;
  els.memberCountText.textContent = `${adminMembers.length}명`;
  if (els.memberBulkInput) els.memberBulkInput.value = adminMembers.map(m => m.name).join('\n');
  els.toggleVotingBtn.textContent = settings.voting_open ? '투표 마감하기' : '투표 다시 열기';
  els.toggleVotingBtn.className = settings.voting_open ? 'danger small' : 'primary small';
  els.toggleRepeatBtn.textContent = settings.allow_repeat_nominee ? '현재: 허용' : '현재: 금지';
  els.toggleRepeatBtn.className = settings.allow_repeat_nominee ? 'ghost small' : 'primary small';
  renderQuestionList();
  renderMemberPreview();
  renderResults();
}

function renderQuestionList() {
  els.questionList.innerHTML = '';
  if (!adminQuestions.length) {
    els.questionList.innerHTML = '<div class="empty">질문이 없어요. 위에서 하나 추가해보세요.</div>';
    return;
  }
  adminQuestions.forEach((q, index) => {
    const row = document.createElement('div');
    row.className = `admin-item ${q.is_active ? '' : 'inactive'}`;
    row.innerHTML = `
      <div class="order-controls">
        <button class="icon-btn" data-action="up" title="위로" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button class="icon-btn" data-action="down" title="아래로" ${index === adminQuestions.length - 1 ? 'disabled' : ''}>↓</button>
      </div>
      <div class="question-edit stacked-edit">
        <input class="input award-name-input" data-role="awardName" value="${escapeHtml(q.award_name)}" maxlength="40" aria-label="상 이름" />
        <input class="input" data-role="title" value="${escapeHtml(q.title)}" maxlength="100" aria-label="질문" />
        <span class="status-pill ${q.is_active ? 'on' : 'off'}">${q.is_active ? '노출중' : '숨김'}</span>
      </div>
      <div class="item-actions">
        <button class="ghost" data-action="save">저장</button>
        <button class="ghost" data-action="toggle">${q.is_active ? '숨기기' : '노출'}</button>
        <button class="danger" data-action="delete">삭제</button>
      </div>`;

    row.querySelector('[data-action="save"]').onclick = async () => {
      const award_name = row.querySelector('[data-role="awardName"]').value.trim();
      const title = row.querySelector('[data-role="title"]').value.trim();
      if (!award_name || !title) return showToast('상 이름과 질문을 모두 입력해주세요.');
      const { error } = await sb.from('awards_questions').update({ award_name, title, updated_at: new Date().toISOString() }).eq('id', q.id);
      if (error) { console.error(error); return showToast('저장하지 못했어요.'); }
      await loadAdminData();
      showToast('시상 항목을 저장했어요.');
    };
    row.querySelector('[data-action="toggle"]').onclick = async () => {
      const { error } = await sb.from('awards_questions').update({ is_active: !q.is_active, updated_at: new Date().toISOString() }).eq('id', q.id);
      if (error) { console.error(error); return showToast('변경하지 못했어요.'); }
      await loadAdminData();
      showToast(q.is_active ? '질문을 숨겼어요.' : '질문을 노출했어요.');
    };
    row.querySelector('[data-action="delete"]').onclick = async () => {
      if (!confirm('이 시상 항목을 삭제할까요? 해당 질문의 기존 응답도 함께 삭제됩니다.')) return;
      const { error } = await sb.from('awards_questions').delete().eq('id', q.id);
      if (error) { console.error(error); return showToast('삭제하지 못했어요.'); }
      await loadAdminData();
      showToast('시상 항목을 삭제했어요.');
    };
    row.querySelector('[data-action="up"]').onclick = () => moveQuestion(q.id, -1);
    row.querySelector('[data-action="down"]').onclick = () => moveQuestion(q.id, 1);
    els.questionList.appendChild(row);
  });
}

function renderMemberPreview() {
  els.memberPreviewList.innerHTML = '';
  if (!adminMembers.length) {
    els.memberPreviewList.innerHTML = '<div class="member-empty">아직 등록된 회원이 없어요.</div>';
    return;
  }
  adminMembers.forEach(member => {
    const chip = document.createElement('span');
    chip.className = 'member-chip';
    chip.textContent = member.name;
    els.memberPreviewList.appendChild(chip);
  });
}

async function saveMembers() {
  const raw = els.memberBulkInput.value || '';
  const pieces = raw.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
  const unique = [];
  const seen = new Set();

  for (const name of pieces) {
    const normalized = normalizeName(name);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(name.replace(/\s+/g, ''));
  }

  if (!unique.length) return showToast('회원 이름을 한 명 이상 입력해주세요.');
  if (!confirm(`회원 명단을 ${unique.length}명으로 저장할까요? 기존 명단은 새 명단으로 교체됩니다.`)) return;

  setBusy(els.saveMembersBtn, true, '저장 중...', '명단 저장');
  const delRes = await sb.from('awards_members').delete().gte('id', 0);
  if (delRes.error) {
    console.error(delRes.error);
    setBusy(els.saveMembersBtn, false, '저장 중...', '명단 저장');
    return showToast('기존 명단을 지우지 못했어요.');
  }

  const rows = unique.map((name, index) => ({ name, sort_order: index + 1, is_active: true }));
  const insRes = await sb.from('awards_members').insert(rows);
  setBusy(els.saveMembersBtn, false, '저장 중...', '명단 저장');
  if (insRes.error) {
    console.error(insRes.error);
    return showToast('회원 명단을 저장하지 못했어요.');
  }
  await loadAdminData();
  showToast(`회원 명단 ${unique.length}명을 저장했어요.`);
}

async function moveQuestion(id, dir) {
  const index = adminQuestions.findIndex(q => q.id === id);
  const next = index + dir;
  if (index < 0 || next < 0 || next >= adminQuestions.length) return;
  const a = adminQuestions[index];
  const b = adminQuestions[next];
  const aOrder = a.sort_order;
  const bOrder = b.sort_order;
  const r1 = await sb.from('awards_questions').update({ sort_order: bOrder, updated_at: new Date().toISOString() }).eq('id', a.id);
  const r2 = await sb.from('awards_questions').update({ sort_order: aOrder, updated_at: new Date().toISOString() }).eq('id', b.id);
  if (r1.error || r2.error) { console.error(r1.error || r2.error); return showToast('순서를 바꾸지 못했어요.'); }
  await loadAdminData();
}

async function addQuestion() {
  const award_name = els.newAwardName.value.trim();
  const title = els.newQuestion.value.trim();
  if (!award_name || !title) return showToast('상 이름과 질문을 모두 입력해주세요.');
  const maxOrder = adminQuestions.length ? Math.max(...adminQuestions.map(q => Number(q.sort_order) || 0)) : 0;
  const { error } = await sb.from('awards_questions').insert({ award_name, title, sort_order: maxOrder + 1, is_active: true });
  if (error) { console.error(error); return showToast('새 상을 추가하지 못했어요.'); }
  els.newAwardName.value = '';
  els.newQuestion.value = '';
  await loadAdminData();
  showToast('새 상을 추가했어요.');
}

function questionResponses(questionId) {
  const voters = new Map(adminSubmissions.map(s => [s.id, s]));
  return adminAnswers
    .filter(a => a.question_id === questionId)
    .map(a => ({ voter: voters.get(a.submission_id)?.voter_name || '알 수 없음', answer: a.answer_name.trim(), createdAt: a.created_at }));
}
function rankedResponses(responses) {
  const grouped = new Map();
  responses.forEach(r => {
    const key = normalizeName(r.answer);
    if (!grouped.has(key)) grouped.set(key, { name: r.answer, count: 0 });
    grouped.get(key).count += 1;
  });
  return [...grouped.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
}
function renderResults() {
  els.resultsList.innerHTML = '';
  if (!adminQuestions.length) {
    els.resultsList.innerHTML = '<div class="empty">등록된 질문이 없어요.</div>';
    return;
  }
  adminQuestions.forEach(q => {
    const responses = questionResponses(q.id);
    const sorted = rankedResponses(responses);
    const topCount = sorted[0]?.count || 0;
    const block = document.createElement('div');
    block.className = 'result-block';
    block.innerHTML = `
      <div class="result-title-row">
        <div><div class="result-award-name">${escapeHtml(q.award_name)}</div><h3>${escapeHtml(q.title)}</h3></div>
        <span>${responses.length}명 응답</span>
      </div>
      <div class="result-table">${sorted.length ? sorted.map(item => `<div class="result-row ${item.count === topCount ? 'winner' : ''}"><div class="result-name">${item.count === topCount ? '🏆 ' : ''}${escapeHtml(item.name)}</div><div class="result-count">${item.count}표</div></div>`).join('') : '<div class="empty">아직 응답이 없어요.</div>'}</div>
      ${responses.length ? `<details class="responses"><summary>개별 응답 보기</summary>${responses.map(r => `<div class="response-row"><span>${escapeHtml(r.voter)}</span><strong>${escapeHtml(r.answer)}</strong></div>`).join('')}</details>` : ''}`;
    els.resultsList.appendChild(block);
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('hidden', panel.id !== tabId));
}

async function updateSetting(field, value, message) {
  const payload = { [field]: value, updated_at: new Date().toISOString() };
  const { error } = await sb.from('awards_settings').update(payload).eq('id', 1);
  if (error) { console.error(error); return showToast('설정을 변경하지 못했어요.'); }
  await loadAdminData();
  showToast(message);
}

async function resetVotes() {
  if (!confirm('지금까지의 투표 내역을 전부 삭제할까요? 이 작업은 되돌릴 수 없어요.')) return;
  const { error } = await sb.from('awards_submissions').delete().gte('created_at', '1970-01-01T00:00:00Z');
  if (error) { console.error(error); return showToast('투표 내역을 삭제하지 못했어요.'); }
  await loadAdminData();
  showToast('투표 내역을 모두 삭제했어요.');
}

async function resetAll() {
  if (!confirm('질문, 설정, 투표를 모두 기본 상태로 되돌릴까요? 회원 명단은 유지됩니다. 이 작업은 되돌릴 수 없어요.')) return;
  const subDel = await sb.from('awards_submissions').delete().gte('created_at', '1970-01-01T00:00:00Z');
  if (subDel.error) { console.error(subDel.error); return showToast('초기화 중 오류가 발생했어요.'); }
  const qDel = await sb.from('awards_questions').delete().gte('created_at', '1970-01-01T00:00:00Z');
  if (qDel.error) { console.error(qDel.error); return showToast('초기화 중 오류가 발생했어요.'); }
  const qIns = await sb.from('awards_questions').insert(DEFAULT_QUESTIONS);
  if (qIns.error) { console.error(qIns.error); return showToast('기본 질문을 복원하지 못했어요.'); }
  const sUpd = await sb.from('awards_settings').update({ voting_open: true, allow_repeat_nominee: true, updated_at: new Date().toISOString() }).eq('id', 1);
  if (sUpd.error) { console.error(sUpd.error); return showToast('설정 초기화에 실패했어요.'); }
  await loadAdminData();
  showToast('질문, 설정, 투표를 기본 상태로 초기화했어요.');
}

function renderCeremony() {
  if (ceremonyIntroMode) {
    els.ceremonyIntro.classList.remove('hidden');
    els.ceremonyAwardContent.classList.add('hidden');
    els.ceremonyNav.classList.add('hidden');
    els.ceremonyProgress.textContent = '';
    return;
  }

  els.ceremonyIntro.classList.add('hidden');
  els.ceremonyAwardContent.classList.remove('hidden');
  els.ceremonyNav.classList.remove('hidden');

  const questions = adminQuestions.filter(q => q.is_active);
  if (!questions.length) {
    els.ceremonyProgress.textContent = '0 / 0';
    els.ceremonyAwardName.textContent = '등록된 상이 없어요';
    els.ceremonyQuestion.textContent = '관리자 페이지에서 시상 항목을 추가해주세요.';
    els.ceremonyWinner.textContent = '—';
    els.ceremonyVotes.textContent = '';
    els.revealWinnerBtn.disabled = true;
    els.prevAwardBtn.disabled = true;
    els.nextAwardBtn.disabled = true;
    return;
  }
  ceremonyIndex = Math.max(0, Math.min(ceremonyIndex, questions.length - 1));
  const q = questions[ceremonyIndex];
  const ranked = rankedResponses(questionResponses(q.id));
  const topCount = ranked[0]?.count || 0;
  const winners = ranked.filter(item => item.count === topCount && topCount > 0);

  els.ceremonyProgress.textContent = `${ceremonyIndex + 1} / ${questions.length}`;
  els.ceremonyAwardName.textContent = q.award_name;
  els.ceremonyQuestion.textContent = q.title;
  els.prevAwardBtn.disabled = ceremonyIndex === 0;
  els.nextAwardBtn.disabled = ceremonyIndex === questions.length - 1;
  els.revealWinnerBtn.disabled = false;

  if (!ceremonyRevealed) {
    els.winnerBox.classList.add('locked');
    els.ceremonyWinner.textContent = '?';
    els.ceremonyVotes.textContent = '결과를 공개해주세요';
    els.revealWinnerBtn.textContent = '✨ 수상자 공개';
    return;
  }
  els.winnerBox.classList.remove('locked');
  if (!winners.length) {
    els.ceremonyWinner.textContent = '아직 투표 없음';
    els.ceremonyVotes.textContent = '응답이 들어오면 여기서 공개돼요';
  } else {
    els.ceremonyWinner.textContent = winners.map(w => w.name).join(' · ');
    els.ceremonyVotes.textContent = winners.length > 1 ? `공동 수상 · ${topCount}표` : `${topCount}표`;
  }
  els.revealWinnerBtn.textContent = '🎉 공개 완료';
}
function moveCeremony(dir) {
  const questions = adminQuestions.filter(q => q.is_active);
  ceremonyIndex = Math.max(0, Math.min(ceremonyIndex + dir, questions.length - 1));
  ceremonyRevealed = false;
  renderCeremony();
}

async function route() {
  const myToken = ++routeToken;
  const hash = location.hash;
  if (hash === '#admin' || hash === '#ceremony') {
    if (!requireConfigured()) {
      showOnly(els.adminLoginView);
      return;
    }
    const ok = await getAdminSession();
    if (myToken !== routeToken) return;
    if (!ok) {
      showOnly(els.adminLoginView);
      setTimeout(() => els.adminPin.focus(), 50);
      return;
    }
    const loaded = await loadAdminData();
    if (!loaded || myToken !== routeToken) return;
    if (hash === '#ceremony') {
      showOnly(els.ceremonyView);
      renderCeremony();
    } else {
      showOnly(els.adminView);
    }
    return;
  }
  showOnly(els.voteView);
  await loadPublicData();
}

els.submitBtn.onclick = submitVote;
els.adminEntry.onclick = () => goTo('admin');
els.backToVoteBtn.onclick = () => goTo('');
els.goVoteBtn.onclick = () => goTo('');
els.loginBtn.onclick = login;
els.adminPin.addEventListener('input', e => e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4));
els.adminPin.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
els.logoutBtn.onclick = async () => { if (sb) await sb.auth.signOut(); goTo(''); showToast('로그아웃했어요.'); };
els.addQuestionBtn.onclick = addQuestion;
els.newQuestion.addEventListener('keydown', e => { if (e.key === 'Enter') addQuestion(); });
els.newAwardName.addEventListener('keydown', e => { if (e.key === 'Enter') els.newQuestion.focus(); });
els.saveMembersBtn.onclick = saveMembers;
els.toggleVotingBtn.onclick = () => updateSetting('voting_open', !settings.voting_open, settings.voting_open ? '투표를 마감했어요.' : '투표를 다시 열었어요.');
els.toggleRepeatBtn.onclick = () => updateSetting('allow_repeat_nominee', !settings.allow_repeat_nominee, settings.allow_repeat_nominee ? '한 사람 몰아주기를 금지했어요.' : '한 사람 몰아주기를 허용했어요.');
els.resetVotesBtn.onclick = resetVotes;
els.resetAllBtn.onclick = resetAll;
els.ceremonyBtn.onclick = async () => { ceremonyIndex = 0; ceremonyRevealed = false; ceremonyIntroMode = true; goTo('ceremony'); };
els.ceremonyBackBtn.onclick = () => goTo('admin');
els.startCeremonyBtn.onclick = () => { ceremonyIntroMode = false; ceremonyIndex = 0; ceremonyRevealed = false; renderCeremony(); };
els.revealWinnerBtn.onclick = () => { ceremonyRevealed = true; renderCeremony(); };
els.prevAwardBtn.onclick = () => moveCeremony(-1);
els.nextAwardBtn.onclick = () => moveCeremony(1);
document.querySelectorAll('.tab').forEach(btn => btn.onclick = () => switchTab(btn.dataset.tab));
document.addEventListener('click', e => { if (!e.target.closest('.autocomplete-wrap')) closeAutocompleteMenus(); });
window.addEventListener('hashchange', route);
route();
