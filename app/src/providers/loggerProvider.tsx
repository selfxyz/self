// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { createContext, useContext } from 'react';

import * as Logger from '../utils/logger';

const LoggerContext = createContext(Logger);

export const LoggerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <LoggerContext.Provider value={Logger}>{children}</LoggerContext.Provider>
  );
};

export const useLogger = () => {
  const loggers = useContext(LoggerContext);
  if (!loggers) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }
  return loggers;
};
