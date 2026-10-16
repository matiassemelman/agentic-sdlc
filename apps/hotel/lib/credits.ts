export type Credit = { title: string; creator: string; licence: string; page: string };

/** Every found picture on the page, as recorded by the taste skill's assets script. */
export const credits: Credit[] = [
  { title: "Palma Cathedral (La Seu) and reflection at Parc de la Mar", creator: "Arieleisenhammer", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/w/index.php?curid=186355383" },
  { title: "Castell de Bellver (Palma)", creator: "UlrichAAB", licence: "CC BY 3.0", page: "https://commons.wikimedia.org/w/index.php?curid=17403497" },
  { title: "The Bay Of Palma", creator: "Wolfgang Weber", licence: "CC BY 3.0", page: "https://commons.wikimedia.org/wiki/File:The_Bay_Of_Palma_(230314461).jpeg" },
  { title: "Serra de Tramuntana - 8", creator: "Maria Rosa Ferre", licence: "CC BY-SA 2.0", page: "https://commons.wikimedia.org/w/index.php?curid=32808229" },
  { title: "Admiralty Chart No 2428, Palma Bay, 1895", creator: "United Kingdom Hydrographic Office", licence: "public domain", page: "https://commons.wikimedia.org/wiki/File:Admiralty_Chart_No_2428_Dragonera_Island_to_Carril_Bay_Including_Palma_Bay,_Published_1895.jpg" },
];
