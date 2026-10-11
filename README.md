<p align="center">
  <img src="https://i.imgur.com/X2pGfSy.png" alt="Chil logo" width=200px />
</p>

# Chil

Chil is a web application built with React, TypeScript, and Firebase. It is designed to automate and streamline scout recognition workflows. By leveraging the flexibility of React and Firebase, Chil provides a fast, secure, and user-friendly tool for cooperators to manage records, generate batch PDFs, and track statistical data via Firestore. It also allows users to quickly verify active registrations, generate bulk PDFs based on Group, District, and Region data, and maintain a robust history of generated documents.

---

## Prerequisites

To develop and run Chil locally, ensure you have the following installed:

### Required Software
- **[Node.js](https://nodejs.org/)**: v18 or higher (v20+ recommended).
- **[Firebase CLI](https://firebase.google.com/docs/cli)**: Install globally via `npm install -g firebase-tools`.

---

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MiguelCiav/chil.git
   cd chil
   ```

2. **Install Frontend Dependencies:**
   ```bash
   npm install
   ```

3. **Install Firebase Functions Dependencies:**
   ```bash
   cd functions
   npm install
   cd ..
   ```

---

## Development Workflow

To start the local Vite development server:

```bash
npm run dev
```

To run and test Firebase Functions locally, you can start the **Firebase Local Emulator Suite**:
```bash
firebase emulators:start
```

---

## Testing and Quality Assurance

Chil is built with a rigorous testing and linting suite to ensure stability.

### 1. Frontend Testing (Vitest)
Runs unit and component tests for the React application using Vitest and React Testing Library.
```bash
npm run test
```

### 2. Linting
Maintains code quality and consistency.
- **Frontend (ESLint):** `npm run lint`

### 3. Code Coverage Reports
You can run automated test coverage reports:
- **Frontend Coverage (Vitest):** Run `npx vitest run --coverage`. Reports are generated under `coverage/`.

---

## Building & Deploying

### Building for Production
To generate a production-ready, optimized static build of the frontend:
```bash
npm run build
```
The compiled files will be located in the `dist/` directory.

### Deploying to Firebase
To deploy the application to Firebase (Hosting, Firestore rules/indexes, and Cloud Functions):
```bash
firebase deploy
```

---

## Core Capabilities

- **Lotes Masivos y Multigrupo**: Creación ágil de lotes con soporte para integrantes de múltiples grupos scouts, asignación individual de jerarquía y validación estricta de cédulas.
- **Fusión de Lotes (Batch Merge)**: Unificación de dos o más lotes existentes en uno consolidado con fecha actualizada y comentarios combinados.
- **Emisión Rápida Individual**: Generación instantánea de reconocimientos con asignación de código oficial y descarga directa en PDF para jóvenes, adultos o colaboradores No Scouts.
- **Diseñador Visual de Plantillas**: Editor interactivo drag-and-drop con fondos personalizados, resolución adaptable, tipografías institucionales oficiales y guías magnéticas inteligentes de centrado y alineación.
- **Descarga de Reconocimientos en ZIP**: Empaquetado automático en archivo comprimido `.zip` con un diploma en PDF individual por cada integrante acreditado.
- **Tablero Estadístico e Interanual (YoY)**: Métricas ejecutivas, distribución territorial por región y distrito, y comparativa histórica interanual con exportación en PDF y CSV.
- **Navegación Moderna y Responsiva**: Sidebar lateral colapsable con drawer táctil para dispositivos móviles y guías interactivas (Walkthroughs) en cada módulo.

---

## Project Stack

### Frontend
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **Typography**: Scouts GT Planar & Noto Sans
- **State/Data Handling**: TanStack Table, React Hook Form
- **Validation**: Zod
- **Icons**: Lucide React
- **Document & Archive Generation**: jsPDF, JSZip

### Backend & Cloud Services
- **Database**: Cloud Firestore
- **Serverless Backend**: Firebase Cloud Functions (2nd Gen Node.js 20)
- **Hosting**: Firebase Hosting
- **Authentication**: Firebase Auth

---

## Development Standards

Chil follows strict development standards to maintain a clean history and automated semantic versioning:
- **[Conventional Commits](https://www.conventionalcommits.org/)**: Follow standard commit message formatting (`<type>(scope): <description>`).

For a detailed guide on our workflow, please read the **[Contributing Guide](docs/CONTRIBUTING.md)**.
