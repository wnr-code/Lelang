// Implementasi baca (read) lapisan data Supabase/PostgreSQL.
// Dipanggil oleh queries.ts bila isSupabaseConfigured() true.
import { getSupabase, throwIfError, TABLES } from "./supabase";
import {
  mapEvent,
  mapItem,
  mapSubmission,
  mapFulfillment,
  mapSurplus,
  mapPhoto,
} from "./mappers";
import { computeItemsWithStatus } from "./item-status";
import type {
  EventRow,
  ItemRow,
  ItemWithStatus,
  SubmissionRow,
  FulfillmentRow,
  SurplusRow,
  PhotoRow,
} from "./types";

type Raw = Record<string, unknown>;

const STATUS_RANK: Record<string, number> = { active: 0, draft: 1, completed: 2, archived: 3 };

export async function sbGetActiveEvents(): Promise<EventRow[]> {
  const { data, error } = await getSupabase()
    .from(TABLES.events)
    .select("*")
    .eq("status", "active")
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("id", { ascending: false });
  throwIfError(error, "getActiveEvents");
  return (data ?? []).map(mapEvent);
}

export async function sbGetArchivedEvents(): Promise<EventRow[]> {
  const { data, error } = await getSupabase()
    .from(TABLES.events)
    .select("*")
    .in("status", ["completed", "archived"])
    .order("completed_at", { ascending: false, nullsFirst: false })
    .order("event_date", { ascending: false, nullsFirst: false });
  throwIfError(error, "getArchivedEvents");
  return (data ?? []).map(mapEvent);
}

export async function sbGetAllEvents(): Promise<EventRow[]> {
  const { data, error } = await getSupabase().from(TABLES.events).select("*");
  throwIfError(error, "getAllEvents");
  const rows = (data ?? []).map(mapEvent);
  rows.sort((a, b) => {
    const ra = STATUS_RANK[a.status] ?? 3;
    const rb = STATUS_RANK[b.status] ?? 3;
    if (ra !== rb) return ra - rb;
    const da = a.event_date ?? "";
    const db = b.event_date ?? "";
    if (da !== db) return da < db ? 1 : -1;
    return b.id - a.id;
  });
  return rows;
}

export async function sbGetEventBySlug(slug: string): Promise<EventRow | undefined> {
  const { data, error } = await getSupabase()
    .from(TABLES.events)
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  throwIfError(error, "getEventBySlug");
  return data ? mapEvent(data) : undefined;
}

export async function sbGetEventById(id: number): Promise<EventRow | undefined> {
  const { data, error } = await getSupabase()
    .from(TABLES.events)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  throwIfError(error, "getEventById");
  return data ? mapEvent(data) : undefined;
}

export async function sbGetItemById(id: number): Promise<ItemRow | undefined> {
  const { data, error } = await getSupabase()
    .from(TABLES.items)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  throwIfError(error, "getItemById");
  return data ? mapItem(data) : undefined;
}

export async function sbGetItemsWithStatus(eventId: number): Promise<ItemWithStatus[]> {
  const sb = getSupabase();
  const { data: itemData, error: itemErr } = await sb
    .from(TABLES.items)
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  throwIfError(itemErr, "getItemsWithStatus(items)");
  const items = (itemData ?? []).map(mapItem);
  if (items.length === 0) return [];

  const itemIds = items.map((i) => i.id);
  const [{ data: fulData, error: fulErr }, { data: subData, error: subErr }] = await Promise.all([
    sb.from(TABLES.fulfillments).select("*").in("item_id", itemIds),
    sb.from(TABLES.submissions).select("*").eq("event_id", eventId),
  ]);
  throwIfError(fulErr, "getItemsWithStatus(fulfillments)");
  throwIfError(subErr, "getItemsWithStatus(submissions)");
  const fulfillments = (fulData ?? []).map(mapFulfillment);
  const submissions = (subData ?? []).map(mapSubmission);
  return computeItemsWithStatus(items, fulfillments, submissions);
}

export async function sbGetFulfillments(itemId: number): Promise<FulfillmentRow[]> {
  const { data, error } = await getSupabase()
    .from(TABLES.fulfillments)
    .select("*")
    .eq("item_id", itemId)
    .order("is_pic", { ascending: false })
    .order("id", { ascending: true });
  throwIfError(error, "getFulfillments");
  return (data ?? []).map(mapFulfillment);
}

export async function sbGetFulfillmentsForEvent(eventId: number): Promise<FulfillmentRow[]> {
  const sb = getSupabase();
  const { data: itemData, error: itemErr } = await sb
    .from(TABLES.items)
    .select("id, sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });
  throwIfError(itemErr, "getFulfillmentsForEvent(items)");
  const items = (itemData ?? []) as Raw[];
  if (items.length === 0) return [];
  const orderMap = new Map<number, number>(items.map((i) => [Number(i.id), Number(i.sort_order)]));
  const itemIds = items.map((i) => Number(i.id));
  const { data: fulData, error: fulErr } = await sb
    .from(TABLES.fulfillments)
    .select("*")
    .in("item_id", itemIds);
  throwIfError(fulErr, "getFulfillmentsForEvent(fulfillments)");
  const rows = (fulData ?? []).map(mapFulfillment);
  rows.sort((a, b) => {
    const oa = orderMap.get(a.item_id) ?? 0;
    const ob = orderMap.get(b.item_id) ?? 0;
    if (oa !== ob) return oa - ob;
    return a.id - b.id;
  });
  return rows;
}

export type SubmissionJoined = SubmissionRow & {
  item_name: string;
  item_kind: string;
  event_title: string;
  event_slug: string;
};

export async function sbGetSubmissions(eventId?: number, status?: string): Promise<SubmissionJoined[]> {
  let q = getSupabase()
    .from(TABLES.submissions)
    .select("*, items(name, kind), events(title, slug)");
  if (eventId) q = q.eq("event_id", eventId);
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  throwIfError(error, "getSubmissions");
  const rows = (data ?? []) as Raw[];
  const mapped: SubmissionJoined[] = rows.map((r) => {
    const item = (r.items ?? {}) as Raw;
    const event = (r.events ?? {}) as Raw;
    return {
      ...mapSubmission(r),
      item_name: String(item.name ?? ""),
      item_kind: item.kind === "tenaga" ? "tenaga" : "barang",
      event_title: String(event.title ?? ""),
      event_slug: String(event.slug ?? ""),
    };
  });
  mapped.sort((a, b) => {
    const pa = a.status === "pending" || a.status === "needs_confirmation" ? 0 : 1;
    const pb = b.status === "pending" || b.status === "needs_confirmation" ? 0 : 1;
    if (pa !== pb) return pa - pb;
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
    return b.id - a.id;
  });
  return mapped;
}

export type SubmissionTracked = SubmissionRow & {
  item_name: string;
  item_kind: string;
  target_label: string;
  item_unit: string;
  event_title: string;
  event_slug: string;
  event_status: string;
  pic_name: string;
};

export async function sbGetSubmissionByCode(code: string): Promise<SubmissionTracked | undefined> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from(TABLES.submissions)
    .select("*, items(name, kind, target_label, unit), events(title, slug, status)")
    .eq("track_code", code)
    .maybeSingle();
  throwIfError(error, "getSubmissionByCode");
  if (!data) return undefined;
  const r = data as Raw;
  const item = (r.items ?? {}) as Raw;
  const event = (r.events ?? {}) as Raw;
  const base = mapSubmission(r);
  const { data: picData, error: picErr } = await sb
    .from(TABLES.fulfillments)
    .select("person_name")
    .eq("submission_id", base.id)
    .eq("is_pic", true)
    .limit(1)
    .maybeSingle();
  throwIfError(picErr, "getSubmissionByCode(pic)");
  return {
    ...base,
    item_name: String(item.name ?? ""),
    item_kind: item.kind === "tenaga" ? "tenaga" : "barang",
    target_label: String(item.target_label ?? ""),
    item_unit: String(item.unit ?? ""),
    event_title: String(event.title ?? ""),
    event_slug: String(event.slug ?? ""),
    event_status: String(event.status ?? ""),
    pic_name: picData ? String((picData as Raw).person_name ?? "") : "",
  };
}

export async function sbGetSurplus(eventId: number): Promise<SurplusRow[]> {
  const { data, error } = await getSupabase()
    .from(TABLES.surplus)
    .select("*")
    .eq("event_id", eventId)
    .order("id", { ascending: true });
  throwIfError(error, "getSurplus");
  return (data ?? []).map(mapSurplus);
}

export async function sbGetPhotos(eventId: number): Promise<PhotoRow[]> {
  const { data, error } = await getSupabase()
    .from(TABLES.photos)
    .select("*")
    .eq("event_id", eventId)
    .order("id", { ascending: true });
  throwIfError(error, "getPhotos");
  return (data ?? []).map(mapPhoto);
}

export async function sbGetDashboardCounts(): Promise<{
  pending: number;
  active: number;
  archived: number;
  unresolvedSurplus: number;
  members: number;
  items: number;
}> {
  const sb = getSupabase();
  const countOf = async (table: string, apply: (q: any) => any): Promise<number> => {
    const { count, error } = await apply(sb.from(table).select("*", { count: "exact", head: true }));
    throwIfError(error, `count(${table})`);
    return count ?? 0;
  };
  const [pending, active, archived, unresolvedSurplus, items, nicknames] = await Promise.all([
    countOf(TABLES.submissions, (q) => q.eq("status", "pending")),
    countOf(TABLES.events, (q) => q.eq("status", "active")),
    countOf(TABLES.events, (q) => q.in("status", ["completed", "archived"])),
    countOf(TABLES.surplus, (q) => q.eq("outcome", "")),
    countOf(TABLES.items, (q) => q),
    sb.from(TABLES.submissions).select("nickname").limit(5000),
  ]);
  throwIfError(nicknames.error, "count(members)");
  const members = new Set((nicknames.data ?? []).map((r: { nickname: string }) => String(r.nickname).trim().toLowerCase())).size;
  return { pending, active, archived, unresolvedSurplus, members, items };
}
