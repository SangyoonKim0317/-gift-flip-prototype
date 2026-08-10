/* ============================================================
   app.js
   - 앱의 "컨트롤러" 역할. 전역 상태(state)를 소유하고,
     STEP 화면 전환(goTo), 선택 카드/칩 렌더링과 클릭 이벤트,
     시작/이전/다음/다시하기 버튼 로직을 담당한다.
   - 가장 마지막에 로드되어야 하는 파일 (data.js/backend.js/matching.js가
     참조하는 state, feedbackCount, computeResults 등을 여기서 연결)
   ============================================================ */

/* ============ 상태 ============
   설문 전체에서 사용자가 고른 값들을 담는 단일 객체.
   - step   : 현재 화면 번호 (0=인트로 ~ 7=결과)
   - avoid  : 복수 선택이라 배열
   - name/tone : STEP 5의 선택 입력(비워도 진행 가능) */
const state = { step:0, relation:null, age:null, style:null, budget:null, avoid:[], name:'', tone:'다정하게' };
const totalSteps = 7; // 진행 점(dot) 표시에 사용되는 총 설문 단계 수 (STEP1~5)
let feedbackCount = 0; // 백엔드 미연결 시(데모 모드) 이 세션에서 남긴 피드백 개수

/* ============ 선택 카드 렌더링 (최초 1회) ============
   RELATIONS/AGES/STYLES 처럼 "카드형 단일 선택" UI를 그리는 공통 함수.
   BUDGETS(칩형)나 AVOIDS(다중선택 칩)는 이 함수를 쓰지 않고 아래에서 별도 처리. */

/**
 * 카드 목록을 그리고, 클릭 시 단일 선택 + state 갱신 처리
 * @param {HTMLElement} container - 카드들을 삽입할 부모 엘리먼트 (예: #relationGrid)
 * @param {Array} items - RELATIONS/AGES/STYLES 같은 데이터 배열 ({k, ic, t, d} 형태)
 * @param {string} key - 선택 결과를 저장할 state의 필드명 (예: 'relation')
 */
function renderCards(container, items, key){
  container.innerHTML = items.map(it => `
    <div class="choice-card" data-key="${it.k}" tabindex="0" role="button">
      <span class="ic">${it.ic}</span>
      <span class="t">${it.t}</span>
      <span class="d">${it.d}</span>
    </div>`).join('');
  container.querySelectorAll('.choice-card').forEach(card=>{
    card.addEventListener('click', ()=>{
      container.querySelectorAll('.choice-card').forEach(c=>c.classList.remove('sel'));
      card.classList.add('sel');
      state[key] = card.dataset.key;
      updateNextEnabled();
    });
  });
}
// STEP 1/2/3 카드 그리드를 각각 초기 렌더링
renderCards(document.getElementById('relationGrid'), RELATIONS, 'relation');
renderCards(document.getElementById('ageGrid'), AGES, 'age');
renderCards(document.getElementById('styleGrid'), STYLES, 'style');

// STEP 4: 예산 칩 (단일 선택) — 카드형이 아니라 알약(chip) 모양이라 renderCards 재사용 안 함
const budgetRow = document.getElementById('budgetRow');
budgetRow.innerHTML = BUDGETS.map(b=>`<button class="chip big" data-key="${b.k}">${b.t}</button>`).join('');
budgetRow.querySelectorAll('.chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    budgetRow.querySelectorAll('.chip').forEach(c=>c.classList.remove('sel'));
    chip.classList.add('sel');
    state.budget = chip.dataset.key;
    updateNextEnabled();
  });
});

// STEP 5-1: 회피 카테고리 칩 (다중 선택) — 클릭할 때마다 state.avoid 배열에 추가/제거 토글
const avoidRow = document.getElementById('avoidRow');
avoidRow.innerHTML = AVOIDS.map(a=>`<button class="chip" data-key="${a.k}">${a.t}</button>`).join('');
avoidRow.querySelectorAll('.chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    chip.classList.toggle('sel');
    const k = chip.dataset.key;
    if(state.avoid.includes(k)) state.avoid = state.avoid.filter(x=>x!==k);
    else state.avoid.push(k);
  });
});

// STEP 5-2: 메시지 톤 칩 (단일 선택, 기본값 '다정하게'가 처음부터 선택되어 있음)
const toneRow = document.getElementById('toneRow');
toneRow.innerHTML = TONES.map((t,i)=>`<button class="chip big${i===0?' sel':''}" data-key="${t}">${t}</button>`).join('');
toneRow.querySelectorAll('.chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    toneRow.querySelectorAll('.chip').forEach(c=>c.classList.remove('sel'));
    chip.classList.add('sel');
    state.tone = chip.dataset.key;
  });
});

// STEP 5-3: 이름/애칭 텍스트 입력 (선택 사항이라 별도 검증 없음)
document.getElementById('nameInput').addEventListener('input', e=>{ state.name = e.target.value.trim(); });

/* ============ 네비게이션 ============
   화면 전환(STEP 0~7)과 하단 이전/다음 버튼의 활성화 상태를 관리한다. */
const nextBtn = document.getElementById('nextBtn');
const backBtn = document.getElementById('backBtn');
const bottombar = document.getElementById('bottombar');

/**
 * 현재 STEP에서 "다음" 버튼을 눌러도 되는지(필수 선택을 다 했는지) 검사해 버튼 활성/비활성 처리
 * STEP 1~4는 필수 선택, STEP 5(개인화)는 전부 선택 사항이라 항상 통과
 */
function updateNextEnabled(){
  let ok = true;
  if(state.step===1) ok = !!state.relation;
  if(state.step===2) ok = !!state.age;
  if(state.step===3) ok = !!state.style;
  if(state.step===4) ok = !!state.budget;
  nextBtn.disabled = !ok;
}

/**
 * 지정한 STEP 화면으로 전환하고, 상단 진행 점(dot)·하단 버튼바 상태를 함께 갱신
 * @param {number} step - 이동할 STEP 번호 (0=인트로, 1~5=설문, 6=로딩, 7=결과)
 */
function goTo(step){
  state.step = step;
  // 해당 step의 <section data-step="N">만 보이도록 active 클래스 토글
  document.querySelectorAll('.step').forEach(s=>{
    s.classList.toggle('active', Number(s.dataset.step)===step);
  });
  // 상단 진행 점: 현재 단계는 'on'(길게 강조), 이전에 지나온 단계는 'done'(완료 색)
  document.querySelectorAll('.dot').forEach(d=>{
    const n = Number(d.dataset.d);
    d.classList.toggle('on', n===step);
    d.classList.toggle('done', n<step && step<=5);
  });
  // 진행 점은 설문 구간(STEP 1~5)에서만 보이게 함 (인트로/로딩/결과에서는 숨김)
  document.getElementById('dots').style.visibility = (step>=1 && step<=5) ? 'visible' : 'hidden';
  // 하단 이전/다음 버튼바는 인트로(0)·로딩(6)·결과(7)에서는 숨김
  bottombar.classList.toggle('hidden', step===0 || step===6 || step===7);
  // 맨 첫 설문 화면(STEP 1)에서는 '이전' 버튼을 숨김 (더 돌아갈 곳이 없으므로)
  backBtn.style.visibility = step<=1 ? 'hidden' : 'visible';
  updateNextEnabled();
  window.scrollTo(0,0);
}

// 인트로 화면의 "고민 뒤집어보기" 버튼 → STEP 1로 이동
document.getElementById('startBtn').addEventListener('click', ()=>goTo(1));

// 이전 버튼: 인트로(0)보다 앞으로는 갈 수 없으므로 step>0일 때만 동작
backBtn.addEventListener('click', ()=>{ if(state.step>0) goTo(state.step-1); });

// 다음 버튼: STEP 5(마지막 설문)에서 누르면 로딩 화면(6)을 보여준 뒤
// 1초 후 실제 매칭 계산(computeResults)을 수행하고 결과 화면(7)으로 이동.
// 그 외 단계에서는 단순히 다음 STEP으로 이동.
nextBtn.addEventListener('click', ()=>{
  if(state.step===5){
    goTo(6);
    setTimeout(()=>{ computeResults(); goTo(7); }, 1000);
  } else {
    goTo(state.step+1);
  }
});

// "처음부터 다시 해보기" 버튼: state와 모든 선택 UI를 초기값으로 리셋 후 인트로로 복귀
document.getElementById('restartBtn').addEventListener('click', ()=>{
  state.relation=null; state.age=null; state.style=null; state.budget=null; state.avoid=[]; state.name=''; state.tone='다정하게';
  feedbackCount = 0;
  document.querySelectorAll('.choice-card.sel').forEach(c=>c.classList.remove('sel'));
  budgetRow.querySelectorAll('.chip.sel').forEach(c=>c.classList.remove('sel'));
  avoidRow.querySelectorAll('.chip.sel').forEach(c=>c.classList.remove('sel'));
  toneRow.querySelectorAll('.chip').forEach((c,i)=>c.classList.toggle('sel', i===0));
  document.getElementById('nameInput').value='';
  goTo(0);
});

/* ============ 초기화 ============
   페이지 로드 시 인트로 화면(STEP 0)부터 시작.
   백엔드가 실제로 연결되어 있으면(backendReady) 결과 화면 하단 안내 문구를
   "임시 세션 저장" 문구 대신 "실제 DB 저장" 문구로 바꿔준다. */
goTo(0);
if(backendReady){
  document.getElementById('footnoteText').innerHTML =
    '* 이 프로토타입은 101개 샘플 데이터(실제 트렌드·가격대를 참고해 구성) + 연령별 트렌드 가중치로 매칭돼요. 후기는 실제 백엔드(Supabase)에 저장되어 누적됩니다.<br>실제 서비스에서는 쇼핑몰 제휴 API로 실시간 가격·재고까지 연결할 수 있어요.';
}
