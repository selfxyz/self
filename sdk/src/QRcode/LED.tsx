import React from 'react';

interface LEDProps {
  size?: number;
  connectionStatus?: 'disconnected' | 'web_connected' | 'mobile_connected';
}

const LED: React.FC<LEDProps> = ({ size = 10, connectionStatus = 'disconnected' }) => {
  const getColor = () => {
    switch (connectionStatus) {
      case 'web_connected':
        return '#424AD8';
      case 'mobile_connected':
        return '#31F040';
      default:
        return '#95a5a6';
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
        marginBottom: '15px',
      }}
    />
  );
};

export default LED;
