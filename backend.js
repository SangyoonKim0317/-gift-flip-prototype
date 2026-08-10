/* ============================================================
   backend.js
   - Supabase(무료 백엔드 서비스)와의 통신만 전담하는 파일.
   - 여기서 실패해도 앱 전체가 죽지 않도록, 모든 함수가 try/catch로
     감싸져 있고 실패 시 false/null을 반환해 호출부(matching.js)가
     "세션 전용 데모 모드"로 자연스럽게 폴백하도록 설계되어 있음.

   설정 방법:
   1) supabase.com에서 무료 프로젝트 생성
   2) 'feedback' 테이블 생성: item_name, reaction, relation, age_group, style, budget, tone (모두 text)
   3) 아래 두 값을 Settings > API 에서 복사해 붙여넣기
   4) 값을 넣지 않으면 자동으로 '세션 전용 카운터'로 동작 (데모/개발 중에도 안전하게 작동)
   ============================================================ */
const SUPABASE_URL = 'https://twifaeihhsjojbuiuecs.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_epEwfygEuFAQp_2Cxhti6g_tL-XdCFO';

// URL/KEY가 실제로 채워져 있는지 간단 검증 → 백엔드 사용 가능 여부 플래그
// matching.js, app.js 여러 곳에서 이 값을 참조해 "실제 저장" vs "데모 카운트"를 분기한다
const backendReady = SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20;

// backendReady가 true일 때만 실제 Supabase 클라이언트 생성 (불필요한 연결 시도 방지)
const db = backendReady ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// state는 app.js에서 정의되어 전역으로 존재 (스크립트 로드 순서: data → backend → matching → app)

/**
 * 선물 카드에 대한 사용자 반응(👍/😐/👎)을 Supabase 'feedback' 테이블에 저장
 * @param {string} itemName - 반응을 남긴 선물 이름 (예: "핸드크림 세트")
 * @param {string} reaction - 'good' | 'ok' | 'bad'
 * @returns {Promise<boolean>} 저장 성공 여부. db가 없거나 에러 시 false
 * - 저장할 때 현재 설문 상태(state)도 함께 기록해서,
 *   나중에 "어떤 관계·나이대·스타일 조합에서 반응이 좋았는지" 분석 가능하게 함
 */
async function saveFeedbackToBackend(itemName, reaction){
  if(!db) return false;
  try{
    const { error } = await db.from('feedback').insert({
      item_name: itemName,
      reaction: reaction,
      relation: state.relation,
      age_group: state.age,
      style: state.style,
      budget: state.budget,
      tone: state.tone,
    });
    return !error;
  }catch(e){
    console.warn('피드백 저장 실패(백엔드 연결 확인 필요):', e);
    return false;
  }
}

/**
 * 지금까지 쌓인 전체 피드백 개수를 조회 (결과 화면 카운터 표시용)
 * @returns {Promise<number|null>} 개수. db가 없거나 조회 실패 시 null
 * - head:true 옵션으로 실제 row 데이터는 받지 않고 count만 가볍게 조회
 */
async function fetchFeedbackCount(){
  if(!db) return null;
  try{
    const { count, error } = await db.from('feedback').select('*', { count:'exact', head:true });
    return error ? null : count;
  }catch(e){
    return null;
  }
}
