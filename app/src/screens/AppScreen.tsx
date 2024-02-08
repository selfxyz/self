import React from 'react';
import ZUPASS from '../images/zupass.png';
import GITCOIN from '../images/gitcoin.png';
import { YStack } from 'tamagui';
import AppCard from '../components/AppCard';
import { App, gitcoin, soulbond, zuzalu } from '../utils/AppClass';

interface AppScreenProps {
  selectedApp: App | null;
  setSelectedApp: (app: App | null) => void;
}

const AppScreen: React.FC<AppScreenProps> = ({ selectedApp, setSelectedApp }) => {

  const handleCardSelect = (app: App) => {
    setSelectedApp(app);
  };

  const cardsData = [
    {
      app: zuzalu,
      title: 'Add to Zupasss',
      description: 'And prove your identity at in person',
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
      app: soulbond,
      title: 'Mint SBT',
      description: 'And prove your identity at in person events',
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
