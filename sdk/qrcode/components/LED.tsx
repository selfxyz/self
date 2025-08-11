import React from 'react';

import { QRcodeSteps } from '../utils/utils.js';

interface LEDProps {
  size?: number;
  connectionStatus?: number;
}

const green = '#31F040';
const blue = '#424AD8';
const gray = '#95a5a6';

const LED: React.FC<LEDProps> = ({ size = 8, connectionStatus = QRcodeSteps.DISCONNECTED }) => {
  const getColor = () => {
    if (connectionStatus >= QRcodeSteps.MOBILE_CONNECTED) {
      return green;
    } else if (connectionStatus >= QRcodeSteps.WAITING_FOR_MOBILE) {
      return blue;
    } else {
      return gray;
    }
  };

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: getColor(),
        boxShadow: `0 0 ${size * 1.5}px ${getColor()}`,
        transition: 'all 0.3s ease',
        marginBottom: '8px',
      }}
    />
  );
};

export default LED;
