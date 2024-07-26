import { AppType } from "../../../common/src/utils/appType";
import { Text, YStack } from 'tamagui';
import { Ticket } from '@tamagui/lucide-icons';
import ZUPASS from '../images/zupass.png';

const comingSoon = () => (
  <YStack ml="$2" p="$2" px="$3" bc="#282828" borderRadius="$10">
    <Text color="#a0a0a0" fontWeight="bold">coming soon</Text>
  </YStack>
);

export const zupassApp: AppType = {
  id: 'zuzalu',

  title: 'Zupass',
  description: 'Connect to prove your identity at in person events',
  background: ZUPASS,
  colorOfTheText: 'white',
  selectable: false,
  icon: Ticket,
  tags: [comingSoon()],

  name: 'Zupass',
  disclosureOptions: {
    date_of_expiry: "required"
  },
  sendButtonText: 'Add to Zupass',
}

export default zupassApp;