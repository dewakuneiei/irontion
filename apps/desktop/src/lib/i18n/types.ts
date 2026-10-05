import type en from "./locales/en";

/** Same shape as the English messages, with every leaf widened to `string`. */
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Messages = Widen<typeof en>;

/** Dot-path of every translatable string, e.g. `"settings.language.title"`. */
type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];
export type MessageKey = Paths<Messages>;
