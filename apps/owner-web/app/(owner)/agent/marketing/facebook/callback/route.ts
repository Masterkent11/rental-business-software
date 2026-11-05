export function GET(request: Request) {
  const input = new URL(request.url).searchParams;
  const fragment = new URLSearchParams();
  const state = input.get("state");
  const code = input.get("code");
  if (
    state &&
    /^[\w-]{43}$/.test(state) &&
    input.getAll("state").length === 1
  ) {
    fragment.set("state", state);
    if (
      !input.has("error") &&
      code &&
      code.length <= 4096 &&
      input.getAll("code").length === 1
    ) {
      fragment.set("code", code);
    }
  } else {
    fragment.set("invalid", "1");
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: `/agent/marketing?tab=channels#${fragment}`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
