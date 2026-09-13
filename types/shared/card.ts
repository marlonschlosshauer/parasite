import type { ContentImage } from "./image";
import type { Link } from "./link";

export interface Card {
  eyebrow?: string;
  title: string;
  text: string;
  image?: ContentImage;
  link?: Link;
}
