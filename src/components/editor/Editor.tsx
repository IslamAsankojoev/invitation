"use client";

import { AlertCircle, Check, ChevronDown, CircleCheck, Crown, ExternalLink, LayoutList, Link2, Loader2, MousePointerClick, Music, Palette, Redo2, RotateCw, Send, Undo2, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import { AccountMenu } from "@/components/account/AccountMenu";
import { DecorLayer } from "@/components/invitation/DecorLayer";
import { InvitationView } from "@/components/invitation/InvitationView";
import { prefersReducedMotion } from "@/components/invitation/motion";
import { MusicButton, useInvitationMusic } from "@/components/invitation/music";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Iphone } from "@/components/ui/iphone";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { accountGate, type ClaimNext, type Ownership } from "@/lib/access";
import { blockById, findBlock, updateBlock } from "@/lib/blocks";
import { createHistory, record, redo, undo } from "@/lib/history";
import { isQuickEditField, type QuickEditField } from "@/lib/quickEdit";
import { premiumUsage } from "@/lib/premium";
import { loadRecent, rememberInvitation, saveRecent } from "@/lib/recent";
import { themeStyle } from "@/lib/theme";
import type { SessionUser } from "@/lib/session";
import { formatZodErrors, invitationDataSchema, type InvitationData } from "@/lib/schema";
import { patchInvitation, UploadTargetContext } from "./api";
import { AccountRequired } from "./AccountRequired";
import { BlocksPanel, type BlockViewState } from "./BlocksPanel";
import { IntroPreview } from "./IntroPreview";
import { LinkPanel } from "./LinkPanel";
import { MusicPanel } from "./MusicPanel";
import { QuickEditBar } from "./QuickEditBar";
import { QuickStart } from "./QuickStart";
import { ThemePanel } from "./ThemePanel";
import { useAutosave, type SaveStatus } from "./useAutosave";

/** Аккаунт, если вход включён: кто вошёл и чьё это приглашение. Нет — вход выключен, всё по token. */
export type EditorAccount = { user: SessionUser | null; ownership: Ownership };

/** Чем закончилось «Сохранить в аккаунт» (параметр saved после возврата из входа). */
export type SaveNotice = "1" | "taken" | "login";

type Props = {
  id: string;
  token: string;
  initialSlug: string;
  initialData: InvitationData;
  account?: EditorAccount;
  notice?: SaveNotice;
  /** Только что создано из шаблона — сначала быстрый старт (имена, дата, место). */
  quickStart?: boolean;
};

const noticeText: Record<SaveNotice, { ok: boolean; text: string }> = {
  "1": { ok: true, text: "Приглашение сохранено в вашем аккаунте" },
  taken: { ok: false, text: "Это приглашение уже сохранено в другом аккаунте" },
  login: { ok: false, text: "Вход не завершён — попробуйте ещё раз" },
};

const TABS = ["Блоки", "Оформление", "Музыка", "Ссылка"] as const;

const statusView: Record<SaveStatus, { text: string; variant: "secondary" | "outline" | "destructive"; icon: ReactNode }> = {
  saved: { text: "Сохранено", variant: "secondary", icon: <Check /> },
  saving: { text: "Сохраняю…", variant: "outline", icon: <Loader2 className="animate-spin" /> },
  invalid: { text: "Есть ошибки — не сохранено", variant: "destructive", icon: <AlertCircle /> },
  error: { text: "Ошибка сохранения", variant: "destructive", icon: <AlertCircle /> },
};

const validate = (data: InvitationData) => {
  const result = invitationDataSchema.safeParse(data);
  return result.success ? [] : formatZodErrors(result.error);
};

/**
 * Куда прокрутить превью, чтобы показать блок: первый — к самому верху, последний — к самому низу,
 * остальные — с отступом сверху, чтобы был виден край соседнего блока и было понятно, где мы.
 */
function previewScrollTop(box: HTMLElement, el: HTMLElement): number {
  const max = box.scrollHeight - box.clientHeight;
  const blocks = Array.from(box.querySelectorAll("[data-block]"));
  if (el === blocks[0]) return 0;
  if (el === blocks[blocks.length - 1]) return max;
  // Телефон может быть уменьшен transform'ом: экранные пиксели переводим в пиксели вёрстки.
  const boxRect = box.getBoundingClientRect();
  const k = boxRect.height ? box.clientHeight / boxRect.height : 1;
  const top = (el.getBoundingClientRect().top - boxRect.top) * k + box.scrollTop;
  const gap = Math.min(80, box.clientHeight * 0.12);
  return Math.min(max, Math.max(0, top - gap));
}

/**
 * Телефон-превью (Magic UI iPhone, пропорции 433×882) в натуральную величину: экран ≈ 402 px — как у iPhone 16 Pro.
 * Не помещается — уменьшаем телефон целиком (transform), а не сужаем экран: иначе вёрстка приглашения съезжала бы.
 */
const PHONE_W = 431;
const PHONE_H = Math.round((PHONE_W * 882) / 433);

/** Масштаб телефона-превью под место (на компьютере): по ширине и высоте области превью. */
function usePhoneScale(fit: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = fit.current;
    if (!enabled || !el) return;
    const update = () => {
      const s = Math.min(1, el.clientWidth / PHONE_W, el.clientHeight / PHONE_H);
      if (s > 0) setScale(s);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit, enabled]);
  return scale;
}

const DESKTOP_QUERY = "(min-width: 1024px)";
/** Компьютер (≥ 1024 px) или телефон. На сервере — компьютер; после гидратации — как на самом деле. */
function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(DESKTOP_QUERY);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );
}

/** Иконки кнопок нижней панели на телефоне. */
const tabIcons: Record<(typeof TABS)[number], ComponentType<{ className?: string }>> = {
  Блоки: LayoutList,
  Оформление: Palette,
  Музыка: Music,
  Ссылка: Link2,
};

/** Ключ localStorage: подсказку «нажмите на блок в превью» уже закрыли. */
const PICK_TIP_KEY = "editor-pick-tip";

/** Плашка «PRO-оформление» над вкладками. Пока тарифов нет — скрыта; значки PRO на плитках остаются. */
const SHOW_PREMIUM_ALERT = false;

export function Editor({ id, token, initialSlug, initialData, account, notice, quickStart = false }: Props) {
  // Состояние приглашения — с историей для «Отменить / Вернуть»; правки подряд (набор текста) склеиваются в шаг.
  const [history, setHistory] = useState(() => createHistory(initialData));
  const data = history.present;
  const setData = useCallback((next: InvitationData) => {
    const now = Date.now();
    setHistory((h) => record(h, next, now));
  }, []);
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  // Ctrl/⌘+Z, Shift+Ctrl/⌘+Z и Ctrl+Y — вне полей ввода (в поле работает обычная отмена набора).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      const key = e.key.toLowerCase();
      if (key === "z" || key === "y") {
        e.preventDefault();
        setHistory((h) => (key === "y" || e.shiftKey ? redo(h) : undo(h)));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [slug, setSlug] = useState(initialSlug);

  const save = useCallback((d: InvitationData) => patchInvitation(id, token, { data: d }), [id, token]);
  const { status, errors } = useAutosave(data, save, validate, 800);
  const statusInfo = statusView[status];
  const musicUrl = data.music.url;
  const music = useInvitationMusic(musicUrl);
  const premium = useMemo(() => (SHOW_PREMIUM_ALERT ? premiumUsage(data) : []), [data]);

  const previewRef = useRef<HTMLDivElement>(null);
  const phoneFitRef = useRef<HTMLDivElement>(null);
  const desktop = useIsDesktop();
  const phoneScale = usePhoneScale(phoneFitRef, desktop);
  /** Телефон: панель — шторка снизу, открыта или нет. На компьютере не используется (панель всегда слева). */
  const [sheet, setSheet] = useState(!!notice);
  // Раскрытый блок — по id; сначала все свёрнуты, чтобы сразу был виден весь список блоков.
  const [expanded, setExpanded] = useState<string | null>(null);
  /** Подвкладка раскрытого блока и «Тонкая настройка» — одни на все блоки, на время сессии. */
  const [blockView, setBlockView] = useState<BlockViewState>({ tab: "content", fineOpen: false });
  /** Превью само прокручивается к блоку, который открыли для редактирования (прокручивать вручную тоже можно). */
  const [follow, setFollow] = useState(true);
  /** Смена ключа пересоздаёт превью — анимации проигрываются заново. */
  const [previewKey, setPreviewKey] = useState(0);
  /** Заставка показана поверх превью (кнопка «Посмотреть заставку» в «Оформлении»). */
  const [intro, setIntro] = useState(false);
  /** Вкладка панели — управляемая: нажатие на блок в превью переключает на «Блоки». */
  const [tab, setTab] = useState<string>(notice ? "Ссылка" : TABS[0]);
  // «Недавние приглашения» на главной: этот браузер помнит, куда вернуться, даже если секретную ссылку не сохранили.
  const hero = findBlock(data, "hero");
  const heroNames = hero?.names ?? "";
  const heroDate = hero?.date ?? "";
  useEffect(() => {
    saveRecent(rememberInvitation(loadRecent(), { id, token, names: heroNames, date: heroDate, at: Date.now() }));
  }, [id, token, heroNames, heroDate]);

  const [starting, setStarting] = useState(quickStart);
  // Быстрый старт — один раз: убираем ?start=1 из адреса, чтобы он не открылся снова после перезагрузки.
  useEffect(() => {
    if (!quickStart) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("start");
    window.history.replaceState(window.history.state, "", url);
  }, [quickStart]);
  /** Подсказка «нажмите на блок в превью» — до первого закрытия (запоминается в браузере). */
  const [pickTip, setPickTip] = useState(false);
  useEffect(() => {
    try {
      setPickTip(localStorage.getItem(PICK_TIP_KEY) !== "1");
    } catch {
      setPickTip(true);
    }
  }, []);
  function closePickTip() {
    setPickTip(false);
    try {
      localStorage.setItem(PICK_TIP_KEY, "1");
    } catch {
      // приватный режим — подсказка просто покажется снова
    }
  }

  const uploadTarget = useMemo(() => ({ id, token }), [id, token]);
  /** Вход включён, а приглашение не своё: «Открыть» и «Гости» сначала просят войти/сохранить (окно с next). */
  const gate = accountGate(account);
  const [gateFor, setGateFor] = useState<ClaimNext | null>(null);

  const scrollPreview = useCallback((id: string | null) => {
    const box = previewRef.current;
    const el = id ? box?.querySelector<HTMLElement>(`[data-block-id="${id}"]`) : null;
    if (!box || (id && !el)) return; // скрытого блока в превью нет
    // scrollTo контейнера, а не scrollIntoView — иначе прокрутится и вся страница редактора.
    box.scrollTo({ top: el ? previewScrollTop(box, el) : 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, []);

  function expand(id: string | null) {
    setExpanded(id);
    setIntro(false);
    // Прокручиваем только при открытии блока, а не при каждой правке — чтобы не мешать смотреть превью.
    if (id && follow) scrollPreview(id);
  }

  /** Новый блок в превью появится после рендера — прокручиваем к нему тогда. */
  const scrollAfterRender = useRef<string | null>(null);
  function added(id: string) {
    setExpanded(id);
    setIntro(false);
    if (follow) scrollAfterRender.current = id;
  }
  useEffect(() => {
    if (!scrollAfterRender.current) return;
    scrollPreview(scrollAfterRender.current);
    scrollAfterRender.current = null;
  }, [data, scrollPreview]);

  /** Карточка блока в панели появится после рендера — тогда и прокручиваем панель к ней. */
  const panelScrollTo = useRef<string | null>(null);
  useEffect(() => {
    const id = panelScrollTo.current;
    if (!id) return;
    panelScrollTo.current = null;
    document.querySelector(`[data-block-item="${id}"]`)?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [expanded, tab]);

  /**
   * Нажатие на блок в превью открывает его в панели. Кнопки и ссылки самого приглашения в превью при этом не
   * срабатывают (захват + stopPropagation). Превью не прокручиваем — человек и так смотрит на этот блок.
   */
  function pickFromPreview(e: React.MouseEvent) {
    const section = (e.target as HTMLElement).closest<HTMLElement>("[data-block-id]");
    if (!section?.dataset.blockId) return;
    e.preventDefault();
    e.stopPropagation();
    const blockId = section.dataset.blockId;
    // Телефон: нажали на надпись — правим её прямо здесь, приглашение остаётся видно (шторка закрыта).
    const field = (e.target as HTMLElement).closest<HTMLElement>("[data-field]")?.dataset.field;
    if (!desktop && isQuickEditField(field)) {
      // Снизу поднимется клавиатура — надпись поднимаем к верху превью, чтобы правка была видна.
      const box = previewRef.current;
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-field]");
      if (box && el) {
        const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
        box.scrollTo({ top: Math.max(0, top - 48), behavior: prefersReducedMotion() ? "auto" : "smooth" });
      }
      setSheet(false);
      setIntro(false);
      setExpanded(blockId);
      setQuickEdit({ blockId, field });
      if (pickTip) closePickTip();
      return;
    }
    setQuickEdit(null);
    setTab("Блоки");
    setSheet(true);
    setIntro(false);
    setExpanded(blockId);
    panelScrollTo.current = blockId;
    if (pickTip) closePickTip();
  }

  /** Быстрая правка надписи на телефоне: какой блок и какое поле. */
  const [quickEdit, setQuickEdit] = useState<{ blockId: string; field: QuickEditField } | null>(null);
  const quickBlock = quickEdit ? blockById(data, quickEdit.blockId) : undefined;
  // Открыли панель (нижние кнопки, «Отправить») — быстрая правка закрывается, иначе легла бы поверх шторки.
  useEffect(() => {
    if (sheet) setQuickEdit(null);
  }, [sheet]);
  /** «Все настройки блока» из быстрой правки — панель с этим блоком. */
  function quickEditMore() {
    if (!quickEdit) return;
    setQuickEdit(null);
    setTab("Блоки");
    setSheet(true);
    setExpanded(quickEdit.blockId);
    panelScrollTo.current = quickEdit.blockId;
  }

  function toggleFollow(on: boolean) {
    setFollow(on);
    if (on && expanded) scrollPreview(expanded);
  }

  /** «Отправить гостям»: панель «Ссылка» с кнопками WhatsApp и Telegram. */
  function openShare() {
    setStarting(false);
    setIntro(false);
    setTab("Ссылка");
    setSheet(true);
  }

  function reloadPreview() {
    setPreviewKey((k) => k + 1);
    previewRef.current?.scrollTo({ top: 0 });
  }

  /** Экран превью: приглашение, декор, музыка, заставка. На компьютере — внутри iPhone, на телефоне — во всю ширину. */
  const previewScreen = (
    // isolate: слои приглашения (заливка выбранного блока, украшения) не выходят поверх шторки и нижней панели.
    <div className="relative isolate h-full">
      <div ref={previewRef} className="editor-pick h-full overflow-y-auto" data-testid="preview" onClickCapture={pickFromPreview}>
        <InvitationView key={previewKey} data={data} slug={slug} preview selectedBlockId={expanded} />
      </div>
      <DecorLayer key={previewKey} decor={data.theme.decor} contained />
      {/* Музыка — как у гостя: включается печатью заставки или кнопкой-эквалайзером. */}
      {musicUrl && (
        <>
          <audio {...music.audioProps} src={musicUrl} loop={data.music.loop} preload="auto" data-testid="preview-music" />
          {/* Переменные палитры: снаружи приглашения --accent — токен shadcn. */}
          <div style={themeStyle(data.theme)} className="absolute right-4 bottom-4 z-20">
            <MusicButton playing={music.playing} onClick={music.toggle} />
          </div>
        </>
      )}
      {/* key по виду: сменили вид — заставка проигрывается заново. */}
      {intro && (
        <IntroPreview
          key={data.theme.envelope.style}
          data={data}
          onOpen={() => musicUrl && !music.playing && music.play()}
          onClose={() => setIntro(false)}
        />
      )}
    </div>
  );

  return (
    <UploadTargetContext.Provider value={uploadTarget}>
      {/* Телефон: превью на весь экран, панель — шторка снизу (editor-ux.md, этап 7). Компьютер: панель слева. */}
      <div className="flex h-svh flex-col bg-muted/60 lg:grid lg:grid-cols-[460px_1fr]">
        {/* Невидимая подложка под шторкой: нажатие вне шторки закрывает её, как у обычного drawer. */}
        {sheet && <div aria-hidden="true" data-testid="sheet-backdrop" className="fixed inset-0 z-30 lg:hidden" onClick={() => setSheet(false)} />}
        <aside
          aria-label="Панель редактора"
          className={cn(
            "fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex h-[62svh] flex-col rounded-t-2xl border-t bg-background shadow-[0_-12px_40px_rgb(0_0_0/0.18)] transition-[translate,visibility] duration-300",
            "lg:static lg:z-auto lg:h-svh lg:translate-y-0 lg:visible lg:rounded-none lg:border-t-0 lg:border-r lg:shadow-none",
            !sheet && "invisible translate-y-[calc(100%+4rem)]",
          )}
        >
          <div className="relative flex justify-center py-2 lg:hidden">
            <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            <Button type="button" variant="ghost" size="icon-xs" className="absolute top-1 right-2" aria-label="Свернуть панель" onClick={() => setSheet(false)}>
              <ChevronDown />
            </Button>
          </div>
          {/* На телефоне шапка нужна только для меню аккаунта: «Открыть», «Гости» и «Отправить» — над превью. */}
          <header className={cn("sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 px-4 pb-3 backdrop-blur lg:pt-3", !account && "max-lg:hidden")}>
            {/* <a href="/" aria-label="На главную" className="shrink-0">
              <img src="/logo.webp" alt="" width={44} height={32} className="h-8 w-auto" />
            </a> */}
            {/* В шторке на телефоне заголовок не нужен и сжимался бы рядом с кнопками — там он только для скринридеров. */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h1 className="sr-only text-base leading-none font-semibold lg:not-sr-only">Редактор приглашения</h1>
            </div>
            <nav className="flex gap-2">
              {account && <AccountMenu user={account.user} />}
            </nav>
          </header>

          <Tabs
            value={tab}
            onValueChange={(t) => {
              setTab(t);
              setIntro(false);
            }}
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            {/* На телефоне разделы переключает нижняя панель — второй ряд вкладок в шторке не нужен. */}
            <div className="border-b px-4 py-3 max-lg:hidden">
              <TabsList className="w-full">
                {TABS.map((t) => (
                  <TabsTrigger key={t} value={t}>
                    {t}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {premium.length > 0 && (
              <Alert data-testid="premium-usage" className="mx-4 mt-4 w-auto border-amber-200 bg-amber-50 text-amber-900">
                <Crown />
                <AlertTitle>PRO-оформление</AlertTitle>
                <AlertDescription className="text-amber-900/80">
                  Для публикации понадобится тариф: {premium.join(", ")}.
                </AlertDescription>
              </Alert>
            )}

            {notice && (
              <Alert role="status" variant={noticeText[notice].ok ? "default" : "destructive"} className="mx-4 mt-4 w-auto">
                {noticeText[notice].ok ? <CircleCheck /> : <AlertCircle />}
                <AlertTitle>{noticeText[notice].text}</AlertTitle>
              </Alert>
            )}

            {errors.length > 0 && (
              <Alert variant="destructive" className="mx-4 mt-4 w-auto">
                <AlertCircle />
                <AlertTitle>Изменения не сохранены</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* relative — чтобы абсолютные элементы внутри (скрытые input.sr-only загрузок) считались от панели
                и прокручивались с ней, а не растягивали страницу ниже экрана. */}
            <div className="relative min-h-0 flex-1 overflow-y-auto p-4">
              <TabsContent value="Блоки">
                <BlocksPanel
                  data={data}
                  onChange={setData}
                  expanded={expanded}
                  onExpandedChange={expand}
                  onAdded={added}
                  view={blockView}
                  onViewChange={setBlockView}
                />
              </TabsContent>
              <TabsContent value="Оформление">
                <ThemePanel data={data} onChange={setData} onPreviewIntro={() => setIntro(true)} />
              </TabsContent>
              <TabsContent value="Музыка">
                <MusicPanel data={data} onChange={setData} />
              </TabsContent>
              <TabsContent value="Ссылка">
                <LinkPanel id={id} token={token} slug={slug} onSlugChange={setSlug} account={account} data={data} />
              </TabsContent>
            </div>
          </Tabs>
        </aside>

        {/* overflow-hidden: уменьшенный transform'ом телефон браузер учитывает в прокрутке по исходному размеру
            (431×878) — без обрезки на телефоне страницу можно было увести вправо и вниз. */}
        <section
          aria-label="Превью"
          className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-hidden pt-2 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:h-svh lg:gap-3 lg:p-8"
        >
          {/* z-[35] — над невидимой подложкой шторки: кнопки сверху нажимаются с первого раза и при открытой панели. */}
          <div className="relative z-[35] flex w-full max-w-[433px] items-center gap-2 px-3 lg:max-w-[720px] lg:px-0">
            {/* На телефоне места мало: перезагрузка превью нужна редко, «Отменить» — часто. */}
            <Button type="button" variant="outline" size="icon-sm" className="max-sm:hidden" onClick={reloadPreview} aria-label="Перезагрузить" title="Перезагрузить превью">
              <RotateCw />
            </Button>
            <div className="flex">
              <Button type="button" variant="ghost" size="icon-sm" disabled={!canUndo} onClick={() => setHistory(undo)} aria-label="Отменить" title="Отменить (Ctrl+Z)">
                <Undo2 />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" disabled={!canRedo} onClick={() => setHistory(redo)} aria-label="Вернуть" title="Вернуть (Ctrl+Shift+Z)">
                <Redo2 />
              </Button>
            </div>
            <Badge role="status" data-testid="save-status" variant={statusInfo.variant} title={statusInfo.text}>
              {statusInfo.icon}
              {/* На узком экране — только значок: место нужнее кнопкам справа. */}
              <span className={cn(status === "saved" && "max-sm:sr-only")}>{statusInfo.text}</span>
            </Badge>
            <label
              className="ml-auto flex cursor-pointer items-center gap-2 text-sm max-lg:hidden"
              title="Прокручивать превью к блоку, который открыт в редакторе"
            >
              <Switch checked={follow} onCheckedChange={toggleFollow} aria-label="Следовать за редактируемым блоком" />
              Листать к блоку
            </label>
            <div className="ml-auto flex gap-2 lg:ml-2">
              {gate ? (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => setGateFor("editor")} aria-label="Открыть">
                    <ExternalLink /> <span className="max-sm:hidden">Открыть</span>
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setGateFor("guests")}>
                    <Users /> <span className="max-sm:sr-only">Гости</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm">
                    <a href={`/i/${slug}`} target="_blank" aria-label="Открыть">
                      <ExternalLink /> <span className="max-sm:hidden">Открыть</span>
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={`/edit/${id}/guests?token=${token}`}>
                      <Users /> <span className="max-sm:sr-only">Гости</span>
                    </a>
                  </Button>
                </>
              )}
              <Button type="button" size="sm" onClick={openShare}>
                <Send /> Отправить{" "}<span className="max-sm:sr-only">гостям</span>
              </Button>
            </div>
          </div>
          {pickTip && (
            <p role="note" className="mx-3 flex w-[calc(100%-1.5rem)] max-w-[433px] items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-sm lg:mx-0 lg:w-full">
              <MousePointerClick className="size-4 shrink-0 text-primary" />
              <span className="flex-1">Нажмите на любой блок в превью, чтобы изменить его</span>
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Закрыть подсказку" onClick={closePickTip}>
                <X />
              </Button>
            </p>
          )}
          {desktop ? (
            <div ref={phoneFitRef} className="flex w-full min-h-0 flex-1 items-center justify-center">
              <div className="shrink-0" style={{ width: PHONE_W * phoneScale, height: PHONE_H * phoneScale }}>
                <Iphone className="drop-shadow-2xl" style={{ width: PHONE_W, transform: `scale(${phoneScale})`, transformOrigin: "top left" }}>
                  {previewScreen}
                </Iphone>
              </div>
            </div>
          ) : (
            // На телефоне рамка не нужна: превью во всю ширину — ровно как увидит гость.
            <div className="relative min-h-0 w-full flex-1 overflow-hidden border-y bg-background">{previewScreen}</div>
          )}
        </section>

        <nav aria-label="Разделы редактора" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t bg-background pb-[env(safe-area-inset-bottom)] lg:hidden">
          {TABS.map((t) => {
            const Icon = tabIcons[t];
            const active = sheet && tab === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                aria-label={`Панель «${t}»`}
                onClick={() => {
                  setIntro(false);
                  if (active) return setSheet(false);
                  setTab(t);
                  setSheet(true);
                }}
                className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground outline-none aria-pressed:text-foreground focus-visible:bg-muted"
              >
                <Icon className="size-5" />
                {t}
              </button>
            );
          })}
        </nav>
      </div>
      {quickEdit && quickBlock && (
        <QuickEditBar
          key={`${quickEdit.blockId}:${quickEdit.field}`}
          block={quickBlock}
          field={quickEdit.field}
          onChange={(patch) => setData(updateBlock(data, quickEdit.blockId, patch))}
          onClose={() => setQuickEdit(null)}
          onMore={quickEditMore}
        />
      )}
      {starting && <QuickStart data={data} onChange={setData} onClose={() => setStarting(false)} onShare={openShare} />}
      {account && gate && (
        <Dialog open={gateFor !== null} onOpenChange={(open) => !open && setGateFor(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle className="sr-only">{gateFor === "guests" ? "Ответы гостей" : "Открыть приглашение"}</DialogTitle>
            <DialogDescription className="sr-only">Нужно войти и сохранить приглашение в аккаунт</DialogDescription>
            <AccountRequired id={id} token={token} account={account} gate={gate} next={gateFor ?? "editor"} />
          </DialogContent>
        </Dialog>
      )}
    </UploadTargetContext.Provider>
  );
}
