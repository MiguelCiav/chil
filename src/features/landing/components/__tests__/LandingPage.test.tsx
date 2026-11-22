import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LandingPage } from '../LandingPage';
import { HeroSection } from '../HeroSection';
import { FeatureGridSection } from '../FeatureGridSection';
import { WorkflowSection } from '../WorkflowSection';
import { LandingFooter } from '../LandingFooter';
import { RevealOnScroll } from '../RevealOnScroll';

type ObserverRecord = {
  callback: IntersectionObserverCallback;
  observed: Element[];
};

function installMockIntersectionObserver() {
  const records: ObserverRecord[] = [];
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '';
    readonly thresholds = [];
    private record: ObserverRecord;
    constructor(callback: IntersectionObserverCallback) {
      this.record = { callback, observed: [] };
      records.push(this.record);
    }
    observe = (el: Element) => {
      this.record.observed.push(el);
    };
    disconnect = vi.fn();
    unobserve = vi.fn();
    takeRecords = vi.fn(() => []);
  }
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  return records;
}

describe('Landing Feature Components', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('RevealOnScroll', () => {
    it('renders children visible immediately when IntersectionObserver is unavailable', () => {
      vi.stubGlobal('IntersectionObserver', undefined);
      const { container } = render(
        <RevealOnScroll>
          <p>Contenido visible sin observer</p>
        </RevealOnScroll>
      );
      expect(container.firstElementChild).toHaveClass('opacity-100');
    });

    it('transitions from hidden to visible when the observer reports an intersection', () => {
      const records = installMockIntersectionObserver();
      const { container } = render(
        <RevealOnScroll>
          <p>Bloque animado</p>
        </RevealOnScroll>
      );
      expect(container.firstElementChild).toHaveClass('opacity-0');

      act(() => {
        records[0].callback(
          [{ isIntersecting: true, target: records[0].observed[0] } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      });
      expect(container.firstElementChild).toHaveClass('opacity-100');
    });

    it('renders children visible immediately when prefers-reduced-motion is enabled', () => {
      vi.stubGlobal('IntersectionObserver', vi.fn());
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
      const { container } = render(
        <RevealOnScroll>
          <p>Movimiento reducido</p>
        </RevealOnScroll>
      );
      expect(container.firstElementChild).toHaveClass('opacity-100');
    });
  });

  describe('HeroSection', () => {
    it('renders the parchment hero banner, Chil crest, World Scouting logo, headline, descriptor and auth links without a navbar', () => {
      render(
        <MemoryRouter>
          <HeroSection />
        </MemoryRouter>
      );

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /Valida registros\.\s*Reconoce rápido\./i
        })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Sistema Scout de Emisión y Control de Reconocimientos/i)
      ).toBeInTheDocument();
      expect(screen.getByAltText('Chil Logo')).toBeInTheDocument();
      expect(screen.getByAltText('World Scouting')).toBeInTheDocument();
      expect(screen.getByTestId('hero-top-gradient')).toBeInTheDocument();
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

      const start = screen.getByRole('link', { name: /Comenzar Ahora/i });
      expect(start).toHaveAttribute('href', '/registro');
      expect(start.querySelector('button')).toBeNull();

      const login = screen.getByRole('link', { name: /Iniciar Sesión/i });
      expect(login).toHaveAttribute('href', '/login');
      expect(login.querySelector('button')).toBeNull();
    });
  });

  describe('FeatureGridSection', () => {
    it('renders the oversized statement and the four product chapters with anchor ids', () => {
      vi.stubGlobal('IntersectionObserver', undefined);
      render(<FeatureGridSection />);

      expect(
        screen.getByRole('heading', { level: 2, name: /Genera lotes de reconocimientos En una sola herramienta/i })
      ).toBeInTheDocument();

      const chapters = [
        ['lotes-masivos', /Pega las cédulas\. Chil te dice quién está al día\./i],
        ['disenador-plantillas', /Tu reconocimiento oficial, con cada nombre en su sitio\./i],
        ['exportacion-flexible', /Un ZIP por grupo\. Listo para entregar\./i],
        ['analitica-territorial', /Tu año completo, de un vistazo\./i]
      ] as const;

      for (const [id, title] of chapters) {
        const article = document.getElementById(id);
        expect(article).not.toBeNull();
        expect(within(article as HTMLElement).getByRole('heading', { level: 3, name: title })).toBeInTheDocument();
      }
    });

    it('activates the chapter that the observer reports in the viewport middle band', () => {
      const records = installMockIntersectionObserver();
      const { container } = render(<FeatureGridSection />);

      const chapterObserver = records.find((record) => record.observed.length === 4);
      expect(chapterObserver).toBeDefined();

      const progressLabels = () =>
        Array.from(container.querySelectorAll('p.text-sm.font-bold')).filter((el) =>
          ['Verifica', 'Diseña', 'Exporta', 'Analiza'].includes(el.textContent ?? '')
        );

      expect(progressLabels()[0]).toHaveClass('text-primary');

      act(() => {
        chapterObserver!.callback(
          [{ isIntersecting: true, target: chapterObserver!.observed[2] } as IntersectionObserverEntry],
          {} as IntersectionObserver
        );
      });

      expect(progressLabels()[2]).toHaveClass('text-primary');
      expect(progressLabels()[0]).not.toHaveClass('text-primary');
    });
  });

  describe('WorkflowSection', () => {
    it('renders the continuous recognition marquee with pause control, manifesto and three product facts', () => {
      render(<WorkflowSection />);

      expect(screen.getByText(/Mensajeros de la Paz, Scouts del Mundo/i)).toBeInTheDocument();
      expect(screen.queryByText(/Insignia de Madera/i)).not.toBeInTheDocument();

      const toggle = screen.getByRole('button', { name: /Pausar cinta de reconocimientos/i });
      expect(toggle).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(toggle);
      expect(screen.getByRole('button', { name: /Reanudar cinta de reconocimientos/i })).toHaveAttribute(
        'aria-pressed',
        'true'
      );

      expect(
        screen.getByRole('heading', { level: 2, name: /Menos tiempo en planillas\. Más tiempo para tus objetivos\./i })
      ).toBeInTheDocument();
      expect(screen.getByText('1:1')).toBeInTheDocument();
      expect(screen.getByText('AES-256')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: /Ramas y categorías reconocidas/i })).toBeInTheDocument();
    });
  });

  describe('LandingFooter', () => {
    it('renders the closing CTA, section anchors, auth links and current year', () => {
      render(
        <MemoryRouter>
          <LandingFooter />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { level: 2, name: /Tu próximo lote empieza hoy\./i })).toBeInTheDocument();

      const register = screen.getByRole('link', { name: /Crear cuenta gratuita/i });
      expect(register).toHaveAttribute('href', '/registro');
      expect(register.querySelector('button')).toBeNull();
      expect(screen.getByRole('link', { name: /Ya tengo cuenta/i })).toHaveAttribute('href', '/login');

      const nav = screen.getByRole('navigation', { name: /Secciones de la página/i });
      expect(within(nav).getByRole('link', { name: 'Verificación' })).toHaveAttribute('href', '#lotes-masivos');
      expect(within(nav).getByRole('link', { name: 'Diseñador de reconocimientos' })).toHaveAttribute(
        'href',
        '#disenador-plantillas'
      );
      expect(within(nav).getByRole('link', { name: 'Analítica' })).toHaveAttribute('href', '#analitica-territorial');

      const year = new Date().getFullYear().toString();
      expect(screen.getByText(new RegExp(`© ${year} Chil\\. Todos los derechos reservados\\.`))).toBeInTheDocument();
    });
  });

  describe('LandingPage composition and routing', () => {
    it('composes hero, showcase, manifesto and closing sections', () => {
      render(
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /Genera lotes de reconocimientos/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /Menos tiempo en planillas/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /Tu próximo lote empieza hoy/i })).toBeInTheDocument();
    });

    it('routes /inicio to LandingPage', () => {
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
          name: /Valida registros\.\s*Reconoce rápido\./i
        })
      ).toBeInTheDocument();
    });
  });
});
