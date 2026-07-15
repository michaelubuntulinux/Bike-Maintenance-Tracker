export const environment = {
  production: false,
  cognito: {
    region: 'us-east-1',
    /** Reemplazá con tu User Pool ID (ej. us-east-1_AbCdEfGh) */
    userPoolId: 'us-east-1_nwVsYMWu0',
    /** App client ID (sin secret) */
    userPoolClientId: '3h4b1kqms873nrtntkms5kgk8s',
  },
};

export function isCognitoConfigured(): boolean {
  const { userPoolId, userPoolClientId } = environment.cognito;
  return (
    !!userPoolId &&
    !!userPoolClientId &&
    !userPoolId.includes('REPLACE') &&
    !userPoolClientId.includes('REPLACE')
  );
}
