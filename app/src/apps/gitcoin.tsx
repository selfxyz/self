import { AppType } from "../../../common/src/utils/appType";
import { Text, YStack } from 'tamagui';
import { Coins } from '@tamagui/lucide-icons';
import GITCOIN from '../images/gitcoin.png';

const comingSoon = () => (
  <YStack ml="$2" p="$2" px="$3" bc="#282828" borderRadius="$10">
    <Text color="#a0a0a0" fontWeight="bold">coming soon</Text>
  </YStack>
);

export const gitcoinApp: AppType = {
  id: 'gitcoin',

  title: 'Gitcoin passport',
  description: 'Add to Gitcoin passport and donate to your favorite projects',
  background: GITCOIN,
  colorOfTheText: 'white',
  selectable: false,
  icon: Coins,
  tags: [comingSoon()],

  name: 'Gitcoin',
  disclosureOptions: {
    date_of_expiry: "required"
  },
  sendButtonText: 'Add to Gitcoin passport',
}

export default gitcoinApp;