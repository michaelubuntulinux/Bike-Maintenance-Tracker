export const environment = {
  production: true,
  cognito: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_nwVsYMWu0',
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
