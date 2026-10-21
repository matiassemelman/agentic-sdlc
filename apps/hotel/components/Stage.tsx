"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { views } from "@/lib/views";
import { filterRooms, type Room } from "@/lib/rooms";
import { RoomList } from "./RoomList";

/**
 * The split stage: the left half is the window and never moves; the right half scrolls.
 * The window shows the view of the room in the middle of the screen.
 */
export function Stage({ rooms: allRooms, hero, after }: { rooms: Room[]; hero: ReactNode; after: ReactNode }) {
  const [guests, setGuests] = useState<number | undefined>(undefined);
  const rooms = useMemo(() => filterRooms(allRooms, guests), [allRooms, guests]);
  // The list may be empty (a filter with no match) or may no longer hold the active room.
  const [active, setActive] = useState<string | undefined>(allRooms[0]?.id);
  const activeRoom = rooms.find((r) => r.id === active) ?? rooms[0];
  const activeView = activeRoom?.view ?? Object.keys(views)[0];

  useEffect(() => {
    const rows = document.querySelectorAll<HTMLElement>("[data-room]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.getAttribute("data-room")!);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    rows.forEach((row) => io.observe(row));
    return () => io.disconnect();
  }, [rooms]);

  return (
    <div className="stage">
      <div className="window">
        <div className="window__frame">
          {Object.entries(views).map(([id, view], i) => (
            <Image
              key={id}
              src={view.image}
              alt={id === activeView ? view.alt : ""}
              fill
              priority={i === 0}
              sizes="(max-width: 800px) 100vw, 47vw"
              className={id === activeView ? "window__img is-active" : "window__img"}
              style={{ objectPosition: view.focus }}
            />
          ))}
        </div>
      </div>
      <div className="column">
        {hero}
        <RoomList rooms={rooms} guests={guests} onGuests={setGuests} active={activeRoom?.id} onActive={setActive} />
        {after}
      </div>
    </div>
  );
}
