# Guía de Rollback: Retorno a Firebase Cloud Functions

Este documento describe los pasos para revertir la arquitectura temporal de Vercel y regresar al despliegue 100% nativo en **Firebase Cloud Functions** una vez regularizado el estado de facturación en Google Cloud Platform (GCP).

---

## Resumen del Estado Temporal Actual

Durante este PR:
* **Microservicio temporal:** El scraper (`loginScraper` y `getMemberStatus`) está alojado en Vercel (`https://chil-scraper-api.vercel.app/api`).
* **Frontend:** Consume la API de Vercel a través de la variable `VITE_SCRAPER_API_URL` en `.env.production`.
* **CI/CD:** El flujo `.github/workflows/ci.yml` despliega a Firebase únicamente Hosting y Firestore (`--only hosting,firestore`) para evitar el error 403 de Cloud Functions.

---

## Procedimiento de Rollback Paso a Paso

### Paso 1: Regularizar la Facturación en Google Cloud
1. Accede a [Google Cloud Console - Facturación](https://console.cloud.google.com/billing).
2. Selecciona la cuenta de facturación vinculada al proyecto `chil-2d600`.
3. Actualiza el medio de pago o procesa el pago del saldo pendiente.
4. Confirma que el estado de la cuenta cambie a **Activa** (verde) y que el proyecto `chil-2d600` figure asociado.

### Paso 2: Desplegar y Probar las Funciones en Firebase
En tu terminal local autenticada en Firebase:
```bash
firebase deploy --only functions
```
Verifica que el despliegue finalice exitosamente sin errores 403 y que en Firebase Console > Functions aparezcan:
* `loginScraper` (us-central1, Callable v2)
* `getMemberStatus` (us-central1, Callable v2)

### Paso 3: Retirar la Variable de Vercel en el Frontend
En el archivo `.env.production`:
* Elimina o comenta la línea de `VITE_SCRAPER_API_URL`:
```ini
# VITE_SCRAPER_API_URL=https://chil-scraper-api.vercel.app/api
```
> **Nota técnica:** [`scraperApi.ts`](file:///home/miguel-ciavato/Documents/github-repos/chil/src/features/batches/api/scraperApi.ts) detecta automáticamente la ausencia de esta variable y conmuta de vuelta al SDK nativo de Firebase (`httpsCallable(functions, ...)`).

### Paso 4: Restaurar el Pipeline de CI/CD
En [.github/workflows/ci.yml](file:///home/miguel-ciavato/Documents/github-repos/chil/.github/workflows/ci.yml#L83-L86), restaura el comando de despliegue completo:
```yaml
      - name: Deploy to Firebase
        run: npx firebase-tools deploy
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

### Paso 5: (Opcional) Eliminar el Microservicio de Vercel
1. Puedes eliminar la carpeta temporal `scraper-api/` y el archivo de tests `src/features/batches/api/__tests__/scraperApiVercel.test.ts`.
2. En [Vercel Dashboard](https://vercel.com/), accede al proyecto `chil-scraper-api` > **Settings** > **Advanced** > **Delete Project**.
