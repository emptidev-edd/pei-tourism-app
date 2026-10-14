import { StyleSheet, Text, View } from 'react-native';

/** Shared loading/error/empty placeholder card for the nearby and stop screens. */
export function TransitStateCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stateCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#f5f8fb',
    gap: 8,
  },
  stateTitle: {
    color: '#16202a',
    fontSize: 16,
    fontWeight: '800',
  },
  stateDescription: {
    color: '#667887',
    fontSize: 14,
    lineHeight: 20,
  },
});
