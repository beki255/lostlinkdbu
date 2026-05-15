import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { itemsAPI } from '../services/api';
import Toast from 'react-native-toast-message';

export default function ReportScreen() {
  const [type, setType] = useState('lost');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title || !description || !category || !location) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please fill all required fields' });
      return;
    }
    setLoading(true);
    try {
      await itemsAPI.create({ title, description, category, type, location });
      Toast.show({ type: 'success', text1: 'Item reported!' });
      setTitle(''); setDescription(''); setCategory(''); setLocation('');
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.typeToggle}>
        <TouchableOpacity style={[styles.typeBtn, type === 'lost' && styles.typeBtnLost]} onPress={() => setType('lost')}>
          <Text style={[styles.typeBtnText, type === 'lost' && styles.typeBtnTextActive]}>Lost</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.typeBtn, type === 'found' && styles.typeBtnFound]} onPress={() => setType('found')}>
          <Text style={[styles.typeBtnText, type === 'found' && styles.typeBtnTextActive]}>Found</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Title *</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Item title" />

      <Text style={styles.label}>Description *</Text>
      <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription}
        placeholder="Describe the item" multiline numberOfLines={4} />

      <Text style={styles.label}>Category *</Text>
      <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="e.g., Electronics" />

      <Text style={styles.label}>Location *</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Where was it lost/found?" />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Report</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 40 },
  typeToggle: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  typeBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB' },
  typeBtnLost: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  typeBtnFound: { borderColor: '#059669', backgroundColor: '#F0FDF4' },
  typeBtnText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  typeBtnTextActive: { color: '#111827' },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 4 },
  textArea: { height: 100, textAlignVertical: 'top' },
  button: { backgroundColor: '#0057B8', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
