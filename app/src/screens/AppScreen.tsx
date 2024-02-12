import React from 'react';
import ZUPASS from '../images/zupass.png';
import GITCOIN from '../images/gitcoin.png';
import { YStack } from 'tamagui';
import AppCard from '../components/AppCard';
import { App, gitcoin, soulbound, zuzalu } from '../utils/AppClass';
import { Steps } from '../utils/utils';

interface AppScreenProps {
  selectedApp: App | null;
  setSelectedApp: (app: App | null) => void;
  step: number;
  setStep: (step: number) => void;
}

const AppScreen: React.FC<AppScreenProps> = ({ selectedApp, setSelectedApp, step, setStep }) => {

  const handleCardSelect = (app: App) => {
    if (selectedApp != app) {
      setSelectedApp(app);
      if (step >= Steps.NFC_SCAN_COMPLETED) {
        setStep(Steps.NFC_SCAN_COMPLETED);
      }
    }
  };

  const cardsData = [
    {
      app: zuzalu,
      title: 'Add to Zupasss',
      description: 'And prove your identity at in person events',
      background: ZUPASS,
      colorOfTheText: 'white',
    },
    {
      app: gitcoin,
      title: 'Add to Gitcoin passport',
      description: 'And donate to your favorite projects',
      background: GITCOIN,
      colorOfTheText: 'white',
    },
    {
      app: soulbound,
      title: 'Mint SBT',
      description: 'And prove you\'re a human',
      colorOfTheText: 'black',
    },
  ];

  return (
    <YStack flex={1} gap="$5" px="$5" jc="center" alignItems='center' >

      {cardsData.map(card => (
        <AppCard
          key={card.app.id}
          title={card.title}
          description={card.description}
          colorOfTheText={card.colorOfTheText}
          background={card.background}
          id={card.app.id}
          onTouchStart={() => handleCardSelect(card.app)}
          selected={selectedApp && selectedApp.id === card.app.id ? true : false}
        />
      ))}

    </YStack>
  );
}

export default AppScreen;
