import type { BlockOf, BlockType, InvitationData } from "@/lib/schema";

export type BlockContext = {
  data: InvitationData;
  slug: string;
  /** В превью редактора форма RSVP не отправляется. */
  preview: boolean;
  /** Показ шаблона (/showcase): всё как у гостя, но анкета не уходит на сервер, а сразу благодарит. */
  demo?: boolean;
};

export type BlockProps<T extends BlockType> = { block: BlockOf<T>; ctx: BlockContext };
