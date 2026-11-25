/** QR meramente ilustrativo (não leva a lugar nenhum): três marcas de canto + módulos pseudoaleatórios fixos. */
const N = 25;

function modulos(): boolean[][] {
  let s = 20261125;
  const g = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s % 100 < 48;
    })
  );
  return g;
}

const GRADE = modulos();
const emCanto = (x: number, y: number) => (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);

function Marca({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="7" height="7" fill="var(--grafite)" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="var(--branco)" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="var(--grafite)" />
    </g>
  );
}

export function QrExemplo({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${N} ${N}`} role="img" aria-label="QR de exemplo" className={className} shapeRendering="crispEdges">
      <rect width={N} height={N} fill="var(--branco)" />
      {GRADE.map((linha, y) => linha.map((on, x) => (on && !emCanto(x, y) ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="var(--grafite)" /> : null)))}
      <Marca x={0} y={0} />
      <Marca x={N - 7} y={0} />
      <Marca x={0} y={N - 7} />
    </svg>
  );
}
