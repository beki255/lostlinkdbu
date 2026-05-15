import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { itemsAPI } from '../services/api';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await itemsAPI.getAll({ q: query });
      setResults(res.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput style={styles.input} placeholder="Search lost & found items..." value={query}
          onChangeText={setQuery} onSubmitEditing={search} returnKeyType="search" />
        <TouchableOpacity style={styles.searchButton} onPress={search}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0057B8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList data={results} keyExtractor={(item) => item._id}
          contentContainerStyle={results.length === 0 ? { flex: 1, justifyContent: 'center', alignItems: 'center' } : { paddingTop: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>{query ? 'No results found' : 'Search for items'}</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={[styles.badge, item.type === 'lost' ? styles.lostBadge : styles.foundBadge]}>
                  {item.type.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.cardLocation}>{item.location}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  searchBar: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  searchButton: { backgroundColor: '#0057B8', borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center' },
  searchButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontSize: 11, fontWeight: '600', overflow: 'hidden' },
  lostBadge: { backgroundColor: '#FEE2E2', color: '#DC2626' },
  foundBadge: { backgroundColor: '#D1FAE5', color: '#059669' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  cardLocation: { fontSize: 13, color: '#9CA3AF' },
  empty: { fontSize: 16, color: '#9CA3AF' },
});
