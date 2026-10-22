'use client';
/* oxlint-disable next/no-img-element -- Local reference photographs retain their source credits. */
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePassport } from '@/components/stories/Passport';
import { stories } from '@/content/stories';
import {
  initialTrip,
  prerequisite,
  interact,
  arrive,
  type Action,
  type Point,
} from '@/components/elsewhere/journey';
import './station.css';
const Scene = lazy(() => import('@/components/elsewhere/StationScene'));
const labels: Record<string, string> = {
  bag: '拿起行李',
  ticket: '領取車票',
  board: '上車',
  alight: '下車',
  stamp: '蓋旅程印章',
  postcard: '翻閱明信片',
};
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="station-loading">3D 場景載入失敗，請重新整理後再試。</p>
    ) : (
      this.props.children
    );
  }
}
export default function ElsewherePage() {
  const { character } = usePassport();
  const [trip, setTrip] = useState(initialTrip),
    [nearby, setNearby] = useState<Action | null>(null),
    [holding, setHolding] = useState(false),
    [overview, setOverview] = useState(false),
    [cameraReset, setCameraReset] = useState(0),
    [autoJourney, setAutoJourney] = useState(false),
    [autoStage, setAutoStage] = useState(''),
    [cityPicker, setCityPicker] = useState(false),
    [menuOpen, setMenuOpen] = useState(false),
    [travelRequest, setTravelRequest] = useState<{
      city: number | 'home';
      sequence: number;
    } | null>(null),
    [firstPerson, setFirstPerson] = useState(false),
    [cancelJourney, setCancelJourney] = useState(0),
    [progress, setProgress] = useState(0),
    [reset, setReset] = useState(0);
  const close = useRef<HTMLButtonElement>(null),
    action = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const release = () => setHolding(false);
    window.addEventListener('blur', release);
    window.addEventListener('pointerup', release);
    document.addEventListener('visibilitychange', release);
    return () => {
      window.removeEventListener('blur', release);
      window.removeEventListener('pointerup', release);
      document.removeEventListener('visibilitychange', release);
    };
  }, []);
  const journey = stories.journeys[trip.city];
  const photos =
    journey?.photoIds.flatMap((id) => {
      const photo = stories.photos.find((p) => p.id === id);
      return photo ? [photo] : [];
    }) ?? [];
  function act(a: Action, at: Point) {
    setTrip((previous) => interact(previous, a, at, stories.journeys.length));
  }
  function closeJournal() {
    setTrip((previous) => ({ ...previous, postcard: false }));
    action.current?.focus();
  }
  useEffect(() => {
    if (!trip.postcard) return;
    close.current?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTrip((previous) => ({ ...previous, postcard: false }));
        action.current?.focus();
      }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [trip.postcard]);
  const available =
    trip.phase === 'onboard'
      ? 'alight'
      : trip.phase === 'walking'
        ? nearby
        : null;
  const missing = available ? prerequisite(trip, available) : null;
  return (
    <main className="station-page" data-menu-open={menuOpen}>
      <nav className="station-nav">
        <Link href="/">← Island</Link>
        <span>ELSEWHERE STATION · 一段親手完成的旅程</span>
        <button
          className="station-menu-toggle"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? '收起 ×' : '選單 ☰'}
        </button>
        <button
          className="station-menu-extra station-menu-action"
          disabled={trip.phase === 'riding'}
          onClick={() => {
            setCityPicker(true);
            setMenuOpen(false);
          }}
        >
          選擇車站
        </button>
        <button
          className="station-menu-extra station-menu-action"
          onClick={() => {
            setFirstPerson((value) => !value);
            setMenuOpen(false);
          }}
        >
          {firstPerson ? '第三視角' : '第一視角'}
        </button>
        <button
          className="station-menu-action"
          onClick={() => {
            setMenuOpen(false);
            setFirstPerson(false);
            setOverview(false);
            setCameraReset((v) => v + 1);
          }}
        >
          找到我
        </button>
        <button
          className="station-menu-action"
          onClick={() => {
            setMenuOpen(false);
            setFirstPerson(false);
            setOverview(true);
            setCameraReset((v) => v + 1);
          }}
        >
          環線總覽
        </button>
        <button
          className="station-menu-action"
          onClick={() => {
            setCityPicker(false);
            setMenuOpen(false);
            setFirstPerson(false);
            setTravelRequest(null);
            setTrip(initialTrip());
            setNearby(null);
            setHolding(false);
            setOverview(false);
            setProgress(0);
            setReset((v) => v + 1);
          }}
        >
          重新開始
        </button>
      </nav>
      <section className="station-world" aria-label="可步行探索的旅行車站">
        <Boundary>
          <Suspense
            fallback={
              <div className="station-loading">
                <p>正在開啟旅行車站…</p>
                <progress aria-label="載入 3D 車站" />
              </div>
            }
          >
            <Scene
              key={reset}
              character={character}
              travelRequest={travelRequest}
              trip={trip}
              journeys={stories.journeys}
              holding={holding}
              overview={overview}
              firstPerson={firstPerson}
              cameraReset={cameraReset}
              cancelJourney={cancelJourney}
              onAutoChange={setAutoJourney}
              onStage={setAutoStage}
              onProgress={setProgress}
              onAction={act}
              onArrive={() => setTrip((previous) => arrive(previous))}
              onNearby={setNearby}
            />
          </Suspense>
        </Boundary>
        <div className="station-scene-tools">
          <button
            aria-expanded={cityPicker}
            aria-controls="station-city-picker"
            disabled={trip.phase === 'riding'}
            onClick={() => setCityPicker((v) => !v)}
          >
            選擇車站
          </button>
          {
            <button
              className="station-camera-toggle"
              aria-pressed={firstPerson}
              onClick={() => setFirstPerson((v) => !v)}
            >
              {firstPerson ? '第三視角' : '第一視角'}
            </button>
          }
        </div>
        {cityPicker && (
          <section
            id="station-city-picker"
            className="station-city-picker"
            aria-label="選擇旅行城市"
          >
            <header>
              <strong>下一站去哪裡？</strong>
              <button
                onClick={() => setCityPicker(false)}
                aria-label="關閉城市選擇"
              >
                ×
              </button>
            </header>
            <p>點一下，角色會自動準備並搭車前往。</p>
            <div>
              <button
                disabled={trip.area === 'station'}
                onClick={() => {
                  setTravelRequest((previous) => ({
                    city: 'home',
                    sequence: (previous?.sequence ?? 0) + 1,
                  }));
                  setCityPicker(false);
                }}
              >
                <span>Elsewhere Station · 起點</span>
                <small>{trip.area === 'station' ? '目前所在' : '返回 →'}</small>
              </button>
              {stories.journeys.map((city, index) => (
                <button
                  key={city.id}
                  disabled={trip.area === 'city' && trip.city === index}
                  onClick={() => {
                    setTravelRequest((previous) => ({
                      city: index,
                      sequence: (previous?.sequence ?? 0) + 1,
                    }));
                    setCityPicker(false);
                  }}
                >
                  <span>{city.city}</span>
                  <small>
                    {trip.area === 'city' && trip.city === index
                      ? '目前所在'
                      : '出發 →'}
                  </small>
                </button>
              ))}
            </div>
          </section>
        )}
      </section>
      <aside className="station-inventory" aria-label="旅行物品">
        <strong className="station-location" aria-live="polite">
          {trip.phase === 'riding'
            ? `前往 ${trip.destination === null ? 'Elsewhere Station' : stories.journeys[trip.destination]?.city} · 搭車中`
            : `你在 ${trip.area === 'station' ? 'Elsewhere Station · 起點' : journey?.city}`}
          <small>
            {firstPerson ? '第一視角' : overview ? '環線總覽' : '第三視角'} ·
            點「找到我」回到角色
          </small>
        </strong>
        <span className={trip.bag ? 'is-owned' : ''}>
          ▣ {trip.bag ? '行李已拿取' : '行李未拿取'}
        </span>
        <span className={trip.ticket === trip.city ? 'is-owned' : ''}>
          ▤ {trip.ticket === trip.city ? `${journey?.city} 車票` : '尚未領票'}
        </span>
        <span>◎ {trip.stamps.length} 枚印章</span>
      </aside>
      <aside className="station-playbar" aria-label="角色操作">
        <div>
          <small>
            {trip.area === 'station'
              ? 'DEPARTURE PLATFORM'
              : journey?.city.toUpperCase()}{' '}
            {trip.phase === 'riding' ? ' / IN TRANSIT' : ''}
          </small>
          <output aria-live="polite">{autoStage || trip.message}</output>
          <p>
            <span className="station-desktop-help">
              點城市自動出發 · 右鍵 / Shift＋拖曳平移 · 按住 Space 操作
            </span>
            <span className="station-touch-help">
              點地面走路 · 單指轉動 · 雙指平移／縮放 · 按住按鈕操作
            </span>
          </p>
        </div>
        {autoJourney ? (
          <div className="station-auto-controls">
            <button onClick={() => setCancelJourney((v) => v + 1)}>
              取消自動行程
            </button>
          </div>
        ) : !available && trip.phase !== 'riding' ? (
          <button
            className="station-primary"
            onClick={() => setCityPicker(true)}
          >
            選擇目的地 →
          </button>
        ) : available?.startsWith('city:') ? (
          <div className="station-destination-hint">
            <strong>點城市，自動準備並出發</strong>
            <span>← → 快速切換 · W / S 離開班次牌</span>
          </div>
        ) : (
          <button
            ref={action}
            className="station-primary station-hold"
            disabled={!available || trip.postcard}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              setHolding(true);
            }}
            onPointerUp={() => setHolding(false)}
            onPointerCancel={() => setHolding(false)}
            onLostPointerCapture={() => setHolding(false)}
            onPointerLeave={() => setHolding(false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <span className="station-hold-ring" aria-hidden="true">
              <svg viewBox="0 0 36 36">
                <circle className="station-hold-track" cx="18" cy="18" r="15" />
                <circle
                  className="station-hold-fill"
                  cx="18"
                  cy="18"
                  r="15"
                  pathLength="100"
                  strokeDasharray="100"
                  strokeDashoffset={100 - progress}
                />
              </svg>
              <span>{missing ? '!' : '␣'}</span>
            </span>
            <span>
              {available
                ? `${missing ? '' : '按住 · '}${labels[available] ?? `選擇 ${stories.journeys[Number(available.split(':')[1])]?.city ?? '目的地'}`}`
                : trip.phase === 'riding'
                  ? '列車行進中…'
                  : '走近物件以互動'}
            </span>
          </button>
        )}
      </aside>
      {trip.postcard && journey && (
        <dialog
          open
          className="station-journal"
          aria-label={`${journey.city} 明信片`}
        >
          <header>
            <span>攝影攤 / {journey.city}</span>
            <button ref={close} onClick={closeJournal} aria-label="收起明信片">
              ×
            </button>
          </header>
          <small>
            {journey.demo
              ? '示範旅程與參考照片，非已驗證的個人旅歷'
              : 'TRAVEL JOURNAL'}
          </small>
          <h2>{journey.city}</h2>
          <h3>{journey.title}</h3>
          {journey.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {photos.map((photo) => (
            <figure key={photo.id}>
              <img
                src={photo.thumbnail}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                loading="lazy"
              />
              <figcaption>
                {photo.title}
                <span>
                  {photo.credit}{' '}
                  {photo.sourceUrl && (
                    <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
                      照片來源 ↗
                    </a>
                  )}
                </span>
              </figcaption>
            </figure>
          ))}
          <Link href="/atlas/world">打開 Memory Atlas ↗</Link>
        </dialog>
      )}
    </main>
  );
}
