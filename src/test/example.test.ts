import { describe, it, expect } from "vitest";
import { detectMyraCommercialIntent, myraCommercialReply } from "../../supabase/functions/_shared/support.ts";

describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});

describe("Myra paid pricing replies", () => {
  it("says Myra is paid and costs ₹999 when someone asks for a free version", () => {
    expect(detectMyraCommercialIntent("myra free chahiye")).toBe("free");
    expect(myraCommercialReply("free")).toContain("₹999");
  });

  it("quotes ₹999 when someone asks Myra's price", () => {
    expect(detectMyraCommercialIntent("Myra ka price kya hai?")).toBe("price");
    expect(myraCommercialReply("price")).toContain("₹999");
  });
});
