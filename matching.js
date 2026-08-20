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

  // 예산 밖이면 감점이 아니라 탈락시킨다.
  // 구버전은 item.min <= b.hi 를 썼기 때문에, '1만원 이하'(hi=10000)를 골라도
  // 10000~30000원짜리가 "겹친다"고 판정돼 만점을 받고 1위로 올라오는 버그가 있었다.
  const b = BUDGETS.find(x=>x.k===state.budget);
  const ov = budgetOverlap(item, b);
  if(ov <= 0) return -Infinity;

  // 관계는 가점이 아니라 필터다.
  // 가점(+3)으로만 두면 관계에 맞지 않는 선물도 후보에 남아, 관계를 바꿔도
  // 결과의 절반 이상이 그대로였다. 직장 상사에게 다트보드가 뜨던 것도 같은 이유.
  if(!item.relations.includes(state.relation)) return -Infinity;

  let score = 3; // 관계 통과 기본점

  if(item.styles.includes(state.style)) score += 3;

  // 나이대는 +2로는 예산(+5)·취향(+3)에 묻혀 사실상 무시됐다.
  // 맞으면 크게 주고, 안 맞으면 감점해서 실제로 순위가 갈리게 한다.
  const ageOk = item.ageBoost && item.ageBoost.includes(state.age);
  score += ageOk ? AGE_BONUS : AGE_PENALTY;

  // 예산 적합도(0~5점):
  //  (1) 겹치는 구간이 그 선물의 가격 범위를 얼마나 차지하는지 → 예산 안에서 살 수 있는 확률
  //  (2) 사용자가 고른 예산 구간을 얼마나 채우는지          → 예산을 알차게 쓰는지
  const itemSpan   = Math.max(item.max - item.min, 1);
  const budgetSpan = Math.max(b.hi - b.lo, 1);
  const fit = (Math.min(ov / itemSpan, 1) * 0.5) + (Math.min(ov / budgetSpan, 1) * 0.5);
  score += fit * 5;

  // 동점 방지용 미세 랜덤 지터
  score += Math.random()*0.6;
  return score;
}

// 나이대 배점. 값을 키우면 나이 선택이 결과를 더 크게 바꾸지만,
// 너무 키우면 예산 점수와 충돌해 오히려 변별력이 떨어진다(실측 기준 4/-2가 최적).
const AGE_BONUS = 4;
const AGE_PENALTY = -2;

/** 선물 가격대와 예산 구간이 실제로 겹치는 폭(원). 0 이하면 예산 밖이라는 뜻 */
function budgetOverlap(item, b){
  if(!b) return 1; // 예산 미선택 상태에서는 필터링하지 않음
  return Math.min(item.max, b.hi) - Math.max(item.min, b.lo);
}

/** 카드에 표시할 가격을 "예산 안에서 실제로 지불하게 될 범위"로 잘라준다.
 *  예) 5,000~15,000원짜리를 '1만원 이하'로 조회 → "5,000원 ~ 1만원" */
function budgetClippedPrice(item, b){
  if(!b) return formatPrice(item.min, item.max);
  const lo = Math.max(item.min, b.lo);
  const hi = Math.min(item.max, b.hi);
  if(hi <= lo) return formatPrice(item.min, item.max);
  return formatPrice(lo, hi);
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
// 이 관계를 고르면 반말 문구가 자동으로 존댓말로 바뀐다.
// 동생·조카처럼 손아래 가족에게 보낼 때는 아래에서 'family'를 빼면 된다.
const HONORIFIC_RELATIONS = ['family','boss'];

// 이름 뒤에 '아/야'를 붙이면 어색해지는 호칭들
const NO_VOCATIVE_SUFFIX = ['님','씨','쌤','선생','부장','과장','팀장','대리','사장',
                            '엄마','아빠','어머니','아버지','할머니','할아버지',
                            '이모','고모','삼촌','언니','오빠','누나','형'];

/**
 * 반말 문구를 해요체로 바꾼다.
 * TAG_CONTEXTS의 다정하게/담백하게/장난스럽게 문구가 전부 반말로만 작성돼 있어서,
 * 가족·직장 상대에게도 "골라봤어", "잘 키워라" 같은 반말이 그대로 나가던 문제를 보정한다.
 */
function toPolite(t){
  // 어간 끝 글자가 받침 없이 ㅏ/ㅐ/ㅓ/ㅔ/ㅕ/ㅖ/ㅘ/ㅙ/ㅝ/ㅞ로 끝나면
  // "~라"(해라체)를 "~요"(해요체)로 바꿔도 자연스럽다.
  // 예) 써라→써요, 키워라→키워요, 챙겨라→챙겨요, 해라→해요, 봐라→봐요
  const OPEN_VOWELS = [0,1,4,5,6,7,9,10,14,15];
  const haeraToHaeyo = (m, ch) => {
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return m;
    const jong = code % 28;
    const jung = Math.floor(code / 28) % 21;
    return (jong === 0 && OPEN_VOWELS.includes(jung)) ? ch + '요' : m;
  };

  return t
    // 2인칭 반말 대명사 제거 (윗사람에게 "너한테", "네 마음에"는 어색)
    .replace(/너한테\s*/g, '')
    .replace(/너의\s*/g, '')
    .replace(/네가(?![가-힣])/g, '')
    .replace(/네\s(?=[가-힣])/g, '')
    .replace(/너\s(?=[가-힣])/g, '')
    // 아래 일반 규칙보다 먼저 처리해야 하는 예외 ("마요", "더요", "바요" 방지)
    .replace(/마라(?![가-힣])/g, '마세요')
    .replace(/더라(?![가-힣])/g, '더라고요')
    .replace(/바라(?![가-힣])/g, '바라요')
    .replace(/가길(?![가-힣])/g, '가시길 바라요')
    // 해체 종결어미 → 해요체
    // (?![가-힣]) = 뒤에 한글이 안 오는 자리(문장 끝).
    //               " :)" "ㅋㅋ" "🪴" 같은 꼬리가 붙어 있어도 어미를 제대로 잡는다.
    .replace(/(했|줬|봤|샀|왔|갔|났|뒀|썼|랐|았|었|겼|졌|녔)어(?![가-힣])/g, '$1어요')
    .replace(/좋겠(?:어|다)(?![가-힣])/g, '좋겠어요')
    .replace(/거야(?![가-힣])/g, '거예요')
    .replace(/같아서(?![가-힣])/g, '같았어요')
    .replace(/같아(?![가-힣])/g, '같아요')
    .replace(/축하해(?![가-힣])/g, '축하드려요')
    .replace(/보냈어(?![가-힣])/g, '보냈어요')
    .replace(/보내(?![가-힣])/g, '보내요')
    .replace(/쐈다(?![가-힣])/g, '준비했어요')
    // 해라체·청유형(장난스럽게 문구) → 해요체
    .replace(/하자(?![가-힣])/g, '해요')
    .replace(/되자(?![가-힣])/g, '돼요')
    .replace(/살자(?![가-힣])/g, '살아요')
    .replace(/붙자(?![가-힣])/g, '붙어요')
    .replace(/지내자(?![가-힣])/g, '지내요')
    .replace(/보자(?![가-힣])/g, '보세요')
    .replace(/한다(?![가-힣])/g, '해요')
    .replace(/이다(?![가-힣])/g, '이에요')
    .replace(/아니다(?![가-힣])/g, '아니에요')
    .replace(/사준다(?![가-힣])/g, '사드려요')
    .replace(/바뀐다(?![가-힣])/g, '바뀌어요')
    .replace(/샀다(?![가-힣])/g, '샀어요')
    .replace(/구나(?![가-힣])/g, '네요')
    .replace(/(겠네|는데|겠는데)(?![가-힣])/g, '$1요')
    .replace(/아니야\?/g, '아니겠어요?')
    .replace(/아니지\?/g, '아니겠죠?')
    .replace(/알지\?/g, '아시죠?')
    .replace(/가즈아(?![가-힣])/g, '가시죠')
    .replace(/([가-힣])라(?![가-힣])/g, haeraToHaeyo)
    // 명령형 반말 → 존댓말
    .replace(/써줘/g, '써주세요')
    .replace(/활용해줘/g, '활용해주세요')
    .replace(/써봐(?![가-힣])/g, '써보세요')
    .replace(/키워봐(?![가-힣])/g, '키워보세요')
    .replace(/챙겨(?![가-힣])/g, '챙기세요')
    .replace(/때\s써(?![가-힣])/g, '때 쓰세요')
    .replace(/잘\s써(?![가-힣])/g, '잘 쓰세요')
    .replace(/골라(?![가-힣])/g, '고르세요')
    .replace(/먹어(?![가-힣])/g, '드세요')
    .replace(/(듯|같아)(?=[ㅋㅎ!?. ]*$)/g, '$1해요')
    .replace(/해(?![가-힣])/g, '해요')
    // 대명사를 지우면서 생긴 이중 공백 정리
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * 선물 이름과 태그를 바탕으로 카드 메시지 문구를 생성
 * @param {string} itemName - 선물 이름
 * @param {string|undefined} tag - GIFTS 아이템의 tags[0]
 * @returns {string} "이름아, ~~~" 형태의 완성된 메시지 문구
 */
function buildMessage(itemName, tag) {
  const name = state.name;
  let tone = state.tone || '다정하게';
  if (tone === '솔직하게') tone = '담백하게';

  // index.html STEP 5의 '말투'(#speechRow) 선택값을 우선 사용한다.
  // 라벨이 '존댓말'/'높임말'/'polite' 중 무엇이든 인식되도록 느슨하게 검사하고,
  // 값이 없으면 관계로 자동 판정한다.
  const sp = String(state.speech || '');
  const polite = /존댓|높임|polite|formal/i.test(sp) ? true
               : /반말|casual|informal/i.test(sp)   ? false
               : HONORIFIC_RELATIONS.includes(state.relation);

  // TAG_CONTEXTS에 없는 태그이거나 tags가 비어 있으면 이름 키워드로 대체 매핑
  let validTag = tag;
  if (!validTag || !TAG_CONTEXTS[validTag]) {
    if (itemName.includes('향') || itemName.includes('초')) validTag = '향';
    else if (itemName.includes('꽃') || itemName.includes('편지')) validTag = '기념';
    else if (itemName.includes('인형') || itemName.includes('키링')) validTag = '취미';
    else if (itemName.includes('카메라') || itemName.includes('필름')) validTag = '취미';
    else validTag = '상품권';
  }
  if (itemName.includes('케이크') || itemName.includes('디저트')) validTag = '식품주류';

  const tagData = TAG_CONTEXTS[validTag] || TAG_CONTEXTS['상품권'];
  const messages = tagData[tone] || tagData['다정하게'];
  let hookText = messages[Math.floor(Math.random() * messages.length)];

  // '격식있게' 문구는 이미 존댓말이므로 건드리지 않는다
  if (polite && tone !== '격식있게') hookText = toPolite(hookText);

  // 한국어 호칭 붙이기
  //  - 받침 있으면 "-아", 없으면 "-야" (지민아 / 민수야)
  //  - 한글이 아니거나(Mike) 이미 호칭인 경우(팀장님, 엄마)는 붙이지 않는다
  //    구버전은 이 검사가 없어서 "팀장님아", "엄마야"가 나왔다
  let prefix = '';
  if (name) {
    const lastChar = name.charCodeAt(name.length - 1);
    const isHangul = lastChar >= 0xAC00 && lastChar <= 0xD7A3;
    const hasBatchim = isHangul ? (lastChar - 0xAC00) % 28 > 0 : false;
    const isTitle = NO_VOCATIVE_SUFFIX.some(sfx => name.endsWith(sfx));

    if (tone === '격식있게') {
      prefix = name.endsWith('님') ? `${name}, ` : `${name} 님, `;
    } else if ((tone === '장난스럽게' || tone === '다정하게') && isHangul && !isTitle && !polite) {
      prefix = `${name}${hasBatchim ? '아' : '야'}, `;
    } else {
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
/* ============ 결과 다양성 ============
   점수 1~5위를 그대로 자르면 같은 조건에서 항상 똑같은 결과가 나오고,
   비슷한 카테고리(향/뷰티 등)가 한꺼번에 몰리기도 한다.
   → 상위 후보 풀에서 점수 비례 가중 랜덤으로 뽑되,
     같은 카테고리는 최대 MAX_PER_TAG개까지만 담는다. */

const POOL_SIZE = 16;    // 후보 풀 크기 (점수 상위 몇 개까지 추첨 대상에 넣을지)
const MAX_PER_TAG = 2;   // 한 결과 안에서 같은 카테고리 최대 개수

function pickDiverse(scored, count){
  const pool = scored.slice(0, Math.max(count, POOL_SIZE));
  if(pool.length <= count) return pool;

  // 점수 차이를 그대로 쓰면 1위가 거의 확정되므로, 최저점을 기준선으로 빼고
  // 3제곱해 "높은 점수일수록 유리하되 고정은 아닌" 분포를 만든다.
  const base = Math.min.apply(null, pool.map(x=>x.score)) - 0.5;
  const remaining = pool.slice();
  const picked = [];
  const tagCount = {};

  while(picked.length < count && remaining.length){
    const weights = remaining.map(x => Math.pow(Math.max(x.score - base, 0.1), 3));
    const total = weights.reduce((a,b)=>a+b, 0);
    let r = Math.random() * total, idx = 0;
    for(; idx < weights.length - 1; idx++){ r -= weights[idx]; if(r <= 0) break; }

    const cand = remaining.splice(idx, 1)[0];
    const tag = (cand.item.tags && cand.item.tags[0]) || '기타';
    if((tagCount[tag] || 0) >= MAX_PER_TAG) continue;  // 카테고리 쏠림 차단
    tagCount[tag] = (tagCount[tag] || 0) + 1;
    picked.push(cand);
  }

  // 카테고리 제약 때문에 개수를 못 채웠으면 남은 것에서 점수순으로 보충
  if(picked.length < count){
    const already = new Set(picked.map(x=>x.item.name));
    scored.filter(x => !already.has(x.item.name))
          .slice(0, count - picked.length)
          .forEach(x => picked.push(x));
  }

  return picked.sort((a,b) => b.score - a.score);
}

function computeResults(){
  // 1) 전체 선물에 점수를 매기고, 회피 태그로 탈락(-Infinity)한 항목은 제거 후 점수 내림차순 정렬
  let scored = GIFTS.map(g=>({item:g, score:scoreItem(g)}))
    .filter(x=>x.score > -Infinity)
    .sort((a,b)=>b.score-a.score);

  // 2) fallback: avoid 조건이 너무 빡빡해 RESULT_COUNT개가 안 채워지면, 회피 목록/미성년자 규칙을
  // 지키는 선에서 나머지(관계/스타일 매칭 우선)로 채워 항상 RESULT_COUNT개를 보여준다.
  if(scored.length < RESULT_COUNT){
    const already = new Set(scored.map(x=>x.item.name));
    const bFill = BUDGETS.find(x=>x.k===state.budget);
    const filler = GIFTS
      .filter(g => !already.has(g.name)
        && !state.avoid.some(a=>g.tags.includes(a))
        && !(state.age === '10대' && g.alcohol)) // fallback 채움에서도 미성년자 주류 제외 규칙은 그대로 유지
      .map(g=>({
        item:g,
        overBudget:true,
        gap: bFill ? Math.max(0, -budgetOverlap(g, bFill)) : 0,
        score:(g.relations.includes(state.relation)?1:0)+(g.styles.includes(state.style)?1:0)+Math.random()*0.3
      }))
      .sort((a,b)=> (a.gap-b.gap) || (b.score-a.score));
    scored = scored.concat(filler);
  }

  // 3) 최종 상위 RESULT_COUNT개 선정
  const top = pickDiverse(scored, RESULT_COUNT);
  const relLabel = RELATION_LABEL[state.relation];
  const styLabel = STYLE_LABEL[state.style];
  const ageLabel = AGE_LABEL[state.age];

  // 4) 카드 HTML 조립
  //    (구 버전에는 여기서 score를 %로 환산한 "궁합 지수" 배지/바를 함께 그렸으나,
  //     제품 결정으로 삭제함. score는 여전히 정렬/필터링에만 내부적으로 쓰인다.)
  const bNow = BUDGETS.find(x=>x.k===state.budget);
  const html = top.map(({item,score,overBudget}, idx)=>{
    const tag = item.tags[0];
    const msg = buildMessage(item.name, tag);
    const ageNote = (item.ageBoost && item.ageBoost.includes(state.age))
      ? ` 요즘 ${ageLabel} 사이에서도 반응이 좋은 편이에요.`
      : '';
    const reason = `${RELATION_PHRASE[state.relation]} 부담 없이 건네기 좋고, '${styLabel}' 취향에도 잘 맞아요.${ageNote}`;
    const buyUrlNaver = 'https://search.shopping.naver.com/search/all?query=' + encodeURIComponent(item.name);
    const buyUrlCoupang = 'https://www.coupang.com/np/search?q=' + encodeURIComponent(item.name);
    return `
    <div class="giftcard" data-idx="${idx}">
      <div class="gc-top">
        <div>
          <span class="gc-ic">${item.ic}</span>
          <div class="gc-name">${item.name}</div>
          <div class="gc-price">${overBudget ? formatPrice(item.min,item.max) : budgetClippedPrice(item,bNow)}</div>
          ${overBudget ? '<div class="gc-note">예산에 맞는 선물이 부족해 조금 벗어난 것도 함께 보여드려요</div>' : ''}
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