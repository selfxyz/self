import type { PresetName } from './utils/presets.js';

export interface ModalOptions {
  appName: string;
  appScope: string;
  appEndpoint: string;
  preset?: PresetName;
  disclosures?: string;
  size?: number;
  darkMode?: boolean;
  logo?: string;
  endpointType?: string;
  description?: string;
}

export interface ModalResult {
  verified: boolean;
  sessionId: string;
  token?: string;
  claims?: Record<string, unknown>;
}

export function openModal(options: ModalOptions): Promise<ModalResult> {
  return new Promise((resolve, reject) => {
    // Build modal DOM elements programmatically (no innerHTML with user content)
    const backdrop = document.createElement('div');
    Object.assign(backdrop.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '10000',
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });

    const modal = document.createElement('div');
    Object.assign(modal.style, {
      position: 'relative',
      background: options.darkMode ? '#1a1a1a' : '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      maxWidth: '420px',
      width: 'calc(100% - 32px)',
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      padding: '8px',
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u00d7'; // × character
    closeBtn.setAttribute('aria-label', 'Close verification');
    Object.assign(closeBtn.style, {
      position: 'absolute',
      top: '16px',
      right: '16px',
      width: '32px',
      height: '32px',
      background: 'none',
      border: `1px solid ${options.darkMode ? '#333' : '#e0e0e0'}`,
      borderRadius: '50%',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: options.darkMode ? '#999' : '#666',
      fontSize: '18px',
      zIndex: '1',
    });

    // Create the widget element
    const widget = document.createElement('self-verify');
    widget.setAttribute('app-name', options.appName);
    widget.setAttribute('app-scope', options.appScope);
    widget.setAttribute('app-endpoint', options.appEndpoint);
    if (options.preset) widget.setAttribute('preset', options.preset);
    if (options.disclosures) widget.setAttribute('disclosures', options.disclosures);
    if (options.size) widget.setAttribute('size', String(options.size));
    if (options.darkMode) widget.setAttribute('dark-mode', '');
    if (options.logo) widget.setAttribute('logo', options.logo);
    if (options.endpointType) widget.setAttribute('endpoint-type', options.endpointType);
    if (options.description) widget.setAttribute('description', options.description);

    let settled = false;

    function cleanup() {
      backdrop.remove();
    }

    function close() {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('User closed verification'));
      }
    }

    widget.addEventListener('self:success', ((e: CustomEvent<ModalResult>) => {
      if (!settled) {
        settled = true;
        setTimeout(() => {
          cleanup();
          resolve(e.detail);
        }, 1200);
      }
    }) as EventListener);

    widget.addEventListener('self:error', ((e: CustomEvent<{ errorCode?: string; reason?: string }>) => {
      if (!settled) {
        settled = true;
        setTimeout(() => {
          cleanup();
          reject(new Error(e.detail.reason || 'Verification failed'));
        }, 2000);
      }
    }) as EventListener);

    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    function onKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', onKeydown);
      }
    }
    document.addEventListener('keydown', onKeydown);

    modal.appendChild(closeBtn);
    modal.appendChild(widget);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Force widget into expanded state after it mounts
    requestAnimationFrame(() => {
      const trigger = widget.shadowRoot?.querySelector('[data-action="expand"]') as HTMLElement;
      if (trigger) trigger.click();
    });
  });
}
