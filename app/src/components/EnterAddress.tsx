import React, { useState, useEffect } from 'react';
import { YStack, XStack, Text, Checkbox, Input, Button, Spinner, Image, useWindowDimensions, ScrollView } from 'tamagui';
import { borderColor, componentBgColor, componentBgColor2, textColor1, textColor2 } from '../utils/colors';
import ENS from "../images/ens_mark_dao.png"
import { useToastController } from '@tamagui/toast'
import { ethers } from 'ethers';
import useSbtStore from '../stores/sbtStore';

const EnterAddress: React.FC = () => {
  const [inputValue, setInputValue] = useState('');

  const {
    address,
    ens,
    update
  } = useSbtStore();
  
  const provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/lpOn3k6Fezetn1e5QF-iEsn-J0C6oGE0`);
  const toast = useToastController()

  useEffect(() => {
    if (ens != '' && inputValue == '') {
      setInputValue(ens);

    }
    else if (address != ethers.ZeroAddress && inputValue == '') {
      setInputValue(address);
    }
  }, [])

  useEffect(() => {
    const resolveENS = async () => {
      if (inputValue != ens) {
        if (inputValue.endsWith('.eth')) {
          try {
            toast.show('🔭 Looking onchain', {
              message: 'Looking for ' + inputValue,
              customData: {
                type: "info",
              },
            })

            const resolvedAddress = await provider.resolveName(inputValue);
            if (resolvedAddress) {
              console.log("new address settled:" + resolvedAddress);
              update({
                address: resolvedAddress,
                ens: inputValue
              });
              toast.show('✨ Welcome ✨', {
                message: 'Nice to meet you ' + inputValue,
                customData: {
                  type: "success",
                },
              })
            } else {
              toast.show('Error', {
                message: inputValue + ' not found ',
                customData: {
                  type: "error",
                },
              })
            }
          } catch (error) {
            toast.show('Error', {
              message: 'Check input format or RPC provider or internet connection',
              customData: {
                type: "error",
              },
            })
          }
        }
        else if (inputValue.length === 42 && inputValue.startsWith('0x')) {
          update({
            address: inputValue,
          });
        }
      };
    };

    resolveENS();
  }, [inputValue]);

  return (
    <YStack bc={componentBgColor} borderRadius="$6" borderWidth={1.5} borderColor={borderColor}>
    <YStack p="$3">
      <XStack gap="$4" ai="center">
        <XStack p="$2" bc="#232323" borderWidth={1.2} borderColor="#343434" borderRadius="$3">
          <Image
            source={{ uri: ENS }}
            w="$1"
            h="$1" />
        </XStack>
        <YStack gap="$1">
          <Text fontSize={16} fow="bold" color="#ededed">Address or ENS</Text>
        </YStack>
      </XStack>
    </YStack>
    <YStack bc={componentBgColor2} borderTopWidth={1.5} borderColor={borderColor} borderBottomLeftRadius="$6" borderBottomRightRadius="$6">
      <Input
        bg="transparent"
        color={textColor1}
        fontSize={13}
        placeholder="anon.eth or 0x023…"
        value={inputValue}
        onChangeText={setInputValue}
        autoCorrect={false}
        autoCapitalize='none'
        borderColor="transparent"
        borderWidth={0}
      />
    </YStack>
  </YStack>
  );
};

export default EnterAddress;