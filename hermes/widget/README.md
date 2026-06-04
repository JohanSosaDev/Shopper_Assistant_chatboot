# Hermes Widget

Widget de chat cliente para Hermes. Bundle vanilla TypeScript ≤30kb gzipped.

## Build

```bash
npm run build
```

## Integración en SFCC

1. Copiar `public/widget.js` y `public/widget.css` al servidor SFCC.
2. Insertar en el template ISML:

```html
<script src="/path/to/widget.js"></script>
<script>
  HermesWidget.init({
    apiBaseUrl: 'https://hermes-api.example.com',
    brand: 'patprimo',
    primaryColor: '#C41E3A',
    onPrimaryColor: '#FFFFFF',
  });
</script>
```
