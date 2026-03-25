import type { RunState, UnitConfig, MapNode, Zone, Directive, Part, Keepsake } from '@/types';
import { eventBus } from '@/utils/EventBus';

const DEFAULT_RUN: RunState = {
  units: [],
  inventory: [],
  keepsakes: [],
  map: [],
  currentNodeId: null,
  zone: 'boiler_works',
  zoneIndex: 0,
  floor: 1,
  ascension: 0,
  consciousnessScore: 0,
  active: false,
};

class RunStateManager {
  private state: RunState = { ...DEFAULT_RUN };

  get(): Readonly<RunState> {
    return this.state;
  }

  start(zone: Zone, ascension: number): void {
    this.state = {
      ...DEFAULT_RUN,
      zone,
      ascension,
      active: true,
      units: [],
      map: [],
    };
    eventBus.emit('run:start', this.state);
  }

  end(won: boolean): void {
    this.state.active = false;
    eventBus.emit('run:end', { won, state: this.state });
  }

  addUnit(unit: UnitConfig): void {
    this.state.units.push(unit);
    eventBus.emit('run:unit_added', unit);
  }

  removeUnit(unitId: string): void {
    this.state.units = this.state.units.filter(u => u.id !== unitId);
    eventBus.emit('run:unit_removed', unitId);
  }

  getUnit(unitId: string): UnitConfig | undefined {
    return this.state.units.find(u => u.id === unitId);
  }

  setMap(map: MapNode[]): void {
    this.state.map = map;
  }

  moveTo(nodeId: string): void {
    this.state.currentNodeId = nodeId;
    const node = this.state.map.find(n => n.id === nodeId);
    if (node) node.visited = true;
    eventBus.emit('run:move', nodeId);
  }

  clearCurrentRoom(): void {
    const node = this.state.map.find(n => n.id === this.state.currentNodeId);
    if (node) node.cleared = true;
    eventBus.emit('run:room_cleared', this.state.currentNodeId);
  }

  advanceZone(): void {
    this.state.zoneIndex++;
    const zones: Zone[] = ['boiler_works', 'voltage_archives', 'soul_labs', 'kenet_heart'];
    this.state.zone = zones[this.state.zoneIndex] ?? 'kenet_heart';
    this.state.map = [];
    this.state.currentNodeId = null;
    this.state.floor++;
    eventBus.emit('run:zone_advance', this.state.zone);
  }

  addConsciousness(amount: number): void {
    this.state.consciousnessScore += amount;
  }

  // ── Inventory ──
  addToInventory(part: Part): void {
    this.state.inventory.push(part);
    eventBus.emit('run:inventory_add', part);
  }

  removeFromInventory(partId: string): Part | undefined {
    const idx = this.state.inventory.findIndex(p => p.id === partId);
    if (idx === -1) return undefined;
    const [part] = this.state.inventory.splice(idx, 1);
    eventBus.emit('run:inventory_remove', part);
    return part;
  }

  getInventory(): Part[] {
    return this.state.inventory;
  }

  // ── Keepsakes ──
  addKeepsake(keepsake: Keepsake): boolean {
    if (this.state.keepsakes.length >= 3) return false;
    this.state.keepsakes.push(keepsake);
    eventBus.emit('run:keepsake_add', keepsake);
    return true;
  }

  removeKeepsake(keepsakeId: string): void {
    this.state.keepsakes = this.state.keepsakes.filter(k => k.id !== keepsakeId);
    eventBus.emit('run:keepsake_remove', keepsakeId);
  }

  getKeepsakes(): Keepsake[] {
    return this.state.keepsakes;
  }

  setDirective(unitId: string, directive: Directive): void {
    const unit = this.getUnit(unitId);
    if (unit) {
      unit.directive = directive;
      eventBus.emit('run:directive_changed', { unitId, directive });
    }
  }

  toJSON(): string {
    return JSON.stringify(this.state);
  }

  fromJSON(json: string): void {
    this.state = JSON.parse(json);
    eventBus.emit('run:loaded', this.state);
  }
}

export const runState = new RunStateManager();
