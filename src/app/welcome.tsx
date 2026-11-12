import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlossaryArt, PitchArt, StoryArt } from '@/components/illustrations';
import { GoogleSignInButton } from '@/components/SignInButtons';
import { authActions } from '@/services/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Deco } from '@/ui/bits';
import { Wordmark } from '@/ui/Logo';
import { Rise } from '@/ui/motion';
import { Eyebrow } from '@/ui/Pill';
import { T } from '@/ui/Text';

const ART = [
  { Art: StoryArt, label: 'The story', sub: 'How it was played, in plain words' },
  { Art: PitchArt, label: 'The pitch', sub: 'Passes, pressing and shots, drawn' },
  { Art: GlossaryArt, label: 'The words', sub: 'Every term explained in seconds' },
];

/** Screen 2, Welcome: one line of value, three illustrations, Google first. No ads. */
export default function Welcome() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16, paddingHorizontal: 16 }}>
      <Deco width={120} style={{ position: 'absolute', left: -34, top: insets.top + 40 }} />
      <Deco width={120} mirror style={{ position: 'absolute', right: -34, top: insets.top + 40 }} />
      <Rise index={0} style={{ alignItems: 'center', marginTop: 24 }}>
        <Wordmark size={26} />
      </Rise>
      <Rise index={1} style={{ alignItems: 'center', marginTop: 40 }}>
        <Eyebrow icon="sports_soccer">Match-day companion</Eyebrow>
        <T v="display" align="center" style={{ marginTop: 20 }}>
          Understand how every match was really played
        </T>
        <T v="body" color="muted" align="center" style={{ marginTop: 14, maxWidth: 330, fontSize: 14.5 }}>
          Open a match and get the story first. Go deeper only if you want to. Every claim shows its data.
        </T>
      </Rise>
      <Rise index={2} style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
        {ART.map(({ Art, label, sub }) => (
          <Card key={label} padded={false} style={{ flex: 1, padding: 12, alignItems: 'center', gap: 6 }}>
            <Art size={56} />
            <T v="labelSm" align="center">
              {label}
            </T>
            <T v="caption" color="muted" align="center" numberOfLines={3}>
              {sub}
            </T>
          </Card>
        ))}
      </Rise>
      <View style={{ flex: 1 }} />
      <Rise index={3} style={{ gap: 12 }}>
        <GoogleSignInButton />
        <Button label="Other ways to sign in" variant="secondary" onPress={() => router.push('/sign-in')} />
        <Button
          label="Browse without an account"
          variant="text"
          onPress={() => {
            authActions.browse();
            router.replace('/explore');
          }}
        />
      </Rise>
    </View>
  );
}
