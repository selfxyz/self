import { styled, Text,View } from '@tamagui/core';

// Correctly capitalized component name
const CircleContainer = styled(View, {
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#000',
    width: 30,
    height: 30,});

// Usage
const CircleText = () => (
  <CircleContainer>
    <Text>1</Text>
  </CircleContainer>
);

export default CircleText;
