/**
 * 시스템 전역 상수 단일 출처. CONFIG.MAGICALOGIA로 주입된다.
 * 마법표는 액터마다 동일한 고정 레퍼런스 데이터 — 특기 이름·열·행만 담고
 * 목표치(TN)는 저장하지 않는다(거리로 매번 파생).
 */
export const MAGICALOGIA = {};

// 속성 열 (가로 순서 = 배열 순서).
// 어둠은 특수처리(취소선·전용색 등) 없이 다른 속성과 동일하게 렌더한다.
MAGICALOGIA.attributes = [
  { key: "star", num: "1", title: "별" },
  { key: "beast", num: "2", title: "짐승" },
  { key: "force", num: "3", title: "힘" },
  { key: "song", num: "4", title: "노래" },
  { key: "dream", num: "5", title: "꿈" },
  { key: "dark", num: "6", title: "어둠" },
];

// 행(출목) — 세로 위치. 인덱스 0..10 ↔ 출목 2..12.
MAGICALOGIA.rows = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// 특기 이름 (열별 11개, 행 인덱스 0..10 순서).
MAGICALOGIA.chart = {
  star: ["황금", "대지", "숲", "길", "바다", "정적", "비", "폭풍", "태양", "천공", "이계"],
  beast: ["육체", "벌레", "꽃", "피", "비늘", "혼돈", "송곳니", "포효", "분노", "날개", "에로스"],
  force: ["중력", "바람", "흐름", "물", "파동", "자유", "충격", "번개", "불꽃", "빛", "순환"],
  song: ["이야기", "선율", "눈물", "이별", "미소", "마음", "승리", "사랑", "정열", "치유", "시간"],
  dream: [
    "추억",
    "수수께끼",
    "거짓말",
    "불안",
    "잠",
    "우연",
    "환상",
    "광기",
    "기도",
    "희망",
    "미래",
  ],
  dark: [
    "심연",
    "부패",
    "배신",
    "마흑",
    "태만",
    "일그러짐",
    "불행",
    "바보",
    "악의",
    "절망",
    "죽음",
  ],
};

// 상태이상 8종.
MAGICALOGIA.statuses = [
  { key: "seal", label: "봉인" },
  { key: "burn", label: "타짐" },
  { key: "weak", label: "허약" },
  { key: "plague", label: "병마" },
  { key: "block", label: "차단" },
  { key: "misfortune", label: "불운" },
  { key: "death", label: "사망" },
  { key: "vanish", label: "소멸" },
];

// 계제(stage) 등급명 — stageTitle 헬퍼/시트 컨텍스트가 system.stage 값으로 조회.
// {ko, kana(가타카나 음역), en(로마자)}. 표시는 "ko (kana)", en은 루비/병기용 보존.
MAGICALOGIA.stageTitles = {
  1: { ko: "신참", kana: "네오퓌테", en: "Neophyte" },
  2: { ko: "이론가", kana: "티오리쿠스", en: "Theoricus" },
  3: { ko: "실천자", kana: "프락티쿠스", en: "Practicus" },
  4: { ko: "철학자", kana: "필로소푸스", en: "Philosophus" },
  5: { ko: "달인", kana: "아뎁투스", en: "Adeptus" },
  6: { ko: "마도사", kana: "마구스", en: "Magus" },
  7: { ko: "초월자", kana: "입시시무스", en: "Ipsissimus" },
};

// 장서/관계 select 옵션.
MAGICALOGIA.spellTypes = ["소환", "주문", "장비"];

// 코스트 영역(마소 속성) select 옵션. ""=미선택, all=全, none=없음.
MAGICALOGIA.COST_AREAS = [
  { value: "", label: "—" },
  { value: "star", label: "별" },
  { value: "beast", label: "짐승" },
  { value: "force", label: "힘" },
  { value: "song", label: "노래" },
  { value: "dream", label: "꿈" },
  { value: "dark", label: "어둠" },
  { value: "all", label: "전" },
  { value: "none", label: "없음" },
];

// 운명 속성(fateAttr) — 앵커(관계) attr select 옵션. 영문 명칭 없음(ko만).
MAGICALOGIA.fateAttr = [
  { ko: "혈연" },
  { ko: "지배" },
  { ko: "숙적" },
  { ko: "연애" },
  { ko: "흥미" },
  { ko: "존경" },
];

// 헤더 식별 select 옵션. {ko, en} — en은 루비/병기용 보존.
// 경력(career)
MAGICALOGIA.CAREER_OPTIONS = [
  { ko: "서경", en: "bookwatch" },
  { ko: "사서", en: "librian" },
  { ko: "서공", en: "artisan" },
  { ko: "방문자", en: "guest" },
  { ko: "이단자", en: "outsider" },
  { ko: "외전", en: "apocrypha" },
];
// 기관(organon)
MAGICALOGIA.ORGANON_OPTIONS = [
  { ko: "원탁", en: "table of contents" },
  { ko: "학원", en: "academy" },
  { ko: "천애", en: "horizon" },
  { ko: "엽귀", en: "cyclops" },
  { ko: "아방궁", en: "laboratory" },
  { ko: "문호", en: "portal" },
];

// 테마 루트 클래스 (클라이언트 설정으로 선택).
MAGICALOGIA.themes = { dark: "theme-dark", light: "theme-light" };

// 코스트 표시 라벨: {area,count} → "별×2" / "노래" / "—".
const COST_AREA_LABELS = Object.fromEntries(MAGICALOGIA.COST_AREAS.map((a) => [a.value, a.label]));

/** 장서 코스트를 표시 문자열로. area 미선택이면 "—". */
export function formatCost(cost) {
  const area = cost?.area ?? "";
  if (!area) return "—";
  const label = COST_AREA_LABELS[area] ?? area;
  const count = cost?.count ?? 0;
  return count ? `${label}×${count}` : label;
}

/**
 * 장서 발동 시 차감할 충전(charge) 소비량. charge는 속성 구분 없는 단일 게이지이므로
 * area는 "0이냐 아니냐"만 가르고(미선택/없음 → 0), 실제 양은 count가 정한다.
 */
export function chargeCostOf(cost) {
  const area = cost?.area ?? "";
  if (area === "" || area === "none") return 0;
  return cost?.count ?? 0;
}
