import type { ComponentType } from "react";
import type { BlockType } from "@/lib/schema";
import { CalendarBlock } from "./CalendarBlock";
import { ContactsBlock } from "./ContactsBlock";
import { CountdownBlock } from "./CountdownBlock";
import { DresscodeBlock } from "./DresscodeBlock";
import { GalleryBlock } from "./GalleryBlock";
import { HeroBlock } from "./HeroBlock";
import { LocationBlock } from "./LocationBlock";
import { PhotoBlock } from "./PhotoBlock";
import { ProgramBlock } from "./ProgramBlock";
import { RsvpBlock } from "./RsvpBlock";
import { StoryBlock } from "./StoryBlock";
import { TextBlock } from "./TextBlock";
import type { BlockProps } from "./types";

/** Реестр: тип блока → компонент. Добавили тип в схему — TypeScript потребует добавить его и сюда. */
export const blockComponents: { [K in BlockType]: ComponentType<BlockProps<K>> } = {
  hero: HeroBlock,
  countdown: CountdownBlock,
  calendar: CalendarBlock,
  story: StoryBlock,
  program: ProgramBlock,
  location: LocationBlock,
  dresscode: DresscodeBlock,
  rsvp: RsvpBlock,
  text: TextBlock,
  photo: PhotoBlock,
  gallery: GalleryBlock,
  contacts: ContactsBlock,
};
