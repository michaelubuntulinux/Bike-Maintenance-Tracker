import { Amplify } from 'aws-amplify';
import { environment, isCognitoConfigured } from '../../../environments/environment';

let configured = false;

export function configureAmplifyAuth(): boolean {
  if (!isCognitoConfigured()) {
    configured = false;
    return false;
  }
  if (configured) {
    return true;
  }
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: environment.cognito.userPoolId,
        userPoolClientId: environment.cognito.userPoolClientId,
        loginWith: {
          email: true,
        },
      },
    },
  });
  configured = true;
  return true;
}
