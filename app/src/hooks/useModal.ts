import { useCallback, useState } from 'react';

import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';

import { ModalParams } from '../screens/Settings/ModalScreen';

export const useModal = (params: ModalParams) => {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();

  const showModal = useCallback(() => {
    setVisible(true);
    navigation.navigate('Modal', params);
  }, [params]);

  const dismissModal = useCallback(() => {
    setVisible(false);
    const routes = navigation.getState()?.routes;
    if (routes?.at(routes.length - 1)?.name === 'Modal') {
      navigation.goBack();
    }
    params.onModalDismiss();
  }, [params]);

  return {
    showModal,
    dismissModal,
    visible,
  };
};
