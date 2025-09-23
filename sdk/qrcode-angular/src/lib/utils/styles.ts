export const containerStyles = {
  display: 'flex',
  'flex-direction': 'column',
  'align-items': 'center',
  width: '100%',
};

export const ledContainerStyles = {
  'margin-bottom': '4px',
};

export const qrContainerStyles = (size: number) => ({
  width: `${size}px`,
  height: `${size}px`,
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'center',
});

export const ledStyles = (size: number, color: string) => ({
  width: `${size}px`,
  height: `${size}px`,
  'border-radius': '50%',
  'background-color': color,
  'box-shadow': `0 0 ${size * 1.5}px ${color}`,
  transition: 'all 0.3s ease',
  'margin-bottom': '8px',
});
