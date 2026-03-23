import type { MapNode, Zone, RoomType } from '@/types';
import { ZONE_ROOMS_MIN, ZONE_ROOMS_MAX, GAME_WIDTH, GAME_HEIGHT } from '@/data/constants';

let nodeIdCounter = 0;

function rng(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Zone bias — more rooms of the matching power source type
const ZONE_ROOM_WEIGHTS: Record<Zone, RoomType[]> = {
  boiler_works:     ['battle', 'battle', 'battle', 'repair', 'terminal', 'elite', 'market'],
  voltage_archives: ['battle', 'battle', 'battle', 'terminal', 'terminal', 'elite', 'repair'],
  soul_labs:        ['battle', 'battle', 'elite', 'elite', 'terminal', 'repair', 'market'],
  kenet_heart:      ['battle', 'battle', 'battle', 'elite', 'elite', 'repair', 'terminal'],
};

// Rooms that must appear at least once per zone
const GUARANTEED_ROOMS: RoomType[] = ['repair'];

export const MapGenerator = {
  generate(zone: Zone, zoneIndex: number): MapNode[] {
    const totalRooms = rng(ZONE_ROOMS_MIN, ZONE_ROOMS_MAX);
    const layers = 4 + zoneIndex; // more layers in later zones
    const roomsPerLayer = Math.max(2, Math.ceil(totalRooms / layers));

    const nodes: MapNode[] = [];
    const layerNodes: string[][] = [];

    const startY = 100;
    const endY = GAME_HEIGHT - 80;
    const layerSpacing = (endY - startY) / (layers + 1);
    const startX = 200;
    const endX = GAME_WIDTH - 200;

    // Generate layers
    for (let layer = 0; layer < layers; layer++) {
      const count = layer === layers - 1 ? 1 : rng(2, Math.min(3, roomsPerLayer));
      const y = startY + layerSpacing * (layer + 1);
      const ids: string[] = [];
      const xSpacing = (endX - startX) / (count + 1);

      for (let i = 0; i < count; i++) {
        const id = `node_${++nodeIdCounter}`;
        const isLastLayer = layer === layers - 1;
        const type: RoomType = isLastLayer ? 'boss' : pick(ZONE_ROOM_WEIGHTS[zone]);
        const x = startX + xSpacing * (i + 1) + rng(-20, 20);

        nodes.push({
          id,
          type,
          x,
          y,
          connections: [],
          visited: false,
          cleared: false,
        });

        ids.push(id);
      }

      layerNodes.push(ids);
    }

    // Guarantee at least one repair room exists (swap a random non-boss node)
    for (const required of GUARANTEED_ROOMS) {
      const nonBoss = nodes.filter(n => n.type !== 'boss');
      if (!nonBoss.some(n => n.type === required) && nonBoss.length > 0) {
        const swapTarget = nonBoss[Math.floor(Math.random() * nonBoss.length)];
        swapTarget.type = required;
      }
    }

    // Connect layers (each node connects to 1-2 nodes in the next layer)
    for (let layer = 0; layer < layerNodes.length - 1; layer++) {
      const currentIds = layerNodes[layer];
      const nextIds = layerNodes[layer + 1];

      for (const id of currentIds) {
        const node = nodes.find(n => n.id === id)!;
        // Connect to at least one node in the next layer
        const primaryTarget = pick(nextIds);
        node.connections.push(primaryTarget);

        // Maybe connect to a second
        if (nextIds.length > 1 && Math.random() > 0.5) {
          const secondTarget = pick(nextIds.filter(nid => nid !== primaryTarget));
          if (secondTarget) node.connections.push(secondTarget);
        }
      }

      // Ensure every next-layer node has at least one incoming connection
      for (const nextId of nextIds) {
        const hasIncoming = currentIds.some(id =>
          nodes.find(n => n.id === id)!.connections.includes(nextId)
        );
        if (!hasIncoming) {
          const randomCurrent = pick(currentIds);
          nodes.find(n => n.id === randomCurrent)!.connections.push(nextId);
        }
      }
    }

    return nodes;
  },
};
