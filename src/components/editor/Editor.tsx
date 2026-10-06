"use client";

import { AlertCircle, Check, CircleCheck, Crown, ExternalLink, Loader2, RotateCw, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { accountGate, type ClaimNext, type Ownership } from "@/lib/access";
import { premiumUsage } from "@/lib/premium";
import { themeStyle } from "@/lib/theme";
import type { SessionUser } from "@/lib/session";
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

/** Масштаб телефона под место: по ширине всегда, по высоте — только на десктопе (там превью без прокрутки). */
function usePhoneScale(fit: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = fit.current;
    if (!el) return;
    const update = () => {
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      const s = Math.min(1, el.clientWidth / PHONE_W, desktop ? el.clientHeight / PHONE_H : 1);
      if (s > 0) setScale(s);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fit]);
  return scale;
}

/** Плашка «PRO-оформление» над вкладками. Пока тарифов нет — скрыта; значки PRO на плитках остаются. */
const SHOW_PREMIUM_ALERT = false;

export function Editor({ id, token, initialSlug, initialData, account, notice }: Props) {
  const [data, setData] = useState(initialData);
  const [slug, setSlug] = useState(initialSlug);

  const save = useCallback((d: InvitationData) => patchInvitation(id, token, { data: d }), [id, token]);
  const { status, errors } = useAutosave(data, save, validate, 800);
  const statusInfo = statusView[status];
  const musicUrl = data.music.url;
  const music = useInvitationMusic(musicUrl);
  const premium = useMemo(() => (SHOW_PREMIUM_ALERT ? premiumUsage(data) : []), [data]);

  const previewRef = useRef<HTMLDivElement>(null);
  const phoneFitRef = useRef<HTMLDivElement>(null);
  const phoneScale = usePhoneScale(phoneFitRef);
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

  function toggleFollow(on: boolean) {
    setFollow(on);
    if (on && expanded) scrollPreview(expanded);
  }

  function reloadPreview() {
    setPreviewKey((k) => k + 1);
    previewRef.current?.scrollTo({ top: 0 });
  }

  return (
    <UploadTargetContext.Provider value={uploadTarget}>
      <div className="min-h-svh bg-muted/60 lg:grid lg:h-svh lg:grid-cols-[460px_1fr]">
        <aside className="flex flex-col border-r bg-background lg:h-svh">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
            {/* <a href="/" aria-label="На главную" className="shrink-0">
              <img src="/logo.webp" alt="" width={44} height={32} className="h-8 w-auto" />
            </a> */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h1 className="text-base leading-none font-semibold">Редактор приглашения</h1>
            </div>
            <nav className="flex gap-2">
              {gate ? (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => setGateFor("editor")}>
                    <ExternalLink /> Открыть
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setGateFor("guests")}>
                    <Users /> Гости
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm">
                    <a href={`/i/${slug}`} target="_blank">
                      <ExternalLink /> Открыть
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={`/edit/${id}/guests?token=${token}`}>
                      <Users /> Гости
                    </a>
                  </Button>
                </>
              )}
              {account && <AccountMenu user={account.user} />}
            </nav>
          </header>

          <Tabs defaultValue={notice ? "Ссылка" : TABS[0]} onValueChange={() => setIntro(false)} className="flex min-h-0 flex-1 flex-col gap-0">
            <div className="border-b px-4 py-3">
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
            <div className="relative flex-1 p-4 lg:overflow-y-auto">
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
        <section aria-label="Превью" className="flex flex-col items-center gap-3 overflow-hidden px-2 pt-4 pb-10 lg:h-svh lg:min-h-0 lg:p-8">
          <div className="flex w-full max-w-[433px] flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="icon-sm" onClick={reloadPreview} aria-label="Перезагрузить" title="Перезагрузить превью">
              <RotateCw />
            </Button>
            <Badge role="status" data-testid="save-status" variant={statusInfo.variant}>
              {statusInfo.icon}
              {statusInfo.text}
            </Badge>
            <label
              className="ml-auto flex cursor-pointer items-center gap-2 text-sm"
              title="Прокручивать превью к блоку, который открыт в редакторе"
            >
              <Switch checked={follow} onCheckedChange={toggleFollow} aria-label="Следовать за редактируемым блоком" />
              Следовать за контентом
            </label>
          </div>
          <div ref={phoneFitRef} className="flex w-full justify-center lg:min-h-0 lg:flex-1 lg:items-center">
            <div className="shrink-0" style={{ width: PHONE_W * phoneScale, height: PHONE_H * phoneScale }}>
          <Iphone
            className="drop-shadow-2xl"
            style={{ width: PHONE_W, transform: `scale(${phoneScale})`, transformOrigin: "top left" }}
          >
            <div className="relative h-full">
              <div ref={previewRef} className="h-full overflow-y-auto" data-testid="preview">
                <InvitationView key={previewKey} data={data} slug={slug} preview />
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
          </Iphone>
            </div>
          </div>
        </section>
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
