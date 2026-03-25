import type { MapNode, Zone, RoomType } from '@/types';
import { GAME_WIDTH, GAME_HEIGHT } from '@/data/constants';

/**
 * Slay the Spire-style vertical map generator.
 *
 * Layout: bottom-to-top, multiple floors (rows).
 * Each floor has 2-4 nodes spread horizontally.
 * Paths go upward, can branch but never cross.
 * Boss always at the top as a single node.
 * Guaranteed rooms: at least 1 repair, 1 elite.
 */

let nodeIdCounter = 0;

function rng(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Room distribution per zone
const ZONE_ROOM_POOL: Record<Zone, RoomType[]> = {
  boiler_works:     ['battle', 'battle', 'battle', 'repair', 'terminal', 'elite', 'market'],
  voltage_archives: ['battle', 'battle', 'battle', 'terminal', 'terminal', 'elite', 'repair'],
  soul_labs:        ['battle', 'battle', 'elite', 'elite', 'terminal', 'repair', 'market'],
  kenet_heart:      ['battle', 'battle', 'battle', 'elite', 'elite', 'repair', 'terminal'],
};

// Floor-specific room rules (Slay the Spire style)
function getRoomForFloor(zone: Zone, floor: number, totalFloors: number): RoomType {
  // Floor 0 (start): always battle
  if (floor === 0) return 'battle';
  // Last floor: always boss
  if (floor === totalFloors - 1) return 'boss';
  // Floor before boss: repair or market (rest stop)
  if (floor === totalFloors - 2) return Math.random() > 0.5 ? 'repair' : 'market';
  // Mid-zone elite (around 60% mark)
  if (floor === Math.floor(totalFloors * 0.6)) return 'elite';

  return pick(ZONE_ROOM_POOL[zone]);
}

export const MapGenerator = {
  generate(zone: Zone, zoneIndex: number): MapNode[] {
    const totalFloors = 6 + zoneIndex; // 6-9 floors
    const nodes: MapNode[] = [];
    const floors: string[][] = [];

    // Map layout constants
    const mapPadX = 140;
    const mapTopY = 80;
    const mapBotY = GAME_HEIGHT - 90;
    const floorSpacing = (mapBotY - mapTopY) / (totalFloors - 1);

    // ── Generate floors bottom-to-top ──
    for (let f = 0; f < totalFloors; f++) {
      const isFirst = f === 0;
      const isLast = f === totalFloors - 1;
      const isPreBoss = f === totalFloors - 2;

      // Node count: first/last = special, others = 2-4
      let nodeCount: number;
      if (isLast) nodeCount = 1;             // Boss is always alone
      else if (isFirst) nodeCount = rng(2, 3); // Starting floor
      else if (isPreBoss) nodeCount = rng(2, 3); // Rest floor
      else nodeCount = rng(2, 4);            // Normal floors

      // Y position: bottom = first floor, top = boss
      const y = Math.round(mapBotY - f * floorSpacing);

      // X positions: evenly spaced with jitter
      const usableW = GAME_WIDTH - mapPadX * 2;
      const xStep = usableW / (nodeCount + 1);
      const floorIds: string[] = [];

      for (let i = 0; i < nodeCount; i++) {
        const id = `node_${++nodeIdCounter}`;
        const type = getRoomForFloor(zone, f, totalFloors);
        const baseX = mapPadX + xStep * (i + 1);
        const jitterX = isLast || isFirst ? 0 : rng(-15, 15);
        const x = Math.round(baseX + jitterX);

        nodes.push({ id, type, x, y, connections: [], visited: false, cleared: false });
        floorIds.push(id);
      }

      floors.push(floorIds);
    }

    // ── Guarantee required rooms ──
    const nonSpecial = nodes.filter(n => n.type !== 'boss' && floors[0].indexOf(n.id) === -1);
    if (!nonSpecial.some(n => n.type === 'repair') && nonSpecial.length > 0) {
      pick(nonSpecial.filter(n => n.type === 'battle') || nonSpecial).type = 'repair';
    }
    if (!nonSpecial.some(n => n.type === 'elite') && nonSpecial.length > 1) {
      const candidates = nonSpecial.filter(n => n.type === 'battle');
      if (candidates.length > 0) candidates[0].type = 'elite';
    }

    // ── Connect floors (bottom → top, no crossing) ──
    for (let f = 0; f < floors.length - 1; f++) {
      const currentIds = floors[f];
      const nextIds = floors[f + 1];
      const currentNodes = currentIds.map(id => nodes.find(n => n.id === id)!);
      const nextNodes = nextIds.map(id => nodes.find(n => n.id === id)!);

      // Sort both by x position for non-crossing paths
      currentNodes.sort((a, b) => a.x - b.x);
      nextNodes.sort((a, b) => a.x - b.x);

      // Strategy: each current node connects to the closest next node(s)
      const connected = new Set<string>();

      for (const curr of currentNodes) {
        // Find closest next node by x distance
        let closest = nextNodes[0];
        let closestDist = Math.abs(curr.x - closest.x);
        for (const next of nextNodes) {
          const dist = Math.abs(curr.x - next.x);
          if (dist < closestDist) {
            closest = next;
            closestDist = dist;
          }
        }

        curr.connections.push(closest.id);
        connected.add(closest.id);

        // 40% chance to also connect to an adjacent next node (branching)
        if (nextNodes.length > 1 && Math.random() < 0.4) {
          const idx = nextNodes.indexOf(closest);
          const adj = nextNodes[idx + 1] ?? nextNodes[idx - 1];
          if (adj && !curr.connections.includes(adj.id)) {
            // Only add if it doesn't create a crossing
            const canConnect = !wouldCross(curr, adj, currentNodes, nextNodes, nodes);
            if (canConnect) {
              curr.connections.push(adj.id);
              connected.add(adj.id);
            }
          }
        }
      }

      // Ensure every next-floor node has at least one incoming
      for (const next of nextNodes) {
        if (!connected.has(next.id)) {
          // Connect from nearest current node
          let nearest = currentNodes[0];
          let nearDist = Math.abs(next.x - nearest.x);
          for (const cn of currentNodes) {
            const d = Math.abs(next.x - cn.x);
            if (d < nearDist) { nearest = cn; nearDist = d; }
          }
          nearest.connections.push(next.id);
        }
      }
    }

    return nodes;
  },
};

/** Check if connecting curr→target would cross existing connections */
function wouldCross(
  curr: MapNode, target: MapNode,
  currentNodes: MapNode[], nextNodes: MapNode[],
  allNodes: MapNode[],
): boolean {
  for (const other of currentNodes) {
    if (other.id === curr.id) continue;
    for (const connId of other.connections) {
      const otherTarget = allNodes.find(n => n.id === connId);
      if (!otherTarget) continue;

      // Check if lines cross: curr→target vs other→otherTarget
      if (linesIntersect(
        curr.x, curr.y, target.x, target.y,
        other.x, other.y, otherTarget.x, otherTarget.y
      )) {
        return true;
      }
    }
  }
  return false;
}

function linesIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): boolean {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 0.001) return false;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
  return t > 0.05 && t < 0.95 && u > 0.05 && u < 0.95;
}
