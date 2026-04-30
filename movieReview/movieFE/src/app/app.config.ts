import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  provideAppInitializer,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAuth0, AuthService as Auth0Service } from '@auth0/auth0-angular';
import { firstValueFrom, filter } from 'rxjs';

import { routes } from './app.routes';
import { WebServices } from './services/web-services';
import { AuthService } from './services/auth-service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    provideAuth0({
      domain: 'ibrahimsharker.uk.auth0.com',
      clientId: 'Fo0Dvs71MUwYg50xpkSHdasBQkAkgu7D',
      authorizationParams: {
        redirect_uri: window.location.origin,
        scope: 'openid profile email',
      },
    }),
    provideAppInitializer(async () => {
      const auth0      = inject(Auth0Service);
      const webService = inject(WebServices);
      const authService = inject(AuthService);

      // Wait for Auth0 to finish its internal session check / code exchange
      await firstValueFrom(auth0.isLoading$.pipe(filter(loading => !loading)));

      const isAuthenticated = await firstValueFrom(auth0.isAuthenticated$);
      console.log('[Auth0] isAuthenticated:', isAuthenticated);

      if (isAuthenticated) {
        try {
          const profile = await firstValueFrom(webService.syncAuth());
          authService.setProfile(profile);
          console.log('[Auth0] sync success:', profile);
        } catch (err) {
          console.error('[Auth0 sync failed]', err);
        }
      }
    }),
  ],
};
