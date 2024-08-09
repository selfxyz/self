import React from 'react';
import { ScrollView, YStack } from 'tamagui';
import AppCard from '../components/AppCard';
import { Steps } from '../utils/utils';
import useNavigationStore from '../stores/navigationStore';
import { AppType } from '../../../common/src/utils/appType';
import sbtApp from '../apps/sbt';
import zupassApp from '../apps/zupass';
import gitcoinApp from '../apps/gitcoin';

const AppScreen: React.FC = () => {
  const {
    selectedApp,
    update
  } = useNavigationStore();

  const handleCardSelect = (app: AppType) => {
    update({
      selectedTab: "prove",
      selectedApp: app,
      step: Steps.APP_SELECTED,
    })
  };

  // add new apps here
  const cardsData = [
    sbtApp,
    zupassApp,
    gitcoinApp
  ];

  return (
    <ScrollView f={1}>
      <YStack my="$8" gap="$5" px="$5" jc="center" alignItems='center'>
        {
          cardsData.map(app => (
            <AppCard
              key={app.id}
              title={app.title}
              description={app.description}
              id={app.id}
              onTouchStart={() => handleCardSelect(app)}
              selected={selectedApp && selectedApp.id === app.id ? true : false}
              selectable={app.selectable}
              icon={app.icon}
              tags={app.tags}
            />
          ))
        }
      </YStack>
    </ScrollView>
  );
}

export default AppScreen;
