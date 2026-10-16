import type { StaticImageData } from "next/image";
import laSeu from "@/images/la-seu.jpg";
import bellver from "@/images/bellver.jpg";
import badia from "@/images/badia.jpg";
import tramuntana from "@/images/tramuntana.jpg";

export type View = {
  image: StaticImageData;
  alt: string;
  /** CSS object-position that keeps the subject inside a tall crop. */
  focus: string;
};

export const views: Record<string, View> = {
  "la-seu": {
    image: laSeu,
    alt: "Palma Cathedral above the old city wall, reflected in the water of Parc de la Mar",
    focus: "50% 50%",
  },
  bellver: {
    image: bellver,
    alt: "Bellver Castle on its hill, the round towers rising above the pines",
    focus: "62% 50%",
  },
  badia: {
    image: badia,
    alt: "The Bay of Palma just after sunset, the far shore dark against an orange sky",
    focus: "40% 50%",
  },
  tramuntana: {
    image: tramuntana,
    alt: "Stone terraces of the Tramuntana range falling to the sea under a grey sky",
    focus: "30% 50%",
  },
};
