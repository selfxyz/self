import '@selfxyz/widget'; // Register <self-verify> custom element
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { SelfVerifyProps } from './types.js';

/**
 * Map of React prop names to HTML attribute names (kebab-case).
 * Only includes props that map to widget attributes.
 */
const PROP_TO_ATTR: Record<string, string> = {
  appId: 'app-id',
  appName: 'app-name',
  appScope: 'app-scope',
  appEndpoint: 'app-endpoint',
  preset: 'preset',
  userId: 'user-id',
  mode: 'mode',
  size: 'size',
  darkMode: 'dark-mode',
  sessionTtl: 'session-ttl',
  logo: 'logo',
  disclosures: 'disclosures',
  endpointType: 'endpoint-type',
  description: 'description',
  verifyUrl: 'verify-url',
  wsUrl: 'ws-url',
  redirectUri: 'redirect-uri',
  clientId: 'client-id',
};

/** Props that are callbacks, not attributes */
const CALLBACK_PROPS = new Set(['onSuccess', 'onError', 'onStatus', 'onAlreadyVerified']);

/** Props handled separately (not attributes) */
const SKIP_PROPS = new Set(['className', 'style', ...CALLBACK_PROPS]);

/**
 * React wrapper around the `<self-verify>` Web Component.
 *
 * Maps React props to HTML attributes and event listeners.
 * Loads the widget script automatically if not already present.
 */
export const SelfVerify = forwardRef<HTMLElement, SelfVerifyProps>(function SelfVerify(props, ref) {
  const elementRef = useRef<HTMLElement>(null);

  useImperativeHandle(ref, () => elementRef.current!, []);

  // Sync attributes
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    for (const [prop, attr] of Object.entries(PROP_TO_ATTR)) {
      const value = (props as Record<string, unknown>)[prop];
      if (value === undefined || value === null || value === false) {
        el.removeAttribute(attr);
      } else if (value === true) {
        el.setAttribute(attr, '');
      } else if (typeof value === 'object') {
        el.setAttribute(attr, JSON.stringify(value));
      } else {
        el.setAttribute(attr, String(value));
      }
    }
  });

  // Attach event listeners
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const listeners: Array<[string, EventListener]> = [];

    const eventMap: Array<[string, keyof SelfVerifyProps]> = [
      ['self:success', 'onSuccess'],
      ['self:error', 'onError'],
      ['self:status', 'onStatus'],
      ['self:already-verified', 'onAlreadyVerified'],
    ];

    for (const [eventName, propName] of eventMap) {
      const callback = props[propName] as ((detail: unknown) => void) | undefined;
      if (callback) {
        const handler = (e: Event) => callback((e as CustomEvent).detail);
        el.addEventListener(eventName, handler);
        listeners.push([eventName, handler]);
      }
    }

    return () => {
      for (const [eventName, handler] of listeners) {
        el.removeEventListener(eventName, handler);
      }
    };
  }, [props.onSuccess, props.onError, props.onStatus, props.onAlreadyVerified]);

  return (
    <self-verify
      ref={elementRef}
      className={props.className}
      style={props.style as React.CSSProperties | undefined}
    />
  );
});

// Extend JSX IntrinsicElements for the custom element
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'self-verify': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
