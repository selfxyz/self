import { SystemBars } from 'react-native-edge-to-edge';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

export const HeadlessNavForEuclid = (props: NativeStackHeaderProps) => {
  
  return (
    <>
      <SystemBars
        style={props.options.statusBarStyle}
        hidden={props.options.statusBarHidden}
      />
    </>
  );
};
