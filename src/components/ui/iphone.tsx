import type { HTMLAttributes, ReactNode } from "react"

const PHONE_WIDTH = 433
const PHONE_HEIGHT = 882
// Наша доработка: рамка экрана тоньше, чем в оригинале Magic UI (там 21.25/19.25 — ≈15 px чёрного поля).
const SCREEN_X = 14
const SCREEN_Y = 11
const SCREEN_WIDTH = 404
const SCREEN_HEIGHT = 860
const SCREEN_RADIUS = 63

// Calculated percentages
const LEFT_PCT = (SCREEN_X / PHONE_WIDTH) * 100
const TOP_PCT = (SCREEN_Y / PHONE_HEIGHT) * 100
const WIDTH_PCT = (SCREEN_WIDTH / PHONE_WIDTH) * 100
const HEIGHT_PCT = (SCREEN_HEIGHT / PHONE_HEIGHT) * 100
const RADIUS_H = (SCREEN_RADIUS / SCREEN_WIDTH) * 100
const RADIUS_V = (SCREEN_RADIUS / SCREEN_HEIGHT) * 100

export interface IphoneProps extends HTMLAttributes<HTMLDivElement> {
  src?: string
  videoSrc?: string
  /** Наша доработка: живое содержимое экрана (превью приглашения) вместо картинки/видео. */
  children?: ReactNode
}

/** Положение и скругление экрана внутри рамки — в долях, чтобы телефон масштабировался целиком. */
const screenStyle = {
  left: `${LEFT_PCT}%`,
  top: `${TOP_PCT}%`,
  width: `${WIDTH_PCT}%`,
  height: `${HEIGHT_PCT}%`,
  borderRadius: `${RADIUS_H}% / ${RADIUS_V}%`,
}

export function Iphone({
  src,
  videoSrc,
  className,
  style,
  children,
  ...props
}: IphoneProps) {
  const hasVideo = !!videoSrc
  const hasMedia = hasVideo || !!src || !!children

  return (
    <div
      className={`relative inline-block w-full align-middle leading-none ${className}`}
      style={{
        aspectRatio: `${PHONE_WIDTH}/${PHONE_HEIGHT}`,
        ...style,
      }}
      {...props}
    >
      {hasVideo && (
        <div
          className="pointer-events-none absolute z-0 overflow-hidden"
          style={{
            left: `${LEFT_PCT}%`,
            top: `${TOP_PCT}%`,
            width: `${WIDTH_PCT}%`,
            height: `${HEIGHT_PCT}%`,
            borderRadius: `${RADIUS_H}% / ${RADIUS_V}%`,
          }}
        >
          <video
            className="block size-full object-cover"
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
        </div>
      )}

      {!hasVideo && src && (
        <div
          className="pointer-events-none absolute z-0 overflow-hidden"
          style={{
            left: `${LEFT_PCT}%`,
            top: `${TOP_PCT}%`,
            width: `${WIDTH_PCT}%`,
            height: `${HEIGHT_PCT}%`,
            borderRadius: `${RADIUS_H}% / ${RADIUS_V}%`,
          }}
        >
          <img
            src={src}
            alt=""
            className="block size-full object-cover object-top"
          />
        </div>
      )}

      {children && !hasVideo && !src && (
        // Экран с содержимым: прокрутка и клики работают, рамка (svg) поверх кликов не ловит.
        <div className="absolute z-0 overflow-hidden" style={screenStyle}>
          {children}
        </div>
      )}

      <svg
        viewBox={`0 0 ${PHONE_WIDTH} ${PHONE_HEIGHT}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute inset-0 z-10 size-full"
        style={{ transform: "translateZ(0)" }}
      >
        <g mask={hasMedia ? "url(#screenPunch)" : undefined}>
          <path
            d="M2 73C2 32.6832 34.6832 0 75 0H357C397.317 0 430 32.6832 430 73V809C430 849.317 397.317 882 357 882H75C34.6832 882 2 849.317 2 809V73Z"
            fill="url(#iphoneTitanium)" stroke="#5a5a5e" strokeWidth="0.75"
          />
          <path
            d="M0 171C0 170.448 0.447715 170 1 170H3V204H1C0.447715 204 0 203.552 0 203V171Z"
            fill="url(#iphoneButton)"
          />
          <path
            d="M1 234C1 233.448 1.44772 233 2 233H3.5V300H2C1.44772 300 1 299.552 1 299V234Z"
            fill="url(#iphoneButton)"
          />
          <path
            d="M1 319C1 318.448 1.44772 318 2 318H3.5V385H2C1.44772 385 1 384.552 1 384V319Z"
            fill="url(#iphoneButton)"
          />
          <path
            d="M430 279H432C432.552 279 433 279.448 433 280V384C433 384.552 432.552 385 432 385H430V279Z"
            fill="url(#iphoneButton)"
          />
          <path
            d="M6 74C6 35.3401 37.3401 4 76 4H356C394.66 4 426 35.3401 426 74V808C426 846.66 394.66 878 356 878H76C37.3401 878 6 846.66 6 808V74Z"
            fill="#1f1f22"
          />
        </g>

        <path
          opacity="0.5"
          d="M174 5H258V5.5C258 6.60457 257.105 7.5 256 7.5H176C174.895 7.5 174 6.60457 174 5.5V5Z"
          fill="#3a3a3c"
        />

        <path
          d={`M${SCREEN_X} ${SCREEN_Y + SCREEN_RADIUS}A${SCREEN_RADIUS} ${SCREEN_RADIUS} 0 0 1 ${SCREEN_X + SCREEN_RADIUS} ${SCREEN_Y}H${SCREEN_X + SCREEN_WIDTH - SCREEN_RADIUS}A${SCREEN_RADIUS} ${SCREEN_RADIUS} 0 0 1 ${SCREEN_X + SCREEN_WIDTH} ${SCREEN_Y + SCREEN_RADIUS}V${SCREEN_Y + SCREEN_HEIGHT - SCREEN_RADIUS}A${SCREEN_RADIUS} ${SCREEN_RADIUS} 0 0 1 ${SCREEN_X + SCREEN_WIDTH - SCREEN_RADIUS} ${SCREEN_Y + SCREEN_HEIGHT}H${SCREEN_X + SCREEN_RADIUS}A${SCREEN_RADIUS} ${SCREEN_RADIUS} 0 0 1 ${SCREEN_X} ${SCREEN_Y + SCREEN_HEIGHT - SCREEN_RADIUS}Z`}
          fill="#000" stroke="#000" strokeWidth="0.5"
          mask={hasMedia ? "url(#screenPunch)" : undefined}
        />

        <g transform="translate(0 -8)">
          <path
            d="M154 48.5C154 38.2827 162.283 30 172.5 30H259.5C269.717 30 278 38.2827 278 48.5C278 58.7173 269.717 67 259.5 67H172.5C162.283 67 154 58.7173 154 48.5Z"
            fill="#000"
          />
          <path
            d="M249 48.5C249 42.701 253.701 38 259.5 38C265.299 38 270 42.701 270 48.5C270 54.299 265.299 59 259.5 59C253.701 59 249 54.299 249 48.5Z"
            fill="#0b0b0d"
          />
          <path
            d="M254 48.5C254 45.4624 256.462 43 259.5 43C262.538 43 265 45.4624 265 48.5C265 51.5376 262.538 54 259.5 54C256.462 54 254 51.5376 254 48.5Z"
            fill="url(#iphoneLens)"
          />
        </g>

        <defs>
          {/* Наша доработка: «чёрный титан» вместо светло-серого макета — металлическая рамка с бликами, чёрный экран. */}
          <linearGradient id="iphoneTitanium" x1="0" y1="0" x2={PHONE_WIDTH} y2={PHONE_HEIGHT} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4a4a4e" />
            <stop offset="0.18" stopColor="#232325" />
            <stop offset="0.5" stopColor="#1a1a1c" />
            <stop offset="0.82" stopColor="#232325" />
            <stop offset="1" stopColor="#48484c" />
          </linearGradient>
          <linearGradient id="iphoneButton" x1="0" y1="0" x2={PHONE_WIDTH} y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3c3c40" />
            <stop offset="1" stopColor="#2a2a2d" />
          </linearGradient>
          <radialGradient id="iphoneLens" cx="258" cy="47" r="7" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#2b3350" />
            <stop offset="0.6" stopColor="#12141c" />
            <stop offset="1" stopColor="#050506" />
          </radialGradient>
          <mask id="screenPunch" maskUnits="userSpaceOnUse">
            <rect
              x="0"
              y="0"
              width={PHONE_WIDTH}
              height={PHONE_HEIGHT}
              fill="white"
            />
            <rect
              x={SCREEN_X}
              y={SCREEN_Y}
              width={SCREEN_WIDTH}
              height={SCREEN_HEIGHT}
              rx={SCREEN_RADIUS}
              ry={SCREEN_RADIUS}
              fill="black"
            />
          </mask>
          <clipPath id="roundedCorners">
            <rect
              x={SCREEN_X}
              y={SCREEN_Y}
              width={SCREEN_WIDTH}
              height={SCREEN_HEIGHT}
              rx={SCREEN_RADIUS}
              ry={SCREEN_RADIUS}
            />
          </clipPath>
        </defs>
      </svg>
    </div>
  )
}
