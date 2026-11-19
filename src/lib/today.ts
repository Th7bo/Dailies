import "server-only";
import { cookies } from "next/headers";
import { dayKey, isValidTimeZone } from "./day";

export const TZ_COOKIE = "tz";

export async function getTimeZone(): Promise<string> {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  return isValidTimeZone(tz) ? tz : "UTC";
}

export async function getToday(): Promise<string> {
  return dayKey(await getTimeZone());
}
