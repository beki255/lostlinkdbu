import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { itemsAPI } from '../services/api';

export default function HomeScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = async () => {
    try {
      const res = await itemsAPI.getAll({ limit: 20 });
      setItems(res.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.badge, item.type === 'lost' ? styles.lostBadge : styles.foundBadge]}>
          {item.type.toUpperCase()}
        </Text>
        <Text style={[styles.badge, styles.statusBadge]}>{item.status}</Text>
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardLocation}>{item.location}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Report')}>
          <Text style={styles.actionText}>+ Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.actionSecondary]} onPress={() => navigation.navigate('Search')}>
          <Text style={[styles.actionText, styles.actionTextSecondary]}>Search</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Recent Items</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#0057B8" style={{ marginTop: 40 }} />
      ) : (
        <FlatList data={items} renderItem={renderItem} keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadItems(); }} />}
          contentContainerStyle={items.length === 0 ? { flex: 1, justifyContent: 'center', alignItems: 'center' } : {}}
          ListEmptyComponent={<Text style={styles.empty}>No items yet</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionButton: { flex: 1, backgroundColor: '#0057B8', borderRadius: 14, padding: 16, alignItems: 'center' },
  actionSecondary: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#0057B8' },
  actionText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  actionTextSecondary: { color: '#0057B8' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontSize: 11, fontWeight: '600', overflow: 'hidden' },
  lostBadge: { backgroundColor: '#FEE2E2', color: '#DC2626' },
  foundBadge: { backgroundColor: '#D1FAE5', color: '#059669' },
  statusBadge: { backgroundColor: '#E0E7FF', color: '#4338CA' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  cardLocation: { fontSize: 13, color: '#6B7280' },
  empty: { fontSize: 16, color: '#9CA3AF' },
});
