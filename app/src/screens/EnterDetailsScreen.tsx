// src/screens/EnterDetailsScreen.tsx

import React, {useState} from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CustomTextInput from '../components/CustomTextInput';
import CustomButton from '../components/CustomButton'; 
import { ToggleGroup } from 'tamagui'
import { AlignCenter, AlignLeft, AlignRight, Camera } from '@tamagui/lucide-icons'
import { SizableText, Tabs, H5 } from 'tamagui'
import { XStack, YStack, Button } from 'tamagui'

const EnterDetailsScreen = ({
  passportNumber,
  setPassportNumber,
  dateOfBirth,
  setDateOfBirth,
  dateOfExpiry,
  setDateOfExpiry,
  onScanPress,
  onStartCameraScan
}) => {
  const [selectedToggle, setSelectedToggle] = useState('camera');
  const handleCameraPress = () => {
      onStartCameraScan(); 
  };

  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.header}>Welcome to Proof of Passport</Text>
      <Text style={styles.header2}>Generate ZK proof with your passport data</Text>
      <ToggleGroup
        type="single"
        value={selectedToggle}
        onValueChange={setSelectedToggle}
        disableDeactivation={true}
        sizeAdjust={1}
      >
        <ToggleGroup.Item value="camera" onPress={handleCameraPress}>
          <Camera />
        </ToggleGroup.Item>
      </ToggleGroup>

      {true ? (
        <View style={styles.inputContainer}>
          <CustomTextInput
            value={passportNumber}
            onChangeText={setPassportNumber}
            placeholder="Passport number"
            keyboardType="default"
          />
          <CustomTextInput
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="Date of birth (yymmdd)"
            keyboardType="numeric"
          />
          <CustomTextInput
            value={dateOfExpiry}
            onChangeText={setDateOfExpiry}
            placeholder="Date of expiry (yymmdd)"
            keyboardType="numeric"
          />
        </View>
      ) : (
        <View style={styles.inputContainer}>
        <Text style={styles.header2}>Work in progress</Text>
        </View>
      )}

      <Button onPress={onScanPress} title="Scan Passport with NFC" />



    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingBottom:20,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    color: 'black',
  },
  header2: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    color: 'gray',
  },
  inputContainer: {
    width: '100%', 
    alignSelf: 'center', 
    flex: 1,
  },
});

export default EnterDetailsScreen;
