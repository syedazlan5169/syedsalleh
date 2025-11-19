import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { API_BASE_URL } from '@/apiConfig';

type PingResponse = {
  message: string;
  time: string;
};

export default function IndexScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PingResponse | null>(null);

  useEffect(() => {
    const fetchPing = async () => {
      try {
        const url = `${API_BASE_URL}/api/ping`;
        console.log('Fetching from:', url);

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = (await response.json()) as PingResponse;
        setData(json);
      } catch (err: any) {
        console.log('Fetch error:', err);
        setError(err?.message ?? 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchPing();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text style={styles.text}>Loading from Laravel API...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Laravel API Response</Text>
        <Text style={styles.text}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Laravel API Response</Text>
      <Text style={styles.text}>Message: {data?.message}</Text>
      <Text style={styles.text}>Time: {data?.time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff', // <- white background so you definitely see content
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000000', // <- black text
  },
  text: {
    fontSize: 16,
    marginBottom: 8,
    color: '#000000', // <- black text
  },
});
