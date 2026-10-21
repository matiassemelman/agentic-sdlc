import { useState } from "react";
import Image from "next/image";
import type { Room } from "@/lib/rooms";
import { guestsLabel } from "@/lib/rooms";
import { formatPrice, USD_PER_EUR, type Currency } from "@/lib/format";
import { views } from "@/lib/views";

export function RoomList({
  rooms,
  active,
  onActive,
}: {
  rooms: Room[];
  active: string | undefined;
  onActive: (id: string) => void;
}) {
  const [currency, setCurrency] = useState<Currency>("EUR");
  return (
    <section id="rooms" className="rooms read" aria-labelledby="rooms-title">
      <h2 id="rooms-title" className="head" data-reveal>
        Four windows
      </h2>
      <div className="currency" data-reveal>
        <div className="currency__switch">
          <button type="button" className="currency__button" aria-pressed={currency === "EUR"} onClick={() => setCurrency("EUR")}>
            Euros
          </button>
          <button type="button" className="currency__button" aria-pressed={currency === "USD"} onClick={() => setCurrency("USD")}>
            US dollars
          </button>
        </div>
        <p className="currency__note">
          Dollar prices are approximate, converted at 1 EUR = {USD_PER_EUR} USD, the European Central Bank reference rate of 19 October 2026.
        </p>
      </div>
      <ul className="rooms__list">
        {rooms.map((room, i) => (
          <li
            key={room.id}
            data-testid="room"
            data-room={room.id}
            data-guests={room.maxGuests}
            className={room.id === active ? "room is-active" : "room"}
            onMouseEnter={() => onActive(room.id)}
            data-reveal
            style={{ "--i": i } as React.CSSProperties}
          >
            {/* On a phone the window does not follow the reader, so each room carries its own view. */}
            <div className="room__view">
              <Image src={views[room.view].image} alt={views[room.view].alt} fill sizes="100vw" style={{ objectPosition: views[room.view].focus }} />
            </div>
            <div className="room__row">
              <h3 className="room__name">{room.name}</h3>
              <p className="room__price">
                <span data-testid="room-price">{formatPrice(room.pricePerNight, currency)}</span> a night
              </p>
            </div>
            <p className="room__desc">{room.description}</p>
            <p className="room__facts">
              <span data-testid="room-guests">{guestsLabel(room.maxGuests)}</span> · {room.sizeM2} m² · {room.beds}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
