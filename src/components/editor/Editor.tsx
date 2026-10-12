"use client";

import { AlertCircle, ArrowLeft, Check, ChevronDown, Redo2, Undo2, CircleCheck, Crown, Eye, LayoutList, Link2, Loader2, MousePointerClick, Music, Palette, RotateCw, Send, Settings, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import { AccountMenu } from "@/components/account/AccountMenu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { DecorLayer } from "@/components/invitation/DecorLayer";
import { InvitationView } from "@/components/invitation/InvitationView";
import { prefersReducedMotion } from "@/components/invitation/motion";
import { MusicButton, useInvitationMusic } from "@/components/invitation/music";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Iphone } from "@/components/ui/iphone";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
/** required — обязателен ли вход для ссылки, «Открыть» и «Гости» (authRequired); не задано — обязателен. */
export type EditorAccount = { user: SessionUser | null; ownership: Ownership; required?: boolean };

/** Чем закончилось «Сохранить в аккаунт» (параметр saved после возврата из входа). */
export type SaveNotice = "1" | "taken" | "login";

type Props = {
  id: string;
  token: string;
  initialSlug: string;
  initialData: InvitationData;
  account?: EditorAccount;
  notice?: SaveNotice;
  /** Только в разработке: адрес сервера в Wi-Fi сети (lib/lan.ts) — для ссылки, которую откроют с телефона. */
  lanOrigin?: string | null;
  /**
   * Правка шаблона из админки (/admin): в шапке вместо «Открыть / Гости / Поделиться» — возврат в админку и свои
   * действия (`actions` получает текущие данные и setData — «Сохранить в шаблон» подставляет новые адреса фото).
   */
  templateMode?: { name: string; backHref: string; actions: (data: InvitationData, setData: (next: InvitationData) => void) => ReactNode };
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
/** Круглые кнопки-иконки в шапке панели — как переключатель темы рядом. */
const headerIcon =
  "inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none";

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

/** Жест «закрыть шторку»: сдвиг вниз больше порога или быстрый смах. */
const SWIPE_CLOSE_PX = 100;
const SWIPE_CLOSE_SPEED = 0.45; // px/мс у отпускания — как у системных sheet
/**
 * Порог намерения: пока палец сдвинулся меньше — это нажатие, жест не вмешивается. iOS Safari отменяет нажатие,
 * если во время касания вызвать preventDefault на touchmove, а палец при обычном нажатии «дрожит» на 5–10 px.
 */
const SWIPE_SLOP = 12;
/** Под пальцем то, что само обрабатывает перетаскивание: ползунки, волна, ручки dnd-kit (touch-none), поля ввода. */
const OWN_DRAG = '.touch-none, [role="slider"], input, textarea, select, [contenteditable="true"]';

/** Ближайший к цели вертикально прокручиваемый предок внутри шторки (список, панель). */
function scrollableIn(target: EventTarget | null, root: HTMLElement): HTMLElement | null {
  for (let el = target instanceof Element ? target : null; el && el !== root; el = el.parentElement) {
    if (!(el instanceof HTMLElement)) continue;
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) return el;
  }
  return null;
}

/**
 * Шторку можно тянуть вниз с любой точки, как системные sheet в iOS: если под пальцем прокручиваемый список и он
 * не в самом верху — сначала прокручивается он; как только дошёл до верха, дальше вниз едет уже шторка (с этой
 * точки). Отпустили после порога или смахнули — закрыть, иначе вернуть. Горизонтальные жесты и элементы со своим
 * перетаскиванием (OWN_DRAG) не перехватываются. Только касания: мышью тянут за ручку.
 */
function useSheetSwipe(ref: React.RefObject<HTMLElement | null>, enabled: boolean, setDrag: (px: number) => void, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;
    /** Жест: старт, ось, точка, с которой едет шторка (null — ещё прокручивается список), сдвиг и скорость у отпускания. */
    let g: {
      x: number;
      y: number;
      scroller: HTMLElement | null;
      axis: "x" | "y" | null;
      origin: number | null;
      dy: number;
      lastY: number;
      lastT: number;
      vy: number;
    } | null = null;

    const start = (e: TouchEvent) => {
      if (e.touches.length !== 1) return (g = null);
      const target = e.target as Element | null;
      if (target?.closest?.(OWN_DRAG) || target?.closest?.('[data-testid="sheet-handle"]')) return (g = null);
      const t = e.touches[0];
      g = { x: t.clientX, y: t.clientY, scroller: scrollableIn(e.target, root), axis: null, origin: null, dy: 0, lastY: t.clientY, lastT: performance.now(), vy: 0 };
    };
    const move = (e: TouchEvent) => {
      if (!g) return;
      const t = e.touches[0];
      const dx = t.clientX - g.x;
      const dy = t.clientY - g.y;
      // Скорость пальца у отпускания (сглаженная): быстрый короткий смах тоже закрывает.
      const now = performance.now();
      const v = (t.clientY - g.lastY) / Math.max(1, now - g.lastT);
      g.vy = g.vy * 0.4 + v * 0.6;
      g.lastY = t.clientY;
      g.lastT = now;
      if (!g.axis) {
        if (Math.abs(dx) < SWIPE_SLOP && Math.abs(dy) < SWIPE_SLOP) return;
        g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (g.axis === "x") return;
      // Список ещё не наверху — пусть прокручивается он; шторку начнём тянуть с момента, когда он дойдёт до верха.
      if (g.origin === null) {
        if (dy <= 0 || (g.scroller && g.scroller.scrollTop > 0)) return;
        g.origin = t.clientY;
      }
      const pull = t.clientY - g.origin;
      if (pull < 0) {
        g.origin = null; // повели обратно вверх — снова прокрутка списка
        setDrag(0);
        return;
      }
      if (pull === 0) return; // точка старта шторки — ещё не тянем и ничего не отменяем
      e.preventDefault(); // иначе браузер прокрутит/оттянет страницу вместо шторки
      g.dy = pull;
      setDrag(pull);
    };
    // Шторку потянули и отпустили над кнопкой — эта кнопка не должна сработать.
    let swallowClick = false;
    const click = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    };
    const end = () => {
      if (!g || g.origin === null || g.dy === 0) return (g = null);
      swallowClick = true;
      setTimeout(() => (swallowClick = false), 400);
      setDrag(0);
      if (g.dy > SWIPE_CLOSE_PX || (g.dy > 30 && g.vy > SWIPE_CLOSE_SPEED)) closeRef.current();
      g = null;
    };
    root.addEventListener("touchstart", start, { passive: true });
    root.addEventListener("touchmove", move, { passive: false });
    root.addEventListener("touchend", end);
    root.addEventListener("touchcancel", end);
    root.addEventListener("click", click, true);
    return () => {
      root.removeEventListener("click", click, true);
      root.removeEventListener("touchstart", start);
      root.removeEventListener("touchmove", move);
      root.removeEventListener("touchend", end);
      root.removeEventListener("touchcancel", end);
    };
  }, [ref, enabled, setDrag]);
}

export function Editor({ id, token, initialSlug, initialData, account, notice, lanOrigin, templateMode }: Props) {
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
  const music = useInvitationMusic(musicUrl, data.music);
  const premium = useMemo(() => (SHOW_PREMIUM_ALERT ? premiumUsage(data) : []), [data]);

  const previewRef = useRef<HTMLDivElement>(null);
  // Рамка и ярлычок выбранного блока видны, пока человек работает с превью; нажатие вне превью их прячет —
  // чтобы правка в панели показывала приглашение как у гостя.
  const [showPick, setShowPick] = useState(false);
  useEffect(() => {
    if (!showPick) return;
    const hide = (e: PointerEvent) => {
      if (!previewRef.current?.contains(e.target as Node)) setShowPick(false);
    };
    document.addEventListener("pointerdown", hide, true);
    return () => document.removeEventListener("pointerdown", hide, true);
  }, [showPick]);
  const phoneFitRef = useRef<HTMLDivElement>(null);
  const desktop = useIsDesktop();
  const phoneScale = usePhoneScale(phoneFitRef, desktop);
  /** Телефон: панель — шторка снизу, открыта или нет. На компьютере не используется (панель всегда слева). */
  // Шторка либо открыта на весь экран, либо закрыта — без промежуточной половины (так попросили).
  const [sheet, setSheetOpen] = useState(!!notice);
  const setSheet = useCallback((open: boolean) => setSheetOpen(open), []);
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
    setShowPick(true);
    panelScrollTo.current = blockId;
    if (pickTip) closePickTip();
  }

  /** Ручка шторки: тянуть вниз — закрыть (шторка идёт за пальцем), касание — закрыть. */
  const [drag, setDrag] = useState(0);
  const asideRef = useRef<HTMLElement>(null);
  useSheetSwipe(asideRef, sheet && !desktop, setDrag, () => setSheet(false));
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
      if (dy > 80) setSheet(false);
    },
    onPointerCancel() {
      dragStart.current = null;
      setDrag(0);
    },
    // Касание без движения (и Enter/пробел с клавиатуры) — click: закрыть шторку.
    onClick() {
      if (Math.abs(dragDelta.current) < 6) setSheet(false);
      dragDelta.current = 0;
    },
  };

  function toggleFollow(on: boolean) {
    setFollow(on);
    if (on && expanded) scrollPreview(expanded);
  }

  /** «Отправить гостям»: панель «Ссылка» с кнопками WhatsApp и Telegram (на телефоне — открыть шторку). */
  function openShare() {
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
      {/* container-type: size — высота экрана превью для фона страницы (100cqh в PageBackground). */}
      <div ref={previewRef} className="editor-pick h-full overflow-y-auto [container-type:size]" data-testid="preview" onClickCapture={pickFromPreview}>
        <InvitationView key={previewKey} data={data} slug={slug} preview selectedBlockId={showPick ? expanded : undefined} />
      </div>
      <DecorLayer key={previewKey} decor={data.theme.decor} contained />
      {/* Музыка — как у гостя: включается печатью заставки или кнопкой-эквалайзером. */}
      {musicUrl && (
        <>
          <audio {...music.audioProps} src={musicUrl} crossOrigin="anonymous" preload="auto" data-testid="preview-music" />
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
          ref={asideRef}
          aria-label="Панель редактора"
          style={drag > 0 ? { translate: `0 ${drag}px` } : undefined}
          className={cn(
            "fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex flex-col rounded-t-2xl border-t bg-background shadow-[0_-12px_40px_rgb(0_0_0/0.18)] transition-[translate,visibility,height,bottom] duration-300 ease-out motion-reduce:transition-none",
            "h-[calc(100svh-4rem-env(safe-area-inset-bottom)-0.75rem)]",
            drag > 0 && "transition-none",
            "lg:static lg:z-auto lg:h-svh lg:translate-y-0 lg:visible lg:rounded-none lg:border-t-0 lg:border-r lg:shadow-none",
            !sheet && "invisible translate-y-[calc(100%+4rem)]",
          )}
        >
          {/* Ручка — кнопка: касание или жест вниз закрывают шторку. */}
          <button
            type="button"
            data-testid="sheet-handle"
            aria-label="Закрыть панель"
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
            <h1 className="sr-only">{templateMode ? `Редактор шаблона «${templateMode.name}»` : "Редактор приглашения"}</h1>
            <div className="flex min-w-0 flex-1 flex-col gap-1 lg:hidden">
              {/* На телефоне вкладки — в нижней панели, а в шапке шторки — название открытого раздела. */}
              <p aria-hidden="true" className="truncate text-base font-semibold lg:hidden">
                {tab}
              </p>
            </div>
            {/* min-w-0: без него длинное название шаблона (без переноса) не даёт шапке сжаться — кнопки вылезали за панель. */}
            <nav aria-label="Действия" className="flex shrink-0 items-center gap-1.5 lg:min-w-0 lg:flex-1 lg:gap-2">
              {templateMode ? (
                <>
                  <Button asChild variant="outline" size="sm" className={actionBtn}>
                    <a href={templateMode.backHref}>
                      <ArrowLeft /> <span className="max-lg:sr-only">Админка</span>
                    </a>
                  </Button>
                  <span className="hidden min-w-0 flex-1 truncate text-sm font-medium lg:block" title={`Шаблон «${templateMode.name}»`}>
                    {templateMode.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">{templateMode.actions(data, setData)}</div>
                </>
              ) : (
                // «Открыть», «Гости» и «Отправить гостям» — над превью; здесь только тема и аккаунт, прижатые вправо.
                <span aria-hidden="true" className="hidden flex-1 lg:block" />
              )}
              {/* Настройки редактора — пока одна; сюда же пойдут следующие. */}
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className={headerIcon} aria-label="Настройки редактора" title="Настройки редактора">
                    <Settings className="size-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72">
                  <label className="flex cursor-pointer items-start gap-3 text-sm">
                    <Switch checked={follow} onCheckedChange={toggleFollow} aria-label="Следовать за редактируемым блоком" className="mt-0.5" />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium">Следовать за редактором</span>
                      <span className="text-muted-foreground">Превью прокручивается к блоку, который открыт в панели</span>
                    </span>
                  </label>
                </PopoverContent>
              </Popover>
              <ThemeToggle />
              {account && <AccountMenu user={account.user} compact />}
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
                <LinkPanel id={id} token={token} slug={slug} onSlugChange={setSlug} account={account} lanOrigin={lanOrigin} data={data} />
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
          {/* На компьютере ряд — ровно по ширине телефона в превью (он уменьшается вместе с окном), не шире. */}
          <div
            className="relative z-[35] flex w-full max-w-[433px] items-center gap-2 px-3 lg:px-0"
            style={desktop ? { maxWidth: PHONE_W * phoneScale } : undefined}
          >
            {/* На телефоне места мало: перезагрузка превью нужна редко, «Отменить» — часто. */}
            <Button type="button" variant="outline" size="icon-sm" className="pointer-coarse:size-10 max-sm:hidden" onClick={reloadPreview} aria-label="Перезагрузить" title="Перезагрузить превью">
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
            {!templateMode && (
              <div className="ml-auto flex gap-2">
                {gate ? (
                  <>
                    <Button type="button" variant="outline" size="sm" className="pointer-coarse:h-10" onClick={() => setGateFor("guests")}>
                      <Users /> <span className="max-sm:sr-only">Гости</span>
                    </Button>
                    <Button type="button" variant="outline" size="icon-sm" className="pointer-coarse:size-10" aria-label="Посмотреть как гость" title="Посмотреть как гость" onClick={() => setGateFor("editor")}>
                      <Eye />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline" size="sm" className="pointer-coarse:h-10">
                      <a href={`/edit/${id}/guests?token=${token}`}>
                        <Users /> <span className="max-sm:sr-only">Гости</span>
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="icon-sm" className="pointer-coarse:size-10">
                      <a href={`/i/${slug}`} target="_blank" rel="noopener" aria-label="Посмотреть как гость" title="Посмотреть как гость">
                        <Eye />
                      </a>
                    </Button>
                  </>
                )}
                {/* Главное действие редактора — отправить гостям ссылку: заметная (основного цвета) кнопка-иконка. */}
                <Button type="button" size="icon-sm" className="pointer-coarse:size-10" aria-label="Отправить гостям" title="Отправить гостям" onClick={openShare}>
                  <Send />
                </Button>
              </div>
            )}
          </div>
          {pickTip && !(sheet && !desktop) && (
            <p
              role="note"
              className="mx-3 flex w-[calc(100%-1.5rem)] max-w-[433px] items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-sm lg:mx-0 lg:w-full"
              style={desktop ? { maxWidth: PHONE_W * phoneScale } : undefined}
            >
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
            <DialogTitle className="sr-only">{gateFor === "guests" ? "Ответы гостей" : "Посмотреть как гость"}</DialogTitle>
            <DialogDescription className="sr-only">Нужно войти и сохранить приглашение в аккаунт</DialogDescription>
            <AccountRequired id={id} token={token} account={account} gate={gate} next={gateFor ?? "editor"} />
          </DialogContent>
        </Dialog>
      )}
    </UploadTargetContext.Provider>
  );
}

