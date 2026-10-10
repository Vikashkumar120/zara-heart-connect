import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { generateGroqTextReply, GROQ_KEY_ENV_NAMES } from "./groq-text.ts";

Deno.test("Groq text uses the next saved API key after a quota response", async () => {
  assertEquals(GROQ_KEY_ENV_NAMES.length, 10);
  const attemptedKeys: string[] = [];
  const result = await generateGroqTextReply(
    "hello",
    "Reply naturally",
    120,
    [],
    90101,
    undefined,
    {
      env: (name) => ({ GROQ_API_KEY: "test-key-one", GROQ_API_KEY_2: "test-key-two" } as Record<string, string>)[name],
      fetcher: async (_input, init) => {
        const headers = new Headers(init?.headers);
        attemptedKeys.push(headers.get("Authorization") ?? "");
        if (attemptedKeys.length === 1) return new Response("{}", { status: 429, headers: { "retry-after": "0" } });
        return new Response(JSON.stringify({ choices: [{ message: { content: "Hello, jaan!" } }] }), { status: 200 });
      },
      sleep: async () => {},
    },
  );

  assertEquals(attemptedKeys.length, 2);
  assertEquals(result?.text, "Hello, jaan!");
  assertEquals(result?.model, "groq/llama-3.3-70b-versatile");
});

Deno.test("Groq text stops on a non-retryable request error", async () => {
  let attempts = 0;
  const result = await generateGroqTextReply(
    "hello",
    "Reply naturally",
    120,
    [],
    90102,
    undefined,
    {
      env: (name) => ({ GROQ_API_KEY: "test-key-one", GROQ_API_KEY_2: "test-key-two" } as Record<string, string>)[name],
      fetcher: async () => {
        attempts += 1;
        return new Response("{}", { status: 400 });
      },
      sleep: async () => {},
    },
  );

  assertEquals(attempts, 1);
  assertEquals(result, null);
});