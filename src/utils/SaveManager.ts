import { runState } from '@/state/RunStateManager';
import { metaState } from '@/state/MetaStateManager';

const STORAGE_KEY_RUN = 'cr_run_state';
const STORAGE_KEY_META = 'cr_meta_state';

export const SaveManager = {
  saveRun(): void {
    try {
      localStorage.setItem(STORAGE_KEY_RUN, runState.toJSON());
    } catch (e) {
      console.error('Failed to save run state:', e);
    }
  },

  loadRun(): boolean {
    try {
      const data = localStorage.getItem(STORAGE_KEY_RUN);
      if (data) {
        runState.fromJSON(data);
        return true;
      }
    } catch (e) {
      console.error('Failed to load run state:', e);
    }
    return false;
  },

  clearRun(): void {
    localStorage.removeItem(STORAGE_KEY_RUN);
  },

  saveMeta(): void {
    try {
      localStorage.setItem(STORAGE_KEY_META, metaState.toJSON());
    } catch (e) {
      console.error('Failed to save meta state:', e);
    }
  },

  loadMeta(): boolean {
    try {
      const data = localStorage.getItem(STORAGE_KEY_META);
      if (data) {
        metaState.fromJSON(data);
        return true;
      }
    } catch (e) {
      console.error('Failed to load meta state:', e);
    }
    return false;
  },

  saveAll(): void {
    this.saveRun();
    this.saveMeta();
  },

  loadAll(): void {
    this.loadMeta();
    this.loadRun();
  },
};
