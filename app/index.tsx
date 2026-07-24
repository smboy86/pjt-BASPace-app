import { Redirect } from 'expo-router';

export default function IndexScreen(): React.JSX.Element {
  return <Redirect href="/(auth)/login" />;
}
