import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { Stage } from "@/components/Stage";
import { credits } from "@/lib/credits";
import { getRooms } from "@/lib/rooms";
import chart from "@/images/chart.jpg";

const REPO = "https://github.com/matiassemelman/agentic-sdlc";

function Hero() {
  return (
    <header className="hero">
      <nav className="hero__nav" aria-label="Main">
        <a className="link only-wide" href="#rooms">Rooms</a>
        <a className="link only-wide" href="#house">The house</a>
        <a className="link" href="#built">How it’s built</a>
        <a className="button" href="#rooms">Choose a room</a>
      </nav>
      <p className="hero__line">Four rooms in Santa Catalina, Palma, each named for what its window sees.</p>
      <h1 className="hero__name">
        <span className="sr-only">Hotel </span>mirador
      </h1>
    </header>
  );
}

function Letter() {
  return (
    <section id="house" className="letter read" aria-label="The house">
      <p data-reveal>We have four rooms and no more. The house is built of marès, the honey-coloured sandstone of the island, and every window has its green shutters.</p>
      <p data-reveal>We named each room for what you see when you open them: the cathedral across the bay, the castle in the pines, the bay itself, and the mountains on a clear morning.</p>
      <p data-reveal>Santa Catalina was the fishermen’s quarter of Palma. The market opens early, and the old town is a short walk along the water.</p>
      <p data-reveal>Breakfast is on the roof from eight to eleven. Rooms are ready from three in the afternoon, and we ask for them back by eleven.</p>
      <p className="letter__sign" data-reveal>Hotel Mirador</p>
      <p className="letter__role">Santa Catalina, Palma de Mallorca</p>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Stage rooms={getRooms()} hero={<Hero />} after={<Letter />} />
      <section id="built" className="band" aria-label="How this page is built">
        <p className="band__statement" data-reveal>
          A software factory builds and changes this page. You can order its next change.
        </p>
        <Image
          className="band__picture"
          src={chart}
          alt="Admiralty chart of Palma Bay, 1895, its soundings dotted across the water"
          sizes="160px"
          data-reveal
        />
        <div className="band__links" data-reveal>
          <p className="band__question">Curious how it works?</p>
          <ul>
            <li><a className="link-plain" href={REPO}>Read the code on GitHub</a></li>
            <li><a className="link-plain" href={`${REPO}/blob/main/docs/design.md`}>Read the design</a></li>
          </ul>
          <p className="band__city">Santa Catalina, Palma de Mallorca · a fictional hotel</p>
        </div>
      </section>
      <footer className="footer">
        <p id="credits" className="footer__credits">
          Pictures:{" "}
          {credits.map((c, i) => (
            <span key={c.page}>
              <a className="link-plain" href={c.page}>{c.title}</a> by {c.creator}, {c.licence}
              {i < credits.length - 1 ? "; " : "."}
            </span>
          ))}
        </p>
        <div className="footer__line">
          <p>A fictional hotel for a software-factory demo</p>
          <ul>
            <li><a className="link" href="#rooms">Rooms</a></li>
            <li><a className="link" href="#house">The house</a></li>
            <li><a className="link" href={REPO}>GitHub</a></li>
          </ul>
          <p className="footer__end">2026 · <a className="link" href="#credits">Picture credits</a></p>
        </div>
      </footer>
      <Reveal />
    </>
  );
}
