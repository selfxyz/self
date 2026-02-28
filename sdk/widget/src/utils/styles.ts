import type { VerificationStepValue } from './websocket.js';
import { VerificationStep } from './websocket.js';

export function getStepLabel(step: VerificationStepValue): string {
  switch (step) {
    case VerificationStep.DISCONNECTED:
      return 'Connecting...';
    case VerificationStep.WAITING_FOR_MOBILE:
      return 'Scan with Self app';
    case VerificationStep.MOBILE_CONNECTED:
      return 'Connected to Self';
    case VerificationStep.PROOF_GENERATION_STARTED:
      return 'Generating proof...';
    case VerificationStep.PROOF_GENERATED:
      return 'Verifying proof...';
    case VerificationStep.PROOF_VERIFIED:
      return 'Verified';
    case VerificationStep.PROOF_GENERATION_FAILED:
      return 'Verification failed';
    default:
      return '';
  }
}

export function getStepColor(step: VerificationStepValue): string {
  switch (step) {
    case VerificationStep.PROOF_VERIFIED:
      return 'var(--self-success, #00C853)';
    case VerificationStep.PROOF_GENERATION_FAILED:
      return 'var(--self-error, #FF1744)';
    case VerificationStep.MOBILE_CONNECTED:
    case VerificationStep.PROOF_GENERATION_STARTED:
    case VerificationStep.PROOF_GENERATED:
      return 'var(--self-primary, #01BFFF)';
    default:
      return 'var(--self-border, #e0e0e0)';
  }
}

export function getWidgetCSS(): string {
  return `
    :host {
      display: inline-block;
      font-family: var(--self-font, system-ui, -apple-system, sans-serif);
      --_primary: var(--self-primary, #01BFFF);
      --_bg: var(--self-bg, #ffffff);
      --_text: var(--self-text, #1a1a1a);
      --_text-secondary: var(--self-text-secondary, #666666);
      --_border: var(--self-border, #e0e0e0);
      --_radius: var(--self-radius, 12px);
      --_success: var(--self-success, #00C853);
      --_error: var(--self-error, #FF1744);
    }

    :host([dark-mode]) {
      --_bg: var(--self-bg, #1a1a1a);
      --_text: var(--self-text, #ffffff);
      --_text-secondary: var(--self-text-secondary, #999999);
      --_border: var(--self-border, #333333);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .widget {
      background: var(--_bg);
      border: 1px solid var(--_border);
      border-radius: var(--_radius);
      overflow: hidden;
      width: fit-content;
      transition: border-color 0.3s ease;
    }

    .widget--expanded {
      padding: 24px;
      max-width: 380px;
    }

    .header {
      font-size: 16px;
      font-weight: 600;
      color: var(--_text);
      margin-bottom: 8px;
    }

    .description {
      font-size: 13px;
      color: var(--_text-secondary);
      line-height: 1.5;
      margin-bottom: 20px;
    }

    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .qr-wrapper {
      position: relative;
      border: 2px solid var(--_border);
      border-radius: 8px;
      padding: 12px;
      transition: border-color 0.3s ease;
      line-height: 0;
    }

    .qr-wrapper svg {
      display: block;
    }

    .status-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--_bg);
      opacity: 0;
      transition: opacity 0.3s ease;
      border-radius: 6px;
      pointer-events: none;
    }

    .status-overlay--visible {
      opacity: 1;
      pointer-events: auto;
    }

    .status-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--_text-secondary);
      text-align: center;
      min-height: 20px;
    }

    /* Button for mobile deep link */
    .verify-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 14px 24px;
      background: var(--_primary);
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: opacity 0.2s ease;
      text-decoration: none;
    }

    .verify-button:hover {
      opacity: 0.9;
    }

    .verify-button:active {
      opacity: 0.8;
    }

    .verify-button svg {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }

    /* Compact trigger button (collapsed state) */
    .trigger-button {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      background: var(--_bg);
      color: var(--_text);
      border: 1px solid var(--_border);
      border-radius: var(--_radius);
      font-size: 15px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease;
    }

    .trigger-button:hover {
      border-color: var(--_primary);
    }

    .trigger-button svg {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }

    /* How it works section */
    .how-it-works {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--_border);
    }

    .how-it-works-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--_text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }

    .steps {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .step {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 13px;
      color: var(--_text-secondary);
      line-height: 1.4;
    }

    .step-number {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      background: var(--_primary);
      color: #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
    }

    /* App store links */
    .app-links {
      margin-top: 16px;
      text-align: center;
    }

    .app-links-label {
      font-size: 12px;
      color: var(--_text-secondary);
      margin-bottom: 8px;
    }

    .app-links-row {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .app-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 500;
      color: var(--_primary);
      text-decoration: none;
      border: 1px solid var(--_border);
      border-radius: 6px;
      transition: border-color 0.2s ease;
    }

    .app-link:hover {
      border-color: var(--_primary);
    }

    /* Animations */
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes check-draw {
      to { stroke-dashoffset: 0; }
    }

    @keyframes fade-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--_border);
      border-top-color: var(--_primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .check-icon {
      width: 48px;
      height: 48px;
      animation: fade-in 0.3s ease;
    }

    .check-icon circle {
      fill: var(--_success);
    }

    .check-icon path {
      stroke: #ffffff;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 24;
      stroke-dashoffset: 24;
      animation: check-draw 0.4s ease 0.2s forwards;
    }

    .error-icon {
      width: 48px;
      height: 48px;
      animation: fade-in 0.3s ease;
    }

    .error-icon circle {
      fill: var(--_error);
    }

    .error-icon line {
      stroke: #ffffff;
      stroke-width: 3;
      stroke-linecap: round;
    }

    .status-text {
      font-size: 14px;
      font-weight: 500;
      color: var(--_text);
      margin-top: 8px;
    }

    /* Powered by footer */
    .powered-by {
      margin-top: 16px;
      text-align: center;
      font-size: 11px;
      color: var(--_text-secondary);
    }

    .powered-by a {
      color: var(--_primary);
      text-decoration: none;
      font-weight: 500;
    }

    /* Verified state */
    .verified-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: var(--_bg);
      border: 1px solid var(--_success);
      border-radius: var(--_radius);
      color: var(--_success);
      font-weight: 600;
      font-size: 15px;
    }

    /* Modal styles */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fade-in 0.2s ease;
    }

    .modal-content {
      position: relative;
      background: var(--_bg);
      border-radius: var(--_radius);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 420px;
      width: calc(100% - 32px);
      max-height: calc(100vh - 32px);
      overflow-y: auto;
    }

    .modal-close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      background: none;
      border: 1px solid var(--_border);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--_text-secondary);
      font-size: 18px;
      z-index: 1;
      transition: border-color 0.2s ease;
    }

    .modal-close:hover {
      border-color: var(--_text-secondary);
    }
  `;
}
