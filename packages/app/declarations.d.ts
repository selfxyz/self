declare module '@env';
declare module '*.png' {
  const value: string;
  export = value;
}
declare module '*.jpeg' {
  const value: string;
  export = value;
}

declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
