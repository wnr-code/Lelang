/**
 * Grafis daun beranting dengan animasi "tumbuh" (batang digambar, daun mekar & bergoyang).
 * Dekoratif murni SVG + CSS (tanpa JS), menghormati prefers-reduced-motion.
 * Warna mengikuti palet Cigatas (emerald + gold).
 */
type Leaf = { x: number; y: number; r: number; s: number; d: number; gold?: boolean };

const LEFT_LEAVES: Leaf[] = [
  { x: 120, y: 200, r: -35, s: 1.0, d: 0.2 },
  { x: 180, y: 160, r: -15, s: 0.85, d: 0.5 },
  { x: 235, y: 120, r: -50, s: 0.9, d: 0.8, gold: true },
  { x: 300, y: 95, r: -20, s: 0.75, d: 1.1 },
  { x: 360, y: 70, r: -40, s: 0.8, d: 1.4 },
  { x: 90, y: 235, r: -60, s: 0.7, d: 0.9, gold: true },
];
const RIGHT_LEAVES: Leaf[] = [
  { x: 1280, y: 200, r: 35, s: 1.0, d: 0.3 },
  { x: 1220, y: 160, r: 15, s: 0.85, d: 0.6 },
  { x: 1165, y: 120, r: 50, s: 0.9, d: 0.9, gold: true },
  { x: 1100, y: 95, r: 20, s: 0.75, d: 1.2 },
  { x: 1040, y: 70, r: 40, s: 0.8, d: 1.5 },
  { x: 1310, y: 235, r: 60, s: 0.7, d: 1.0, gold: true },
];

function LeafShape({ leaf }: { leaf: Leaf }) {
  return (
    <g
      className="leaf-grow"
      style={{ animationDelay: `${leaf.d}s`, transformOrigin: `${leaf.x}px ${leaf.y}px` }}
    >
      <g className="leaf-sway" style={{ animationDelay: `${leaf.d}s`, transformOrigin: `${leaf.x}px ${leaf.y}px` }}>
        <path
          d={`M ${leaf.x} ${leaf.y} q ${18 * leaf.s} ${-26 * leaf.s} ${40 * leaf.s} ${-10 * leaf.s} q ${-14 * leaf.s} ${26 * leaf.s} ${-40 * leaf.s} ${10 * leaf.s} z`}
          transform={`rotate(${leaf.r} ${leaf.x} ${leaf.y})`}
          fill={leaf.gold ? "#E8B83F" : "#12A05C"}
          opacity={leaf.gold ? 0.9 : 0.85}
        />
        <path
          d={`M ${leaf.x} ${leaf.y} q ${20 * leaf.s} ${-16 * leaf.s} ${40 * leaf.s} ${-10 * leaf.s}`}
          transform={`rotate(${leaf.r} ${leaf.x} ${leaf.y})`}
          stroke={leaf.gold ? "#FFF9EA" : "#E7F7E9"}
          strokeWidth={1.2}
          fill="none"
          opacity={0.6}
        />
      </g>
    </g>
  );
}

export function FooterLeaves() {
  return (
    <svg
      viewBox="0 0 1400 280"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="footerBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#075B35" />
          <stop offset="100%" stopColor="#054A2B" />
        </linearGradient>
      </defs>
      <rect width="1400" height="280" fill="url(#footerBg)" />
      {/* batang kiri & kanan (digambar tumbuh) */}
      <path className="branch-draw" d="M 60 280 C 120 220 160 170 240 120 S 360 70 410 50" stroke="#078A48" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path className="branch-draw" style={{ animationDelay: "0.3s" }} d="M 1340 280 C 1280 220 1240 170 1160 120 S 1040 70 990 50" stroke="#078A48" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path className="branch-draw" style={{ animationDelay: "0.6s" }} d="M 100 280 C 140 240 180 210 220 190" stroke="#12A05C" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path className="branch-draw" style={{ animationDelay: "0.6s" }} d="M 1300 280 C 1260 240 1220 210 1180 190" stroke="#12A05C" strokeWidth="3" fill="none" strokeLinecap="round" />
      {LEFT_LEAVES.map((l, i) => <LeafShape key={`l${i}`} leaf={l} />)}
      {RIGHT_LEAVES.map((l, i) => <LeafShape key={`r${i}`} leaf={l} />)}
    </svg>
  );
}
