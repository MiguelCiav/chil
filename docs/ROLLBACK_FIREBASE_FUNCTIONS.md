# Guía de Rollback: Retorno a Firebase Cloud Functions

Este documento describe los pasos para revertir la arquitectura temporal de Vercel y regresar al despliegue 100% nativo en **Firebase Cloud Functions** una vez regularizado el estado de facturación en Google Cloud Platform (GCP).

---

## Resumen del Estado Temporal Actual

Arquitectura temporal vigente:
* **Microservicio temporal:** Los endpoints del scraper (`saveScraperSession`, `getScraperSessionStatus`, `clearScraperSession` y `getMemberStatus`) están alojados en Vercel (`https://chil-scraper-api.vercel.app/api`).
* **Frontend:** Consume la API de Vercel a través de la variable `VITE_SCRAPER_API_URL` en `.env` y `.env.production`.
* **CI/CD:** El flujo `.github/workflows/ci.yml` despliega a Firebase únicamente Hosting y Firestore (`--only hosting,firestore`) para evitar el error 403 de Cloud Functions.

---

## Procedimiento de Rollback Paso a Paso

### Paso 1: Regularizar la Facturación en Google Cloud
1. Accede a [Google Cloud Console - Facturación](https://console.cloud.google.com/billing).
2. Selecciona la cuenta de facturación vinculada al proyecto `chil-2d600`.
3. Actualiza el medio de pago o procesa el pago del saldo pendiente.
4. Confirma que el estado de la cuenta cambie a **Activa** (verde) y que el proyecto `chil-2d600` figure asociado.

### Paso 2: Configurar Secreto y Desplegar las Funciones en Firebase
Antes de desplegar, asegúrate de que el secreto `SCRAPER_ENCRYPTION_KEY` requerido por `functions/scraper/crypto.js` (`saveScraperSession` y `getMemberStatus`) esté configurado en Firebase Secret Manager:
```bash
firebase functions:secrets:set SCRAPER_ENCRYPTION_KEY
```
Luego, en tu terminal local autenticada en Firebase:
```bash
firebase deploy --only functions
```
Verifica que el despliegue finalice exitosamente sin errores 403 y que en Firebase Console > Functions aparezcan:
* `saveScraperSession` (us-central1, Callable v2)
* `getScraperSessionStatus` (us-central1, Callable v2)
* `clearScraperSession` (us-central1, Callable v2)
* `getMemberStatus` (us-central1, Callable v2)

### Paso 3: Retirar la Variable de Vercel en el Frontend
En `.env` y `.env.production`:
* Elimina o comenta la línea de `VITE_SCRAPER_API_URL`:
```ini
# VITE_SCRAPER_API_URL=https://chil-scraper-api.vercel.app/api
```
> **Nota técnica:** [`scraperApi.ts`](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/api/scraperApi.ts) detecta automáticamente la ausencia de esta variable y conmuta de vuelta al SDK nativo de Firebase (`httpsCallable(functions, ...)`).

### Paso 4: Restaurar el Pipeline de CI/CD
En [.github/workflows/ci.yml](file:///home/miguel-ciavato/Documents/github-repos/chil/.github/workflows/ci.yml#L83-L86) (actualmente `- name: Deploy to Firebase (Hosting & Firestore)` con `--only hosting,firestore`), restaura el comando de despliegue completo:
```yaml
      - name: Deploy to Firebase
        run: npx firebase-tools deploy
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

### Paso 5: (Opcional) Eliminar el Microservicio de Vercel
1. Puedes eliminar la carpeta temporal `scraper-api/` y retirar las pruebas del transporte HTTP de Vercel en `src/features/batches/api/__tests__/scraperApi.test.ts` (y `scraper-api/__tests__/`).
2. En [Vercel Dashboard](https://vercel.com/), accede al proyecto `chil-scraper-api` > **Settings** > **Advanced** > **Delete Project**.
