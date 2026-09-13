import type { Card } from "@/types/shared/card";
import type { Link } from "@/types/shared/link";

export interface TextModuleContent {
  _type: "text";
  eyebrow?: string;
  heading: string;
  body: string;
  align?: "left" | "center";
}

export interface QuoteModuleContent {
  _type: "quote";
  quote: string;
  person: string;
}

export interface GridModuleContent {
  _type: "grid";
  eyebrow?: string;
  heading: string;
  cards: Card[];
}

export interface CtaModuleContent {
  _type: "cta";
  heading: string;
  body: string;
  link: Link;
}
