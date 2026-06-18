/* =============================================================
 *  마기카로기아 — system config constants
 *  Import once (e.g. in your system's init hook) and expose on
 *  CONFIG.MAGICALOGIA so templates/helpers can read the fixed
 *  reference data (the magic chart is identical for every actor).
 * ============================================================= */

export const MAGICALOGIA = {};

// 출목 (dice-result rows) of the magic chart
MAGICALOGIA.chartIndex = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// 마법표 (Magic Chart). 6 columns × 11 rows.
//   key   : data key used for the actor's "active skill" flags
//   title : 속성 name
//   dark  : true for 어둠 (curse) column → rendered struck-through
//   cells : [{ name, cost }] indexed parallel to chartIndex (2…12)
MAGICALOGIA.chart = [
  { key: "star",  num: "1", title: "별",   dark: false, cells: [
    {name:"황금",cost:6},{name:"대지",cost:5},{name:"숲",cost:6},{name:"길",cost:7},{name:"바다",cost:8},
    {name:"정적",cost:9},{name:"비",cost:9},{name:"폭풍",cost:8},{name:"태양",cost:7},{name:"천공",cost:6},{name:"이게",cost:7} ] },
  { key: "beast", num: "2", title: "짐승", dark: false, cells: [
    {name:"육체",cost:7},{name:"벌레",cost:6},{name:"꽃",cost:5},{name:"피",cost:6},{name:"비늘",cost:7},
    {name:"혼돈",cost:8},{name:"송곳니",cost:8},{name:"포효",cost:7},{name:"분노",cost:6},{name:"날개",cost:5},{name:"에로스",cost:6} ] },
  { key: "force", num: "3", title: "힘",   dark: false, cells: [
    {name:"중력",cost:8},{name:"바람",cost:7},{name:"흐름",cost:6},{name:"물",cost:7},{name:"파동",cost:8},
    {name:"자유",cost:9},{name:"충격",cost:9},{name:"번개",cost:8},{name:"불꽃",cost:7},{name:"빛",cost:6},{name:"순환",cost:7} ] },
  { key: "song",  num: "4", title: "노래", dark: false, cells: [
    {name:"이야기",cost:7},{name:"선율",cost:7},{name:"눈물",cost:6},{name:"이별",cost:5},{name:"미소",cost:6},
    {name:"마음",cost:7},{name:"승리",cost:8},{name:"사랑",cost:9},{name:"정열",cost:9},{name:"치유",cost:8},{name:"시간",cost:9} ] },
  { key: "dream", num: "5", title: "꿈",   dark: false, cells: [
    {name:"추억",cost:5},{name:"수수께끼",cost:6},{name:"거짓말",cost:7},{name:"불안",cost:7},{name:"잠",cost:8},
    {name:"우연",cost:9},{name:"환상",cost:10},{name:"광기",cost:11},{name:"기도",cost:11},{name:"희망",cost:10},{name:"미래",cost:11} ] },
  { key: "dark",  num: "6", title: "어둠", dark: true,  cells: [
    {name:"심연",cost:7},{name:"부패",cost:8},{name:"배신",cost:9},{name:"마흑",cost:9},{name:"태만",cost:10},
    {name:"일그러짐",cost:11},{name:"불행",cost:12},{name:"바보",cost:12},{name:"악의",cost:12},{name:"절망",cost:12},{name:"죽음",cost:12} ] }
];

// 상태이상 (status ailments)
MAGICALOGIA.statuses = [
  { key: "seal",     label: "봉인" },
  { key: "burn",     label: "타짐" },
  { key: "weak",     label: "허약" },
  { key: "plague",   label: "병마" },
  { key: "block",    label: "차단" },
  { key: "misfortune", label: "불운" },
  { key: "death",    label: "사망" },
  { key: "vanish",   label: "소멸" }
];

// 장서(spell) types & 관계(anchor) attributes — select options
MAGICALOGIA.spellTypes   = ["공격", "소환", "장비", "주문", "기타"];
MAGICALOGIA.anchorAttrs  = ["혈연", "연애", "흥미", "존경", "사명", "공포", "열등", "분노"];

// Themes (sheet root class). Persist the choice as an actor/world flag.
MAGICALOGIA.themes = {
  dark:  "theme-dark",   // 마법진 바이올렛
  light: "theme-light"   // 장서 양피지
};
