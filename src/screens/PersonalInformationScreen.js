import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { BRAND_COLORS, UI_COLORS, STATUS_COLORS } from '../constants/Colors';
import ActivitySummaryCard from '../components/ActivitySummaryCard';

const LIGHT_PURPLE = '#6B4E8C';

export default function PersonalInformationScreen({ navigation, route }) {
  const defaults = {
    fullName: '',
    phone: '',
    email: '',
    memberSince: '',
    membershipPlan: '',
    renewalDate: '',
    goals: [],
    preferences: [],
    medicalNotes: [],
    emergencyContact: { name: '', phone: '' },
    heightCm: '',
    weightKg: '',
    bodyFat: '',
    last7Days: { sessions: '', calories: '', streak: '' },
    trainers: [],
  };

  const seed = route?.params?.initialData || {};
  const initial = {
    ...defaults,
    ...seed,
    emergencyContact: { ...defaults.emergencyContact, ...(seed.emergencyContact || {}) },
    last7Days: { ...defaults.last7Days, ...(seed.last7Days || {}) },
    goals: Array.isArray(seed.goals) ? seed.goals : defaults.goals,
    preferences: Array.isArray(seed.preferences) ? seed.preferences : defaults.preferences,
    medicalNotes: Array.isArray(seed.medicalNotes) ? seed.medicalNotes : defaults.medicalNotes,
    trainers: Array.isArray(seed.trainers) ? seed.trainers : defaults.trainers,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(initial);
  const [isAlertModalVisible, setIsAlertModalVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const updateNested = (path, val) => {
    const [a, b] = path.split('.');
    setForm(prev => ({ ...prev, [a]: { ...(prev[a] || {}), [b]: val } }));
  };

  const showCustomAlert = (title, message, buttons) => {
    setAlertConfig({ title, message, buttons });
    setIsAlertModalVisible(true);
  };

  // Fetch profile data from API
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) {
          showCustomAlert('Error', 'Not authenticated. Please log in again.', [
            { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
          ]);
          return;
        }

        const res = await fetch('https://gfit-dev.gdinexus.com:8412/api/Member/profile', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          console.log('Profile fetch failed with status', res.status);
          showCustomAlert('Error', 'Failed to fetch profile data. Please try again.', [
            { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
          ]);
          return;
        }

        const data = await res.json();
        const fullName = `${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''}`.trim() || data.userName || '';
        const memberSince = data.changedOnUtc ? new Date(data.changedOnUtc).toLocaleDateString() : '';
        
        setForm(prev => ({
          ...prev,
          fullName: fullName || prev.fullName,
          phone: data.phoneNumber || prev.phone,
          email: data.email || prev.email,
          memberSince: memberSince || prev.memberSince,
          // Map other fields if API provides them; otherwise, retain defaults or seed data
          heightCm: data.heightCm || prev.heightCm,
          weightKg: data.weightKg || prev.weightKg,
          bodyFat: data.bodyFat || prev.bodyFat,
          goals: data.goals || prev.goals,
          preferences: data.preferences || prev.preferences,
          medicalNotes: data.medicalNotes || prev.medicalNotes,
          emergencyContact: {
            name: data.emergencyContactName || prev.emergencyContact.name,
            phone: data.emergencyContactPhone || prev.emergencyContact.phone,
          },
        }));
      } catch (e) {
        console.log('fetchProfile error:', e);
        showCustomAlert('Error', 'Unable to fetch profile data. Please try again.', [
          { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const onSave = () => {
    if (!form.fullName || !form.phone || !form.email) {
      showCustomAlert('Error', 'Please fill in all required fields (Full Name, Phone, Email).', [
        { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
      ]);
      return;
    }
    setIsEditing(false);
    showCustomAlert('Saved', 'Your personal information has been updated.', [
      { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
    ]);
  };

  // Mock session objects (replace later)
  const mockSessions = [
    { startAt: Date.now() - 2 * 3600 * 1000, endAt: Date.now() - 90 * 60 * 1000, durationSec: 1800, status: 'completed' },
    { startAt: Date.now() - 2 * 24 * 3600 * 1000, endAt: Date.now() - 2 * 24 * 3600 * 1000 + 2700 * 1000, durationSec: 2700, status: 'completed' },
    { startAt: Date.now() - 4 * 24 * 3600 * 1000, endAt: Date.now() - 4 * 24 * 3600 * 1000 + 3600 * 1000, durationSec: 3600, status: 'completed' },
  ];

  // Optional scheduled (future)
  const mockScheduled = [
    { when: Date.now() - 2 * 24 * 3600 * 1000 },
    { when: Date.now() - 4 * 24 * 3600 * 1000 },
    { when: Date.now() + 1 * 24 * 3600 * 1000 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={BRAND_COLORS.PURPLE} barStyle="light-content" />
      <LinearGradient
        colors={[BRAND_COLORS.PURPLE, LIGHT_PURPLE]}
        style={styles.header}
      >
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.headerBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Personal Information</Text>
          {isEditing ? (
            <TouchableOpacity style={styles.headerBtn} onPress={onSave} activeOpacity={0.8}>
              <Text style={styles.headerActionText}>Save</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.headerBtn} onPress={() => setIsEditing(true)} activeOpacity={0.8}>
              <Text style={styles.headerActionText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Profile</Text>
              <Field label="Full name" value={form.fullName} editable={isEditing} onChangeText={t => update('fullName', t)} />
              <Field label="Phone" value={form.phone} editable={isEditing} onChangeText={t => update('phone', t)} keyboardType="phone-pad" />
              <Field label="Email" value={form.email} editable={isEditing} onChangeText={t => update('email', t)} keyboardType="email-address" />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Membership</Text>
              <Field label="Member since" value={form.memberSince} editable={false} />
              <Field label="Plan" value={form.membershipPlan} editable={isEditing} onChangeText={t => update('membershipPlan', t)} />
              <Field label="Renews on" value={form.renewalDate} editable={isEditing} onChangeText={t => update('renewalDate', t)} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Goals & Preferences</Text>
              <Field
                label="Goals"
                value={(form.goals || []).join(', ')}
                editable={isEditing}
                onChangeText={t => update('goals', t.split(',').map(s => s.trim()).filter(Boolean))}
              />
              <Field
                label="Preferences"
                value={(form.preferences || []).join(', ')}
                editable={isEditing}
                onChangeText={t => update('preferences', t.split(',').map(s => s.trim()).filter(Boolean))}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Health & Safety</Text>
              <Field
                label="Medical notes"
                value={(form.medicalNotes || []).join(', ')}
                editable={isEditing}
                onChangeText={t => update('medicalNotes', t.split(',').map(s => s.trim()).filter(Boolean))}
              />
              <Field
                label="Emergency contact name"
                value={form.emergencyContact?.name || ''}
                editable={isEditing}
                onChangeText={t => updateNested('emergencyContact.name', t)}
              />
              <Field
                label="Emergency contact phone"
                value={form.emergencyContact?.phone || ''}
                editable={isEditing}
                onChangeText={t => updateNested('emergencyContact.phone', t)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Body Metrics</Text>
              <Field
                label="Height (cm)"
                value={String(form.heightCm ?? '')}
                editable={isEditing}
                keyboardType="numeric"
                onChangeText={t => update('heightCm', t.replace(/[^0-9]/g, ''))}
              />
              <Field
                label="Weight (kg)"
                value={String(form.weightKg ?? '')}
                editable={isEditing}
                keyboardType="numeric"
                onChangeText={t => update('weightKg', t.replace(/[^0-9]/g, ''))}
              />
              <Field
                label="Body fat"
                value={form.bodyFat || ''}
                editable={isEditing}
                onChangeText={t => update('bodyFat', t)}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Activity Summary</Text>
              <ActivitySummaryCard
                sessions={mockSessions}
                scheduled={mockScheduled}
                style={{ marginTop: 20 }}
              />
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={isAlertModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsAlertModalVisible(false)}
      >
        <View style={styles.alertModalOverlay}>
          <View style={styles.alertModalContainer}>
            <Text style={styles.alertModalTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertModalMessage}>{alertConfig.message}</Text>
            <View style={styles.alertModalButtonContainer}>
              {alertConfig.buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.alertModalButton,
                    button.style === 'destructive' ? styles.alertModalDestructiveButton : styles.alertModalDefaultButton,
                  ]}
                  onPress={button.onPress}
                  accessible={true}
                  accessibilityLabel={button.text}
                  accessibilityHint={`Press to ${button.text.toLowerCase()}`}
                >
                  <Text
                    style={[
                      styles.alertModalButtonText,
                      button.style === 'destructive' ? styles.alertModalDestructiveButtonText : styles.alertModalDefaultButtonText,
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, value, editable, onChangeText, keyboardType }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {editable ? (
        <TextInput
          style={styles.input}
          value={String(value ?? '')}
          onChangeText={onChangeText}
          placeholder="Enter value"
          placeholderTextColor="rgba(255, 255, 255, 0.7)"
          keyboardType={keyboardType || 'default'}
        />
      ) : (
        <Text style={styles.rowValue}>{value && String(value).length ? String(value) : '-'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: LIGHT_PURPLE 
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 18,
    paddingBottom: 15,
  },
  headerBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  headerBtn: { 
    paddingVertical: 8, 
    paddingHorizontal: 8, 
    minWidth: 48, 
    alignItems: 'flex-start',
    backgroundColor: 'transparent'
  },
  headerBtnText: { 
    fontSize: 20, 
    color: BRAND_COLORS.YELLOW, 
    fontWeight: '800' 
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#FFFFFF' 
  },
  headerActionText: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: BRAND_COLORS.YELLOW 
  },
  content: { 
    flex: 1, 
    backgroundColor: LIGHT_PURPLE 
  },
  contentContainer: { 
    paddingHorizontal: 20, 
    paddingVertical: 16 
  },
  card: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#FFFFFF', 
    marginBottom: 10 
  },
  row: { 
    paddingVertical: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: UI_COLORS.BORDER_LIGHT 
  },
  rowLabel: { 
    fontSize: 13, 
    color: 'rgba(255, 255, 255, 0.7)', 
    marginBottom: 4 
  },
  rowValue: { 
    fontSize: 14, 
    color: '#FFFFFF', 
    fontWeight: '600' 
  },
  input: {
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
  },
  alertModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Updated to semi-transparent overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertModalContainer: {
    backgroundColor: BRAND_COLORS.PURPLE,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  alertModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  alertModalMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  alertModalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  alertModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  alertModalDefaultButton: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderWidth: 1,
    borderColor: BRAND_COLORS.YELLOW,
  },
  alertModalDestructiveButton: {
    backgroundColor: STATUS_COLORS.ERROR,
  },
  alertModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertModalDefaultButtonText: {
    color: BRAND_COLORS.YELLOW,
  },
  alertModalDestructiveButtonText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});