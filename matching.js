/* ============================================================
   matching.js
   - 선물 추천 알고리즘(점수 계산), 메시지 문구 생성, 결과 화면
     렌더링(카드 HTML 조립 + 복사/피드백 버튼 이벤트)을 담당.
   - 이 파일의 함수들은 전역 state(app.js)와 GIFTS/BUDGETS 등
     데이터(data.js)를 그대로 참조하므로 항상 그 두 파일보다
     늦게 로드되어야 한다.
   ============================================================ */

/* ============ 매칭 엔진 ============
   전체 GIFTS 각각에 대해 현재 설문 상태(state)와 얼마나 잘 맞는지
   점수를 매기고, 그 점수로 정렬해 상위 RESULT_COUNT개를 추천한다. */

// 결과 화면에 보여줄 추천 개수. 여기 숫자만 바꾸면 전체 로직(정렬/fallback/렌더링)에 그대로 반영됨.
const RESULT_COUNT = 5;

/**
 * 선물 1개에 대한 매칭 점수를 계산
 * @param {object} item - GIFTS 배열의 원소 하나
 * @returns {number} 점수. 회피 태그에 걸리면 -Infinity(즉시 탈락)
 *
 * 점수 배점:
 *  - 관계(relations) 일치        : +3
 *  - 스타일(styles) 일치         : +3
 *  - 나이대 트렌드(ageBoost) 일치 : +2
 *  - 예산 구간 겹침               : +3
 *  - 예산 구간을 벗어나지만 근접(1.5만원 이내) : +1
 *  - 예산 구간을 크게 벗어남       : -6 (사실상 탈락에 가까움)
 *  - 마지막에 0~0.6 사이 랜덤값을 더해 동점 시 순서가 매번 살짝 바뀌게 함
 *
 * 법적/정책적 제외 규칙(사용자의 회피 선택과 무관하게 항상 적용):
 *  - 받는 사람이 10대인 경우, item.alcohol === true 인 선물은 무조건 제외
 */
function scoreItem(item){
  // 회피 카테고리에 걸리면 무조건 제외
  if(state.avoid.some(a=>item.tags.includes(a))) return -Infinity;

  // 미성년자(10대) 보호: 주류는 avoid 선택 여부와 상관없이 항상 배제
  if(state.age === '10대' && item.alcohol) return -Infinity;

  let score = 0;
  if(item.relations.includes(state.relation)) score += 3;
  if(item.styles.includes(state.style)) score += 3;
  if(item.ageBoost && item.ageBoost.includes(state.age)) score += 2;

  // 예산 구간(BUDGETS)과 선물 가격 범위(item.min~max)가 겹치는지 검사
  const b = BUDGETS.find(x=>x.k===state.budget);
  if(item.min<=b.hi && item.max>=b.lo){
    // 두 구간이 겹치는 경우 (완전 일치 or 부분 겹침)
    score += 3;
  } else{
    // 겹치지 않는 경우, 얼마나 벗어났는지(gap) 계산해서 완충 점수 부여
    const gap = item.min>b.hi ? item.min-b.hi : b.lo-item.max;
    score += gap<=15000 ? 1 : -6;
  }

  // 동점 방지용 미세 랜덤 지터
  score += Math.random()*0.6;
  return score;
}

/* ============ 메시지 생성 ============
   선물 카드에 함께 보여줄 "선물과 함께 건넬 말 한마디"를 만든다.
   TAG_CONTEXTS[태그][톤] 문구 풀에서 랜덤으로 하나를 뽑고,
   앞에 받는 사람 이름을 자연스러운 호칭으로 붙여준다. */

/**
 * 선물 이름과 태그를 바탕으로 카드 메시지 문구를 생성
 * @param {string} itemName - 선물 이름 (예: "카페 · 디저트 기프티콘")
 * @param {string|undefined} tag - GIFTS 아이템의 tags[0] (태그가 없는 선물도 있음)
 * @returns {string} "이름아, ~~~" 형태의 완성된 메시지 문구
 */
function buildMessage(itemName, tag) {
  const name = state.name;
  let tone = state.tone || '다정하게';

  // '솔직하게'라는 톤 값이 과거 버전이나 다른 곳에서 넘어올 경우를 대비한 안전장치
  // (현재 TONES에는 '솔직하게'가 없지만, 방어적으로 '담백하게'로 매핑)
  if (tone === '솔직하게') tone = '담백하게';

  // ---- 태그 예외 처리 매핑 ----
  // GIFTS 중 일부는 tags 배열이 비어있거나(예: 손편지, 캐릭터 인형) TAG_CONTEXTS에
  // 없는 태그일 수 있다. 이럴 땐 선물 이름의 키워드를 보고 가장 비슷한 톤의
  // 문구 카테고리로 대체 매핑해준다. 아래에도 안 걸리면 '상품권' 문구로 폴백.
  let validTag = tag;
  if (!validTag || !TAG_CONTEXTS[validTag]) {
    if (itemName.includes('향') || itemName.includes('초')) validTag = '향';
    else if (itemName.includes('꽃') || itemName.includes('편지')) validTag = '홈';
    else if (itemName.includes('인형') || itemName.includes('키링')) validTag = '액세서리';
    else if (itemName.includes('카메라') || itemName.includes('필름')) validTag = '디지털';
    else validTag = '상품권';
  }

  // 케이크/디저트류는 tags에 '상품권'이 먼저 잡혀 있어도 식품 멘트가 더 자연스러우므로 강제 override
  if (itemName.includes('케이크') || itemName.includes('디저트')) {
    validTag = '식품주류';
  }

  // 태그 → 톤별 문구 배열에서 랜덤으로 하나 선택
  const tagData = TAG_CONTEXTS[validTag] || TAG_CONTEXTS['상품권'];
  const messages = tagData[tone] || tagData['다정하게'];
  const hookText = messages[Math.floor(Math.random() * messages.length)];

  // -------------------------------------------------------------
  // ✨ 한국어 호칭(받침 유무) 자연스럽게 만들기
  //    이름 마지막 글자에 받침이 있으면 "-아", 없으면 "-야"를 붙인다
  //    (예: "지민" → 받침 없음 → "지민아" / "민수" → 받침 있음 → "민수야")
  //    * 한글 유니코드는 0xAC00('가')부터 시작해 초성-중성-종성 순으로
  //      28개 종성 패턴이 반복되므로, (문자코드 - 0xAC00) % 28 값이
  //      0이면 받침 없음, 0보다 크면 받침 있음이 된다.
  // -------------------------------------------------------------
  let prefix = '';
  if (name) {
    // 마지막 글자의 받침(종성) 유무 확인
    const lastChar = name.charCodeAt(name.length - 1);
    const hasBatchim = (lastChar - 0xAC00) % 28 > 0;

    if (tone === '장난스럽게' || tone === '다정하게') {
      // 받침 있으면 '아', 없으면 '야' (예: 지민아 / 민수야)
      const call = hasBatchim ? '아' : '야';
      prefix = `${name}${call}, `;
    } else if (tone === '격식있게') {
      prefix = `${name} 님, `;
    } else {
      // 담백하게
      prefix = `${name}, `;
    }
  }

  return `${prefix}${hookText}`;
}

/**
 * 가격 숫자를 "1.5만원" 같은 한국식 표기로 변환
 * @param {number} min - 최소 가격(원)
 * @param {number} max - 최대 가격(원)
 * @returns {string} "1.5만원 ~ 3만원" 형태의 가격대 문자열
 */
function formatPrice(min,max){
  // 1만원 이상이면 만원 단위로, 딱 떨어지지 않으면 소수점 1자리까지 표시
  const f = n => n>=10000 ? (n/10000).toFixed(n%10000===0?0:1)+'만원' : n.toLocaleString()+'원';
  return `${f(min)} ~ ${f(max)}`;
}

/* ============ 결과 계산 + 렌더링 ============
   1) 전체 GIFTS에 점수를 매겨 정렬
   2) (회피/미성년자 필터가 너무 빡빡해서) RESULT_COUNT개가 안 채워지면 fallback으로 채움
   3) 상위 RESULT_COUNT개를 카드 HTML로 조립해 #resultList에 삽입
   4) 카드마다 "멘트 복사" / "구매처 보기" / "피드백(👍😐👎)" 이벤트 연결
   5) 피드백 카운터를 Supabase 또는 세션 변수에서 불러와 표시 */

/**
 * 현재 state를 기준으로 추천 RESULT_COUNT개를 계산하고 결과 화면(#resultList)에 렌더링
 * 부수효과: DOM을 직접 수정하고, 복사/피드백 버튼에 이벤트 리스너를 붙인다
 */
function computeResults(){
  // 1) 전체 선물에 점수를 매기고, 회피 태그로 탈락(-Infinity)한 항목은 제거 후 점수 내림차순 정렬
  let scored = GIFTS.map(g=>({item:g, score:scoreItem(g)}))
    .filter(x=>x.score > -Infinity)
    .sort((a,b)=>b.score-a.score);

  // 2) fallback: avoid 조건이 너무 빡빡해 RESULT_COUNT개가 안 채워지면, 회피 목록/미성년자 규칙을
  // 지키는 선에서 나머지(관계/스타일 매칭 우선)로 채워 항상 RESULT_COUNT개를 보여준다.
  if(scored.length < RESULT_COUNT){
    const already = new Set(scored.map(x=>x.item.name));
    const filler = GIFTS
      .filter(g => !already.has(g.name)
        && !state.avoid.some(a=>g.tags.includes(a))
        && !(state.age === '10대' && g.alcohol)) // fallback 채움에서도 미성년자 주류 제외 규칙은 그대로 유지
      .map(g=>({item:g, score:(g.relations.includes(state.relation)?1:0)+(g.styles.includes(state.style)?1:0)+Math.random()*0.3}))
      .sort((a,b)=>b.score-a.score);
    scored = scored.concat(filler);
  }

  // 3) 최종 상위 RESULT_COUNT개 선정
  const top = scored.slice(0,RESULT_COUNT);
  const relLabel = RELATION_LABEL[state.relation];
  const styLabel = STYLE_LABEL[state.style];
  const ageLabel = AGE_LABEL[state.age];

  // 4) 카드 HTML 조립
  //    (구 버전에는 여기서 score를 %로 환산한 "궁합 지수" 배지/바를 함께 그렸으나,
  //     제품 결정으로 삭제함. score는 여전히 정렬/필터링에만 내부적으로 쓰인다.)
  const html = top.map(({item,score}, idx)=>{
    const tag = item.tags[0];
    const msg = buildMessage(item.name, tag);
    const ageNote = (item.ageBoost && item.ageBoost.includes(state.age))
      ? ` 요즘 ${ageLabel} 사이에서도 반응이 좋은 편이에요.`
      : '';
    const reason = `${relLabel}에 부담 없이 건네기 좋고, '${styLabel}' 취향에도 잘 맞아요.${ageNote}`;
    const buyUrlNaver = 'https://search.shopping.naver.com/search/all?query=' + encodeURIComponent(item.name);
    const buyUrlCoupang = 'https://www.coupang.com/np/search?q=' + encodeURIComponent(item.name);
    return `
    <div class="giftcard" data-idx="${idx}">
      <div class="gc-top">
        <div>
          <span class="gc-ic">${item.ic}</span>
          <div class="gc-name">${item.name}</div>
          <div class="gc-price">${formatPrice(item.min,item.max)}</div>
        </div>
      </div>
      <div class="gc-reason">${reason}</div>
      <div class="msg-box">${msg}</div>
      <div class="gc-actions">
        <button class="mini-btn copy" data-msg="${encodeURIComponent(msg)}">✂️ 멘트 복사</button>
        <a class="mini-btn buy" href="${buyUrlCoupang}" target="_blank" rel="noopener">🛒 쿠팡</a>
        <a class="mini-btn buy-alt" href="${buyUrlNaver}" target="_blank" rel="noopener">🔎 네이버</a>
      </div>
      <div class="fp-row" data-name="${item.name}">
        <button class="mini-btn fp" data-reaction="good">👍 좋았어요</button>
        <button class="mini-btn fp" data-reaction="ok">😐 무난했어요</button>
        <button class="mini-btn fp" data-reaction="bad">👎 별로였어요</button>
      </div>
    </div>`;
  }).join('');

  document.getElementById('resultList').innerHTML = html || `<p class="sub">조건에 맞는 선물을 찾지 못했어요. 조건을 조금 넓혀보세요.</p>`;

  // 5) "멘트 복사" 버튼: 클립보드 API 우선 사용, 실패 시(구형 브라우저 등) textarea+execCommand로 폴백
  document.querySelectorAll('.mini-btn.copy').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const text = decodeURIComponent(btn.dataset.msg);
      try{
        await navigator.clipboard.writeText(text);
      }catch(e){
        const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      btn.textContent = '✔ 복사 완료'; btn.classList.add('copied');
      setTimeout(()=>{ btn.textContent='✂️ 멘트 복사'; btn.classList.remove('copied'); }, 1600);
    });
  });

  // 6) 피드백 카운터 초기 표시: 실제 백엔드가 있으면 Supabase에서, 없으면 세션 변수(feedbackCount)로
  const counterEl = document.getElementById('fpCounter');
  if(backendReady){
    counterEl.textContent = '후기 집계 불러오는 중…';
    fetchFeedbackCount().then(n=>{
      counterEl.textContent = n===null
        ? '후기 저장 준비 중이에요'
        : `지금까지 쌓인 실제 후기 · ${n}건`;
    });
  } else {
    counterEl.textContent = `이 세션에서 남긴 후기 · ${feedbackCount}건 (데모 모드)`;
  }

  // 7) 카드별 피드백(👍/😐/👎) 버튼 클릭 처리
  //    - 같은 카드 안에서 하나를 누르면 나머지 버튼은 비활성화(중복 클릭 방지)
  //    - backendReady면 Supabase에 저장 후 최신 카운트를 다시 불러와 표시
  //    - 아니면 세션 변수(feedbackCount)만 증가시켜 데모용으로 표시
  document.querySelectorAll('.fp-row').forEach(row=>{
    row.querySelectorAll('.mini-btn.fp').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        row.querySelectorAll('.mini-btn.fp').forEach(b=>{ b.classList.remove('sel'); b.disabled=true; });
        btn.classList.add('sel');
        const itemName = row.dataset.name;
        const reaction = btn.dataset.reaction;

        if(backendReady){
          const ok = await saveFeedbackToBackend(itemName, reaction);
          if(ok){
            const n = await fetchFeedbackCount();
            counterEl.textContent = n===null ? '저장했어요 ✓' : `지금까지 쌓인 실제 후기 · ${n}건`;
          } else {
            counterEl.textContent = '저장에 실패했어요 (연결 확인 필요)';
          }
        } else {
          feedbackCount++;
          counterEl.textContent = `이 세션에서 남긴 후기 · ${feedbackCount}건 (데모 모드)`;
        }
      });
    });
  });
}