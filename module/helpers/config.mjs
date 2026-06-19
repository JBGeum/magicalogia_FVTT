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
  star: ["황금", "대지", "숲", "길", "바다", "정적", "비", "폭풍", "태양", "천공", "이게"],
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

// 계제(rank) 등급명 — rankTitle 헬퍼/시트 컨텍스트가 system.rank 값으로 조회.
MAGICALOGIA.rankTitles = {
  1: "입문자 (Neophyte)",
  2: "열성자 (Zelator)",
  3: "이론자 (Theoricus)",
  4: "실천자 (Practicus)",
  5: "철학자 (Philosophus)",
  6: "소관문 (Adeptus Minor)",
  7: "대관문 (Adeptus Major)",
  8: "면관문 (Adeptus Exemptus)",
  9: "대사 (Magister)",
  10: "마도사 (Magus)",
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
  { value: "all", label: "전(全)" },
  { value: "none", label: "없음" },
];

MAGICALOGIA.anchorAttrs = ["혈연", "연애", "흥미", "존경", "사명", "공포", "열등", "분노"];

// 헤더 식별 datalist 추천목록(자유 입력 허용 — 목록은 가이드일 뿐).
MAGICALOGIA.CAREER_OPTIONS = ["서경", "주화", "야행"];
MAGICALOGIA.ORG_OPTIONS = ["마탑", "결사"];

// 효과 지속 종류 select(고정 choices). 0번이 기본값.
MAGICALOGIA.EFFECT_TYPES = ["없음", "지속", "순간", "장면"];

// 테마 루트 클래스 (액터 flag로 선택).
MAGICALOGIA.themes = { dark: "theme-dark", light: "theme-light" };
