import { describe, it, expect } from "vitest";
import { buildTableCard } from "../module/system/table-card.mjs";

describe("buildTableCard", () => {
  it("표명·굴림식·결과·효과·카드 셸을 포함한다", () => {
    const html = buildTableCard({
      table: "장면표(일반)",
      formula: "2d6",
      result: 7,
      texts: ["주위에서 마법 재액이 발생한다."],
    });
    expect(html).toContain("mg-card");
    expect(html).toContain("장면표(일반)");
    expect(html).toContain("2d6");
    expect(html).toContain("mg-tres__num");
    expect(html).toContain("7");
    expect(html).toContain("mg-tbody");
    expect(html).toContain("주위에서 마법 재액이 발생한다.");
  });

  it("효과 텍스트는 HTML로 렌더된다(이스케이프하지 않음)", () => {
    const html = buildTableCard({
      table: "T",
      formula: "1d6",
      result: 1,
      texts: ["<b>봉인.</b> 무작위 마법 하나."],
    });
    expect(html).toContain("<b>봉인.</b>");
  });

  it("표명은 HTML 이스케이프된다", () => {
    const html = buildTableCard({ table: "<x>", formula: "1d6", result: 1, texts: [] });
    expect(html).not.toContain("<x>");
    expect(html).toContain("&lt;x&gt;");
  });

  it("formula가 없으면 굴림식 pill을 생략한다", () => {
    const html = buildTableCard({ table: "T", formula: "", result: 3, texts: ["x"] });
    expect(html).not.toContain("mg-card__formula");
  });

  it("result가 없으면 결과 숫자 블록을 생략한다", () => {
    const html = buildTableCard({ table: "T", formula: "1d6", result: null, texts: ["x"] });
    expect(html).not.toContain("mg-tres");
  });

  it("여러 결과는 각각 .mg-tbody로 낸다", () => {
    const html = buildTableCard({
      table: "T",
      formula: "1d6",
      result: 2,
      texts: ["첫째", "둘째"],
    });
    expect((html.match(/mg-tbody"/g) || []).length).toBe(2);
  });
});
