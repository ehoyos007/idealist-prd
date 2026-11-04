import { assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Route-level contract: every service-role document route must run the ownership guard BEFORE its first service-client read/write.
for (const fn of ["link-documents-to-project", "retrieve-context", "chunk-and-index"]) {
  Deno.test(`${fn}: authenticate -> guardDocumentAccess -> only then data access`, async () => {
    const full = await Deno.readTextFile(new URL(`../${fn}/index.ts`, import.meta.url));
    const src = full.slice(full.indexOf("serve(async")); // handler body only (helpers above it are definitions, not calls)
    const iAuth = src.indexOf("await authenticate(req)");
    const iGuard = src.indexOf("await guardDocumentAccess(");
    const iData = Math.min(...[src.indexOf(".from('prd_"), src.indexOf(".rpc('match_"), src.indexOf("keywordFallbackSearch(supabase")].filter((i) => i >= 0));
    assert(iAuth >= 0 && iGuard > iAuth, `${fn}: guard must follow authenticate`);
    assert(iData > iGuard, `${fn}: data access precedes ownership guard`);
    assert(/if \(denied\) return denied;/.test(src), `${fn}: denial must short-circuit`);
  });
}
Deno.test("chunk-and-index stamps the caller as chunk owner", async () => {
  const src = await Deno.readTextFile(new URL("../chunk-and-index/index.ts", import.meta.url));
  assert(src.includes("user_id: ownerId"));
});
