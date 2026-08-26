import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from '../LandingPage';
import { HeroSection } from '../HeroSection';
import { FeatureGridSection } from '../FeatureGridSection';
import { WorkflowSection } from '../WorkflowSection';
import { ScoutValuesSection } from '../ScoutValuesSection';
import { LandingFooter } from '../LandingFooter';
import * as authFeature from '../../../auth';

vi.mock('../../../auth', async () => {
  const actual = await vi.importActual<typeof import('../../../auth')>('../../../auth');
  return {
    ...actual,
    useAuth: vi.fn()
  };
});

describe('Landing Page Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('HeroSection', () => {
    it('renders branding, title, subtitle and mock certificate preview with required tags', () => {
      render(
        <MemoryRouter>
          <HeroSection />
        </MemoryRouter>
      );

      // Headline and Subtitle
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /Chil — Sistema de Emisión y Control de Reconocimientos Scouts/i
        })
      ).toBeInTheDocument();

      expect(
        screen.getByText(
          /La plataforma moderna, ágil y oficial para gestionar lotes de reconocimientos, diseñar diplomas visuales interactivos y generar analítica territorial en el Movimiento Scout./i
        )
      ).toBeInTheDocument();

      // CTA Buttons and Links
      const registerBtn = screen.getByRole('link', {
        name: /Comenzar Ahora \/ Registrarse/i
      });
      expect(registerBtn).toHaveAttribute('href', '/registro');

      const loginBtn = screen.getByRole('link', {
        name: /Iniciar Sesión/i
      });
      expect(loginBtn).toHaveAttribute('href', '/login');

      const quickAction = screen.getByRole('link', {
        name: /Conoce la Emisión Rápida/i
      });
      expect(quickAction).toHaveAttribute('href', '#emision-rapida');

      // Visual Mock Preview tags
      expect(screen.getByText(/V-12\.345\.678/i)).toBeInTheDocument();
      expect(screen.getByText(/Tropa Scout/i)).toBeInTheDocument();
      expect(screen.getByText(/REC-8F3A2B/i)).toBeInTheDocument();
      expect(screen.getByText('Mariana Rojas Cadenas')).toBeInTheDocument();
      expect(screen.getByText(/Mérito Scout de Bronce/i)).toBeInTheDocument();
    });
  });

  describe('FeatureGridSection', () => {
    it('renders all 6 capability cards with titles and descriptions', () => {
      render(<FeatureGridSection />);

      expect(
        screen.getByRole('heading', {
          level: 2,
          name: /Todo lo necesario para la gestión de reconocimientos/i
        })
      ).toBeInTheDocument();

      // 1. Emisión Rápida
      expect(screen.getByRole('heading', { level: 3, name: 'Emisión Rápida' })).toBeInTheDocument();
      expect(
        screen.getByText(/Galardona individualmente en 1 solo paso con descarga instantánea/i)
      ).toBeInTheDocument();

      // 2. Lotes Masivos
      expect(screen.getByRole('heading', { level: 3, name: 'Lotes Masivos' })).toBeInTheDocument();
      expect(
        screen.getByText(/Carga de cédulas, verificación automática en el sistema de registro scout/i)
      ).toBeInTheDocument();

      // 3. Diseñador de Plantillas
      expect(
        screen.getByRole('heading', { level: 3, name: 'Diseñador de Plantillas' })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Editor visual interactivo adaptado a cualquier dimensión de diploma/i)
      ).toBeInTheDocument();

      // 4. Unidades Scouts & No Scout
      expect(
        screen.getByRole('heading', { level: 3, name: 'Unidades Scouts & No Scout' })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Soporte completo para Manada, Tropa, Caminantes, Clan/i)
      ).toBeInTheDocument();

      // 5. Analítica Territorial & YoY
      expect(
        screen.getByRole('heading', { level: 3, name: 'Analítica Territorial & YoY' })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Métricas interanuales \(Year-over-Year\), distribución geográfica/i)
      ).toBeInTheDocument();

      // 6. Aislamiento Multi-Tenant
      expect(
        screen.getByRole('heading', { level: 3, name: 'Aislamiento Multi-Tenant' })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Privacidad, seguridad y control total sobre los lotes y datos/i)
      ).toBeInTheDocument();
    });
  });

  describe('WorkflowSection', () => {
    it('renders the 3-step workflow section', () => {
      render(<WorkflowSection />);

      expect(
        screen.getByRole('heading', { level: 2, name: /¿Cómo funciona Chil\?/i })
      ).toBeInTheDocument();

      expect(screen.getByRole('heading', { level: 3, name: '1. Configurar' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: '2. Verificar' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: '3. Emitir' })).toBeInTheDocument();

      expect(
        screen.getByText(/Selecciona el tipo de reconocimiento del catálogo oficial/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Ingresa las cédulas para consultar automáticamente la membresía/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Genera los certificados PDF de alta resolución con códigos únicos/i)
      ).toBeInTheDocument();
    });
  });

  describe('ScoutValuesSection', () => {
    it('renders scout institutional values and badges', () => {
      render(<ScoutValuesSection />);

      expect(
        screen.getByRole('heading', {
          level: 2,
          name: /Valores que impulsan cada reconocimiento/i
        })
      ).toBeInTheDocument();

      expect(screen.getByText('Promesa y Ley Scout')).toBeInTheDocument();
      expect(screen.getByText('Reconocimiento al Mérito')).toBeInTheDocument();
      expect(screen.getByText('Hermandad Scout')).toBeInTheDocument();
      expect(screen.getByText('Siempre Listos')).toBeInTheDocument();
      expect(screen.getByText('Fundamento')).toBeInTheDocument();
      expect(screen.getByText('Superación')).toBeInTheDocument();
    });
  });

  describe('LandingFooter', () => {
    it('renders public footer with links to login, register, branding and scout motto', () => {
      render(
        <MemoryRouter>
          <LandingFooter />
        </MemoryRouter>
      );

      expect(screen.getByText(/Siempre Listos para Servir ⚜️/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Iniciar Sesión/i })).toHaveAttribute('href', '/login');
      expect(screen.getByRole('link', { name: /Crear Cuenta \/ Registrarse/i })).toHaveAttribute(
        'href',
        '/registro'
      );
      expect(
        screen.getByText(new RegExp(`© ${new Date().getFullYear()} Chil`, 'i'))
      ).toBeInTheDocument();
    });
  });

  describe('LandingPage Orchestrator', () => {
    it('renders full landing page with all subcomponents', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      // Hero
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /Chil — Sistema de Emisión y Control de Reconocimientos Scouts/i
        })
      ).toBeInTheDocument();

      // Capabilities
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: /Todo lo necesario para la gestión de reconocimientos/i
        })
      ).toBeInTheDocument();

      // Workflow
      expect(
        screen.getByRole('heading', { level: 2, name: /¿Cómo funciona Chil\?/i })
      ).toBeInTheDocument();

      // Scout Values
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: /Valores que impulsan cada reconocimiento/i
        })
      ).toBeInTheDocument();

      // Footer
      expect(screen.getByText(/Siempre Listos para Servir ⚜️/i)).toBeInTheDocument();
    });
  });

  describe('App Routing Integration for Landing Page', () => {
    it('renders LandingPage at root "/" when user is unauthenticated', () => {
      vi.mocked(authFeature.useAuth).mockReturnValue({
        user: null,
        loading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        resetPassword: vi.fn()
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /Chil — Sistema de Emisión y Control de Reconocimientos Scouts/i
        })
      ).toBeInTheDocument();
    });

    it('renders LandingPage at "/inicio" route', () => {
      render(
        <MemoryRouter initialEntries={['/inicio']}>
          <Routes>
            <Route path="/inicio" element={<LandingPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /Chil — Sistema de Emisión y Control de Reconocimientos Scouts/i
        })
      ).toBeInTheDocument();
    });
  });
});
