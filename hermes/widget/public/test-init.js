// Usa el mismo origin que sirve la página → funciona en localhost y en tunnel HTTPS.
HermesWidget.init({
  apiBaseUrl: window.location.origin,
  brand: 'patprimo',
  primaryColor: '#1c1f2a',
  onPrimaryColor: '#FFFFFF',
});
