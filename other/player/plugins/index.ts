import { registerPlugin } from '@/other/player/registry';
import { audioPlugin } from '@/other/player/plugins/audio';
import { soundCloudPlugin } from '@/other/player/plugins/soundcloud';

registerPlugin(audioPlugin);
registerPlugin(soundCloudPlugin);
