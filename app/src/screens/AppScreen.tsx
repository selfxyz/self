import React from 'react';
import ZUPASS from '../images/zupass.png';
import GITCOIN from '../images/gitcoin.png';
import { YStack } from 'tamagui';
import AppCard from '../components/AppCard';
import { App, gitcoin, soulbond, zuzalu } from '../utils/AppClass';
const AppScreen = ({ selectedApp, setSelectedApp }) => {

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
    <YStack gap="$5" w="100%" p="$5">

      {cardsData.map(card => (
        <AppCard
          key={card.app.id}
          title={card.title}
          description={card.description}
          colorOfTheText={card.colorOfTheText}
          background={card.background}
          id={card.app.id}
          onTouchStart={() => handleCardSelect(card.app)}
          eleva={selectedApp && selectedApp.id === card.app.id ? "$0" : "$12"}
        />
      ))}

    </YStack>
  );
}

export default AppScreen;
