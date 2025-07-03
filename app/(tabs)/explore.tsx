import { Image } from 'expo-image';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useClerk } from '@clerk/clerk-expo'
import * as Linking from 'expo-linking'

export default function TabTwoScreen() {
  const { signOut } = useClerk()
  const handleSignOut = async () => {
    try {
      await signOut()
      // Redirect to your desired page
      Linking.openURL(Linking.createURL('/'))
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2))
    }
  }

  return (
    <ParallaxScrollView 
      headerImage={<Image source={require('@/assets/images/react-logo.png')} style={styles.headerImage} />}
      headerBackgroundColor={{ dark: '#000000', light: '#ffffff' }}
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Signed in</ThemedText>
      </ThemedView>
      <TouchableOpacity onPress={handleSignOut}>
        <Text style={{ color: 'red' }}>Sign out</Text>
      </TouchableOpacity>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
