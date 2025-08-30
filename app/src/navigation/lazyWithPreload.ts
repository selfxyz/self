import React from 'react';

// Helper around React.lazy that exposes the underlying dynamic import
// so callers can manually preload a screen when debugging or profiling.
// Prefer using React.lazy directly and opt into this only when you need
// to eagerly load a component.
export function lazyWithPreload<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  const Component = React.lazy(factory) as React.LazyExoticComponent<T> & {
    preload: () => Promise<{ default: T }>;
  };
  Component.preload = factory;
  return Component;
}
