"use client";

import {
  ArrowDown,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  ChevronDown,
  Compass,
  Crosshair,
  Info,
  MapPin,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  Route,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getMapRegion,
  getMapVenue,
  mapCategories,
  mapRegions,
  mapVenues,
  maraudersMapEvents,
  type FestivalEvent,
  type MapCategory,
} from "@/lib/marauders-map";

const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 760;
const MIN_SCALE = 1;
const MAX_SCALE = 2.4;
const BOOKMARK_STORAGE_KEY = "technika27-marauders-map-bookmarks";

type CategoryFilter = "all" | MapCategory;
type Transform = { x: number; y: number; scale: number };
type LocationState = "idle" | "requesting" | "granted" | "denied" | "unavailable";

const initialTransform: Transform = { x: 0, y: 0, scale: 1 };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampTransform(transform: Transform): Transform {
  const { scale } = transform;
  if (scale <= MIN_SCALE) return initialTransform;
  return {
    scale,
    x: clamp(transform.x, VIEWBOX_WIDTH * (1 - scale), 0),
    y: clamp(transform.y, VIEWBOX_HEIGHT * (1 - scale), 0),
  };
}

function categoryForEvent(event: FestivalEvent) {
  return mapCategories[event.category];
}

function formatSchedule(event: FestivalEvent) {
  if (!event.start) return "Schedule to be announced";
  const date = new Date(event.start);
  if (Number.isNaN(date.getTime())) return "Schedule to be announced";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: event.end ? "short" : undefined,
  }).format(date);
}

function useFilteredEvents(category: CategoryFilter, query: string, savedOnly: boolean, bookmarks: string[]) {
  const normalizedQuery = query.trim().toLowerCase();
  return useMemo(() => maraudersMapEvents.filter((event) => {
    const categoryMatch = category === "all" || event.category === category;
    const savedMatch = !savedOnly || bookmarks.includes(event.id);
    const searchMatch = !normalizedQuery || [
      event.name,
      event.description,
      event.category,
      categoryForEvent(event).label,
      categoryForEvent(event).regionLabel,
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
    return categoryMatch && savedMatch && searchMatch;
  }), [bookmarks, category, normalizedQuery, savedOnly]);
}

function MapArrival({ onReveal }: { onReveal: () => void }) {
  const arrivalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    arrivalRef.current?.focus();
  }, []);

  return (
    <div
      className="map-arrival"
      ref={arrivalRef}
      tabIndex={-1}
      role="dialog"
      aria-labelledby="map-arrival-title"
      aria-describedby="map-arrival-copy"
    >
      <div className="map-arrival-card">
        <span className="map-arrival-mark" aria-hidden="true">✦</span>
        <span className="map-arrival-kicker">A field guide to Technika ’27</span>
        <h2 id="map-arrival-title">I solemnly swear<br />that I am up to no good.</h2>
        <p id="map-arrival-copy">The ink is still drying. Explore the festival’s illustrative event regions while official venue details are being prepared.</p>
        <button className="button button-gold" type="button" onClick={onReveal} autoFocus>
          Reveal the Marauder&apos;s Map <ArrowUpRight size={14} />
        </button>
        <button className="map-arrival-skip" type="button" onClick={onReveal}>Skip the preface and view events</button>
      </div>
    </div>
  );
}

function CategoryFilters({
  category,
  onCategoryChange,
}: {
  category: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
}) {
  const filters: Array<{ id: CategoryFilter; label: string }> = [
    { id: "all", label: "All Events" },
    { id: "technical", label: "Technical" },
    { id: "fun", label: "Fun & E-sports" },
    { id: "cultural", label: "Cultural" },
  ];

  return (
    <div className="map-filters" aria-label="Filter events by category">
      {filters.map((filter) => (
        <button
          className={`map-filter ${category === filter.id ? "active" : ""}`}
          type="button"
          key={filter.id}
          aria-pressed={category === filter.id}
          onClick={() => onCategoryChange(filter.id)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

function MapHeader({
  category,
  query,
  savedOnly,
  bookmarksCount,
  onCategoryChange,
  onQueryChange,
  onSavedOnlyChange,
  onClear,
}: {
  category: CategoryFilter;
  query: string;
  savedOnly: boolean;
  bookmarksCount: number;
  onCategoryChange: (category: CategoryFilter) => void;
  onQueryChange: (query: string) => void;
  onSavedOnlyChange: (saved: boolean) => void;
  onClear: () => void;
}) {
  const hasFilters = category !== "all" || query.length > 0 || savedOnly;

  return (
    <>
      <header className="marauders-map-header">
        <div className="map-header-copy">
          <span className="map-kicker"><Sparkles size={13} /> Cartography wing · provisional edition</span>
          <h1>The Marauder&apos;s <em>Map</em></h1>
          <p>Every quest, challenge, and performance at Technika&apos;27 — gathered on one living parchment.</p>
        </div>
        <div className="map-header-aside" aria-label="Map summary">
          <span className="map-header-seal"><Compass size={24} strokeWidth={1.1} /></span>
          <span><b>{maraudersMapEvents.length}</b><small>event entries indexed</small></span>
          <span><b>{mapVenues.length}</b><small>themed regions</small></span>
        </div>
      </header>

      <section className="map-discovery-bar" aria-label="Find an event">
        <div className="map-search-wrap">
          <Search size={16} aria-hidden="true" />
          <label className="sr-only" htmlFor="marauders-search">Search events</label>
          <input
            id="marauders-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search events, ideas, or regions"
          />
          {query && <button type="button" aria-label="Clear event search" onClick={() => onQueryChange("")}><X size={14} /></button>}
        </div>
        <CategoryFilters category={category} onCategoryChange={onCategoryChange} />
        <button
          className={`map-saved-toggle ${savedOnly ? "active" : ""}`}
          type="button"
          aria-pressed={savedOnly}
          onClick={() => onSavedOnlyChange(!savedOnly)}
        >
          {savedOnly ? <BookmarkCheck size={14} /> : <Bookmark size={14} />} Saved <span>{bookmarksCount}</span>
        </button>
        {hasFilters && <button className="map-clear-button" type="button" onClick={onClear}>Clear filters</button>}
      </section>
    </>
  );
}

function MapIllustration({
  visibleEvents,
  selectedVenueId,
  transform,
  onTransformChange,
  onVenueSelect,
}: {
  visibleEvents: FestivalEvent[];
  selectedVenueId: string | null;
  transform: Transform;
  onTransformChange: (transform: Transform) => void;
  onVenueSelect: (venueId: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const panRef = useRef<{ pointerId: number; clientX: number; clientY: number; transform: Transform } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const visibleVenueIds = new Set(visibleEvents.map((event) => event.venueId));
  const eventCounts = useMemo(() => visibleEvents.reduce<Record<string, number>>((counts, event) => {
    counts[event.venueId] = (counts[event.venueId] || 0) + 1;
    return counts;
  }, {}), [visibleEvents]);

  const zoomAt = useCallback((nextScale: number, clientX?: number, clientY?: number) => {
    const next = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    if (!svgRef.current || clientX === undefined || clientY === undefined) {
      onTransformChange(clampTransform({ ...transform, scale: next }));
      return;
    }
    const rect = svgRef.current.getBoundingClientRect();
    const cursorX = ((clientX - rect.left) / rect.width) * VIEWBOX_WIDTH;
    const cursorY = ((clientY - rect.top) / rect.height) * VIEWBOX_HEIGHT;
    const worldX = (cursorX - transform.x) / transform.scale;
    const worldY = (cursorY - transform.y) / transform.scale;
    onTransformChange(clampTransform({ x: cursorX - worldX * next, y: cursorY - worldY * next, scale: next }));
  }, [onTransformChange, transform]);

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, transform };
    setIsPanning(true);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    const svg = svgRef.current;
    if (!pan || !svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((event.clientX - pan.clientX) / rect.width) * VIEWBOX_WIDTH / pan.transform.scale;
    const dy = ((event.clientY - pan.clientY) / rect.height) * VIEWBOX_HEIGHT / pan.transform.scale;
    onTransformChange(clampTransform({ ...pan.transform, x: pan.transform.x + dx, y: pan.transform.y + dy }));
  };

  const stopPanning = (event: React.PointerEvent<SVGSVGElement>) => {
    if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
    setIsPanning(false);
  };

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -.12 : .12;
    zoomAt(transform.scale + delta, event.clientX, event.clientY);
  };

  return (
    <div className="map-stage">
      <svg
        ref={svgRef}
        className={`campus-map-svg ${isPanning ? "is-panning" : ""}`}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        role="img"
        aria-labelledby="campus-map-title campus-map-desc"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopPanning}
        onPointerCancel={stopPanning}
        onWheel={handleWheel}
      >
        <title id="campus-map-title">Illustrative Technika ’27 event map</title>
        <desc id="campus-map-desc">A parchment planning canvas with three fictional themed regions. It is not a geographic campus map and does not show real buildings, routes, distances, or venue coordinates.</desc>
        <defs>
          <filter id="map-paper-grain" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch" result="noise" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer><feFuncA type="table" tableValues="0 .16" /></feComponentTransfer>
            <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
          </filter>
          <linearGradient id="map-paper" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--secondary-200)" />
            <stop offset=".48" stopColor="var(--secondary-400)" />
            <stop offset="1" stopColor="var(--secondary-600)" />
          </linearGradient>
          <radialGradient id="map-wash" cx=".5" cy=".5" r=".7">
            <stop offset="0" stopColor="var(--fg-strong)" stopOpacity=".56" />
            <stop offset="1" stopColor="var(--primary-700)" stopOpacity=".2" />
          </radialGradient>
        </defs>
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`} className="map-zoom-layer">
          <rect className="map-paper" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#map-paper)" filter="url(#map-paper-grain)" />
          <rect className="map-paper-wash" x="24" y="24" width={VIEWBOX_WIDTH - 48} height={VIEWBOX_HEIGHT - 48} rx="12" fill="url(#map-wash)" />
          <path className="map-ink-border" d="M42 44C177 31 300 48 420 40s236 10 356 0 255-2 382 10M36 707c139 10 261-6 385 4s238-9 362 0 263 10 383-3M42 44c-8 145 8 280 0 409s-2 173 6 254M1156 49c-7 145 10 278 1 405s3 178-7 253" />
          <path className="map-contour" d="M74 189c115-83 220-71 298-33s128 26 195-16M68 214c123-81 225-58 297-23s140 31 210-11M1084 160c-89 43-147 30-211-1s-131-13-189 24M1092 184c-94 44-145 39-211 5s-128-18-181 16M1074 595c-82-32-136-27-198 4s-128 32-189 11M1077 622c-85-35-143-30-205 3s-121 33-182 7" />
          <path className="map-decorative-trail" d="M189 590C324 514 334 445 307 365s-1-139 136-199M439 626c-38-91 3-142 84-191s132-44 186-130M655 694c72-83 84-161 36-217s-40-117 52-173M1024 366c-91-16-138 5-173 75s-55 103-141 117" />
          <g className="map-annotation" aria-hidden="true">
            <path d="M85 92h230M85 98h110M868 88h250M868 94h150" />
            <text x="85" y="80">THE INKED FRONTIER · PROVISIONAL SURVEY</text>
            <text x="870" y="77">TECHNIKA ’27 · FIELD EDITION</text>
            <text x="586" y="355">decorative ink only · not a walking route</text>
            <text x="100" y="675">coordinates are illustrative anchors</text>
          </g>
          {mapRegions.map((region) => {
            const category = mapCategories[region.category];
            return (
              <g className="map-region" key={region.id} style={{ "--region-accent": category.accent } as React.CSSProperties}>
                <rect x={region.position.x} y={region.position.y} width={region.size.width} height={region.size.height} rx="22" />
                <path className="map-region-inner" d={`M${region.position.x + 22} ${region.position.y + 60}h${region.size.width - 44}M${region.position.x + 22} ${region.position.y + region.size.height - 30}h${region.size.width - 44}`} />
                <text className="map-region-title" x={region.position.x + 28} y={region.position.y + 38}>{region.label}</text>
                <text className="map-region-subtitle" x={region.position.x + 30} y={region.position.y + 52}>{region.shortLabel.toUpperCase()} · THEMED REGION</text>
                <path className="map-region-glyph" d={`M${region.position.x + region.size.width - 48} ${region.position.y + 24}l10 10-10 10-10-10z`} />
              </g>
            );
          })}
          <g className="map-architecture" aria-hidden="true">
            <path d="M176 292h84v74h-84zM397 239h84v75h-84zM202 432h96v62h-96zM383 397h112v94H383z" />
            <path d="M677 190h92v52h-92zM888 179h118v63H888zM715 277h117v54H715zM902 273h106v57H902z" />
            <path d="M671 474h104v56H671zM890 454h120v68H890zM710 558h110v52H710zM891 558h86v50h-86z" />
            <path className="map-architecture-detail" d="M190 310h56m-56 16h56m-56 16h56M411 257h56m-56 16h56m-56 16h56M690 208h65m-65 16h65m-65 16h65M905 198h82m-82 17h82M688 494h70m-70 16h70M910 476h80m-80 16h80" />
            <circle cx="349" cy="226" r="28" /><circle cx="836" cy="375" r="27" /><circle cx="536" cy="540" r="20" />
          </g>
          <g className="map-landmark-labels" aria-hidden="true">
            <text x="180" y="385">illustrative node</text><text x="690" y="350">illustrative node</text><text x="687" y="640">illustrative node</text>
          </g>
          {mapVenues.filter((venue) => visibleVenueIds.has(venue.id)).map((venue) => {
            const region = getMapRegion(venue.regionId);
            const category = region ? mapCategories[region.category] : mapCategories.technical;
            const isSelected = selectedVenueId === venue.id;
            return (
              <g
                key={venue.id}
                className={`map-marker ${isSelected ? "selected" : ""}`}
                data-map-marker="true"
                transform={`translate(${venue.position.x} ${venue.position.y})`}
                tabIndex={0}
                role="button"
                aria-label={`${venue.label}, ${eventCounts[venue.id]} event${eventCounts[venue.id] === 1 ? "" : "s"}`}
                style={{ "--marker-accent": category.accent } as React.CSSProperties}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onVenueSelect(venue.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onVenueSelect(venue.id); }
                }}
              >
                <circle className="marker-pulse" r="31" />
                <circle className="marker-halo" r="23" />
                <path className="marker-diamond" d="M0-17 17 0 0 17-17 0Z" />
                <circle className="marker-core" r="7" />
                <text className="marker-count" x="0" y="4">{eventCounts[venue.id]}</text>
                <text className="marker-label" x="30" y="5">{venue.label}</text>
                <title>{`${venue.label} · ${eventCounts[venue.id]} event entries`}</title>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-stage-note"><Info size={13} /> Illustrative planning canvas · not a geographic campus map</div>
      <div className="map-compass" aria-label="Compass, north is up"><span>N</span><Compass size={40} strokeWidth={1} /><b>S</b><i>E</i><em>W</em></div>
      <div className="map-controls" aria-label="Map controls">
        <button type="button" onClick={() => zoomAt(transform.scale + .2)} aria-label="Zoom in"><Plus size={16} /></button>
        <span aria-live="polite">{Math.round(transform.scale * 100)}%</span>
        <button type="button" onClick={() => zoomAt(transform.scale - .2)} aria-label="Zoom out"><Minus size={16} /></button>
        <button type="button" onClick={() => onTransformChange(initialTransform)} aria-label="Reset map view"><RotateCcw size={15} /></button>
      </div>
      <div className="map-pan-hint"><ArrowDown size={12} /> Drag to pan · scroll to zoom</div>
    </div>
  );
}

function MapLegend() {
  return (
    <div className="map-legend" aria-label="Map legend">
      <div className="map-legend-heading"><span>Legend</span><small>ink &amp; intention</small></div>
      <div className="map-legend-items">
        <span><i className="legend-dot technical" /> Technical</span>
        <span><i className="legend-dot fun" /> Fun &amp; E-sports</span>
        <span><i className="legend-dot cultural" /> Cultural</span>
        <span><i className="legend-line" /> Decorative ink</span>
      </div>
    </div>
  );
}

function EventCard({
  event,
  bookmarked,
  onSelect,
  onToggleBookmark,
}: {
  event: FestivalEvent;
  bookmarked: boolean;
  onSelect: (event: FestivalEvent) => void;
  onToggleBookmark: (eventId: string) => void;
}) {
  const category = categoryForEvent(event);
  const venue = getMapVenue(event.venueId);
  return (
    <article className="map-event-card" style={{ "--event-accent": category.accent } as React.CSSProperties}>
      <div className="map-event-card-topline">
        <span className="map-event-category"><i /> {category.label}</span>
        <span className={`map-event-status ${event.status}`}>{event.status}</span>
      </div>
      <h3>{event.name}</h3>
      <p>{event.description}</p>
      <div className="map-event-card-meta">
        <span><MapPin size={12} /><span>Venue to be announced<small>{venue ? `Region: ${venue.label}` : "Official venue pending"}</small></span></span>
        <span><CalendarDays size={12} /> {event.start ? formatSchedule(event) : "Schedule TBA"}</span>
      </div>
      <div className="map-event-card-actions">
        <button className="map-text-button" type="button" onClick={() => onSelect(event)}>View details <ArrowUpRight size={13} /></button>
        <button
          className={`map-bookmark-button ${bookmarked ? "saved" : ""}`}
          type="button"
          aria-label={`${bookmarked ? "Remove" : "Save"} ${event.name}`}
          aria-pressed={bookmarked}
          onClick={() => onToggleBookmark(event.id)}
        >
          {bookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        </button>
      </div>
    </article>
  );
}

function EventDirectory({
  events,
  bookmarks,
  onSelect,
  onToggleBookmark,
}: {
  events: FestivalEvent[];
  bookmarks: string[];
  onSelect: (event: FestivalEvent) => void;
  onToggleBookmark: (eventId: string) => void;
}) {
  return (
    <section className="map-directory" aria-labelledby="directory-title">
      <div className="map-section-heading">
        <div><span className="map-section-kicker">The event directory</span><h2 id="directory-title">Choose your <em>quest.</em></h2></div>
        <span className="map-result-count">{events.length.toString().padStart(2, "0")} found</span>
      </div>
      {events.length > 0 ? (
        <div className="map-event-list">
          {events.map((event) => <EventCard key={event.id} event={event} bookmarked={bookmarks.includes(event.id)} onSelect={onSelect} onToggleBookmark={onToggleBookmark} />)}
        </div>
      ) : (
        <div className="map-empty-state">
          <span className="map-empty-mark">⌁</span>
          <h3>No paths found in this ink.</h3>
          <p>Try another spell, category, or clear the filters to return to the full directory.</p>
        </div>
      )}
    </section>
  );
}

function EventDetailPanel({
  venueId,
  selectedEventId,
  visibleEvents,
  bookmarks,
  onClose,
  onEventSelect,
  onToggleBookmark,
  onRevealPath,
}: {
  venueId: string;
  selectedEventId: string;
  visibleEvents: FestivalEvent[];
  bookmarks: string[];
  onClose: () => void;
  onEventSelect: (eventId: string) => void;
  onToggleBookmark: (eventId: string) => void;
  onRevealPath: (venueId: string) => void;
}) {
  const venue = getMapVenue(venueId);
  const eventsAtVenue = visibleEvents.filter((event) => event.venueId === venueId);
  const event = eventsAtVenue.find((candidate) => candidate.id === selectedEventId) ?? eventsAtVenue[0];
  if (!venue || !event) return null;
  const category = categoryForEvent(event);
  const bookmarked = bookmarks.includes(event.id);

  return (
    <section className="map-detail-panel" role="dialog" aria-modal="false" aria-labelledby="map-detail-title">
      <div className="map-detail-stamp"><span>Venue file</span><b>{eventsAtVenue.length.toString().padStart(2, "0")}</b></div>
      <button className="map-detail-close" type="button" onClick={onClose} aria-label="Close event details"><X size={17} /></button>
      <div className="map-detail-heading">
        <span className="map-section-kicker" style={{ color: category.accent }}>{category.label} · {event.status}</span>
        <h2 id="map-detail-title">{event.name}</h2>
        <p>{event.description}</p>
      </div>
      <dl className="map-detail-facts">
        <div><dt><MapPin size={14} /> Venue</dt><dd>Venue to be announced<small>Illustrative region: {venue.label}. {venue.note}</small></dd></div>
        <div><dt><CalendarDays size={14} /> Schedule</dt><dd>{formatSchedule(event)}<small>Final timings will appear when published.</small></dd></div>
        <div><dt><Info size={14} /> Registration</dt><dd>{event.registrationUrl ? "Registration available" : "Details to be announced"}<small>{event.registrationUrl ? "Use the official registration destination below." : "No registration destination has been supplied."}</small></dd></div>
      </dl>
      <div className="map-detail-actions">
        <button className={`button map-detail-save ${bookmarked ? "saved" : ""}`} type="button" onClick={() => onToggleBookmark(event.id)}>
          {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />} {bookmarked ? "Saved to itinerary" : "Save event"}
        </button>
        <button className="button button-glass" type="button" onClick={() => onRevealPath(venue.id)}><Route size={14} /> Reveal My Path</button>
        {event.registrationUrl ? <a className="button button-gold" href={event.registrationUrl} target="_blank" rel="noreferrer">Register <ArrowUpRight size={14} /></a> : <span className="map-unavailable-action">Registration link to be announced</span>}
      </div>
      <div className="map-detail-event-switcher" aria-label={`More events in ${venue.label}`}>
        <span>Also filed at this region</span>
        <div>{eventsAtVenue.map((venueEvent) => <button type="button" key={venueEvent.id} className={venueEvent.id === event.id ? "active" : ""} onClick={() => onEventSelect(venueEvent.id)}>{venueEvent.name}</button>)}</div>
      </div>
    </section>
  );
}

function RoutePlanner({
  start,
  destination,
  message,
  locationState,
  onStartChange,
  onDestinationChange,
  onReveal,
  onUseLocation,
}: {
  start: string;
  destination: string;
  message: string;
  locationState: LocationState;
  onStartChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onReveal: () => void;
  onUseLocation: () => void;
}) {
  return (
    <section className="map-route-planner" aria-labelledby="route-planner-title">
      <div className="route-planner-copy">
        <span className="map-section-kicker"><Navigation size={12} /> The route ledger</span>
        <h2 id="route-planner-title">Draw a path when the <em>paths are known.</em></h2>
        <p>Official campus paths, distances, and venue coordinates have not been supplied yet. We will reveal the real walking trail here — never a guess.</p>
      </div>
      <div className="route-planner-form">
        <label>Starting region <span className="sr-only">required</span><div className="select-wrap"><select value={start} onChange={(event) => onStartChange(event.target.value)}><option value="">Choose an origin</option>{mapVenues.map((venue) => <option value={venue.id} key={venue.id}>{venue.label}</option>)}</select><ChevronDown size={14} /></div></label>
        <label>Destination region <div className="select-wrap"><select value={destination} onChange={(event) => onDestinationChange(event.target.value)}><option value="">Choose a destination</option>{mapVenues.map((venue) => <option value={venue.id} key={venue.id}>{venue.label}</option>)}</select><ChevronDown size={14} /></div></label>
        <button className="button button-gold route-button" type="button" disabled={!start || !destination} onClick={onReveal}><Route size={14} /> Reveal My Path</button>
        <button className="route-location-button" type="button" onClick={onUseLocation} disabled={locationState === "requesting"}><Crosshair size={14} /> {locationState === "requesting" ? "Requesting…" : "Use my location"}</button>
      </div>
      <div className={`route-planner-message ${message ? "visible" : ""}`} role="status" aria-live="polite">
        {message || "Select two illustrative regions to check route readiness."}
      </div>
      <p className="route-location-note"><Info size={12} /> Location is optional. We ask only after you choose to share it; this illustrative canvas is not georeferenced.</p>
    </section>
  );
}

function MapFooterNotes({ bookmarksCount }: { bookmarksCount: number }) {
  return (
    <div className="map-footer-notes">
      <span><Bookmark size={13} /> {bookmarksCount} saved {bookmarksCount === 1 ? "event" : "events"}</span>
      <span><Sparkles size={13} /> Schedule, registration, and venues are published separately when confirmed.</span>
      <span><MapPin size={13} /> Official campus geometry will replace this planning canvas.</span>
    </div>
  );
}

export function MaraudersMapExplorer() {
  const [arrivalOpen, setArrivalOpen] = useState(true);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [bookmarksLoaded, setBookmarksLoaded] = useState(false);
  const [transform, setTransform] = useState<Transform>(initialTransform);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [routeStart, setRouteStart] = useState("");
  const [routeDestination, setRouteDestination] = useState("");
  const [routeMessage, setRouteMessage] = useState("");
  const [locationState, setLocationState] = useState<LocationState>("idle");
  const [notice, setNotice] = useState("");
  const visibleEvents = useFilteredEvents(category, query, savedOnly, bookmarks);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(BOOKMARK_STORAGE_KEY);
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (Array.isArray(parsed)) setBookmarks(parsed.filter((value): value is string => typeof value === "string"));
        }
      } catch {
        // Anonymous saving remains usable when storage is unavailable.
      } finally {
        setBookmarksLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!bookmarksLoaded) return;
    try {
      window.localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
    } catch {
      // Private browsing and storage policies should not block the map.
    }
  }, [bookmarks, bookmarksLoaded]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const openVenue = useCallback((venueId: string) => {
    const firstEvent = visibleEvents.find((event) => event.venueId === venueId);
    setSelectedVenueId(venueId);
    setSelectedEventId(firstEvent?.id ?? null);
  }, [visibleEvents]);

  const openEvent = useCallback((event: FestivalEvent) => {
    setSelectedVenueId(event.venueId);
    setSelectedEventId(event.id);
  }, []);

  const toggleBookmark = useCallback((eventId: string) => {
    const event = maraudersMapEvents.find((candidate) => candidate.id === eventId);
    setBookmarks((current) => {
      const saving = !current.includes(eventId);
      setNotice(saving ? `${event?.name ?? "Event"} saved to your itinerary.` : `${event?.name ?? "Event"} removed from your itinerary.`);
      return saving ? [...current, eventId] : current.filter((id) => id !== eventId);
    });
  }, []);

  const clearFilters = () => {
    setCategory("all");
    setQuery("");
    setSavedOnly(false);
  };

  const revealPath = () => {
    if (!routeStart || !routeDestination) return;
    if (routeStart === routeDestination) {
      setRouteMessage("Choose two different regions to reveal a path.");
      return;
    }
    setRouteMessage("Campus routes coming soon — official path geometry, walking distance, and time are not available yet.");
  };

  const revealPathToVenue = (venueId: string) => {
    setRouteDestination(venueId);
    setRouteMessage("");
    document.getElementById("route-planner-title")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationState("unavailable");
      setRouteMessage("Location is not available in this browser. The map remains fully usable without it.");
      return;
    }
    setLocationState("requesting");
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationState("granted");
        setRouteMessage("Location permission granted. Because this canvas is not georeferenced, your position is not plotted.");
      },
      () => {
        setLocationState("denied");
        setRouteMessage("Location was not shared. No location marker was added; the map remains fully usable without it.");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
    );
  };

  const selectedEvents = selectedVenueId ? visibleEvents.filter((event) => event.venueId === selectedVenueId) : [];

  return (
    <div className={`marauders-page ${arrivalOpen ? "arrival-open" : ""}`}>
      {arrivalOpen && <MapArrival onReveal={() => setArrivalOpen(false)} />}
      <div className="marauders-map-shell">
        <MapHeader
          category={category}
          query={query}
          savedOnly={savedOnly}
          bookmarksCount={bookmarks.length}
          onCategoryChange={setCategory}
          onQueryChange={setQuery}
          onSavedOnlyChange={setSavedOnly}
          onClear={clearFilters}
        />

        <div className="map-workbench">
          <div className="map-column">
            <section className="map-artifact" aria-labelledby="map-canvas-title">
              <div className="map-artifact-heading">
                <div><span className="map-section-kicker">The illustrated campus canvas</span><h2 id="map-canvas-title">A map in the <em>making.</em></h2></div>
                <span className="map-edition-mark">TM · 27 <small>FIELD COPY</small></span>
              </div>
              <MapIllustration visibleEvents={visibleEvents} selectedVenueId={selectedVenueId} transform={transform} onTransformChange={setTransform} onVenueSelect={openVenue} />
              <MapLegend />
            </section>
            {selectedVenueId && selectedEventId && <EventDetailPanel venueId={selectedVenueId} selectedEventId={selectedEventId} visibleEvents={selectedEvents} bookmarks={bookmarks} onClose={() => { setSelectedVenueId(null); setSelectedEventId(null); }} onEventSelect={setSelectedEventId} onToggleBookmark={toggleBookmark} onRevealPath={revealPathToVenue} />}
            <RoutePlanner start={routeStart} destination={routeDestination} message={routeMessage} locationState={locationState} onStartChange={setRouteStart} onDestinationChange={setRouteDestination} onReveal={revealPath} onUseLocation={useMyLocation} />
          </div>
          <EventDirectory events={visibleEvents} bookmarks={bookmarks} onSelect={openEvent} onToggleBookmark={toggleBookmark} />
        </div>

        <MapFooterNotes bookmarksCount={bookmarks.length} />
      </div>
      {notice && <div className="map-notice" role="status" aria-live="polite"><BookmarkCheck size={15} /> {notice}</div>}
    </div>
  );
}
