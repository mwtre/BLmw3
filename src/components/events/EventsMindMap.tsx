import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Gamepad2,
  GlassWater,
  MapPin,
  Ticket,
  Users,
} from 'lucide-react';
import MindMapCloseButton from '../mind-map/MindMapCloseButton';

interface EventsMindMapProps {
  onClose: () => void;
}

type CityId = 'amsterdam' | 'zurich';

interface EventLesson {
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  time: string;
  title: string;
  description: string;
  takeaway: string;
}

interface CityEvent {
  id: string;
  cityId: CityId;
  city: string;
  venue: string;
  date: string;
  title: string;
  lessons: EventLesson[];
  seats: number;
}

const BOOKING_KEY = 'mw3-events-bookings-v1';

const cityInfo: Record<CityId, { name: string; venue: string; note: string }> = {
  amsterdam: {
    name: 'Amsterdam',
    venue: 'MW3 Canal Lab',
    note: 'Easy evening format near the city center.',
  },
  zurich: {
    name: 'Zurich',
    venue: 'MW3 Alpine Studio',
    note: 'Premium small-group session for builders and traders.',
  },
};

const eventPlans: { title: string; lessons: EventLesson[] }[] = [
  {
    title: 'Wallets Before Wicks',
    lessons: [
      {
        level: 'Beginner',
        time: '18:30-19:30',
        title: 'First wallet, first NFT, first token',
        description: 'Create a wallet, protect the seed phrase, claim a demo NFT, and read token basics.',
        takeaway: 'Wallet safety checklist.',
      },
      {
        level: 'Intermediate',
        time: '19:30-20:30',
        title: 'Exchange basics without panic clicks',
        description: 'Learn spot buy/sell, fees, stablecoins, order books, and how not to fat-finger an order.',
        takeaway: 'First exchange flow map.',
      },
      {
        level: 'Advanced',
        time: '20:30-21:30',
        title: 'Charting the first wick',
        description: 'Read candles, volume, support, resistance, and the difference between a plan and a guess.',
        takeaway: 'Simple chart checklist.',
      },
    ],
  },
  {
    title: 'Candle Mafia: Green, Red, Repeat',
    lessons: [
      {
        level: 'Beginner',
        time: '18:30-19:30',
        title: 'Wallet to market watch',
        description: 'Connect wallet basics to price tracking, watchlists, tickers, and market cap.',
        takeaway: 'Personal watchlist starter.',
      },
      {
        level: 'Intermediate',
        time: '19:30-20:30',
        title: 'Limit orders and cool heads',
        description: 'Use market, limit, stop, and take-profit orders with a no-drama trade routine.',
        takeaway: 'Order type cheat sheet.',
      },
      {
        level: 'Advanced',
        time: '20:30-21:30',
        title: 'TA: structure over vibes',
        description: 'Map trend, invalidation, candle closes, liquidity zones, and fake breakouts.',
        takeaway: 'Structure chart template.',
      },
    ],
  },
  {
    title: 'Spot Goblin Bootcamp',
    lessons: [
      {
        level: 'Beginner',
        time: '18:30-19:30',
        title: 'Tokens you can actually explain',
        description: 'Understand supply, utility, token unlocks, and why random tickers are not a thesis.',
        takeaway: 'Token research checklist.',
      },
      {
        level: 'Intermediate',
        time: '19:30-20:30',
        title: 'Spot entries and exits',
        description: 'Plan entries, scale-ins, exits, position size, and rules for taking profit.',
        takeaway: 'Spot trade worksheet.',
      },
      {
        level: 'Advanced',
        time: '20:30-21:30',
        title: 'Risk/reward boss fight',
        description: 'Build a trade with invalidation, R multiple, drawdown limits, and journal notes.',
        takeaway: 'Risk/reward calculator.',
      },
    ],
  },
  {
    title: 'Liquidity Pool Party',
    lessons: [
      {
        level: 'Beginner',
        time: '18:30-19:30',
        title: 'DEX and wallet survival',
        description: 'Learn swaps, approvals, gas, slippage, and how to avoid signing nonsense.',
        takeaway: 'Safe swap checklist.',
      },
      {
        level: 'Intermediate',
        time: '19:30-20:30',
        title: 'Liquidity, spreads, and fills',
        description: 'See why thin books move fast, how spreads hurt entries, and where liquidity hides.',
        takeaway: 'Liquidity reading guide.',
      },
      {
        level: 'Advanced',
        time: '20:30-21:30',
        title: 'Perps funding and liquidation traps',
        description: 'Understand leverage, margin, funding rates, liquidation levels, and why size kills.',
        takeaway: 'Leverage danger map.',
      },
    ],
  },
  {
    title: 'Meme Coins, Real Risk',
    lessons: [
      {
        level: 'Beginner',
        time: '18:30-19:30',
        title: 'NFTs, memes, and ownership',
        description: 'Decode NFTs, communities, royalties, floor price, and meme coin narratives.',
        takeaway: 'Narrative filter.',
      },
      {
        level: 'Intermediate',
        time: '19:30-20:30',
        title: 'Volatility without faceplanting',
        description: 'Trade high-volatility assets with smaller size, alerts, and clear exit rules.',
        takeaway: 'Volatility playbook.',
      },
      {
        level: 'Advanced',
        time: '20:30-21:30',
        title: 'Narrative rotation trading',
        description: 'Track sector rotation, relative strength, leader coins, and exhaustion signals.',
        takeaway: 'Rotation tracker.',
      },
    ],
  },
  {
    title: 'No FOMO Fight Club',
    lessons: [
      {
        level: 'Beginner',
        time: '18:30-19:30',
        title: 'Emotions before execution',
        description: 'Spot FOMO, revenge trades, overconfidence, and the classic “just one more” trap.',
        takeaway: 'Mindset reset card.',
      },
      {
        level: 'Intermediate',
        time: '19:30-20:30',
        title: 'Trading plan or clown plan',
        description: 'Write entry, stop, target, size, and reason before touching the buy button.',
        takeaway: 'Pre-trade checklist.',
      },
      {
        level: 'Advanced',
        time: '20:30-21:30',
        title: 'Journal like a pro',
        description: 'Review win rate, average loss, R multiple, mistakes, and setup quality.',
        takeaway: 'Journal scoring system.',
      },
    ],
  },
  {
    title: 'On-Chain Detective Night',
    lessons: [
      {
        level: 'Beginner',
        time: '18:30-19:30',
        title: 'Read a wallet like a receipt',
        description: 'Open an explorer, read transactions, token transfers, approvals, and gas fees.',
        takeaway: 'Explorer basics guide.',
      },
      {
        level: 'Intermediate',
        time: '19:30-20:30',
        title: 'Whales, flows, and exchange moves',
        description: 'Track exchange inflows, stablecoin moves, wallet clusters, and alert basics.',
        takeaway: 'Flow watchlist.',
      },
      {
        level: 'Advanced',
        time: '20:30-21:30',
        title: 'Signal or noise?',
        description: 'Combine on-chain clues with chart levels so you do not chase every whale sneeze.',
        takeaway: 'Signal scoring sheet.',
      },
    ],
  },
  {
    title: 'Altcoin Launchpad Rodeo',
    lessons: [
      {
        level: 'Beginner',
        time: '18:30-19:30',
        title: 'Token launches explained',
        description: 'Understand presales, vesting, unlocks, FDV, circulating supply, and launch hype.',
        takeaway: 'Launch term decoder.',
      },
      {
        level: 'Intermediate',
        time: '19:30-20:30',
        title: 'Avoiding exit liquidity duty',
        description: 'Check liquidity, unlock calendars, team wallets, and early buyer behavior.',
        takeaway: 'Launch risk checklist.',
      },
      {
        level: 'Advanced',
        time: '20:30-21:30',
        title: 'Breakout or distribution?',
        description: 'Use volume, market structure, and supply zones to separate momentum from dumping.',
        takeaway: 'Launch trade plan.',
      },
    ],
  },
  {
    title: 'Bot vs Human Trading Night',
    lessons: [
      {
        level: 'Beginner',
        time: '18:30-19:30',
        title: 'AI helpers without autopilot',
        description: 'Use AI for notes, research, summaries, and alerts without outsourcing judgment.',
        takeaway: 'AI prompt starter.',
      },
      {
        level: 'Intermediate',
        time: '19:30-20:30',
        title: 'Build a trading checklist bot',
        description: 'Turn your rules into prompts for news review, chart prep, and trade journaling.',
        takeaway: 'Checklist prompt pack.',
      },
      {
        level: 'Advanced',
        time: '20:30-21:30',
        title: 'Backtest the human',
        description: 'Compare your plan against historical candles, stats, and execution mistakes.',
        takeaway: 'Backtest workflow.',
      },
    ],
  },
  {
    title: 'Scam Radar and Rug Pull Bingo',
    lessons: [
      {
        level: 'Beginner',
        time: '18:30-19:30',
        title: 'Wallet security boot-up',
        description: 'Learn cold wallets, hot wallets, approvals, phishing links, and seed phrase rules.',
        takeaway: 'Security checklist.',
      },
      {
        level: 'Intermediate',
        time: '19:30-20:30',
        title: 'Exchange and app hygiene',
        description: 'Set up 2FA, withdrawal allowlists, API key safety, and account recovery basics.',
        takeaway: 'Account lockdown plan.',
      },
      {
        level: 'Advanced',
        time: '20:30-21:30',
        title: 'Trade only what survives due diligence',
        description: 'Check contracts, liquidity locks, holders, unlocks, and chart manipulation signs.',
        takeaway: 'Rug pull filter.',
      },
    ],
  },
  {
    title: 'Social Tokens and Signal Hunters',
    lessons: [
      {
        level: 'Beginner',
        time: '18:30-19:30',
        title: 'Community value basics',
        description: 'Understand creators, social tokens, incentives, access, and community ownership.',
        takeaway: 'Community value map.',
      },
      {
        level: 'Intermediate',
        time: '19:30-20:30',
        title: 'Narrative tracking for traders',
        description: 'Watch social momentum, catalysts, volume confirmation, and invalidation points.',
        takeaway: 'Catalyst tracker.',
      },
      {
        level: 'Advanced',
        time: '20:30-21:30',
        title: 'Trade the hype decay',
        description: 'Plan around announcements, liquidity spikes, sell-the-news risk, and trend failure.',
        takeaway: 'Hype cycle playbook.',
      },
    ],
  },
  {
    title: 'Perps, Punchlines, and Profit Plans',
    lessons: [
      {
        level: 'Beginner',
        time: '18:30-19:30',
        title: 'Year-end wallet cleanup',
        description: 'Organize wallets, exports, tax notes, PnL screenshots, and portfolio labels.',
        takeaway: 'Portfolio cleanup list.',
      },
      {
        level: 'Intermediate',
        time: '19:30-20:30',
        title: 'Review trades without crying',
        description: 'Find best setups, worst mistakes, average loss, and what to stop doing.',
        takeaway: 'Year review sheet.',
      },
      {
        level: 'Advanced',
        time: '20:30-21:30',
        title: 'Next-year perps rulebook',
        description: 'Write leverage limits, no-trade zones, funding rules, and max loss per week.',
        takeaway: 'Personal trading constitution.',
      },
    ],
  },
];

function buildEvents(cityId: CityId): CityEvent[] {
  const city = cityInfo[cityId];
  return eventPlans.map((plan, index) => {
    const month = 8 + index;
    const year = 2026 + Math.floor(month / 12);
    const monthIndex = month % 12;
    const day = cityId === 'amsterdam' ? 12 : 19;
    const date = new Date(Date.UTC(year, monthIndex, day, 18, 30));
    return {
      id: `${cityId}-${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      cityId,
      city: city.name,
      venue: city.venue,
      date: date.toISOString(),
      title: plan.title,
      lessons: plan.lessons,
      seats: cityId === 'amsterdam' ? 32 : 24,
    };
  });
}

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

function loadBookings(): Record<string, boolean> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(BOOKING_KEY) ?? '{}') as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, value === true])
    );
  } catch {
    return {};
  }
}

function saveBookings(bookings: Record<string, boolean>) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings));
}

function EventCityCard({
  cityId,
  events,
  bookings,
  onToggleBooking,
}: {
  cityId: CityId;
  events: CityEvent[];
  bookings: Record<string, boolean>;
  onToggleBooking: (eventId: string) => void;
}) {
  const city = cityInfo[cityId];
  const bookedCount = events.filter((event) => bookings[event.id]).length;

  return (
    <article className="rounded-[2rem] border-2 border-black bg-white p-5 shadow-xl lg:max-h-[78vh] lg:overflow-y-auto">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-5">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em]">
            <MapPin className="h-4 w-4" />
            {city.name}
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight">{city.venue}</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-gray-600">{city.note}</p>
        </div>

        <div className="rounded-2xl bg-black px-4 py-3 text-white">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400">
            Booked
          </div>
          <div className="mt-1 text-2xl font-black">
            {bookedCount}/{events.length}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {events.map((event) => {
          const booked = bookings[event.id] === true;
          return (
            <div
              key={event.id}
              className="rounded-2xl border border-black/10 bg-gray-50 p-4"
            >
              <div className="grid gap-3 md:grid-cols-[120px_1fr_auto] md:items-center">
                <div className="rounded-xl border-2 border-black bg-white p-3 text-center">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    {formatMonth(event.date)}
                  </div>
                  <div className="mt-1 text-xl font-black">{formatDay(event.date)}</div>
                </div>

                <div className="min-w-0">
                  <h3 className="text-base font-black uppercase tracking-wide sm:text-lg">
                    {event.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      18:30-21:30
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {event.seats} seats
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Ticket className="h-4 w-4" />
                      Free
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleBooking(event.id)}
                  className={`inline-flex items-center justify-center gap-2 rounded-full border-2 border-black px-4 py-3 text-xs font-black uppercase tracking-wide transition-colors ${
                    booked ? 'bg-black text-white' : 'bg-white text-black hover:bg-black hover:text-white'
                  }`}
                >
                  {booked ? <CheckCircle2 className="h-4 w-4" /> : <Ticket className="h-4 w-4" />}
                  {booked ? 'Seat booked' : 'Book seat'}
                </button>
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-white">
                {event.lessons.map((item) => (
                  <div
                    key={item.level}
                    className="grid gap-2 border-b border-black/10 p-3 last:border-b-0 lg:grid-cols-[150px_1fr]"
                  >
                    <div>
                      <span className="inline-flex rounded-full border border-black px-2 py-1 text-[10px] font-black uppercase tracking-wide">
                        {item.level}
                      </span>
                      <div className="mt-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                        {item.time} · 1h
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black uppercase tracking-wide">{item.title}</div>
                      <p className="mt-1 text-xs leading-5 text-gray-600">{item.description}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-black">
                        Takeaway: {item.takeaway}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function EventsMindMap({ onClose }: EventsMindMapProps) {
  const [bookings, setBookings] = useState<Record<string, boolean>>(() => loadBookings());

  const amsterdamEvents = useMemo(() => buildEvents('amsterdam'), []);
  const zurichEvents = useMemo(() => buildEvents('zurich'), []);

  useEffect(() => {
    saveBookings(bookings);
  }, [bookings]);

  const toggleBooking = (eventId: string) => {
    setBookings((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <MindMapCloseButton onClose={onClose} />

      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-20 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-black px-4 py-2 text-xs font-black uppercase tracking-[0.35em]">
              <CalendarDays className="h-4 w-4" />
              EVENTS
            </div>

            <h1 className="max-w-4xl text-4xl font-black uppercase tracking-tight sm:text-6xl">
              Free MW3 meetups from September 2026.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600">
              Two cities, one simple format: cocktails, a blockchain game, and a practical Web3
              lesson every month. Pick your city, read the calendar, and book a free seat.
            </p>

            <div className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border-2 border-black bg-white p-4">
                <div className="text-2xl font-black">24</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Events total
                </div>
              </div>
              <div className="rounded-2xl border-2 border-black bg-white p-4">
                <div className="text-2xl font-black">3h</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Learning track
                </div>
              </div>
              <div className="rounded-2xl border-2 border-black bg-white p-4">
                <div className="text-2xl font-black">Free</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Seat + game
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl border-2 border-black bg-black p-5 text-white sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
              <GlassWater className="mb-3 h-6 w-6" />
              <div className="text-sm font-black uppercase">Cocktails</div>
              <p className="mt-2 text-xs leading-5 text-gray-300">Open social start.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
              <Gamepad2 className="mb-3 h-6 w-6" />
              <div className="text-sm font-black uppercase">Game</div>
              <p className="mt-2 text-xs leading-5 text-gray-300">Blockchain game challenge.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
              <BookOpen className="mb-3 h-6 w-6" />
              <div className="text-sm font-black uppercase">Lesson</div>
              <p className="mt-2 text-xs leading-5 text-gray-300">One clear Web3 topic.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border-2 border-black bg-white p-5 shadow-xl">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Gamepad2 className="h-6 w-6" />
                <h2 className="text-2xl font-black uppercase tracking-wide">How the events work</h2>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-gray-600">
                No boring conference energy. Each night is built like a small mission: learn,
                test, play, and leave with something useful.
              </p>
            </div>
            <div className="rounded-full border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-[0.2em]">
              18:00 doors · 21:30 close
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-black/10 bg-gray-50 p-4 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">
                01 Arrive
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                Check in, grab a cocktail, meet the room, and scan the monthly mission card.
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-gray-50 p-4 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">
                02 Learn
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                Move through three one-hour classes: wallet basics, exchange flow, then charts.
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-gray-50 p-4 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">
                03 Play
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                Teams solve a blockchain game challenge using wallets, tokens, and market clues.
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-gray-50 p-4 shadow-sm">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-gray-500">
                04 Leave
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                Leave with notes, safety rules, next steps, and a seat priority for next month.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <EventCityCard
            cityId="amsterdam"
            events={amsterdamEvents}
            bookings={bookings}
            onToggleBooking={toggleBooking}
          />
          <EventCityCard
            cityId="zurich"
            events={zurichEvents}
            bookings={bookings}
            onToggleBooking={toggleBooking}
          />
        </section>
      </main>
    </div>
  );
}
