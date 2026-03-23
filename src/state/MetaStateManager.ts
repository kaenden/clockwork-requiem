import type { MetaState, ExplosionRecord, Zone } from '@/types';
import { eventBus } from '@/utils/EventBus';

const DEFAULT_META: MetaState = {
  schemaBook: [],
  axiomJournals: [],
  configUnlocks: [],
  explosionArchive: [],
  ascensionLevel: 0,
  totalRuns: 0,
  totalWins: 0,
  pvpRating: 1000,
};

class MetaStateManager {
  private state: MetaState = { ...DEFAULT_META };

  get(): Readonly<MetaState> {
    return this.state;
  }

  discoverPart(partId: string): void {
    if (!this.state.schemaBook.includes(partId)) {
      this.state.schemaBook.push(partId);
      eventBus.emit('meta:part_discovered', partId);
    }
  }

  unlockJournal(entryId: string): void {
    if (!this.state.axiomJournals.includes(entryId)) {
      this.state.axiomJournals.push(entryId);
      eventBus.emit('meta:journal_unlocked', entryId);
    }
  }

  unlockConfig(configId: string): void {
    if (!this.state.configUnlocks.includes(configId)) {
      this.state.configUnlocks.push(configId);
      eventBus.emit('meta:config_unlocked', configId);
    }
  }

  recordExplosion(record: ExplosionRecord): void {
    this.state.explosionArchive.push(record);
    eventBus.emit('meta:explosion_recorded', record);
  }

  completeRun(won: boolean): void {
    this.state.totalRuns++;
    if (won) {
      this.state.totalWins++;
      this.state.ascensionLevel++;
    }
    eventBus.emit('meta:run_complete', { won, totalRuns: this.state.totalRuns });
  }

  updatePvpRating(delta: number): void {
    this.state.pvpRating = Math.max(0, this.state.pvpRating + delta);
  }

  toJSON(): string {
    return JSON.stringify(this.state);
  }

  fromJSON(json: string): void {
    this.state = { ...DEFAULT_META, ...JSON.parse(json) };
    eventBus.emit('meta:loaded', this.state);
  }
}

export const metaState = new MetaStateManager();
