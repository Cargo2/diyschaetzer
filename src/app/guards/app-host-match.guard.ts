import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { AppHostService } from '../services/app-host.service';

/**
 * Aktiviert den App-Routen-Baum (WP1) nur auf dem App-Host bzw. bei Dev-Override.
 * Auf dem Server/Prerender ist `isAppHost` immer false → es matcht der Marketing-
 * Baum, damit das prerenderte HTML unverändert bleibt. Der Modus wird EINMALIG im
 * Service bestimmt (stabil über alle Navigationen), sonst würde `canMatch` flippen.
 */
export const appHostMatchGuard: CanMatchFn = () => inject(AppHostService).isAppHost;
