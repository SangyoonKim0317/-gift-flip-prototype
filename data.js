/* ============================================================
   data.js
   - 설문 단계별 선택지, 선물 데이터, 멘트(메시지) 데이터를 모아둔 파일
   - 이 파일은 "고정 데이터"만 담당한다. 계산 로직은 matching.js,
     화면 렌더링/상태는 app.js를 참고할 것.
   - 로드 순서: data.js → backend.js → matching.js → app.js
     (뒤의 파일들이 여기 선언된 상수를 그대로 참조하기 때문)

   ⚠️ 데이터 출처 관련 중요 안내
   GIFTS 배열의 101개 항목은 실시간 쇼핑몰 API로 가져온 데이터가 아니라,
   웹 검색으로 확인한 카드사 소비 빅데이터 리포트·선물 가이드 블로그·
   유통업계 트렌드 기사 등을 참고해 "카테고리 + 대략적 가격대"만
   가져와 손으로 구성한 샘플 데이터다. 특정 상품 링크·재고·실시간
   가격이 아니므로, 실제 서비스 전환 시에는 네이버쇼핑/쿠팡/카카오
   선물하기 등의 제휴 API로 교체해야 한다. (index.html 하단 footnote,
   결과 화면의 databox에도 이 사실이 명시되어 있음) */

/* ============ 선택지 데이터 ============ */

// STEP 1: 선물 받는 사람과의 관계
// k = 내부 식별 키 (matching.js의 scoreItem, GIFTS.relations 와 매칭)
// ic = 아이콘 이모지, t = 카드 제목, d = 카드 부제
const RELATIONS = [
  {k:'sum', ic:'🫣', t:'썸 타는 사이', d:'수위 조절이 관건'},
  {k:'sogaeting', ic:'🤝', t:'소개팅 · 첫 만남', d:'답례, 부담 없게'},
  {k:'closefriend', ic:'😄', t:'친한 친구', d:'매년 뭘 살지 고민'},
  {k:'longfriend', ic:'📱', t:'오랜만에 연락된 친구', d:'얼마나 챙길지 애매함'},
  {k:'boss', ic:'💼', t:'직장 상사 · 어려운 동료', d:'가벼워도 무거워도 곤란'},
  {k:'family', ic:'🏠', t:'가족', d:'용돈 말고 뭘 드리지'},
];
// STEP 3: 선물의 느낌/스타일 (GIFTS.styles 와 매칭)
const STYLES = [
  {k:'실용', ic:'🔧', t:'실용파', d:'꼭 필요한 걸로'},
  {k:'감성', ic:'💌', t:'감성파', d:'마음이 담긴 걸로'},
  {k:'힙함', ic:'✨', t:'힙하게', d:'트렌디하고 재밌게'},
  {k:'무난', ic:'🙂', t:'아무거나 좋아함', d:'무난한 게 최고'},
];

// STEP 4: 예산 구간
// lo/hi = 구간의 하한/상한 (matching.js의 scoreItem에서 GIFTS.min/max와 겹치는지 비교)
const BUDGETS = [
  {k:'0-10000', t:'1만원 이하', lo:0, hi:10000},
  {k:'10000-30000', t:'1~3만원', lo:10000, hi:30000},
  {k:'30000-50000', t:'3~5만원', lo:30000, hi:50000},
  {k:'50000-100000', t:'5~10만원', lo:50000, hi:100000},
  {k:'100000-300000', t:'10만원 이상', lo:100000, hi:300000},
];

// STEP 5: 피하고 싶은 카테고리 (복수 선택)
// GIFTS.tags 중 하나라도 겹치면 해당 선물은 추천에서 완전히 제외됨 (scoreItem에서 -Infinity 처리)
const AVOIDS = [
  {k:'향', t:'향 있는 제품'},
  {k:'뷰티', t:'화장품 · 뷰티'},
  {k:'액세서리', t:'액세서리'},
  {k:'디지털', t:'전자기기'},
  {k:'식품주류', t:'식품 · 주류'},
];

// STEP 2: 받는 사람의 나이대
// GIFTS.ageBoost 배열에 이 값이 포함되어 있으면 매칭 점수에 가산점(+2)을 준다
const AGES = [
  {k:'10대', ic:'🎒', t:'10대', d:'학생·용돈 감성'},
  {k:'20대', ic:'🎓', t:'20대', d:'트렌드에 민감'},
  {k:'30대', ic:'💼', t:'30대', d:'실속과 취향 사이'},
  {k:'40대', ic:'🏡', t:'40대', d:'건강·실용 선호'},
  {k:'50대 이상', ic:'🌿', t:'50대 이상', d:'품격 있는 선물 선호'},
];

// STEP 5: 선물 카드에 함께 담을 메시지의 어투
// TAG_CONTEXTS 의 각 태그별로 이 4가지 톤에 대응하는 문구 풀이 존재해야 함
const TONES = ['다정하게','담백하게','격식있게','장난스럽게'];

/* ============ 태그별 × 톤별 멘트 풀 ============
   구조: TAG_CONTEXTS[태그][톤] = 문구 배열
   - matching.js의 buildMessage()가 선물의 첫 번째 tag와 사용자가 고른 톤으로
     이 배열에서 랜덤으로 하나를 뽑아 카드 메시지를 만든다.
   - 새 태그를 추가하려면: 여기에 4개 톤(다정/담백/장난/격식) 각각
     최소 1개 이상의 문구를 채워 넣어야 buildMessage의 폴백 로직이 안전하게 동작한다. */
const TAG_CONTEXTS = {
  '뷰티': {
    '다정하게': ['너한테 잘 어울릴 것 같아서 골라봤어. 잘 써줘ㅎㅎ', '요즘 이런 거 필요할 것 같아서 골라봤어ㅎㅎ', '소소하지만 네 마음에 쏙 들었으면 좋겠어 :)'],
    '담백하게': ['매일 쓰기 무난한 걸로 골랐어.', '피부 관리할 때 쓰기 좋을 거야.', '실용적인 뷰티 아이템으로 챙겼어.'],
    '장난스럽게': ['이거 바르고 더 예뻐져라/멋있어져라ㅋㅋ', '이거 쓰고 갑자기 연예인 되는 거 아니야?ㅋㅋ', '이제 관리 좀 열심히 하자ㅋㅋ'],
    '격식있게': ['일상의 소소한 가꾸움에 도움이 되길 바랍니다.', '소소하지만 기분 좋은 선물이 되었으면 좋겠습니다.', '평소에도 유용하게 잘 사용하셨으면 좋겠습니다.']
  },
  '향': {
    '다정하게': ['좋은 향기 맡으면서 기분 전환했으면 좋겠어!', '공간이 더 은은하고 따뜻해지길 바라며 준비했어!', '향이 너무 좋아서 네 생각나서 골랐어 :)'],
    '담백하게': ['기분 전환할 때 피우거나 쓰기 좋을 거야.', '향이 무난하고 괜찮아서 골랐어.', '공간 분위기 바꿀 때 써봐.'],
    '장난스럽게': ['이제 지나갈 때마다 좋은 냄새 나겠네ㅋㅋ', '이거 쓰고 향수 뭐 쓰냐는 말 좀 들어봐라ㅋㅋ', '이거 뿌리고 향기로운 사람 좀 되어봐라ㅋㅋ'],
    '격식있게': ['은은한 향기와 함께 편안한 휴식이 되시길 바랍니다.', '좋은 향이 공간을 따뜻하게 채워주길 바랍니다.', '마음의 평안에 작은 도움이 되길 바랍니다.']
  },
  '디지털': {
    '다정하게': ['매일 요긴하게 잘 쓸 수 있을 것 같아서 골랐어!', '일상에서 자주 쓰면서 유용하게 활용해줘 :)', '네 생활에 편의를 더해줬으면 좋겠다!'],
    '담백하게': ['실용적인 걸로 골라봤어.', '유용하게 잘 쓸 것 같아서 골라봤어.', '필요할 것 같아서 준비해봤어.'],
    '장난스럽게': ['이제 이거 없이는 못 사는 거 아니야?ㅋㅋ', '이거 쓰고 현대인 되자ㅋㅋ', '편하게 살자.'],
    '격식있게': ['일상과 업무에 유용하게 쓰이길 바라는 마음으로 준비했습니다.', '편리한 일상에 작은 보탬이 되길 바랍니다.', '생활에 작은 편리함을 더해드릴 수 있으면 좋겠습니다.']
  },
  '홈': {
    '다정하게': ['집에서 편하게 쓸 것 같아서 골라봤어!', '쉴 때 유용하게 쓸 것 같아서 골라봤어ㅎㅎ', '집에서 조금이라도 더 편했으면 해서 골라봤어.'],
    '담백하게': ['집에 두고 쓰기에 제일 무난하고 편한 걸로 골랐어.', '필요할 것 같아서 하나 보냈어.', '방에 두면 좋을 것 같아서 골랐어.'],
    '장난스럽게': ['집순이/집돌이 생활에 한 걸음 더 다가가길ㅋㅋ', '집 밖으로 나오지 말고 힐링해라ㅋㅋ', '이제 약속 잡으면 이거 핑계로 거절하는 거 아니지?ㅋㅋ'],
    '격식있게': ['편안하고 아늑한 휴식 시간에 작은 보탬이 되길 바랍니다.', '늘 평안한 공간이 되시길 바라는 마음으로 올립니다.', '기분 좋은 휴식이 되시길 바랍니다.']
  },
  '식물': {
    '다정하게': ['초록초록한 기운 받아서 늘 기분 좋은 하루 보내!', '보고 있으면 괜히 기분 좋아져서 골라봤어 🪴', '네 공간에 작은 활력이 되어줬으면 해!'],
    '담백하게': ['키우기 무난하고 보기 좋은 걸로 골랐어.', '방이나 책상에 두고 키워봐.', '소소하게 힐링하기 좋을 거야.'],
    '장난스럽게': ['시들게 하지 말고 잘 키워라ㅋㅋ', '식물 보면서 눈 건강 좀 챙겨라ㅋㅋ', '죽이지 말고 오래오래 잘 키워라ㅋㅋ'],
    '격식있게': ['화사하고 가릇한 기운이 늘 함께하시길 바랍니다.', '일상에 작은 싱그러움이 되길 바라는 마음입니다.', '늘 평안하시길 진심으로 기원합니다.']
  },
  '문구': {
    '다정하게': ['매일 손에 잡히는 걸로 부담 없이 챙겨봤어!', '일하거나 공부할 때 요긴하게 쓰였으면 좋겠다 :)', '평소에 잘 쓸 것 같아서 골라봤어. 예쁘게 잘 써줘ㅎㅎ'],
    '담백하게': ['필요해 보이길래 하나 보내.', '매일 쓰기 무난한 할 것 같아 준비했어.', '실용적으로 쓰기 좋을 거야.'],
    '장난스럽게': ['계획만 세우지 말고 실천도 해라ㅋㅋ', '너의 모든 기록을 응원한다ㅋㅋ', '이거 쓰고 정답만 찍어라/계약 성공해라!'],
    '격식있게': ['소중한 생각과 기록의 순간에 요긴히 쓰이길 바랍니다.', '노고와 열정의 순간에 작은 도움이 되길 바랍니다.', '늘 좋은 성과와 결실이 함께하시길 바랍니다.']
  },
  '식품주류': {
    '다정하게': ['달달한 거 먹고 기분 풀었으면 해서 골랐어!', '맛있는 거 먹고 힐링하는 시간이 되었으면 좋겠어😋', '맛있는 거 먹고 힘내라고 보내!'],
    '담백하게': ['맛있게 먹고 기분 전환해.', '당 충전 필요할 때 먹으라고 골랐어.', '맛있게 즐기기 좋은 걸로 쐈다.'],
    '장난스럽게': ['맛있게 먹으면 0칼로리인 거 알지?', '당 충전 빡 하고 힘내라! 😋', '먹고 죽은 귀신이 깔도 좋다더라 맛있게 먹어!'],
    '격식있게': ['풍요롭고 기분 좋은 휴식 시간이 되시길 바라는 마음입니다.', '맛있게 드시고 즐거운 시간 보내셨으면 좋겠습니다.', '소중한 분들과 행복한 시간 보내시는 데 작은 즐거움이 되었으면 좋겠습니다.']
  },
  '건강': {
    '다정하게': ['다른 것보다 네 건강이 제일 먼저 생각나서 챙겼어!', '피곤할 때 챙겨 먹고/쓰고 에너지 회복해 :)', '늘 건강하고 행복했으면 좋겠다!'],
    '담백하게': ['체력 떨어지지 말고 건강 잘 챙겨.', '요즘 건강 챙기는 게 최고라 골랐어.', '몸 챙길 때 유용하게 활용해.'],
    '장난스럽게': ['골골대지 말고 이거 먹고/쓰고 만수무강해라 👍', '건강이 최고다 체력 보충해라ㅋㅋ', '이거 먹고 건강해라ㅋㅋ'],
    '격식있게': ['항상 건강하시고 활기찬 날들만 가득하시길 진심으로 기원합니다.', '신체와 마음의 평안에 작은 보탬이 되길 바랍니다.', '늘 건강함 속에서 행복하시길 바랍니다.']
  },
  '액세서리': {
    '다정하게': ['너한테 잘 어울릴 것 같아서 골라봤어ㅎㅎ.', '포인트로 예쁘게 활용해주면 좋겠다 :)', '네 분위기랑 딱일 것 같아서 준비했어!'],
    '담백하게': ['데일리로 부담 없이 차고 다니기 좋을 거야.', '스타일에 포인트 줄 때 써.', '무난하게 잘 어울릴 것 같아서 골랐어.'],
    '장난스럽게': ['잃어버리지 말고 오래오래 써라ㅋㅋ', '착샷 인증 필수인 거 알지?ㅋㅋ', '꾸밀 때 잘 쓰고 다녀라ㅋㅋ'],
    '격식있게': ['소중한 순간마다 함께할 수 있으면 좋겠습니다.', '마음에 드는 선물이 되었으면 좋겠습니다.', '일상에 작은 기쁨을 더해드리는 선물이 되었으면 좋겠습니다.']
  },
  '패션': {
    '다정하게': ['요즘 계절에 너한테 너무 잘 어울릴 것 같아!', '요즘 하고 다니면 잘 어울릴 것 같아서 골라봤어.', '보자마자 너 생각나서 골랐어 :) 잘 어울릴 것 같아서'],
    '담백하게': ['요즘 입기/착용하기 무난하고 실용적인 걸로 골랐어.', '데일리로 잘 써.', '스타일에 무난하게 잘 어울릴 거야.'],
    '장난스럽게': ['이거 입고/차고 사람답게 하고 다녀보자ㅋㅋ', '착샷 인증 바로 날려라ㅋㅋ', '잘 어울리면 내 안목 인정해줘라ㅋㅋ'],
    '격식있게': ['일상에 기분 좋은 포인트가 되었으면 좋겠습니다.', '기분 좋은 순간마다 함께할 수 있는 선물이 되었으면 좋겠습니다.', '마음에 드는 선물이 되었으면 좋겠습니다.']
  },
  '상품권': {
    '다정하게': ['갖고 싶은 거 골라서 기분 좋게 쓰라고 준비했어ㅎㅎ', '뭐가 좋을지 고민하다가 네가 원하는 걸 사는 게 좋을 것 같아서!', '필요한 거 살 때 조금이라도 도움이 되었으면 좋겠다.'],
    '담백하게': ['뭐가 좋을지 고민하다가 상품권으로 골랐어.', '필요한 거 살 때 써.', '이게 제일 실용적인 것 같아서 골랐어.'],
    '장난스럽게': ['원하는 거 골라서 시원하게 질러라ㅋㅋ', '내가 준 거니까 아낌없이 써라ㅋㅋ', '잊지말고 써라ㅋㅋ'],
    '격식있게': ['필요하신 곳에 유용하게 사용하셨으면 좋겠습니다.', '원하시는 곳에 기분 좋게 사용하시길 바랍니다.', '마음에 드는 것을 고르는 즐거움도 함께하시길 바랍니다.', '필요하신 곳에 알차게 사용하시길 바랍니다.']
  }
};

/* ============ 라벨 조회용 매핑 ============
   내부 키(k)로 화면 표시용 한글 라벨(t)을 바로 찾기 위한 매핑 객체.
   예: RELATION_LABEL['closefriend'] === '친한 친구'
   matching.js의 computeResults()에서 추천 사유 문구를 만들 때 사용됨. */
const RELATION_LABEL = Object.fromEntries(RELATIONS.map(r=>[r.k,r.t]));
const STYLE_LABEL = Object.fromEntries(STYLES.map(s=>[s.k,s.t]));
const AGE_LABEL = Object.fromEntries(AGES.map(a=>[a.k,a.t]));

/* ============ 선물 아이템 28종 ============
   각 필드 설명:
   - name      : 선물 이름 (결과 카드, 네이버 쇼핑 검색 링크, 메시지 태그 추론에 사용)
   - ic        : 카드에 표시할 아이콘 이모지
   - styles    : 이 선물과 어울리는 STYLES.k 목록 (하나라도 겹치면 +3점)
   - relations : 이 선물이 어울리는 RELATIONS.k 목록 (하나라도 겹치면 +3점)
   - min / max : 가격대 (원) — 예산 구간과 겹치는 정도로 점수 가감
   - tags      : AVOIDS.k 와 매칭되는 카테고리 태그.
                 1) 사용자가 회피 목록에서 고른 태그와 겹치면 즉시 추천에서 제외
                 2) tags[0]이 buildMessage()에서 멘트 문구 선택 기준이 됨
   - ageBoost  : 이 선물이 잘 먹히는 AGES.k 목록 (겹치면 +2점 + 결과 카드에 트렌드 문구 추가)
   - alcohol   : true인 경우 실제 주류. tags의 '식품주류'는 디저트/건강식품과 섞여 있어
                 태그만으로 걸러낼 수 없으므로, 미성년자(10대) 추천에서 무조건 배제하기
                 위한 전용 플래그. (matching.js의 scoreItem에서 검사) */
const GIFTS = [
  {name:'핸드크림 세트', ic:'🧴', styles:['감성','무난'], relations:['sum','sogaeting','closefriend','longfriend','family','boss'], min:15000, max:30000, tags:['뷰티'], ageBoost:['20대','30대','40대']},
  {name:'블루투스 이어폰', ic:'🎧', styles:['실용','힙함'], relations:['closefriend','sogaeting','sum','family'], min:30000, max:150000, tags:['디지털'], ageBoost:['10대','20대','30대']},
  {name:'향초', ic:'🕯️', styles:['감성'], relations:['closefriend','sum','longfriend','sogaeting'], min:15000, max:40000, tags:['향','홈'], ageBoost:['20대','30대']},
  {name:'감성 텀블러', ic:'🥤', styles:['실용','무난'], relations:['closefriend','sum','longfriend','family','boss','sogaeting'], min:15000, max:35000, tags:['홈'], ageBoost:['10대','20대','30대','40대']},
  {name:'손편지 + 미니 꽃다발', ic:'💐', styles:['감성'], relations:['closefriend','longfriend','family','sum'], min:5000, max:20000, tags:[], ageBoost:['10대','20대','30대','40대','50대 이상']},
  {name:'카페 · 디저트 기프티콘', ic:'🍰', styles:['무난'], relations:['closefriend','sum','longfriend','family','boss','sogaeting'], min:5000, max:15000, tags:['상품권','식품주류'], ageBoost:['10대','20대','30대','40대','50대 이상']},
  {name:'무선 충전기', ic:'🔌', styles:['실용'], relations:['boss','closefriend','family','longfriend'], min:20000, max:40000, tags:['디지털'], ageBoost:['10대','20대','30대']},
  {name:'목 · 어깨 마사지기', ic:'💆', styles:['실용'], relations:['family','boss','closefriend'], min:30000, max:80000, tags:['디지털'], ageBoost:['30대','40대','50대 이상']},
  {name:'미니 향수', ic:'🌸', styles:['감성','힙함'], relations:['sum','sogaeting','closefriend'], min:20000, max:60000, tags:['향','뷰티'], ageBoost:['10대','20대','30대']},
  {name:'캐릭터 인형 · 키링', ic:'🧸', styles:['힙함'], relations:['closefriend','sum','longfriend'], min:10000, max:30000, tags:[], ageBoost:['10대','20대']},
  {name:'브랜드 양말 세트', ic:'🧦', styles:['무난','실용'], relations:['closefriend','sum','longfriend','family','boss','sogaeting'], min:10000, max:25000, tags:['패션'], ageBoost:['10대','20대','30대','40대','50대 이상']},
  {name:'폼롤러 홈트 세트', ic:'🏋️', styles:['실용'], relations:['closefriend','family'], min:15000, max:35000, tags:[], ageBoost:['20대','30대']},
  {name:'감성 다이어리 · 플래너', ic:'📔', styles:['감성','실용'], relations:['closefriend','longfriend','boss'], min:10000, max:25000, tags:['문구'], ageBoost:['10대','20대','30대']},
  {name:'미니 다육이 화분', ic:'🪴', styles:['감성'], relations:['closefriend','longfriend','boss','family'], min:10000, max:20000, tags:['식물'], ageBoost:['20대','30대','40대']},
  {name:'고급 볼펜', ic:'🖊️', styles:['실용','무난'], relations:['boss','family'], min:20000, max:50000, tags:['문구'], ageBoost:['30대','40대','50대 이상']},
  {name:'홍삼 · 건강즙 세트', ic:'🌿', styles:['무난'], relations:['family','boss'], min:30000, max:80000, tags:['건강','식품주류'], ageBoost:['40대','50대 이상']},
  {name:'와인 · 전통주', ic:'🍷', styles:['무난','힙함'], relations:['boss','family','closefriend'], min:30000, max:100000, tags:['식품주류'], ageBoost:['30대','40대','50대 이상'], alcohol:true},
  {name:'우정 팔찌', ic:'📿', styles:['감성'], relations:['closefriend','sum'], min:10000, max:30000, tags:['액세서리'], ageBoost:['10대','20대']},
  {name:'미니 블루투스 스피커', ic:'🔊', styles:['힙함','실용'], relations:['closefriend','sum','sogaeting','longfriend'], min:30000, max:80000, tags:['디지털'], ageBoost:['10대','20대','30대']},
  {name:'반신욕 입욕제 세트', ic:'🛁', styles:['감성'], relations:['closefriend','family','longfriend'], min:15000, max:30000, tags:['뷰티'], ageBoost:['20대','30대','40대']},
  {name:'레터링 케이크 기프티콘', ic:'🎂', styles:['무난','감성'], relations:['closefriend','family','sum'], min:20000, max:40000, tags:['상품권','식품주류'], ageBoost:['10대','20대','30대']},
  {name:'니트 · 머플러', ic:'🧣', styles:['실용','감성'], relations:['sum','family','sogaeting','closefriend'], min:20000, max:60000, tags:['패션'], ageBoost:['20대','30대','40대','50대 이상']},
  {name:'즉석카메라 필름 세트', ic:'📸', styles:['힙함'], relations:['closefriend','sum','sogaeting'], min:20000, max:50000, tags:[], ageBoost:['10대','20대']},
  {name:'명절 과일 · 한과 세트', ic:'🍎', styles:['무난'], relations:['family','boss'], min:30000, max:100000, tags:['식품주류'], ageBoost:['40대','50대 이상']},
  {name:'용돈봉투 + 메시지카드 세트', ic:'💌', styles:['무난','감성'], relations:['family'], min:5000, max:15000, tags:['문구'], ageBoost:['10대','20대','30대']},
  {name:'스킨케어 세트', ic:'🧴', styles:['감성','무난'], relations:['family','closefriend','longfriend'], min:20000, max:60000, tags:['뷰티'], ageBoost:['20대','30대','40대']},
  {name:'모바일 문화상품권', ic:'🎟️', styles:['실용','무난'], relations:['boss','longfriend','closefriend'], min:10000, max:50000, tags:['상품권'], ageBoost:['10대','20대','30대','40대','50대 이상']},
  {name:'고급 편지지 세트', ic:'✉️', styles:['감성'], relations:['family','closefriend','longfriend'], min:8000, max:20000, tags:['문구'], ageBoost:['10대','20대','30대']},

  /* ---- 여기부터 추가된 12종 (예산·연령·스타일 커버리지 확장용) ---- */
  {name:'감성 무드등', ic:'🪔', styles:['감성'], relations:['closefriend','sum','family','boss'], min:15000, max:35000, tags:['홈'], ageBoost:['20대','30대']},
  {name:'미니 가습기', ic:'💧', styles:['실용'], relations:['family','boss','closefriend'], min:20000, max:45000, tags:['디지털'], ageBoost:['20대','30대','40대']},
  {name:'브랜드 우산', ic:'☂️', styles:['실용','무난'], relations:['boss','family','closefriend','longfriend'], min:15000, max:30000, tags:['패션'], ageBoost:['20대','30대','40대','50대 이상']},
  {name:'수제 쿠키 세트', ic:'🍪', styles:['감성'], relations:['closefriend','sum','longfriend'], min:10000, max:25000, tags:['식품주류'], ageBoost:['10대','20대']},
  {name:'무선 마우스', ic:'🖱️', styles:['실용'], relations:['boss','family'], min:15000, max:30000, tags:['디지털'], ageBoost:['20대','30대','40대']},
  {name:'스터디 플래너 + 포스트잇 세트', ic:'📝', styles:['실용','감성'], relations:['closefriend','family'], min:8000, max:18000, tags:['문구'], ageBoost:['10대','20대']},
  {name:'감성 캔들워머', ic:'🕯️', styles:['감성'], relations:['closefriend','sum','longfriend'], min:25000, max:45000, tags:['홈'], ageBoost:['20대','30대']},
  {name:'극세사 니트 담요', ic:'🧶', styles:['실용','감성'], relations:['family','closefriend'], min:20000, max:40000, tags:['홈'], ageBoost:['30대','40대','50대 이상']},
  {name:'휴대용 미니 선풍기', ic:'🌀', styles:['실용'], relations:['closefriend','sum','sogaeting','family'], min:10000, max:25000, tags:['디지털'], ageBoost:['10대','20대']},
  {name:'미니 방향제 키링', ic:'🔑', styles:['힙함'], relations:['closefriend','sum','sogaeting'], min:8000, max:18000, tags:['향','액세서리'], ageBoost:['10대','20대']},
  {name:'심플 손목시계', ic:'⌚', styles:['감성','힙함'], relations:['sum','sogaeting','family'], min:50000, max:150000, tags:['액세서리'], ageBoost:['20대','30대','40대']},
  {name:'프리미엄 실크 스카프', ic:'🧣', styles:['감성','무난'], relations:['family','boss'], min:80000, max:200000, tags:['패션'], ageBoost:['40대','50대 이상']},
  {name:'미니 캔디 부케', ic:'🍬', styles:['감성','무난'], relations:['closefriend','sum','longfriend'], min:5000, max:12000, tags:['식품주류'], ageBoost:['10대','20대']},

  /* ---- 여기부터 추가된 60종 (네이버 쇼핑/블로그/카드사 리포트 등에서 확인한
     실제 트렌드·가격대를 참고해 카테고리별 빈틈을 채운 샘플 데이터) ----
     출처 예: 카드사 소비 빅데이터 기반 커플 기념일 가격대 가이드, Pickr
     연령대별 선물 가이드, KB의 생각 설 선물 트렌드, 무신사 나이대별 선물
     추천 등 — 정확한 상품 링크·재고가 아닌 "카테고리/가격대"만 참고했음 */

  // -- 효도선물 / 40~50대 이상 --
  {name:'종아리 부항 마사지기', ic:'🦵', styles:['실용'], relations:['family'], min:80000, max:150000, tags:['디지털'], ageBoost:['40대','50대 이상']},
  {name:'온열 찜질 매트', ic:'🔥', styles:['실용'], relations:['family'], min:40000, max:90000, tags:['홈'], ageBoost:['40대','50대 이상']},
  {name:'오메가3·루테인·칼슘 종합영양제 세트', ic:'💊', styles:['무난'], relations:['family','boss'], min:50000, max:100000, tags:['건강'], ageBoost:['40대','50대 이상']},
  {name:'카네이션 + 용돈박스', ic:'🌷', styles:['감성','무난'], relations:['family'], min:10000, max:30000, tags:['상품권'], ageBoost:['40대','50대 이상']},
  {name:'곶감 선물세트', ic:'🟠', styles:['무난'], relations:['family','boss'], min:30000, max:80000, tags:['식품주류'], ageBoost:['40대','50대 이상']},
  {name:'제주 감귤 · 한라봉 혼합세트', ic:'🍊', styles:['무난'], relations:['family','boss'], min:25000, max:80000, tags:['식품주류'], ageBoost:['30대','40대','50대 이상']},
  {name:'리클라이너 안마의자', ic:'🛋️', styles:['실용'], relations:['family'], min:300000, max:800000, tags:['디지털'], ageBoost:['40대','50대 이상']},
  {name:'시니어 건강관리 스마트워치', ic:'⌚', styles:['실용'], relations:['family'], min:80000, max:180000, tags:['디지털'], ageBoost:['50대 이상']},

  // -- 직장 상사 / 격식 있는 관계 --
  {name:'니치 향초 (조말론풍)', ic:'🕯️', styles:['감성','무난'], relations:['boss','family'], min:50000, max:90000, tags:['향'], ageBoost:['30대','40대','50대 이상']},
  {name:'니치 향수', ic:'🌸', styles:['감성','무난'], relations:['boss','family'], min:100000, max:200000, tags:['향'], ageBoost:['30대','40대','50대 이상']},
  {name:'프리미엄 백화점 통합상품권', ic:'💳', styles:['무난'], relations:['boss','family'], min:100000, max:300000, tags:['상품권'], ageBoost:['30대','40대','50대 이상']},
  {name:'와인 오프너 세트', ic:'🍾', styles:['실용','감성'], relations:['boss','family'], min:20000, max:40000, tags:['홈'], ageBoost:['30대','40대','50대 이상']},
  {name:'프리미엄 가죽 카드지갑', ic:'👛', styles:['무난','감성'], relations:['boss','family','sum'], min:80000, max:200000, tags:['액세서리'], ageBoost:['30대','40대']},

  // -- 연인 / 썸 / 소개팅 --
  {name:'애플워치 SE급 스마트워치', ic:'⌚', styles:['실용','힙함'], relations:['sum','closefriend'], min:300000, max:450000, tags:['디지털'], ageBoost:['20대','30대']},
  {name:'LED 마스크 뷰티디바이스', ic:'💡', styles:['감성','실용'], relations:['sum','closefriend','family'], min:200000, max:450000, tags:['뷰티'], ageBoost:['30대','40대']},
  {name:'이너퍼퓸 캡슐 세트', ic:'🧴', styles:['감성'], relations:['sum','sogaeting'], min:15000, max:30000, tags:['향'], ageBoost:['20대','30대']},
  {name:'인테리어 디퓨저 세트', ic:'🌬️', styles:['감성'], relations:['closefriend','sum','longfriend'], min:20000, max:40000, tags:['향'], ageBoost:['20대','30대']},
  {name:'기계식 키보드', ic:'⌨️', styles:['실용','힙함'], relations:['sum','closefriend','boss'], min:60000, max:150000, tags:['디지털'], ageBoost:['20대','30대']},
  {name:'100W GaN 초고속 충전기', ic:'🔋', styles:['실용'], relations:['sum','closefriend','family'], min:25000, max:45000, tags:['디지털'], ageBoost:['20대','30대']},
  {name:'남성 스킨케어 3종 세트', ic:'🧴', styles:['실용','무난'], relations:['sum','family'], min:30000, max:60000, tags:['뷰티'], ageBoost:['20대','30대','40대']},
  {name:'위스키 12년 싱글몰트', ic:'🥃', styles:['무난','힙함'], relations:['boss','family','closefriend'], min:70000, max:150000, tags:['식품주류'], ageBoost:['30대','40대','50대 이상'], alcohol:true},
  {name:'러닝화', ic:'👟', styles:['실용','힙함'], relations:['sum','closefriend','family'], min:120000, max:200000, tags:['패션'], ageBoost:['20대','30대']},
  {name:'요가매트 + 필라테스 밴드 세트', ic:'🧘', styles:['실용'], relations:['closefriend','family'], min:20000, max:40000, tags:['건강'], ageBoost:['20대','30대','40대']},

  // -- 10대 / 학생 --
  {name:'코딩 로봇 키트', ic:'🤖', styles:['힙함','실용'], relations:['family','closefriend'], min:40000, max:90000, tags:['디지털'], ageBoost:['10대']},
  {name:'스마트 토이 피규어', ic:'🧸', styles:['힙함'], relations:['family','closefriend'], min:20000, max:50000, tags:['액세서리'], ageBoost:['10대']},
  {name:'인스탁스 미니 즉석카메라', ic:'📷', styles:['힙함'], relations:['closefriend','sum','sogaeting'], min:70000, max:95000, tags:['디지털'], ageBoost:['10대','20대']},
  {name:'캐릭터 콜라보 그립톡 + 파우치 세트', ic:'📱', styles:['힙함'], relations:['closefriend','sum','sogaeting'], min:8000, max:15000, tags:['액세서리'], ageBoost:['10대']},
  {name:'편의점 감성 답례 세트', ic:'🏪', styles:['무난','힙함'], relations:['sogaeting','closefriend','sum'], min:5000, max:12000, tags:['식품주류'], ageBoost:['10대','20대']},
  {name:'브랜드 볼캡', ic:'🧢', styles:['힙함'], relations:['closefriend','sum','sogaeting'], min:20000, max:40000, tags:['패션'], ageBoost:['10대','20대']},
  {name:'셀카봉 겸 미니 삼각대', ic:'🤳', styles:['힙함'], relations:['closefriend','sum','sogaeting'], min:10000, max:20000, tags:['디지털'], ageBoost:['10대','20대']},
  {name:'립밤 · 틴트 세트', ic:'💄', styles:['감성','무난'], relations:['closefriend','sum','sogaeting'], min:10000, max:20000, tags:['뷰티'], ageBoost:['10대','20대']},
  {name:'뽀모도로 공부 타이머', ic:'⏲️', styles:['실용'], relations:['family','closefriend'], min:25000, max:45000, tags:['디지털'], ageBoost:['10대','20대']},

  // -- 홈 / 오피스 / 기타 --
  {name:'탁상 미니 화이트보드 + 플래너 세트', ic:'🗒️', styles:['실용'], relations:['boss','family','closefriend'], min:12000, max:25000, tags:['문구'], ageBoost:['20대','30대','40대']},
  {name:'LED 무드조명 탁상시계', ic:'🕰️', styles:['감성'], relations:['closefriend','family','boss'], min:15000, max:30000, tags:['홈'], ageBoost:['20대','30대']},
  {name:'기모 원마일웨어 실내복 세트', ic:'🧥', styles:['실용'], relations:['family'], min:25000, max:50000, tags:['패션'], ageBoost:['40대','50대 이상']},
  {name:'미니 전기요', ic:'🔌', styles:['실용'], relations:['family'], min:30000, max:60000, tags:['홈'], ageBoost:['50대 이상']},
  {name:'반려식물 워터드롭 화분 세트', ic:'🪴', styles:['감성'], relations:['closefriend','longfriend','boss'], min:15000, max:30000, tags:['식물'], ageBoost:['20대','30대']},
  {name:'아로마 디퓨저 오일 세트', ic:'🌿', styles:['감성'], relations:['closefriend','family','longfriend'], min:20000, max:40000, tags:['향'], ageBoost:['30대','40대']},
  {name:'원목 트레이 + 머그컵 세트', ic:'☕', styles:['감성','무난'], relations:['family','closefriend'], min:20000, max:40000, tags:['홈'], ageBoost:['30대','40대']},
  {name:'캠핑 감성 미니 랜턴', ic:'🏮', styles:['힙함'], relations:['closefriend','sum'], min:20000, max:40000, tags:['홈'], ageBoost:['20대','30대']},
  {name:'블루투스 키보드 + 마우스 세트', ic:'⌨️', styles:['실용'], relations:['boss','family'], min:40000, max:70000, tags:['디지털'], ageBoost:['30대','40대']},
  {name:'무선 이어폰 케이스 파우치', ic:'🎧', styles:['힙함'], relations:['closefriend','sum'], min:8000, max:15000, tags:['액세서리'], ageBoost:['10대','20대']},
  {name:'명품 스몰 파우치', ic:'👝', styles:['감성','무난'], relations:['sum','sogaeting','family'], min:50000, max:120000, tags:['액세서리'], ageBoost:['20대','30대']},
  {name:'캐시미어 니트', ic:'🧶', styles:['감성','실용'], relations:['family','sum'], min:60000, max:150000, tags:['패션'], ageBoost:['30대','40대','50대 이상']},
  {name:'감성 캘리그라피 액자', ic:'🖼️', styles:['감성'], relations:['closefriend','longfriend','family'], min:15000, max:30000, tags:['홈'], ageBoost:['20대','30대','40대']},
  {name:'원두커피 선물세트', ic:'☕', styles:['무난'], relations:['boss','closefriend','family'], min:15000, max:35000, tags:['식품주류'], ageBoost:['30대','40대']},
  {name:'초콜릿 · 마카롱 선물세트', ic:'🍫', styles:['감성','무난'], relations:['sum','sogaeting','closefriend'], min:10000, max:25000, tags:['식품주류'], ageBoost:['10대','20대']},
  {name:'반려동물 간식 선물세트', ic:'🐾', styles:['감성'], relations:['closefriend','family'], min:15000, max:30000, tags:[], ageBoost:['20대','30대']},
  {name:'스니커즈 세탁 케어 키트', ic:'👟', styles:['실용','힙함'], relations:['closefriend','sum'], min:15000, max:25000, tags:['패션'], ageBoost:['10대','20대']},
  {name:'캐릭터 콜라보 우산', ic:'☔', styles:['힙함','무난'], relations:['closefriend','family'], min:15000, max:25000, tags:['패션'], ageBoost:['10대','20대']},
  {name:'프리미엄 손소독제 홀더 세트', ic:'🧼', styles:['실용'], relations:['boss','closefriend'], min:8000, max:15000, tags:['건강'], ageBoost:['20대','30대']},
  {name:'감성 캔버스 에코백', ic:'👜', styles:['감성','힙함'], relations:['closefriend','sum','longfriend'], min:10000, max:20000, tags:['패션'], ageBoost:['10대','20대']},
  {name:'니치 핸드워시 · 디퓨저 세트', ic:'🧴', styles:['감성'], relations:['family','closefriend','boss'], min:25000, max:50000, tags:['홈'], ageBoost:['30대','40대']},
  {name:'스마트폰 짐벌 셀피스틱', ic:'📱', styles:['힙함','실용'], relations:['closefriend','sum','sogaeting'], min:25000, max:50000, tags:['디지털'], ageBoost:['10대','20대']},
  {name:'미니 블렌더', ic:'🥤', styles:['실용'], relations:['family','closefriend'], min:25000, max:45000, tags:['디지털'], ageBoost:['20대','30대','40대']},
  {name:'캠핑 의자 · 접이식 테이블 세트', ic:'🏕️', styles:['실용','힙함'], relations:['closefriend','family'], min:30000, max:60000, tags:['홈'], ageBoost:['20대','30대','40대']},
  {name:'프리미엄 아로마 입욕제 기프트박스', ic:'🛁', styles:['감성'], relations:['family','closefriend','longfriend'], min:25000, max:45000, tags:['뷰티'], ageBoost:['30대','40대','50대 이상']},
  {name:'시그니처 룸스프레이 세트', ic:'🌫️', styles:['감성'], relations:['closefriend','longfriend','family'], min:20000, max:40000, tags:['향'], ageBoost:['20대','30대','40대']},
  {name:'헤어드라이기', ic:'💨', styles:['실용'], relations:['family','sum'], min:40000, max:90000, tags:['디지털'], ageBoost:['20대','30대','40대']},
  {name:'브랜드 스텐 보온병', ic:'🧊', styles:['실용','무난'], relations:['family','boss','closefriend'], min:20000, max:40000, tags:['홈'], ageBoost:['30대','40대','50대 이상']},
];
