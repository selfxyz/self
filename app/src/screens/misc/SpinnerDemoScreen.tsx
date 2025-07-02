// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { Check, ChevronDown } from '@tamagui/lucide-icons';
import React, { useState } from 'react';
import { Platform, ScrollView } from 'react-native';
import { LoaderKitView } from 'react-native-loader-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Adapt, Select, Sheet, View, XStack, YStack } from 'tamagui';

import { BodyText } from '../../components/typography/BodyText';
import { Title } from '../../components/typography/Title';
import {
  amber500,
  black,
  green500,
  red500,
  sky500,
  slate200,
  slate800,
  white,
} from '../../utils/colors';

// All available spinner types from react-native-loader-kit
const commonSpinners = [
  'BallPulse',
  'BallGridPulse',
  'BallClipRotate',
  'SquareSpin',
  'BallClipRotatePulse',
  'BallClipRotateMultiple',
  'BallPulseRise',
  'BallRotate',
  'CubeTransition',
  'BallZigZag',
  'BallZigZagDeflect',
  'BallTrianglePath',
  'BallScale',
  'LineScale',
  'LineScaleParty',
  'BallScaleMultiple',
  'BallPulseSync',
  'BallBeat',
  'LineScalePulseOut',
  'LineScalePulseOutRapid',
  'BallScaleRipple',
  'BallScaleRippleMultiple',
  'BallSpinFadeLoader',
  'LineSpinFadeLoader',
  'TriangleSkewSpin',
  'Pacman',
  'BallGridBeat',
  'SemiCircleSpin',
  'Orbit',
  'AudioEqualizer',
  'BallDoubleBounce',
] as const;

const iosOnlySpinners = ['BallRotateChase', 'CircleStrokeSpin'] as const;

const colors = [
  { name: 'Red', value: red500 },
  { name: 'Green', value: green500 },
  { name: 'Blue', value: sky500 },
  { name: 'Amber', value: amber500 },
  { name: 'Black', value: black },
  { name: 'Slate', value: slate800 },
];

const speeds = [
  { name: 'Slow (0.5x)', value: 0.5 },
  { name: 'Normal (1.0x)', value: 1.0 },
  { name: 'Fast (1.5x)', value: 1.5 },
  { name: 'Very Fast (2.0x)', value: 2.0 },
];

interface SpinnerItemProps {
  name: string;
  color: string;
  speed: number;
  isIOSOnly?: boolean;
}

const SpinnerItem: React.FC<SpinnerItemProps> = ({
  name,
  color,
  speed,
  isIOSOnly,
}) => {
  const canShow = !isIOSOnly || Platform.OS === 'ios';

  return (
    <View
      backgroundColor={white}
      borderRadius={12}
      padding={16}
      margin={8}
      borderWidth={1}
      borderColor={slate200}
      alignItems="center"
      justifyContent="center"
      minHeight={120}
      opacity={canShow ? 1 : 0.5}
    >
      <View
        height={50}
        width={50}
        marginBottom={12}
        alignItems="center"
        justifyContent="center"
      >
        {canShow ? (
          <LoaderKitView
            style={{ width: 50, height: 50 }}
            name={name as any}
            animationSpeedMultiplier={speed}
            color={color}
          />
        ) : (
          <BodyText fontSize={12} color={slate800} textAlign="center">
            iOS Only
          </BodyText>
        )}
      </View>
      <BodyText
        fontSize={12}
        color={slate800}
        textAlign="center"
        numberOfLines={2}
      >
        {name}
        {isIOSOnly && ' (iOS)'}
      </BodyText>
    </View>
  );
};

const SpinnerDemoScreen: React.FC = () => {
  const { top, bottom } = useSafeAreaInsets();
  const [selectedColor, setSelectedColor] = useState(colors[0].value);
  const [selectedSpeed, setSelectedSpeed] = useState(1.0);

  const allSpinners = [
    ...commonSpinners.map(name => ({ name, isIOSOnly: false })),
    ...iosOnlySpinners.map(name => ({ name, isIOSOnly: true })),
  ];

  return (
    <View flex={1} backgroundColor={slate200}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottom + 20 }}
      >
        <YStack paddingHorizontal={20} paddingTop={top + 20} gap={24}>
          {/* Header */}
          <YStack alignItems="center" gap={8}>
            <Title textAlign="center" color={black}>
              Spinner Demo
            </Title>
            <BodyText textAlign="center" color={slate800} fontSize={16}>
              React Native Loader Kit Showcase
            </BodyText>
          </YStack>

          {/* Controls */}
          <YStack
            gap={16}
            backgroundColor={white}
            padding={16}
            borderRadius={12}
          >
            <BodyText fontSize={16} fontWeight="bold" color={black}>
              Customization
            </BodyText>

            {/* Color Selector */}
            <YStack gap={8}>
              <BodyText fontSize={14} color={slate800}>
                Color
              </BodyText>
              <Select
                value={selectedColor}
                onValueChange={setSelectedColor}
                disablePreventBodyScroll
              >
                <Select.Trigger iconAfter={ChevronDown}>
                  <Select.Value />
                </Select.Trigger>

                <Adapt when="sm" platform="touch">
                  <Sheet native modal dismissOnSnapToBottom animation="medium">
                    <Sheet.Frame>
                      <Sheet.ScrollView>
                        <Adapt.Contents />
                      </Sheet.ScrollView>
                    </Sheet.Frame>
                    <Sheet.Overlay
                      backgroundColor="rgba(0,0,0,0.5)"
                      animation="lazy"
                      enterStyle={{ opacity: 0 }}
                      exitStyle={{ opacity: 0 }}
                    />
                  </Sheet>
                </Adapt>

                <Select.Content zIndex={200000}>
                  <Select.Viewport>
                    <Select.Group>
                      {colors.map((color, i) => (
                        <Select.Item
                          key={color.value}
                          index={i}
                          value={color.value}
                        >
                          <Select.ItemText>{color.name}</Select.ItemText>
                          <Select.ItemIndicator marginLeft="auto">
                            <Check size={16} />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Group>
                  </Select.Viewport>
                </Select.Content>
              </Select>
            </YStack>

            {/* Speed Selector */}
            <YStack gap={8}>
              <BodyText fontSize={14} color={slate800}>
                Animation Speed
              </BodyText>
              <Select
                value={selectedSpeed.toString()}
                onValueChange={value => setSelectedSpeed(parseFloat(value))}
                disablePreventBodyScroll
              >
                <Select.Trigger iconAfter={ChevronDown}>
                  <Select.Value />
                </Select.Trigger>

                <Adapt when="sm" platform="touch">
                  <Sheet native modal dismissOnSnapToBottom animation="medium">
                    <Sheet.Frame>
                      <Sheet.ScrollView>
                        <Adapt.Contents />
                      </Sheet.ScrollView>
                    </Sheet.Frame>
                    <Sheet.Overlay
                      backgroundColor="rgba(0,0,0,0.5)"
                      animation="lazy"
                      enterStyle={{ opacity: 0 }}
                      exitStyle={{ opacity: 0 }}
                    />
                  </Sheet>
                </Adapt>

                <Select.Content zIndex={200000}>
                  <Select.Viewport>
                    <Select.Group>
                      {speeds.map((speed, i) => (
                        <Select.Item
                          key={speed.value}
                          index={i}
                          value={speed.value.toString()}
                        >
                          <Select.ItemText>{speed.name}</Select.ItemText>
                          <Select.ItemIndicator marginLeft="auto">
                            <Check size={16} />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Group>
                  </Select.Viewport>
                </Select.Content>
              </Select>
            </YStack>
          </YStack>

          {/* Common Spinners */}
          <YStack gap={16}>
            <BodyText fontSize={18} fontWeight="bold" color={black}>
              Common Spinners ({commonSpinners.length})
            </BodyText>
            <XStack flexWrap="wrap" justifyContent="space-around">
              {commonSpinners.map(spinner => (
                <View key={spinner} width="45%">
                  <SpinnerItem
                    name={spinner}
                    color={selectedColor}
                    speed={selectedSpeed}
                  />
                </View>
              ))}
            </XStack>
          </YStack>

          {/* iOS Only Spinners */}
          <YStack gap={16}>
            <BodyText fontSize={18} fontWeight="bold" color={black}>
              iOS Only Spinners ({iosOnlySpinners.length})
            </BodyText>
            <BodyText fontSize={14} color={slate800}>
              These spinners are only available on iOS devices
            </BodyText>
            <XStack flexWrap="wrap" justifyContent="space-around">
              {iosOnlySpinners.map(spinner => (
                <View key={spinner} width="45%">
                  <SpinnerItem
                    name={spinner}
                    color={selectedColor}
                    speed={selectedSpeed}
                    isIOSOnly
                  />
                </View>
              ))}
            </XStack>
          </YStack>

          {/* Usage Info */}
          <YStack
            gap={12}
            backgroundColor={white}
            padding={16}
            borderRadius={12}
          >
            <BodyText fontSize={16} fontWeight="bold" color={black}>
              Usage Information
            </BodyText>
            <BodyText fontSize={14} color={slate800}>
              • Total spinners: {allSpinners.length} ({commonSpinners.length}{' '}
              common + {iosOnlySpinners.length} iOS-only)
            </BodyText>
            <BodyText fontSize={14} color={slate800}>
              • Package: react-native-loader-kit v3.0.0
            </BodyText>
            <BodyText fontSize={14} color={slate800}>
              • Platform: {Platform.OS} ({Platform.Version})
            </BodyText>
            <BodyText fontSize={14} color={slate800}>
              • New Architecture: Supported
            </BodyText>
          </YStack>
        </YStack>
      </ScrollView>
    </View>
  );
};

export default SpinnerDemoScreen;
