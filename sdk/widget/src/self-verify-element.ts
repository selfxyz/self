import type { SelfApp, SelfAppDisclosureConfig } from '@selfxyz/sdk-common';
import { getUniversalLink, REDIRECT_URL, SelfAppBuilder, WS_DB_RELAYER } from '@selfxyz/sdk-common';
import { v4 as uuidv4 } from 'uuid';

import { getAppStoreUrls, getDefaultBrowserName, isInAppBrowser, isMobile } from './utils/device.js';
import { resolvePreset } from './utils/presets.js';
import { renderQRToSVG } from './utils/qr.js';
import { getStepColor, getStepLabel, getWidgetCSS } from './utils/styles.js';
import type { VerificationStepValue } from './utils/websocket.js';
import { VerificationStep, WebSocketManager } from './utils/websocket.js';

const SELF_LOGO_SVG = `<svg width="28" height="28" viewBox="0 0 92 92" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M29.4862 38.0341C29.4862 32.8577 33.6281 28.6604 38.7362 28.6604H56.599L76.3837 8.61108H27.0606L9.3623 26.5461V56.0524H29.4862V38.0237V38.0341Z" fill="currentColor"/><path d="M63.2384 36.0864V53.4903C63.2384 58.6666 59.0965 62.864 53.9884 62.864H36.8142L16.3409 83.6111H65.664L83.3623 65.6761V36.0968H63.2384V36.0864Z" fill="currentColor"/><path d="M46.3726 37.3923H46.3623C41.6113 37.3923 37.7598 41.2959 37.7598 46.1111V46.1215C37.7598 50.9367 41.6113 54.8403 46.3623 54.8403H46.3726C51.1236 54.8403 54.9751 50.9367 54.9751 46.1215V46.1111C54.9751 41.2959 51.1236 37.3923 46.3726 37.3923Z" fill="currentColor"/></svg>`;

// Status icons are static SVG strings — no user input
const CHECK_SVG = '<svg class="check-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24"/><path d="M14 24l7 7 13-13" fill="none"/></svg>';
const ERROR_SVG = '<svg class="error-icon" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24"/><line x1="16" y1="16" x2="32" y2="32"/><line x1="32" y1="16" x2="16" y2="32"/></svg>';

const SESSION_KEY_PREFIX = 'self_session_';

/**
 * Safely creates a DOM tree from static template + escaped dynamic values.
 * All user-provided strings are escaped via textContent assignment before insertion.
 */
function escapeForAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function createTextEl(tag: string, className: string, text: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

export class SelfVerifyElement extends HTMLElement {
  static get observedAttributes() {
    return [
      'app-name',
      'app-scope',
      'app-endpoint',
      'preset',
      'user-id',
      'mode',
      'size',
      'dark-mode',
      'session-ttl',
      'logo',
      'disclosures',
      'endpoint-type',
      'description',
    ];
  }

  private shadow: ShadowRoot;
  private wsManager: WebSocketManager | null = null;
  private sessionId: string = '';
  private currentStep: VerificationStepValue = VerificationStep.DISCONNECTED;
  private expanded = false;
  private selfApp: SelfApp | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.sessionId = this.getAttribute('user-id') || uuidv4();

    // Check for existing valid session
    if (this.checkSessionMemory()) return;

    this.wsManager = new WebSocketManager({
      onStepChange: (step) => this.handleStepChange(step),
      onSuccess: (data) => this.handleSuccess(data),
      onError: (data) => this.handleError(data),
    });

    this.buildSelfApp();
    this.render();
    this.connectWebSocket();
  }

  disconnectedCallback() {
    this.wsManager?.disconnect();
    this.wsManager = null;
  }

  attributeChangedCallback() {
    if (!this.isConnected) return;
    this.buildSelfApp();
    this.render();
  }

  private buildSelfApp(): void {
    const appName = this.getAttribute('app-name');
    const scope = this.getAttribute('app-scope');
    const endpoint = this.getAttribute('app-endpoint');

    if (!appName || !scope || !endpoint) return;

    const presetName = this.getAttribute('preset');
    const disclosuresStr = this.getAttribute('disclosures');
    const endpointType = (this.getAttribute('endpoint-type') || 'https') as 'https' | 'celo';
    const logo = this.getAttribute('logo') || '';
    const mode = this.getAttribute('mode') || 'websocket';

    if (endpointType === 'celo' && mode === 'token') {
      console.error('[self-verify] Token mode is incompatible with onchain (celo) endpoint type.');
      return;
    }

    let disclosures: SelfAppDisclosureConfig = {};

    if (disclosuresStr) {
      try {
        disclosures = JSON.parse(disclosuresStr);
      } catch {
        console.error('[self-verify] Invalid disclosures JSON');
        return;
      }
    } else if (presetName) {
      const preset = resolvePreset(presetName);
      if (preset) {
        disclosures = preset.disclosures;
      } else {
        console.error(`[self-verify] Unknown preset: ${presetName}`);
      }
    }

    try {
      const builder = new SelfAppBuilder({
        appName,
        scope,
        endpoint,
        endpointType,
        userId: this.sessionId,
        logoBase64: logo,
        disclosures,
      } as Partial<SelfApp>);

      this.selfApp = builder.build();
      this.selfApp.sessionId = this.sessionId;
    } catch (e) {
      console.error('[self-verify] Config error:', (e as Error).message);
    }
  }

  private connectWebSocket(): void {
    if (!this.selfApp || !this.wsManager) return;
    this.wsManager.connect(WS_DB_RELAYER, this.selfApp);
  }

  private handleStepChange(step: VerificationStepValue): void {
    this.currentStep = step;
    this.updateStatus();
    this.dispatchEvent(
      new CustomEvent('self:status', {
        detail: { step, label: getStepLabel(step) },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleSuccess(data: Record<string, unknown>): void {
    const ttl = parseInt(this.getAttribute('session-ttl') || '0', 10);
    if (ttl > 0) {
      this.saveSessionMemory(ttl);
    }

    this.dispatchEvent(
      new CustomEvent('self:success', {
        detail: {
          verified: true,
          sessionId: this.sessionId,
          token: data.token,
          claims: data.claims,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleError(data: { error_code?: string; reason?: string }): void {
    this.dispatchEvent(
      new CustomEvent('self:error', {
        detail: { errorCode: data.error_code, reason: data.reason },
        bubbles: true,
        composed: true,
      })
    );
  }

  // Session memory
  private getSessionKey(): string {
    return `${SESSION_KEY_PREFIX}${this.getAttribute('app-scope') || ''}`;
  }

  private checkSessionMemory(): boolean {
    const ttl = parseInt(this.getAttribute('session-ttl') || '0', 10);
    if (ttl <= 0) return false;

    try {
      const stored = localStorage.getItem(this.getSessionKey());
      if (!stored) return false;
      const session = JSON.parse(stored);
      if (Date.now() < session.expiresAt) {
        this.renderVerified();
        this.dispatchEvent(
          new CustomEvent('self:already-verified', {
            detail: { scope: session.scope, verifiedAt: session.verifiedAt },
            bubbles: true,
            composed: true,
          })
        );
        return true;
      }
      localStorage.removeItem(this.getSessionKey());
    } catch {
      // ignore
    }
    return false;
  }

  private saveSessionMemory(ttlSeconds: number): void {
    try {
      localStorage.setItem(
        this.getSessionKey(),
        JSON.stringify({
          scope: this.getAttribute('app-scope'),
          verifiedAt: Date.now(),
          expiresAt: Date.now() + ttlSeconds * 1000,
        })
      );
    } catch {
      // localStorage unavailable
    }
  }

  // DOM-based rendering — avoids innerHTML with user content
  private render(): void {
    const qrSize = parseInt(this.getAttribute('size') || '200', 10);
    const presetName = this.getAttribute('preset');
    const customDesc = this.getAttribute('description');
    const darkMode = this.hasAttribute('dark-mode');
    const mobile = isMobile();
    const inApp = isInAppBrowser();

    const preset = presetName ? resolvePreset(presetName) : null;
    const headerText = customDesc
      ? this.getAttribute('app-name') || 'Verify with Self'
      : preset?.header || 'Verify with Self';
    const descText = customDesc || preset?.description || 'Verify your identity privately using Self.';
    const appStores = getAppStoreUrls();

    // Clear shadow DOM
    while (this.shadow.firstChild) {
      this.shadow.removeChild(this.shadow.firstChild);
    }

    // Add styles
    const styleEl = document.createElement('style');
    styleEl.textContent = getWidgetCSS();
    this.shadow.appendChild(styleEl);

    if (mobile && inApp) {
      this.shadow.appendChild(this.buildInAppBrowserWarning());
    } else if (mobile) {
      this.shadow.appendChild(this.buildMobileView(descText, appStores));
    } else {
      this.shadow.appendChild(this.buildDesktopView(headerText, descText, qrSize, darkMode, appStores));
    }
  }

  private buildDesktopView(
    header: string,
    description: string,
    qrSize: number,
    darkMode: boolean,
    appStores: { ios: string; android: string }
  ): HTMLElement {
    if (!this.expanded) {
      const btn = document.createElement('button');
      btn.className = 'trigger-button';
      btn.setAttribute('aria-label', 'Start verification with Self');
      // Logo is a static trusted SVG constant
      const logoSpan = document.createElement('span');
      logoSpan.insertAdjacentHTML('afterbegin', SELF_LOGO_SVG);
      btn.appendChild(logoSpan.firstElementChild!);
      const label = document.createElement('span');
      label.textContent = 'Verify with Self';
      btn.appendChild(label);
      btn.addEventListener('click', () => {
        this.expanded = true;
        this.render();
      });
      return btn;
    }

    const widget = document.createElement('div');
    widget.className = 'widget widget--expanded';

    widget.appendChild(createTextEl('div', 'header', header));
    widget.appendChild(createTextEl('div', 'description', description));

    // QR container
    const qrContainer = document.createElement('div');
    qrContainer.className = 'qr-container';

    const qrWrapper = document.createElement('div');
    qrWrapper.className = 'qr-wrapper';
    qrWrapper.style.borderColor = getStepColor(this.currentStep);

    if (this.selfApp) {
      const qrValue = `${REDIRECT_URL}?sessionId=${this.sessionId}`;
      const qrSvgStr = renderQRToSVG({
        value: qrValue,
        size: qrSize,
        darkColor: darkMode ? '#ffffff' : '#000000',
        lightColor: darkMode ? '#1a1a1a' : '#ffffff',
        logoSvg: 'self',
      });
      // QR SVG is generated from trusted internal code, not user input
      const qrEl = document.createElement('div');
      qrEl.setAttribute('role', 'img');
      qrEl.setAttribute('aria-label', 'Scan this QR code with the Self app to verify your identity');
      qrEl.insertAdjacentHTML('afterbegin', qrSvgStr);
      qrWrapper.appendChild(qrEl);
    }

    // Status overlay
    const overlay = document.createElement('div');
    overlay.className = 'status-overlay';
    if (this.currentStep >= VerificationStep.MOBILE_CONNECTED) {
      overlay.classList.add('status-overlay--visible');
    }
    this.appendStatusContent(overlay);
    qrWrapper.appendChild(overlay);

    qrContainer.appendChild(qrWrapper);
    qrContainer.appendChild(createTextEl('div', 'status-label', getStepLabel(this.currentStep)));
    widget.appendChild(qrContainer);

    widget.appendChild(this.buildHowItWorks());
    widget.appendChild(this.buildAppStoreLinks(appStores));
    widget.appendChild(this.buildPoweredBy());

    return widget;
  }

  private buildMobileView(
    description: string,
    appStores: { ios: string; android: string }
  ): HTMLElement {
    const widget = document.createElement('div');
    widget.className = 'widget widget--expanded';

    if (this.currentStep >= VerificationStep.MOBILE_CONNECTED) {
      const qrContainer = document.createElement('div');
      qrContainer.className = 'qr-container';
      this.appendStatusContent(qrContainer);
      qrContainer.appendChild(createTextEl('div', 'status-text', getStepLabel(this.currentStep)));
      widget.appendChild(qrContainer);
      return widget;
    }

    widget.appendChild(createTextEl('div', 'description', description));

    const deepLink = this.selfApp ? getUniversalLink(this.selfApp) : '#';
    const btn = document.createElement('a');
    btn.href = deepLink;
    btn.className = 'verify-button';
    btn.setAttribute('aria-label', 'Open Self app to verify');
    const logoSpan = document.createElement('span');
    logoSpan.insertAdjacentHTML('afterbegin', SELF_LOGO_SVG);
    btn.appendChild(logoSpan.firstElementChild!);
    const btnLabel = document.createElement('span');
    btnLabel.textContent = 'Open in Self App';
    btn.appendChild(btnLabel);
    widget.appendChild(btn);

    widget.appendChild(this.buildAppStoreLinks(appStores));
    widget.appendChild(this.buildPoweredBy());

    return widget;
  }

  private buildInAppBrowserWarning(): HTMLElement {
    const browser = getDefaultBrowserName();
    const widget = document.createElement('div');
    widget.className = 'widget widget--expanded';
    widget.appendChild(createTextEl('div', 'header', `Open in ${browser}`));
    widget.appendChild(
      createTextEl(
        'div',
        'description',
        `This verification requires ${browser} to open the Self app. Please open this page in ${browser} to continue.`
      )
    );
    widget.appendChild(this.buildPoweredBy());
    return widget;
  }

  private appendStatusContent(parent: HTMLElement): void {
    // Static trusted SVGs for status icons
    switch (this.currentStep) {
      case VerificationStep.PROOF_VERIFIED: {
        const div = document.createElement('div');
        div.insertAdjacentHTML('afterbegin', CHECK_SVG);
        parent.appendChild(div.firstElementChild!);
        break;
      }
      case VerificationStep.PROOF_GENERATION_FAILED: {
        const div = document.createElement('div');
        div.insertAdjacentHTML('afterbegin', ERROR_SVG);
        parent.appendChild(div.firstElementChild!);
        break;
      }
      case VerificationStep.MOBILE_CONNECTED:
      case VerificationStep.PROOF_GENERATION_STARTED:
      case VerificationStep.PROOF_GENERATED: {
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        parent.appendChild(spinner);
        break;
      }
    }
  }

  private buildHowItWorks(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'how-it-works';

    container.appendChild(createTextEl('div', 'how-it-works-title', 'How it works'));

    const steps = document.createElement('div');
    steps.className = 'steps';

    const stepTexts = [
      'Scan the QR code with the Self app',
      'Follow the steps in the app to verify',
      'Done — only the requested proof is shared',
    ];

    stepTexts.forEach((text, i) => {
      const step = document.createElement('div');
      step.className = 'step';

      const num = document.createElement('span');
      num.className = 'step-number';
      num.textContent = String(i + 1);
      step.appendChild(num);

      const span = document.createElement('span');
      span.textContent = text;
      step.appendChild(span);

      steps.appendChild(step);
    });

    container.appendChild(steps);
    return container;
  }

  private buildAppStoreLinks(appStores: { ios: string; android: string }): HTMLElement {
    const container = document.createElement('div');
    container.className = 'app-links';

    container.appendChild(createTextEl('div', 'app-links-label', "Don't have Self?"));

    const row = document.createElement('div');
    row.className = 'app-links-row';

    const iosLink = document.createElement('a');
    iosLink.href = appStores.ios;
    iosLink.className = 'app-link';
    iosLink.target = '_blank';
    iosLink.rel = 'noopener';
    iosLink.textContent = 'App Store';
    row.appendChild(iosLink);

    const androidLink = document.createElement('a');
    androidLink.href = appStores.android;
    androidLink.className = 'app-link';
    androidLink.target = '_blank';
    androidLink.rel = 'noopener';
    androidLink.textContent = 'Google Play';
    row.appendChild(androidLink);

    container.appendChild(row);
    return container;
  }

  private buildPoweredBy(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'powered-by';
    div.appendChild(document.createTextNode('Powered by '));
    const link = document.createElement('a');
    link.href = 'https://self.xyz';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Self';
    div.appendChild(link);
    div.appendChild(document.createTextNode(' \u2014 zero-knowledge identity'));
    return div;
  }

  private renderVerified(): void {
    while (this.shadow.firstChild) {
      this.shadow.removeChild(this.shadow.firstChild);
    }
    const styleEl = document.createElement('style');
    styleEl.textContent = getWidgetCSS();
    this.shadow.appendChild(styleEl);

    const badge = document.createElement('div');
    badge.className = 'verified-badge';

    const iconDiv = document.createElement('div');
    iconDiv.insertAdjacentHTML('afterbegin', CHECK_SVG);
    badge.appendChild(iconDiv.firstElementChild!);

    const span = document.createElement('span');
    span.textContent = 'Verified';
    badge.appendChild(span);

    this.shadow.appendChild(badge);
  }

  private updateStatus(): void {
    if (!this.isConnected) return;

    const step = this.currentStep;

    // For terminal states, re-render fully
    if (
      step === VerificationStep.PROOF_VERIFIED ||
      step === VerificationStep.PROOF_GENERATION_FAILED
    ) {
      this.render();
      return;
    }

    // Update overlay + label in place
    const overlay = this.shadow.querySelector('.status-overlay');
    const label = this.shadow.querySelector('.status-label');
    const qrWrapper = this.shadow.querySelector('.qr-wrapper') as HTMLElement | null;

    if (overlay) {
      while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
      this.appendStatusContent(overlay as HTMLElement);
      const showOverlay = step >= VerificationStep.MOBILE_CONNECTED;
      overlay.classList.toggle('status-overlay--visible', showOverlay);
    }
    if (label) {
      label.textContent = getStepLabel(step);
    }
    if (qrWrapper) {
      qrWrapper.style.borderColor = getStepColor(step);
    }

    // Mobile: re-render on status changes to swap button → status view
    if (isMobile() && step >= VerificationStep.MOBILE_CONNECTED) {
      this.render();
    }
  }
}
