"use client";

import { AlertCircle, Check, ChevronDown, Redo2, Undo2, CircleCheck, Crown, ExternalLink, LayoutList, Link2, Loader2, MousePointerClick, Music, Palette, RotateCw, Send, Users, X } from "lucide-react";
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
import { premiumUsage } from "@/lib/premium";
import { themeStyle } from "@/lib/theme";
import type { SessionUser } from "@/lib/session";
import { commit, createHistory, redo, undo } from "@/lib/history";
import { formatZodErrors, invitationDataSchema, type InvitationData } from "@/lib/schema";
import { patchInvitation, UploadTargetContext } from "./api";
import { AccountRequired } from "./AccountRequired";
import { BlocksPanel, type BlockViewState } from "./BlocksPanel";
import { IntroPreview } from "./IntroPreview";
import { LinkPanel } from "./LinkPanel";
import { MusicPanel } from "./MusicPanel";
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

/** Кнопки «Открыть»/«Гости»: на телефоне в шторке только иконки (подпись остаётся для скринридеров). */
const actionBtn = "max-lg:size-10 max-lg:px-0 max-lg:[&_svg]:size-5";

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

export function Editor({ id, token, initialSlug, initialData, account, notice }: Props) {
  /** Данные + история правок для «Отменить / Повторить» (lib/history.ts). Все правки идут через setData. */
  const [history, setHistory] = useState(() => createHistory(initialData));
  const data = history.present;
  const setData = useCallback((next: InvitationData) => setHistory((h) => commit(h, next, Date.now())), []);
  const undoEdit = useCallback(() => setHistory(undo), []);
  const redoEdit = useCallback(() => setHistory(redo), []);
  // ⌘Z / Ctrl+Z, ⇧⌘Z / Ctrl+Y — кроме полей ввода: там работает отмена набора самого браузера.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) undoEdit();
      else if ((key === "z" && e.shiftKey) || key === "y") redoEdit();
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undoEdit, redoEdit]);
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
  const [sheet, setSheetOpen] = useState(!!notice);
  /** Высота шторки, как у системных sheet: половина экрана (видно превью) или почти весь экран. */
  const [sheetFull, setSheetFull] = useState(false);
  const setSheet = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setSheetFull(false);
  }, []);
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
    setTab("Блоки");
    setSheet(true);
    setIntro(false);
    setExpanded(blockId);
    panelScrollTo.current = blockId;
    if (pickTip) closePickTip();
  }

  /**
   * Ручка шторки: тянуть вниз — уменьшить (из полной) или закрыть, вверх — развернуть, касание — переключить высоту.
   * Шторка идёт за пальцем вниз; вверх просто меняется высота после отпускания.
   */
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<number | null>(null);
  const dragDelta = useRef(0);
  const sheetHandle = {
    onPointerDown(e: React.PointerEvent) {
      dragStart.current = e.clientY;
      dragDelta.current = 0;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    onPointerMove(e: React.PointerEvent) {
      if (dragStart.current === null) return;
      dragDelta.current = e.clientY - dragStart.current;
      setDrag(Math.max(0, dragDelta.current));
    },
    onPointerUp() {
      if (dragStart.current === null) return;
      dragStart.current = null;
      const dy = dragDelta.current;
      setDrag(0);
      if (dy > 80) {
        if (sheetFull) setSheetFull(false);
        else setSheet(false);
      } else if (dy < -40) setSheetFull(true);
    },
    onPointerCancel() {
      dragStart.current = null;
      setDrag(0);
    },
    // Касание без движения (и Enter/пробел с клавиатуры) — click: переключить высоту.
    onClick() {
      if (Math.abs(dragDelta.current) < 6) setSheetFull((f) => !f);
      dragDelta.current = 0;
    },
  };

  function toggleFollow(on: boolean) {
    setFollow(on);
    if (on && expanded) scrollPreview(expanded);
  }

  function reloadPreview() {
    setPreviewKey((k) => k + 1);
    previewRef.current?.scrollTo({ top: 0 });
  }

  /** Экран превью: приглашение, декор, музыка, заставка. На компьютере — внутри iPhone, на телефоне — во всю ширину. */
  const previewScreen = (
    // isolate: слои приглашения (заливка выбранного блока, украшения) не выходят поверх шторки и нижней панели.
    <div className="relative isolate h-full">
      {/* container-type: size — высота экрана превью для фона страницы (100cqh в PageBackground). */}
      <div ref={previewRef} className="editor-pick h-full overflow-y-auto [container-type:size]" data-testid="preview" onClickCapture={pickFromPreview}>
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
          style={drag > 0 ? { translate: `0 ${drag}px` } : undefined}
          className={cn(
            "fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex flex-col rounded-t-2xl border-t bg-background shadow-[0_-12px_40px_rgb(0_0_0/0.18)] transition-[translate,visibility,height,bottom] duration-300 ease-out motion-reduce:transition-none",
            sheetFull ? "h-[calc(100svh-4rem-env(safe-area-inset-bottom)-0.75rem)]" : "h-[50svh]",
            drag > 0 && "transition-none",
            "lg:static lg:z-auto lg:h-svh lg:translate-y-0 lg:visible lg:rounded-none lg:border-t-0 lg:border-r lg:shadow-none",
            !sheet && "invisible translate-y-[calc(100%+4rem)]",
          )}
        >
          {/* Ручка — кнопка: касание переключает высоту, жест вниз/вверх — уменьшить/закрыть/развернуть. */}
          <button
            type="button"
            data-testid="sheet-handle"
            aria-label={sheetFull ? "Уменьшить панель" : "Развернуть панель"}
            aria-expanded={sheetFull}
            className="relative flex h-6 w-full shrink-0 cursor-grab touch-none items-start justify-center pt-2 outline-none focus-visible:bg-muted lg:hidden"
            {...sheetHandle}
          >
            <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          </button>
          <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background/95 px-4 pb-3 backdrop-blur lg:gap-3 lg:pt-3">
            {/* <a href="/" aria-label="На главную" className="shrink-0">
              <img src="/logo.webp" alt="" width={44} height={32} className="h-8 w-auto" />
            </a> */}
            {/* В шторке на телефоне заголовок не нужен и сжимался бы рядом с кнопками — там он только для скринридеров. */}
            <h1 className="sr-only">Редактор приглашения</h1>
            <div className="flex min-w-0 flex-1 flex-col gap-1 lg:hidden">
              {/* На телефоне вкладки — в нижней панели, а в шапке шторки — название открытого раздела. */}
              <p aria-hidden="true" className="truncate text-base font-semibold lg:hidden">
                {tab}
              </p>
            </div>
            <nav aria-label="Действия" className="flex shrink-0 items-center gap-1.5 lg:flex-1 lg:gap-2">
              {gate ? (
                <>
                  <Button type="button" variant="outline" size="sm" className={actionBtn} onClick={() => setGateFor("editor")}>
                    <ExternalLink /> <span className="max-lg:sr-only">Открыть</span>
                  </Button>
                  <Button type="button" variant="outline" size="sm" className={actionBtn} onClick={() => setGateFor("guests")}>
                    <Users /> <span className="max-lg:sr-only">Гости</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm" className={actionBtn}>
                    <a href={`/i/${slug}`} target="_blank" rel="noopener">
                      <ExternalLink /> <span className="max-lg:sr-only">Открыть</span>
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm" className={actionBtn}>
                    <a href={`/edit/${id}/guests?token=${token}`}>
                      <Users /> <span className="max-lg:sr-only">Гости</span>
                    </a>
                  </Button>
                </>
              )}
            {/* Главное действие редактора — отправить гостям ссылку: одна заметная кнопка, остальное — второстепенное. */}
            <Button
              type="button"
              size="sm"
              className="hidden lg:ml-auto lg:inline-flex"
              onClick={() => {
                setTab("Ссылка");
                setIntro(false);
              }}
            >
              <Send /> Поделиться
            </Button>
              {account && <AccountMenu user={account.user} />}
              <Button type="button" variant="ghost" size="icon-sm" className="size-10 lg:hidden" aria-label="Свернуть панель" onClick={() => setSheet(false)}>
                <ChevronDown />
              </Button>
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
            {/* На телефоне те же разделы — в нижней панели; второй ряд вкладок там только мешал бы. */}
            <div className="hidden border-b px-4 py-3 lg:block">
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
                <LinkPanel id={id} token={token} slug={slug} onSlugChange={setSlug} account={account} />
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
          <div className="flex w-full max-w-[433px] flex-wrap items-center gap-2 px-3 lg:px-0">
            <Button type="button" variant="outline" size="icon-sm" className="pointer-coarse:size-10" onClick={reloadPreview} aria-label="Перезагрузить" title="Перезагрузить превью">
              <RotateCw />
            </Button>
            <div role="group" aria-label="История правок" className="flex">
              <Button type="button" variant="ghost" size="icon-sm" className="pointer-coarse:size-10" aria-label="Отменить" title="Отменить (⌘Z)" disabled={history.past.length === 0} onClick={undoEdit}>
                <Undo2 />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" className="pointer-coarse:size-10" aria-label="Повторить" title="Повторить (⇧⌘Z)" disabled={history.future.length === 0} onClick={redoEdit}>
                <Redo2 />
              </Button>
            </div>
            <Badge role="status" data-testid="save-status" variant={statusInfo.variant}>
              {statusInfo.icon}
              {/* На узком экране «Сохранено/Сохраняю» — только значком (текст для скринридеров), ошибки — всегда словами. */}
              <span className={cn((status === "saved" || status === "saving") && "max-sm:sr-only")}>{statusInfo.text}</span>
            </Badge>
            <label
              className="ml-auto flex min-h-8 cursor-pointer pointer-coarse:min-h-10 items-center gap-2 text-sm"
              title="Прокручивать превью к блоку, который открыт в редакторе"
            >
              <Switch checked={follow} onCheckedChange={toggleFollow} aria-label="Следовать за редактируемым блоком" />
              Следовать
            </label>
          </div>
          {pickTip && !(sheet && !desktop) && (
            <p role="note" className="mx-3 flex w-[calc(100%-1.5rem)] max-w-[433px] items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-sm lg:mx-0 lg:w-full">
              <MousePointerClick className="size-4 shrink-0 text-primary" />
              <span className="flex-1">Нажмите на любой блок в превью, чтобы изменить его</span>
              <Button type="button" variant="ghost" size="icon-xs" className="pointer-coarse:size-9" aria-label="Закрыть подсказку" onClick={closePickTip}>
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

        <nav
          aria-label="Разделы редактора"
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t bg-background pb-[env(safe-area-inset-bottom)] transition-[translate] duration-200 motion-reduce:transition-none lg:hidden",
          )}
        >
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
                className="group flex h-16 touch-manipulation flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground outline-none aria-pressed:font-medium aria-pressed:text-foreground focus-visible:bg-muted"
              >
                {/* Активный раздел — «таблетка» под иконкой, а не только цвет текста. */}
                <span className="flex h-7 w-14 items-center justify-center rounded-full transition-colors group-active:bg-muted group-aria-pressed:bg-primary/12 motion-reduce:transition-none">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                {t}
              </button>
            );
          })}
        </nav>
      </div>
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

