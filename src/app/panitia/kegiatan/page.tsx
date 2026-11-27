import { redirect } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { isPanitia } from "@/lib/auth";
import { getAllEvents, getItemsWithStatus } from "@/lib/queries";
import { CreateEventForm, EventCard } from "@/components/panitia-events";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function KelolaKegiatanPage() {
  if (!(await isPanitia())) redirect("/panitia/login");
  const events = await getAllEvents();
  const eventItems = await Promise.all(
    events.map(async (ev) => ({ ev, items: await getItemsWithStatus(ev.id) }))
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Kelola Kegiatan</h1>
          <p className="mt-0.5 text-sm text-stone-500">Acara dan kebutuhan. Setiap kegiatan punya link sendiri untuk dibagikan ke grup WhatsApp.</p>
        </div>
        <CreateEventForm />
      </div>

      {events.length === 0 ? (
        <EmptyState icon={<CalendarPlus className="h-10 w-10" />} title="Belum ada kegiatan" subtitle="Buat kegiatan pertama, tambahkan kebutuhan, lalu aktifkan." />
      ) : (
        <div className="space-y-4">
          {eventItems.map(({ ev, items }) => (
            <EventCard key={ev.id} event={ev} items={items} />
          ))}
        </div>
      )}
    </div>
  );
}
