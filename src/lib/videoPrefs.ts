import type { VideoPrefs } from '../../shared/models';
import { VIDEO_PROFILES } from '../../shared/models';

const KEY = 'xuong_video_prefs';
const DEFAULT: VideoPrefs = { platform: 'omni-flash', allow10: false };

export function loadVideoPrefs(): VideoPrefs {
  try {
    const v = { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    if (!VIDEO_PROFILES.some((p) => p.id === v.platform)) v.platform = DEFAULT.platform;
    if (v.platform !== 'omni-flash') v.allow10 = false;
    return v;
  } catch {
    return DEFAULT;
  }
}

export function saveVideoPrefs(v: VideoPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* bỏ qua */
  }
}
