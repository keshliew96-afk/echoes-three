// Core menu registration (M1): the app-layer screens and M1's settings tabs.
// Called once by createApp(). Other keys register their own screens / tabs
// from their own modules (M2 'saves'/'records', M3 the Audio tab, M4a the
// expedition picker + a Gameplay row, M5b the multiplayer screens + Network
// tab, INT 'pause') — the title and the settings chrome pick them up live.
import { registerScreen, registerSettingsTab } from '../../app/registry.js';
import { createLoadingScreen } from './loading.js';
import { createTitleScreen } from './title.js';
import { createSettingsScreen } from './settings.js';
import { createConfirmScreen } from './confirm.js';
import { createKeepDisplayScreen } from './keepdisplay.js';
import { createFarewellScreen } from './farewell.js';
import { buildDisplayTab } from './tabs/display.js';
import { buildGameplayTab } from './tabs/gameplay.js';
import { buildControlsTab } from './tabs/controls.js';

let registered = false;

export function registerCoreMenus() {
  if (registered) return;
  registered = true;
  registerScreen('loading', createLoadingScreen);
  registerScreen('title', createTitleScreen);
  registerScreen('settings', createSettingsScreen);
  registerScreen('confirm', createConfirmScreen);
  registerScreen('keep-display', createKeepDisplayScreen);
  registerScreen('farewell', createFarewellScreen);
  registerSettingsTab({ id: 'display', label: 'Display', order: 10, build: buildDisplayTab });
  registerSettingsTab({ id: 'gameplay', label: 'Gameplay', order: 30, build: buildGameplayTab });
  registerSettingsTab({ id: 'controls', label: 'Controls', order: 40, build: buildControlsTab });
}
