import {
  initMoxaCounters,
  loadMoxaStaticHtml,
} from '../moxa-shared/moxa-shared.js';

export default async function decorate(block) {
  await loadMoxaStaticHtml(block, 'moxa-content');
  initMoxaCounters(block);
}
