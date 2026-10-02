import type { BlockOf, BlockType, InvitationData } from "@/lib/schema";

export type BlockContext = {
  data: InvitationData;
  slug: string;
  /** В превью редактора форма RSVP не отправляется. */
  preview: boolean;
};

export type BlockProps<T extends BlockType> = { block: BlockOf<T>; ctx: BlockContext };
