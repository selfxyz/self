import { useCallback } from 'react';

import { useNavigation } from '@react-navigation/native';

import { ModalParams } from '../screens/Settings/ModalScreen';

export const useModal = (params: ModalParams) => {
  const navigation = useNavigation();

  const showModal = useCallback(() => {
    navigation.navigate('Modal', params);
  }, [navigation, params]);

  const dismissModal = useCallback(() => {
    const routes = navigation.getState()?.routes;
    if (routes?.at(routes.length - 1)?.name === 'Modal') {
      navigation.goBack();
    }
  }, [navigation, params]);

  return {
    showModal,
    dismissModal,
  };
};
