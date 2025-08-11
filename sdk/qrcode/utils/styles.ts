const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
};

const ledContainerStyle: React.CSSProperties = {
  marginBottom: '4px',
};

const qrContainerStyle = (size: number): React.CSSProperties => ({
  width: `${size}px`,
  height: `${size}px`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export { containerStyle };
export { ledContainerStyle };
export { qrContainerStyle };
