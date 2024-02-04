import React, { useState } from 'react';
import ZUPASS from '../images/zupass.png';
import GITCOIN from '../images/gitcoin.png';
import { Text, YStack, Card, H2, H3, Paragraph, Image, Button, XStack, CardFooter } from 'tamagui';
import { ChevronRight, X } from '@tamagui/lucide-icons';
import MyCard from '../components/MyCard';
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
        <MyCard
          key={card.app.id}
          title={card.title}
          description={card.description}
          colorOfTheText={card.colorOfTheText}
          background={card.background}
          id={card.app.id}
          onTouchStart={() => handleCardSelect(card.app)}
          eleva={selectedApp === card.app ? "$0" : "$6"}
        />
      ))}

    </YStack>
  );
}

export default AppScreen;
