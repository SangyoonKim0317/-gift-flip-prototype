/* ============================================================
   matching.js (가격대 및 검색 연동 보완버전)
   ============================================================ */

const RESULT_COUNT = 5;

/**
 * 예산 매칭 점수 계산
 */
function budgetScore(item, b){
  if (!b) return 0;
  const overlapLo = Math.max(item.min || 0, b.lo);
  const overlapHi = Math.min(item.max || 0, b.hi);
  const overlap = overlapHi - overlapLo;

  if(overlap > 0){
    const itemRange = Math.max((item.max || 0) - (item.min || 0), 1);
    const ratio = Math.min(1, overlap / itemRange);
    return ratio * 5; // 예산 가중치를 기존 3에서 5로 올려 가격대 정확도 대폭 상승!
  }

  // 예산 범위를 완전히 벗어난 경우 강하게 감점 (-10)
  const gap = item.min > b.hi ? item.min - b.hi : b.lo - item.max;
  return gap <= 10000 ? -2 : -10;
}

/**
 * 현재 state.budget 문구로부터 BUDGETS 객체 안전하게 찾기
 */
function getCurrentBudgetObj() {
  if (typeof BUDGETS === 'undefined') return null;
  // 1) 정확한 키 매칭 시도
  let b = BUDGETS.find(x => x.k === state.budget || x.label === state.budget);
  if (b) return b;

  // 2) 매칭 실패 시 숫자만 추출해서 범위 검색 (예: "5~10만원", "5만~10만")
  if (typeof state.budget === 'string') {
    const nums = state.budget.match(/\d+/g);
    if (nums && nums.length >= 1) {
      const lo = parseInt(nums[0]) * 10000;
      const hi = nums.length >= 2 ? parseInt(nums[1]) * 10000 : 99999999;
      return { lo, hi };
    }
  }
  return null;
}

/**
 * 선물 1개 점수 매기기
 */
function scoreItem(item){
  if(state.avoid && state.avoid.some(a => item.tags && item.tags.includes(a))) return -Infinity;
  if(state.age === '10대' && item.alcohol) return -Infinity;

  let score = 0;
  if(item.relations && item.relations.includes(state.relation)) score += 3;
  if(item.styles && item.styles.includes(state.style)) score += 3;
  if(item.ageBoost && item.ageBoost.includes(state.age)) score += 2;

  const b = getCurrentBudgetObj();
  score += budgetScore(item, b);

  score += Math.random() * 0.4;
  return score;
}

/**
 * 선물 메시지(멘트) 조립
 * - 톤(state.tone)과 존댓말/반말(state.speech) 두 축으로 TAG_CONTEXTS에서 문구를 뽑는다.
 * - relation이 'boss'(직장 상사·어려운 동료)이면, STEP 5에서 사용자가 뭘 골랐든
 *   무조건 '존댓말'을 사용하도록 여기서 한 번 더 강제한다.
 *   (app.js의 updateSpeechConstraint()가 UI 단에서도 막아주지만,
 *    데이터/상태가 꼬이는 예외 상황에 대비해 메시지 생성 시점에도 이중으로 방어)
 */
function buildMessage(itemName, tag) {
  const name = state.name;
  let tone = state.tone || '다정하게';
  if (tone === '솔직하게') tone = '담백하게';

  let speech = state.speech || '반말';
  if (state.relation === 'boss') speech = '존댓말';

  let validTag = tag;
  if (!validTag || !TAG_CONTEXTS[validTag]) {
    if (itemName.includes('향') || itemName.includes('초')) validTag = '향';
    else if (itemName.includes('꽃') || itemName.includes('편지')) validTag = '홈';
    else if (itemName.includes('인형') || itemName.includes('키링')) validTag = '액세서리';
    else if (itemName.includes('카메라') || itemName.includes('필름')) validTag = '디지털';
    else validTag = '상품권';
  }

  if (itemName.includes('케이크') || itemName.includes('디저트')) validTag = '식품주류';

// 수정된 코드
const tagData = TAG_CONTEXTS[validTag] || TAG_CONTEXTS['상품권'];
const toneData = tagData[tone] || tagData['다정하게'];

// 1) 사용자가 선택한 speech(반말)가 없으면 -> 존댓말 -> 반말 순으로 안전하게 찾아옵니다.
let messages = toneData[speech];
if (!messages || messages.length === 0) {
  messages = toneData['존댓말'] || toneData['반말'] || [];
}
  const hookText = messages[Math.floor(Math.random() * messages.length)];

  let prefix = '';
  if (name) {
    const lastChar = name.charCodeAt(name.length - 1);
    const isHangul = lastChar >= 0xAC00 && lastChar <= 0xD7A3;
    const hasBatchim = isHangul ? (lastChar - 0xAC00) % 28 > 0 : false;

    if (speech === '존댓말') {
      // 존댓말일 때는 톤과 무관하게 항상 정중한 호칭("~님,")을 붙임
      prefix = `${name} 님, `;
    } else if (tone === '장난스럽게' || tone === '다정하게') {
      const call = isHangul ? (hasBatchim ? '아' : '야') : '';
      prefix = `${name}${call}, `;
    } else {
      prefix = `${name}, `;
    }
  }

  return `${prefix}${hookText}`;
}

function formatPrice(min, max){
  const f = n => n>=10000 ? (n/10000).toFixed(n%10000===0?0:1)+'만원' : (n || 0).toLocaleString()+'원';
  return `${f(min)} ~ ${f(max)}`;
}

function computeResults(){
  let scored = GIFTS.map(g=>({item:g, score:scoreItem(g)}))
    .filter(x=>x.score > -Infinity)
    .sort((a,b)=>b.score-a.score);

  if(scored.length < RESULT_COUNT){
    const already = new Set(scored.map(x=>x.item.name));
    const b = getCurrentBudgetObj();
    const filler = GIFTS
      .filter(g => !already.has(g.name)
        && !(state.avoid && state.avoid.some(a => g.tags && g.tags.includes(a)))
        && !(state.age === '10대' && g.alcohol))
      .map(g=>({
        item:g,
        score:(g.relations && g.relations.includes(state.relation)?1:0)
          + (g.styles && g.styles.includes(state.style)?1:0)
          + budgetScore(g,b)
      }))
      .sort((a,b)=>b.score-a.score);
    scored = scored.concat(filler);
  }

  const top = scored.slice(0, RESULT_COUNT);
  const relLabel = (typeof RELATION_LABEL !== 'undefined' && RELATION_LABEL[state.relation]) || '';
  const styLabel = (typeof STYLE_LABEL !== 'undefined' && STYLE_LABEL[state.style]) || '';
  const ageLabel = (typeof AGE_LABEL !== 'undefined' && AGE_LABEL[state.age]) || '';

  const html = top.map(({item}, idx)=>{
    const tag = (item.tags && item.tags.length > 0) ? item.tags[0] : undefined;
    const msg = buildMessage(item.name, tag);
    const ageNote = (item.ageBoost && item.ageBoost.includes(state.age))
      ? ` 요즘 ${ageLabel} 사이에서도 반응이 좋은 편이에요.`
      : '';
    const reason = `${relLabel}에 부담 없이 건네기 좋고, '${styLabel}' 취향에도 잘 맞아요.${ageNote}`;
    
    // 네이버 쇼핑 키워드에 예산 가격대 추가 (가격 튐 방지)
    const b = getCurrentBudgetObj();
    const priceHint = b && b.lo ? ` ${Math.round(b.lo/10000)}만원대` : '';
    // ✅ 수정 코드:
// state.budget 문구(예: '5~10만원')에 맞춰 네이버 가격 필터(minPrice, maxPrice) 추가
let minP = '', maxP = '';
const bKey = state.budget || '';

if (bKey.includes('1만원 이하') || bKey === '0-10000') { maxP = '10000'; }
else if (bKey.includes('1~3만원') || bKey === '10000-30000') { minP = '10000'; maxP = '30000'; }
else if (bKey.includes('3~5만원') || bKey === '30000-50000') { minP = '30000'; maxP = '50000'; }
else if (bKey.includes('5~10만원') || bKey === '50000-100000') { minP = '50000'; maxP = '100000'; }
else if (bKey.includes('10만원 이상') || bKey === '100000-300000') { minP = '100000'; }

let buyUrl = 'https://search.shopping.naver.com/search/all?query=' + encodeURIComponent(item.name);
if (minP) buyUrl += `&minPrice=${minP}`;
if (maxP) buyUrl += `&maxPrice=${maxP}`;

    return `
    <div class="giftcard" data-idx="${idx}">
      <div class="gc-top">
        <div>
          <span class="gc-ic">${item.ic || '🎁'}</span>
          <div class="gc-name">${item.name}</div>
          <div class="gc-price">${formatPrice(item.min, item.max)}</div>
        </div>
      </div>
      <div class="gc-reason">${reason}</div>
      <div class="msg-box">${msg}</div>
      <div class="gc-actions">
        <button class="mini-btn copy" data-msg="${encodeURIComponent(msg)}">✂️ 멘트 복사</button>
        <a class="mini-btn buy" href="${buyUrl}" target="_blank" rel="noopener">🔎 구매처 보기</a>
      </div>
      <div class="fp-row" data-name="${item.name}">
        <button class="mini-btn fp" data-reaction="good">👍 좋았어요</button>
        <button class="mini-btn fp" data-reaction="ok">😐 무난했어요</button>
        <button class="mini-btn fp" data-reaction="bad">👎 별로였어요</button>
      </div>
    </div>`;
  }).join('');

  const resultListEl = document.getElementById('resultList');
  if (resultListEl) {
    resultListEl.innerHTML = html || `<p class="sub">조건에 맞는 선물을 찾지 못했어요. 조건을 조금 넓혀보세요.</p>`;
  }

  // 버튼 이벤트 연결 (기존과 동일)
  document.querySelectorAll('.mini-btn.copy').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const text = decodeURIComponent(btn.dataset.msg);
      try{ await navigator.clipboard.writeText(text); }
      catch(e){
        const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      btn.textContent = '✔ 복사 완료'; btn.classList.add('copied');
      setTimeout(()=>{ btn.textContent='✂️ 멘트 복사'; btn.classList.remove('copied'); }, 1600);
    });
  });

  const counterEl = document.getElementById('fpCounter');
  if (counterEl) {
    if(typeof backendReady !== 'undefined' && backendReady){
      counterEl.textContent = '후기 집계 불러오는 중…';
      if (typeof fetchFeedbackCount === 'function') {
        fetchFeedbackCount().then(n=>{
          counterEl.textContent = n===null ? '후기 저장 준비 중이에요' : `지금까지 쌓인 실제 후기 · ${n}건`;
        });
      }
    } else {
      const count = typeof feedbackCount !== 'undefined' ? feedbackCount : 0;
      counterEl.textContent = `이 세션에서 남긴 후기 · ${count}건 (데모 모드)`;
    }
  }

  document.querySelectorAll('.fp-row').forEach(row=>{
    row.querySelectorAll('.mini-btn.fp').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        row.querySelectorAll('.mini-btn.fp').forEach(b=>{ b.classList.remove('sel'); b.disabled=true; });
        btn.classList.add('sel');
        const itemName = row.dataset.name;
        const reaction = btn.dataset.reaction;

        if(typeof backendReady !== 'undefined' && backendReady){
          if (typeof saveFeedbackToBackend === 'function') {
            const ok = await saveFeedbackToBackend(itemName, reaction);
            if(ok && counterEl && typeof fetchFeedbackCount === 'function'){
              const n = await fetchFeedbackCount();
              counterEl.textContent = n===null ? '저장했어요 ✓' : `지금까지 쌓인 실제 후기 · ${n}건`;
            } else if (counterEl) {
              counterEl.textContent = '저장에 실패했어요 (연결 확인 필요)';
            }
          }
        } else {
          if (typeof feedbackCount !== 'undefined') feedbackCount++;
          if (counterEl) {
            const count = typeof feedbackCount !== 'undefined' ? feedbackCount : 0;
            counterEl.textContent = `이 세션에서 남긴 후기 · ${count}건 (데모 모드)`;
          }
        }
      });
    });
  });
}
