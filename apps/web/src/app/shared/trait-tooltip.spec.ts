import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { V20_RULESET } from '@vampiro/shared';
import { TraitTooltip } from './trait-tooltip';

@Component({
  imports: [TraitTooltip],
  template: `<button type="button" [traitTooltip]="key()">Fuerza</button>`,
})
class Host {
  readonly key = signal('fuerza');
}

describe('TraitTooltip', () => {
  let fixture: ComponentFixture<Host>;
  let button: HTMLButtonElement;

  const tooltip = () => document.querySelector<HTMLElement>('[role="tooltip"]');

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(Host);
    // El primer ciclo crea el recurso y lanza la petición; se responde antes de esperar.
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('/api/v1/rulesets/v20').flush(V20_RULESET);
    await fixture.whenStable();
    button = fixture.nativeElement.querySelector('button');
  });

  afterEach(() => {
    fixture.destroy();
    TestBed.inject(HttpTestingController).verify();
  });

  it('al recibir el foco muestra nombre, resumen y niveles del rasgo', async () => {
    button.dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();

    const panel = tooltip();
    expect(panel?.textContent).toContain('Fuerza');
    expect(panel?.textContent).toContain('Potencia física bruta');
    expect(panel?.querySelectorAll('li').length).toBe(5);
    expect(button.getAttribute('aria-describedby')).toBe(panel?.id);
  });

  it('Escape lo cierra', async () => {
    button.dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();

    expect(tooltip()).toBeNull();
    expect(button.hasAttribute('aria-describedby')).toBe(false);
  });

  it('al perder el foco se cierra', async () => {
    button.dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    button.dispatchEvent(new FocusEvent('blur'));
    await fixture.whenStable();
    expect(tooltip()).toBeNull();
  });

  it('un rasgo que no existe no muestra nada', async () => {
    fixture.componentInstance.key.set('telepatia');
    await fixture.whenStable();
    button.dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    expect(tooltip()).toBeNull();
  });

  it('se limpia al destruirse', async () => {
    button.dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    fixture.destroy();
    expect(tooltip()).toBeNull();
  });
});
