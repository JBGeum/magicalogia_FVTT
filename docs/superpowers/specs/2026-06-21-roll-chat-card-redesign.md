# 설계 — 판정 채팅 카드 재디자인 (통일 양식 + 마소)

> 2026-06-21 · 브랜치 `develop` · 시안 출처: `docs/design/06211223/`(gitignore — `example.html` + `styles/magicalogia-chatcard.css` + `templates/chat-roll-card.hbs` + `scripts/chat-card-helpers.js`).
> 액터/아이템 시트 재디자인과 별개. 판정(2d6) 채팅 카드를 `.mg-card` 통일 양식으로 재작성하고 마소(더블릿) 알림을 추가한다.

## 배경

현재 판정 채팅 카드(`templates/chat/specialty-roll.hbs`)는 한 줄짜리 텍스트(헤더·주사위·결과)이고 전용 SCSS가 없다(무스타일). 새 핸드오프(`06211223`)는 시트와 동일 토큰의 `.mg-card` 그리모어풍 통일 양식(시질 헤더 + d6 pip 주사위 + 성공/실패 리본 + 마소 알림)을 제공한다. `rollSpecialty`(특기표)와 `rollSoulSkill`(혼의특기) 두 굴림이 이 카드를 공유한다.

신규 기능: **마소(魔素)** — 2d6이 더블릿(같은 눈)이면 그 눈에 대응하는 영역의 마소가 발생(1별·2짐승·3힘·4노래·5꿈·6어둠 = config attributes 순서).

## 공통 결정

- 판정 로직은 기존 `classifyRoll`(펌블 1,1=자동실패 / 스페셜 6,6=자동성공 / 더블릿) 재사용. 카드 `success/special/fumble/doublet`은 classifyRoll 결과 기준.
- **펌블·스페셜 명시**: 성공/실패 리본 + 라벨(스페셜!/펌블!). 더블릿 칩 별도.
- **마소는 특기·혼의특기 둘 다** 적용(더블릿 눈 → `CONFIG.MAGICALOGIA.attributes[눈-1].title`).
- **카드 테마는 라이트 고정**(`class="magicalogia theme-light"`). 채팅 메시지 content는 보는 사람별 전환이 안 되므로 가독성을 위해 라이트로 통일(추후 공통 테마 재설계 시 변경).
- **헤더는 시질 + 시전자만**. 시간·삭제는 Foundry 채팅 로그가 제공하므로 카드에서 제외.
- d6 면은 `renderDie`로 pip HTML을 만들어 `{{{dieHtml}}}`로 출력(`buildRollCard` 패턴).
- 토큰은 우리 `_tokens.scss` 재사용. 새 CSS의 토큰/theme 블록은 이식하지 않되, **실패색 토큰 `--mg-bad*`만 추가**(현재 없음).
- 데이터 모델 변경 없음. 커밋 메시지: 영어 한 줄, co-author 없음.

## 변경 파일·내용

### ① `scss/theme/_tokens.scss` — 실패색 토큰 추가

다크(`.magicalogia`)와 라이트(`.magicalogia.theme-light`) 블록에 각각 추가(값은 새 CSS 그대로):

- 다크: `--mg-bad: #ef9393;` `--mg-bad-bg: #9c3a4a3d;` `--mg-bad-line: #c0566a8c;`
- 라이트: `--mg-bad: #a3343f;` `--mg-bad-bg: #a3343f24;` `--mg-bad-line: #a3343f7a;`

(theme-tokens 완전성 테스트가 다크 색상 토큰을 라이트가 모두 오버라이드하는지 검사하므로 양쪽에 추가해야 통과.)

### ② `scss/component/_chat-card.scss` (신설) + `scss/magicalogia.scss`

새 `magicalogia-chatcard.css`의 `.mg-card*` 규칙을 `.magicalogia { … }` 중첩 SCSS로 이식(토큰/theme 블록 제외). 이식 대상:

- `.mg-card`(골드 1.5px + `::before` 안쪽 라인 프레임) / `&__head`(바 배경 + 시질 + 시전자) / `&__sigil` / `&__who`
- `.mg-card__body`
- `.mg-roll-title` / `&__skill`(`.dom` 골드 강조) / `&__target`(알약 배지)
- `.mg-roll-dice` / `.mg-die`(pip 3×3 그리드, `&.is-match` 골드) / `.mg-roll-eq` / `.mg-roll-sum` / `.mg-roll-detail`
- `.mg-outcome` / `&--success`(골드) / `&--fail`(`--mg-bad*` 크림슨) / `&__mark` / `&__text` / `&__tag`(더블릿 칩)
- `.mg-note`(좌측 골드 보더 노트 바) / `&__icon`

`.mg-card__time`/`.mg-card__del`은 템플릿에서 제외하므로 이식하지 않는다.

`scss/magicalogia.scss`에 `@use "component/chat-card";` 추가.

### ③ `templates/chat/specialty-roll.hbs` — 새 `.mg-card` 구조로 재작성

```hbs
<div class="magicalogia theme-light">
  <div class="mg-card">
    <div class="mg-card__head">
      <span class="mg-card__sigil"><svg viewBox="0 0 16 16" fill="currentColor"><path
            d="M8 1l1.7 4 4.3.3-3.3 2.8 1 4.2L8 12.2 4.3 12.3l1-4.2L2 5.3 6.3 5z"
          /></svg></span>
      <span class="mg-card__who">{{who}}</span>
    </div>
    <div class="mg-card__body">
      <div class="mg-roll-title">
        <span class="mg-roll-title__skill"><span class="dom">{{domain}}</span> · {{skill}}</span>
        <span class="mg-roll-title__target">목표 <b>{{target}}</b></span>
      </div>
      <div class="mg-roll-dice">
        {{{dieHtml}}}
        <span class="mg-roll-eq">=</span>
        <span class="mg-roll-sum">{{sum}}</span>
        <span class="mg-roll-detail">2D6 · {{dice.[0]}} + {{dice.[1]}}</span>
      </div>
      {{#if success}}
        <div class="mg-outcome mg-outcome--success">
          <span class="mg-outcome__mark">✦</span>
          <span class="mg-outcome__text">{{#if special}}스페셜!{{else}}성공{{/if}}</span>
          {{#if doublet}}<span class="mg-outcome__tag">✦ 더블릿</span>{{/if}}
        </div>
      {{else}}
        <div class="mg-outcome mg-outcome--fail">
          <span class="mg-outcome__mark">✕</span>
          <span class="mg-outcome__text">{{#if fumble}}펌블!{{else}}실패{{/if}}</span>
          {{#if doublet}}<span class="mg-outcome__tag">✦ 더블릿</span>{{/if}}
        </div>
      {{/if}}
      {{#if doublet}}
        <div class="mg-note"><span class="mg-note__icon">✦</span><span><b>{{masoDomain}}</b>의 영역
            마소가 발생합니다</span></div>
      {{/if}}
    </div>
  </div>
</div>
```

(시질·더블릿 칩의 정확한 SVG는 시안 `chat-roll-card.hbs` 인라인 SVG를 사용하거나 유니코드 ✦로 단순화 — plan에서 확정.)

### ④ `module/system/specialty-roll.mjs` — 카드 데이터 빌더 + renderDie

- `renderDie(value, match)` 추가(시안 `chat-card-helpers.js` 포팅): d6 pip 3×3 그리드 markup, `match`면 `is-match`.
- 공통 카드 렌더 함수 추출:

```js
async function postRollCard(actor, { domain, skill, tn }) {
  const roll = await new Roll("2d6").evaluate();
  const [d1, d2] = roll.dice[0].results.map((r) => r.result);
  const result = classifyRoll(d1, d2, tn);
  const dieHtml =
    renderDie(d1, result.doublet) +
    '<span class="mg-roll-eq">+</span>' +
    renderDie(d2, result.doublet);
  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/magicalogia/templates/chat/specialty-roll.hbs",
    {
      who: ChatMessage.getSpeaker({ actor }).alias,
      domain,
      skill,
      target: tn,
      dice: [d1, d2],
      sum: result.total,
      success: result.success,
      special: result.special,
      fumble: result.fumble,
      doublet: result.doublet,
      masoDomain: result.doublet ? CONFIG.MAGICALOGIA.attributes[d1 - 1].title : null,
      dieHtml,
    },
  );
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls: [roll] });
}
```

- `rollSpecialty`: cell/tn 계산 후 `postRollCard(actor, { domain: column.title, skill: cell.name, tn: cell.tn })`로 위임(기존 cell/tn null 가드 유지).
- `rollSoulSkill`: `postRollCard(actor, { domain: "혼의 특기", skill: actor.system.soulSkill?.trim() || "혼의 특기", tn: 6 })`.
- `classifyRoll`은 그대로(순수 함수, 기존 테스트 유지).

## 검증

- `npm run build` 성공 — `_chat-card.scss` 컴파일, `--mg-bad*` 포함.
- `npm test` 무회귀 — `classifyRoll` 테스트 유지, theme-tokens 완전성 테스트 통과(--mg-bad\* 양쪽 추가), 52개 이상 통과.
- **Foundry 실렌더:**
  - 특기표 특기명 클릭 → 라이트 카드: 시질 + 시전자, 영역·특기 + 목표 배지, d6 pip 2면(더블릿이면 골드 강조) + 합계 + 상세, 성공/실패 리본.
  - 펌블(1,1) → 실패 리본 "펌블!" + 마소 노트(별). 스페셜(6,6) → 성공 리본 "스페셜!" + 마소(어둠).
  - 일반 더블릿(예: 4,4) → 더블릿 칩 + 「노래」 마소 노트.
  - 혼의특기 클릭 → 같은 카드(domain "혼의 특기"), 더블릿 시 마소.
  - 모든 카드 라이트 테마 고정·가독성.

## 비목표 (후속)

- 채팅 카드의 보는 사람별 테마 전환(공통 테마 재설계 시).
- 아이템 사용/효과 발동 등 다른 채팅 카드(같은 `.mg-card` 양식 재사용은 후속).
- 마소 자동 효과 적용(알림만, 자동 처리 없음).

## 함정 / 참고

- 새 CSS 토큰/theme 블록 이식 금지(우리 `_tokens.scss` 재사용). `--mg-bad*`만 추가.
- 카드 테마 라이트 고정 — `class="magicalogia theme-light"`(데이터에 theme 안 넘김).
- 마소 매핑은 `CONFIG.MAGICALOGIA.attributes`(별·짐승·힘·노래·꿈·어둠, num 1-6 순서) 재사용 — 별도 DOMAINS 맵 불필요.
- 시간·삭제는 Foundry 채팅 로그 제공 — 카드에서 제외.
- `docs/design/`은 gitignore — 새 SCSS는 이식으로 시스템에 들여와야 배포 포함.
