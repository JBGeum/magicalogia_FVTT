import { describe, it, expect } from "vitest";
import { patchManifest } from "../tools/patch-manifest.mjs";

const base = {
  id: "magicalogia",
  title: "Magicalogia",
  version: "0.1.0",
  url: "",
  manifest: "",
  download: "",
  license: "LICENSE.txt",
};
const opts = { version: "0.2.0", repo: "JBGeum/magicalogia_FVTT", tag: "v0.2.0" };

describe("patchManifest", () => {
  it("sets version from the resolved version", () => {
    expect(patchManifest(base, opts).version).toBe("0.2.0");
  });

  it("sets a stable latest manifest url", () => {
    expect(patchManifest(base, opts).manifest).toBe(
      "https://github.com/JBGeum/magicalogia_FVTT/releases/latest/download/system.json",
    );
  });

  it("sets a versioned download url using the tag", () => {
    expect(patchManifest(base, opts).download).toBe(
      "https://github.com/JBGeum/magicalogia_FVTT/releases/download/v0.2.0/magicalogia.zip",
    );
  });

  it("sets the project url", () => {
    expect(patchManifest(base, opts).url).toBe("https://github.com/JBGeum/magicalogia_FVTT");
  });

  it("preserves unrelated fields", () => {
    const r = patchManifest(base, opts);
    expect(r.id).toBe("magicalogia");
    expect(r.title).toBe("Magicalogia");
    expect(r.license).toBe("LICENSE.txt");
  });

  it("does not mutate the input object", () => {
    patchManifest(base, opts);
    expect(base.version).toBe("0.1.0");
    expect(base.manifest).toBe("");
  });
});
