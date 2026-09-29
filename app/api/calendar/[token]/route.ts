import { getDb } from "@/db";
import { buildCalendar } from "@/lib/ics";
import { calendarPostingsForToken } from "@/lib/services/settings";

// 구글·애플 캘린더 구독 URL: /api/calendar/<calendarToken>.ics
export async function GET(_request: Request, ctx: RouteContext<"/api/calendar/[token]">) {
  const { token } = await ctx.params;
  const list = await calendarPostingsForToken(getDb(), token.replace(/\.ics$/, ""));
  if (!list) return new Response("Not found", { status: 404 });

  return new Response(buildCalendar(list, new Date()), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "private, max-age=900",
    },
  });
}
