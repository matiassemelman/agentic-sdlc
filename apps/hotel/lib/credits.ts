import pictures from "@/data/picture-credits.json";

export type Credit = { title: string; creator: string; licence: string; licenceUrl: string; page: string };

/** Every found picture on the page, read from the record the taste skill's assets script keeps. */
export const credits: Credit[] = pictures.map((p) => ({
  title: p.title,
  creator: p.creator,
  licence: p.license,
  licenceUrl: p.licenseUrl,
  page: p.page,
}));
