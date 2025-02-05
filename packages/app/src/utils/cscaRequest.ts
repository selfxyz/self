import { castCSCAProof } from '@openpassport/common/utils/types';

import useUserStore from '../stores/userStore';
import { ModalProofSteps } from './utils';

export const sendCSCARequest = async (
  inputs_csca: any,
  modalServerUrl: string,
  setModalProofStep: (modalProofStep: number) => void,
) => {
  try {
    console.log('inputs_csca before requesting modal server - cscaRequest.ts');
    fetch(modalServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inputs_csca),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        useUserStore.getState().cscaProof = castCSCAProof(data);
        setModalProofStep(ModalProofSteps.MODAL_SERVER_SUCCESS);
        console.log('Response from server:', data);
      })
      .catch(error => {
        console.error('Error during request:', error);
        setModalProofStep(ModalProofSteps.MODAL_SERVER_ERROR);
      });
  } catch (error) {
    console.error('Error during request:', error);
    setModalProofStep(ModalProofSteps.MODAL_SERVER_ERROR);
  }
};
