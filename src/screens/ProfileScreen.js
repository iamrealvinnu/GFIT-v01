import { LogBox } from 'react-native';
// Suppress VirtualizedLists warning
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested inside plain ScrollViews',
]);
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Switch,
  Modal,
  TextInput,
  FlatList,
  Image,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Feather as Icon } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { updateMemberProfile } from '../api/member';
import { BRAND_COLORS, UI_COLORS, STATUS_COLORS } from '../constants/Colors';
import { useRoute } from '@react-navigation/native';

const LIGHT_PURPLE = '#6B4E8C';

export default function ProfileScreen({ navigation }) {
  const route = useRoute();
  const { user, logout, updateUserProfile } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPlanModalVisible, setIsPlanModalVisible] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isAlertModalVisible, setIsAlertModalVisible] = useState(false);
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [isSuccessPopupVisible, setIsSuccessPopupVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [originalProfileImage, setOriginalProfileImage] = useState(null);
  const [profileExtra, setProfileExtra] = useState({
    Address1: '',
    Address2: '',
    City: '',
    State: '',
    Zip: '',
    Dob: '',
    GenderId: '',
    Email: user?.email || '',
  });
  const [originalProfileExtra, setOriginalProfileExtra] = useState(null);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
  });
  const [mockUser, setMockUser] = useState({
    name: user?.name || 'GFIT User',
    phoneNumber: user?.phoneNumber || '+91 98765 43210',
    membershipPlan: '',
    membershipStart: new Date(2025, 8, 5), // September 5, 2025
    profileImage: user?.profileImage || null,
  });
  const [tempName, setTempName] = useState(mockUser.name);
  const [tempPhoneNumber, setTempPhoneNumber] = useState(mockUser.phoneNumber);
  const [paymentStep, setPaymentStep] = useState('select_method'); // start at method
  const [selectedPlan, setSelectedPlan] = useState({ name: 'Membership', price: 0 }); // safe default
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [upiId, setUpiId] = useState('');
  const [errors, setErrors] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    cardHolder: '',
    upiId: '',
  });
  const [countdown, setCountdown] = useState(5);
  const [isCounting, setIsCounting] = useState(false);
  const progressAnim = useState(new Animated.Value(1))[0]; // For progress bar animation
  const [profileId, setProfileId] = useState(null);

  // Plans removed. Keep empty array so other parts (e.g., benefits lookup) don’t crash.
  const plans = [];

  const upiOptions = ['GPay', 'PhonePe', 'PayTM'];

  // Card type icons (using FontAwesome5 icon names)
  const cardImages = {
    visa: 'cc-visa',
    mastercard: 'cc-mastercard',
    amex: 'cc-amex',
    rupay: 'credit-card', // RuPay icon not available in FontAwesome5, using generic credit card
  };

  // UPI app icons (using generic icons as placeholders)
  const upiImages = {
    GPay: 'google', // FontAwesome5 has a Google icon
    PhonePe: 'phone', // Placeholder for PhonePe
    PayTM: 'money-check-alt', // Placeholder for PayTM
  };

  // Countdown and success popup logic
  useEffect(() => {
    if (isCounting && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: 5000,
        useNativeDriver: false,
      }).start();
      return () => clearInterval(timer);
    } else if (isCounting && countdown === 0) {
      setIsCounting(false);
      setMockUser({ ...mockUser, membershipPlan: selectedPlan.name });
      setIsPaymentModalVisible(false);
      setIsSuccessPopupVisible(true);
      setTimeout(() => {
        setIsSuccessPopupVisible(false);
        setPaymentStep('select_plan');
        setSelectedPlan(null);
        setSelectedMethod(null);
        setCardNumber('');
        setExpiry('');
        setCvv('');
        setCardHolder('');
        setUpiId('');
        setErrors({ cardNumber: '', expiry: '', cvv: '', cardHolder: '', upiId: '' });
        setCountdown(5);
        progressAnim.setValue(1);
      }, 2000); // Close popup after 2 seconds
    }
  }, [isCounting, countdown, selectedPlan, progressAnim]);

  // Card type detection
  const getCardType = (number) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.startsWith('4')) return 'visa';
    if (cleaned.startsWith('5')) return 'mastercard';
    if (cleaned.startsWith('34') || cleaned.startsWith('37')) return 'amex';
    if (cleaned.startsWith('60') || cleaned.startsWith('65')) return 'rupay';
    return null;
  };

  // Validation functions
  const validateCardNumber = (number) => {
    const cleaned = number.replace(/\D/g, '');
    return cleaned.length < 16 ? 'Card number must be 16 digits' : '';
  };

  const validateExpiry = (expiry) => {
    if (!expiry) return '';
    const [month, year] = expiry.split('/');
    const currentYear = new Date().getFullYear() % 100;
    const currentMonth = new Date().getMonth() + 1;
    if (!month || !year) return 'Invalid format (MM/YY)';
    if (parseInt(month) > 12 || parseInt(month) < 1) return 'Invalid month';
    if (parseInt(year) < currentYear) return 'Card has expired';
    if (parseInt(year) === currentYear && parseInt(month) < currentMonth) return 'Card has expired';
    return '';
  };

  const validateCvv = (cvv) => {
    return cvv.length < 3 ? 'CVV must be 3 digits' : '';
  };

  const validateUpiId = (upi) => {
    return !upi.includes('@') ? 'Invalid UPI ID format' : '';
  };

  // Handle input changes with validation
  const handleCardNumberChange = (text) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < cleaned.length; i += 4) {
      if (i > 0) formatted += ' ';
      formatted += cleaned.slice(i, i + 4);
    }
    setCardNumber(formatted);
    setErrors((prev) => ({ ...prev, cardNumber: validateCardNumber(formatted) }));
  };

  const handleExpiryChange = (text) => {
    let value = text.replace(/\D/g, '');
    if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
    setExpiry(value);
    setErrors((prev) => ({ ...prev, expiry: validateExpiry(value) }));
  };

  const handleCvvChange = (text) => {
    const cleaned = text.replace(/\D/g, '');
    setCvv(cleaned);
    setErrors((prev) => ({ ...prev, cvv: validateCvv(cleaned) }));
  };

  const handleUpiChange = (text) => {
    setUpiId(text);
    setErrors((prev) => ({ ...prev, upiId: validateUpiId(text) }));
  };

  const showCustomAlert = (title, message, buttons) => {
    setAlertConfig({ title, message, buttons });
    setIsAlertModalVisible(true);
  };

  const handleLogout = () => {
    showCustomAlert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setIsAlertModalVisible(false) },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.log('Logout error:', error);
            }
            setIsAlertModalVisible(false);
          },
        },
      ]
    );
  };

  const handleEditPress = () => {
    setTempName(mockUser.name);
    setTempPhoneNumber(mockUser.phoneNumber);
    setOriginalProfileImage(mockUser.profileImage || null);
    setOriginalProfileExtra({ ...profileExtra });
    setIsEditModalVisible(true);
  };

  const splitName = (full) => {
    if (!full) return { firstName: '', middleName: '', lastName: '' };
    const parts = full.trim().split(/\s+/);
    const firstName = parts.shift() || '';
    const lastName = parts.length ? parts.pop() : '';
    const middleName = parts.join(' ');
    return { firstName, middleName, lastName };
  };

  const buildImageFileFromUri = (uri) => {
    if (!uri) return undefined;
    // Only attach if it's a local/resource URI rather than remote http(s)
    if (/^https?:\/\//i.test(uri)) return undefined;
    const name = (uri.split('/').pop() || 'profile.jpg').split('?')[0];
    const ext = (name.split('.').pop() || '').toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';
    return { uri, name, type };
  };

  const setExtra = (key, value) => {
    setProfileExtra((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = async () => {
    if (!tempName || !tempPhoneNumber) {
      showCustomAlert('Error', 'Please fill in all fields.', [
        { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
      ]);
      return;
    }
    if (!profileId) {
      showCustomAlert('Error', 'Unable to determine your user ID. Please reopen the Profile screen or try again.', [
        { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
      ]);
      return;
    }
    try {
      setIsSaving(true);
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        throw new Error('No auth token found');
      }

      const { firstName, middleName, lastName } = splitName(tempName);
      const fieldsRaw = {
        UserName: tempName,
        PreferredName: tempName,
        FirstName: firstName,
        MiddleName: middleName,
        LastName: lastName,
        Email: profileExtra.Email || user?.email || '',
        PhoneNumber: tempPhoneNumber,
        Address1: profileExtra.Address1,
        Address2: profileExtra.Address2,
        City: profileExtra.City,
        State: profileExtra.State,
        Zip: profileExtra.Zip,
        Dob: profileExtra.Dob ? new Date(profileExtra.Dob).toISOString().split('T')[0] : '', // Format as YYYY-MM-DD
        GenderId: profileExtra.GenderId,
      };
      const fields = Object.fromEntries(
        Object.entries(fieldsRaw).filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== '')
      );

      const imageFile = buildImageFileFromUri(mockUser?.profileImage);

      // Create FormData for multipart
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      if (imageFile) {
        formData.append('file', {
          uri: imageFile.uri,
          name: imageFile.name,
          type: imageFile.type,
        });
      }

      console.log('Updating profile with fields:', fields);
      console.log('Image file:', imageFile);
      console.log('Profile ID:', profileId);

      const response = await fetch(`https://gfit-dev.gdinexus.com:8412/api/Member/update-profile/${profileId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          // No Content-Type for multipart/form-data - let browser set it with boundary
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('API Error Status:', response.status, 'Body:', errorText);
        throw new Error(`Update failed: ${response.status} - ${errorText}`);
      }

      const updatedData = await response.json();
      console.log('Update successful:', updatedData);

      // Update local state with response data
      const updatedBlobUrl = updatedData?.pictureBlobUrl
        ? `https://gfit-dev.gdinexus.com:8412${updatedData.pictureBlobUrl}`
        : null;
      let finalImageUri = null;
      if (updatedBlobUrl) {
        try {
          const fileName = `profile_${(user?.email || user?.phoneNumber || 'anon').replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
          const dest = `${FileSystem.cacheDirectory}${fileName}`;
          const dl = await FileSystem.downloadAsync(updatedBlobUrl, dest, {
            headers: { Authorization: `Bearer ${token}` },
          });
          finalImageUri = dl?.uri || updatedBlobUrl;
        } catch (e) {
          console.log('profile image download after update failed, falling back to URL', e?.message || e);
          finalImageUri = updatedBlobUrl;
        }
      }

      setMockUser((prev) => ({
        ...prev,
        name: updatedData.userName || tempName,
        phoneNumber: updatedData.phoneNumber || tempPhoneNumber,
        profileImage: finalImageUri || prev.profileImage,
      }));
      if (finalImageUri) {
        try {
          const key = `profileImage:${user?.email || user?.phoneNumber || 'anon'}`;
          await AsyncStorage.setItem(key, finalImageUri);
        } catch {}
      }
      setProfileExtra((prev) => ({
        ...prev,
        Email: updatedData.email || prev.Email,
        // Update other fields if needed from response
      }));

      updateUserProfile?.({ name: tempName, phoneNumber: tempPhoneNumber });
      setIsEditModalVisible(false);
      showCustomAlert('Profile Updated', 'Your profile has been updated successfully.', [
        { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
      ]);
    } catch (e) {
      console.log('handleSaveProfile error:', e);
      showCustomAlert('Update Failed', e?.message || 'Could not update your profile. Please try again later.', [
        { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setTempName(mockUser.name);
    setTempPhoneNumber(mockUser.phoneNumber);
    setIsEditModalVisible(false);
    setIsPhotoModalVisible(false);
    setIsPreviewModalVisible(false);
    setPreviewImage(null);
    if (originalProfileExtra) setProfileExtra({ ...originalProfileExtra });
  };

  const [isSaving, setIsSaving] = useState(false);
  const hasChanges =
    tempName !== mockUser.name ||
    tempPhoneNumber !== mockUser.phoneNumber ||
    (mockUser.profileImage || null) !== (originalProfileImage || null) ||
    (originalProfileExtra && (
      profileExtra.Email !== originalProfileExtra.Email ||
      profileExtra.Address1 !== originalProfileExtra.Address1 ||
      profileExtra.Address2 !== originalProfileExtra.Address2 ||
      profileExtra.City !== originalProfileExtra.City ||
      profileExtra.State !== originalProfileExtra.State ||
      profileExtra.Zip !== originalProfileExtra.Zip ||
      profileExtra.Dob !== originalProfileExtra.Dob ||
      profileExtra.GenderId !== originalProfileExtra.GenderId
    ));

  const pickImageFromLibrary = async () => {
    try {
      const ImagePicker = require('expo-image-picker');
      if (!ImagePicker || typeof ImagePicker.requestMediaLibraryPermissionsAsync !== 'function') {
        showCustomAlert('Missing dependency', 'The image picker module is not available. Please run `expo install expo-image-picker` and rebuild the app, then restart the bundler.', [
          { text: 'OK', onPress: () => setIsPhotoModalVisible(false) },
        ]);
        return;
      }
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showCustomAlert('Permission Denied', 'Permission to access photos is required to select a profile picture.', [
          { text: 'OK', onPress: () => setIsPhotoModalVisible(false) },
        ]);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsImageLoading(true);
        setPreviewImage(result.assets[0].uri);
        setIsPhotoModalVisible(false);
        setIsPreviewModalVisible(true);
      } else {
        setIsPhotoModalVisible(false);
      }
    } catch (error) {
      console.log('pickImageFromLibrary error:', error);
      showCustomAlert('Error', 'Unable to open image library. Please try again.', [
        { text: 'OK', onPress: () => setIsPhotoModalVisible(false) },
      ]);
    } finally {
      setIsImageLoading(false);
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const ImagePicker = require('expo-image-picker');
      if (!ImagePicker || typeof ImagePicker.requestCameraPermissionsAsync !== 'function') {
        showCustomAlert('Missing dependency', 'The camera module is not available. Please run `expo install expo-image-picker` and rebuild the app, then restart the bundler.', [
          { text: 'OK', onPress: () => setIsPhotoModalVisible(false) },
        ]);
        return;
      }
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showCustomAlert('Permission Denied', 'Permission to use camera is required to take a profile picture.', [
          { text: 'OK', onPress: () => setIsPhotoModalVisible(false) },
        ]);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsImageLoading(true);
        setPreviewImage(result.assets[0].uri);
        setIsPhotoModalVisible(false);
        setIsPreviewModalVisible(true);
      } else {
        setIsPhotoModalVisible(false);
      }
    } catch (error) {
      console.log('takePhotoWithCamera error:', error);
      showCustomAlert('Error', 'Unable to open camera. Please try again.', [
        { text: 'OK', onPress: () => setIsPhotoModalVisible(false) },
      ]);
    } finally {
      setIsImageLoading(false);
    }
  };

  const confirmProfileImage = () => {
    const doConfirm = async () => {
      try {
        setIsImageLoading(true);
        setMockUser({ ...mockUser, profileImage: previewImage });
        const key = `profileImage:${user?.email || user?.phoneNumber || 'anon'}`;
        await AsyncStorage.setItem(key, previewImage);
        setIsPreviewModalVisible(false);
        setPreviewImage(null);
        showCustomAlert('Success', 'Profile picture updated successfully.', [
          { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
        ]);
      } catch (e) {
        console.log('confirmProfileImage save error:', e);
        showCustomAlert('Error', 'Unable to save profile picture locally.', [
          { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
        ]);
      } finally {
        setIsImageLoading(false);
      }
    };
    doConfirm();
  };

  const cancelProfileImage = () => {
    setIsPreviewModalVisible(false);
    setPreviewImage(null);
  };

  const removeProfilePhoto = () => {
    const doRemove = async () => {
      try {
        setIsImageLoading(true);
        setMockUser({ ...mockUser, profileImage: null });
        const key = `profileImage:${user?.email || user?.phoneNumber || 'anon'}`;
        await AsyncStorage.removeItem(key);
        setIsPhotoModalVisible(false);
        showCustomAlert('Success', 'Profile picture removed successfully.', [
          { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
        ]);
      } catch (e) {
        console.log('removeProfilePhoto error:', e);
        showCustomAlert('Error', 'Unable to remove saved profile picture.', [
          { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
        ]);
      } finally {
        setIsImageLoading(false);
      }
    };
    doRemove();
  };

  useEffect(() => {
    const loadImage = async () => {
      try {
        const key = `profileImage:${user?.email || user?.phoneNumber || 'anon'}`;
        const uri = await AsyncStorage.getItem(key);
        if (uri) {
          setMockUser((prev) => ({ ...prev, profileImage: uri }));
        }
      } catch (e) {
        console.log('loadImage error:', e);
      }
    };
    loadImage();
  }, [user]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) return;

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
          return;
        }

  const data = await res.json();
  if (data?.id) setProfileId(data.id);
  const serverName = data?.name || data?.fullName || data?.firstName || null;
  const serverPhone = data?.phoneNumber || data?.phone || null;
  const blobUrl = data?.pictureBlobUrl ? `https://gfit-dev.gdinexus.com:8412${data.pictureBlobUrl}` : null;
  const serverImage = blobUrl || data?.profileImage || data?.profilePictureUrl || data?.avatarUrl || data?.avatar || data?.photoUrl || data?.picture || null;

        let resolvedImage = serverImage || null;
        if (blobUrl) {
          try {
            const fileName = `profile_${(user?.email || user?.phoneNumber || 'anon').replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
            const dest = `${FileSystem.cacheDirectory}${fileName}`;
            const dl = await FileSystem.downloadAsync(blobUrl, dest, {
              headers: { Authorization: `Bearer ${token}` },
            });
            resolvedImage = dl?.uri || blobUrl;
          } catch (e) {
            console.log('profile image download failed, falling back to URL', e?.message || e);
            resolvedImage = serverImage;
          }
        }

        setMockUser((prev) => ({
          ...prev,
          name: serverName || prev.name,
          phoneNumber: serverPhone || prev.phoneNumber,
          profileImage: resolvedImage || prev.profileImage,
          membershipPlan: data?.membershipPlan || prev.membershipPlan,
          membershipStart: data?.membershipStart ? new Date(data.membershipStart) : prev.membershipStart,
        }));
        if (resolvedImage) {
          try {
            const key = `profileImage:${user?.email || user?.phoneNumber || 'anon'}`;
            await AsyncStorage.setItem(key, resolvedImage);
          } catch {}
        }

        setProfileExtra((prev) => ({
          ...prev,
          Address1: data?.address1 || data?.addressLine1 || prev.Address1,
          Address2: data?.address2 || data?.addressLine2 || prev.Address2,
          City: data?.city || prev.City,
          State: data?.state || prev.State,
          Zip: data?.zip || data?.postalCode || prev.Zip,
          Dob: data?.dob || data?.dateOfBirth || prev.Dob,
          GenderId: data?.genderId || prev.GenderId,
          Email: data?.email || prev.Email,
        }));
      } catch (e) {
        console.log('fetchProfile error:', e);
      }
    };
    fetchProfile();
  }, [user]);

  const handleViewPlan = () => {
    showCustomAlert(
      'Coming Soon',
      'Plan details will be available soon',
      [{ text: 'OK', onPress: () => setIsAlertModalVisible(false) }],
    );
    // Do not open the plan modal anymore
    setIsPlanModalVisible(false);
  };

  const handleMakePayment = () => {
    // Skip plans; open at method with safe default
    setSelectedPlan({ name: mockUser.membershipPlan || 'Membership', price: 0 });
    setPaymentStep('select_method');
    setIsPaymentModalVisible(true);
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setPaymentStep('select_method');
  };

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
    if (method === 'Cards') {
      setPaymentStep('enter_details');
    } else if (method === 'Cash') {
      setPaymentStep('confirm_cash');
    } else {
      setPaymentStep('enter_upi');
    }
  };

  const handleSubmitPayment = () => {
    if (selectedMethod === 'Cards') {
      if (!cardNumber || !expiry || !cvv || !cardHolder) {
        showCustomAlert('Error', 'Please fill in all card fields.', [
          { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
        ]);
        return;
      }
      if (errors.cardNumber || errors.expiry || errors.cvv) {
        showCustomAlert('Error', 'Please correct the errors in card details.', [
          { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
        ]);
        return;
      }
    } else if (selectedMethod !== 'Cash' && !upiId) {
      showCustomAlert('Error', 'Please enter a UPI ID.', [
        { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
      ]);
      return;
    } else if (selectedMethod !== 'Cash' && errors.upiId) {
      showCustomAlert('Error', 'Please enter a valid UPI ID.', [
        { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
      ]);
      return;
    }
    setIsCounting(true);
  };

  const renderPlan = ({ item }) => (
    <TouchableOpacity
      style={styles.planItem}
      onPress={() => handleSelectPlan(item)}
      accessible={true}
      accessibilityLabel={item.name}
      accessibilityHint={`Select ${item.name} for ₹${item.price}`}
    >
      <Text style={styles.planName}>{item.name}</Text>
      <Text style={styles.planPrice}>₹{item.price.toLocaleString('en-IN')}</Text>
      <Text style={styles.planBenefits}>{item.benefits}</Text>
    </TouchableOpacity>
  );

  const renderUpiOption = ({ item }) => (
    <TouchableOpacity
      style={styles.upiOption}
      onPress={() => handleSelectMethod(item)}
      accessible={true}
      accessibilityLabel={item}
      accessibilityHint={`Select ${item} for payment`}
    >
      <FontAwesome5 name={upiImages[item]} size={40} color={BRAND_COLORS.YELLOW} style={styles.upiImage} />
      <Text style={styles.upiText}>{item}</Text>
    </TouchableOpacity>
  );

  const profileSections = [
    {
      title: 'Membership',
      items: [
        { icon: 'credit-card', label: 'View Plan Details', action: 'navigate', screen: 'ViewPlan' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: 'user', label: 'Personal Information', action: 'navigate', screen: 'PersonalInformation' },
        { icon: 'lock', label: 'Privacy & Security', action: 'navigate', screen: 'PrivacySecurity' },
        { icon: 'key', label: 'Change Password', action: 'navigate', screen: 'ChangePassword' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'bell', label: 'Push Notifications', action: 'toggle', value: notificationsEnabled, onToggle: setNotificationsEnabled },
        { icon: 'globe', label: 'Language', action: 'navigate', screen: 'Language' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle', label: 'Help & FAQ', action: 'navigate', screen: 'Help' },
        { icon: 'mail', label: 'Contact Support', action: 'navigate', screen: 'Contact' },
        { icon: 'star', label: 'Rate App', action: 'external', url: 'https://play.google.com' },
        { icon: 'share-2', label: 'Share App', action: 'share' },
      ],
    },
    {
      title: 'About',
      items: [
        { icon: 'info', label: 'App Version', action: 'info', value: '1.0.0' },
        { icon: 'file-text', label: 'Terms of Service', action: 'navigate', screen: 'Terms' },
        { icon: 'lock', label: 'Privacy Policy', action: 'navigate', screen: 'PrivacyPolicy' },
      ],
    },
  ];

  const handleItemPress = (item) => {
    switch (item.action) {
      case 'navigate':
        if (item.screen === 'ViewPlan') {
          handleViewPlan();
        } else if (item.screen === 'Terms') {
          navigation.navigate('TermsOfService');
        } else if (item.screen === 'PrivacyPolicy') {
          navigation.navigate('PrivacyPolicy');
        } else if (item.screen === 'PrivacySecurity') {
          navigation.navigate('PrivacySecurity');
        } else if (item.screen === 'ChangePassword') {
          navigation.navigate('ChangePassword');
        } else if (item.screen === 'PersonalInformation') {
          const parent = navigation.getParent?.();
          if (parent?.navigate) {
            parent.navigate('PersonalInformation');
          } else {
            navigation.navigate('PersonalInformation');
          }
        } else {
          showCustomAlert('Coming Soon', `${item.label || 'This feature'} will be available in the next update!`, [
            { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
          ]);
        }
        break;
      case 'toggle':
        break;
      case 'external':
        showCustomAlert('External Link', 'This will open an external link in the future.', [
          { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
        ]);
        break;
      case 'share':
        showCustomAlert('Share', 'App sharing functionality will be available soon!', [
          { text: 'OK', onPress: () => setIsAlertModalVisible(false) },
        ]);
        break;
      case 'info':
        break;
    }
  };

  // Open Payments modal when navigated with param
  useEffect(() => {
    if (route?.params?.openPaymentModal) {
      setSelectedPlan({ name: mockUser.membershipPlan || 'Membership', price: 0 });
      setPaymentStep('select_method');
      setIsPaymentModalVisible(true);
      navigation.setParams({ openPaymentModal: undefined });
    }
  }, [route?.params?.openPaymentModal]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={BRAND_COLORS.PURPLE} barStyle="light-content" />
      <LinearGradient colors={[BRAND_COLORS.PURPLE, LIGHT_PURPLE]} style={styles.gradient}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Manage your account & preferences</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Info Card */}
          <LinearGradient colors={[BRAND_COLORS.PURPLE, LIGHT_PURPLE]} style={styles.userCardGradient}>
            <View style={styles.userCard}>
              <TouchableOpacity
                style={styles.userAvatar}
                onPress={() => {
                  console.log('Avatar clicked, opening photo modal');
                  setIsPhotoModalVisible(true);
                }}
                accessible={true}
                accessibilityLabel="Change profile photo"
                accessibilityHint="Opens options to take or select a photo"
              >
                {mockUser.profileImage ? (
                  <Image source={{ uri: mockUser.profileImage }} style={{ width: 70, height: 70, borderRadius: 35 }} />
                ) : (
                  <Icon name="user" size={40} color={BRAND_COLORS.YELLOW} />
                )}
              </TouchableOpacity>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{mockUser.name || 'GFIT User'}</Text>
                <Text style={styles.userMemberSince}>
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '2025'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditPress}
                accessible={true}
                accessibilityLabel="Edit profile"
                accessibilityHint="Opens a modal to edit your name and phone number"
                activeOpacity={0.8}
              >
                <View style={styles.editButtonInner}>
                  <Icon name="edit-2" size={14} color={BRAND_COLORS.YELLOW} style={{ marginRight: 8 }} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </View>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Make a Payment Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleMakePayment}
            accessible={true}
            accessibilityLabel="Make a payment"
            accessibilityHint="Opens the payment interface modal"
          >
            <Text style={styles.actionButtonText}>Make a Payment</Text>
          </TouchableOpacity>

          {/* Custom Alert Modal */}
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

          {/* Photo Options Modal */}
          <Modal
            visible={isPhotoModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsPhotoModalVisible(false)}
          >
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}> 
              <View style={[styles.photoModalBox, styles.photoModalContainer]}> 
                <View style={[styles.modalHeader, styles.photoModalHeader]}> 
                  <Text style={styles.modalTitle}>Change Profile Photo</Text> 
                  <TouchableOpacity 
                    style={styles.modalCloseBtn} 
                    onPress={() => { 
                      console.log('Closing photo modal'); 
                      setIsPhotoModalVisible(false); 
                    }} 
                    accessible={true} 
                    accessibilityLabel="Close" 
                    accessibilityHint="Closes the profile photo options modal" 
                  > 
                    <Icon name="x" size={24} color={BRAND_COLORS.YELLOW} /> 
                  </TouchableOpacity> 
                </View> 
                <View style={styles.photoOptionsContent}> 
                  <ScrollView contentContainerStyle={styles.photoOptionsList} keyboardShouldPersistTaps="handled"> 
                    <TouchableOpacity 
                      style={styles.modalActionButton} 
                      onPress={pickImageFromLibrary} 
                      activeOpacity={0.8} 
                      accessible={true} 
                      accessibilityLabel="Choose from Gallery" 
                      accessibilityHint="Opens the gallery to select a profile picture" 
                    > 
                      <View style={styles.actionRow}> 
                        <Icon name="image" size={18} color={BRAND_COLORS.PURPLE} style={styles.actionRowIcon} /> 
                        <Text style={styles.modalActionButtonText}>Choose from Gallery</Text> 
                      </View> 
                    </TouchableOpacity> 
                    <TouchableOpacity 
                      style={styles.modalActionButton} 
                      onPress={takePhotoWithCamera} 
                      activeOpacity={0.8} 
                      accessible={true} 
                      accessibilityLabel="Take Photo" 
                      accessibilityHint="Opens the camera to take a new profile picture" 
                    > 
                      <View style={styles.actionRow}> 
                        <Icon name="camera" size={18} color={BRAND_COLORS.PURPLE} style={styles.actionRowIcon} /> 
                        <Text style={styles.modalActionButtonText}>Take Photo</Text> 
                      </View> 
                    </TouchableOpacity> 
                    <TouchableOpacity 
                      style={styles.modalCancelButton} 
                      onPress={removeProfilePhoto} 
                      activeOpacity={0.8} 
                      accessible={true} 
                      accessibilityLabel="Remove Photo" 
                      accessibilityHint="Removes the current profile picture" 
                    > 
                      <View style={styles.actionRow}> 
                        <Icon name="trash-2" size={18} color={BRAND_COLORS.YELLOW} style={styles.actionRowIcon} /> 
                        <Text style={styles.modalCancelButtonText}>Remove Photo</Text> 
                      </View> 
                    </TouchableOpacity> 
                  </ScrollView> 
                </View> 
              </View> 
            </View>
          </Modal>

          {/* Preview Image Modal */}
          <Modal
            visible={isPreviewModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsPreviewModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.photoModalBox}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Preview Profile Photo</Text>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={cancelProfileImage}
                    accessible={true}
                    accessibilityLabel="Close"
                    accessibilityHint="Closes the preview modal without saving"
                  >
                    <Icon name="x" size={24} color={BRAND_COLORS.YELLOW} />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalContent}>
                  {isImageLoading ? (
                    <ActivityIndicator size="large" color={BRAND_COLORS.YELLOW} style={styles.imageLoading} />
                  ) : previewImage ? (
                    <Image
                      source={{ uri: previewImage }}
                      style={styles.previewImage}
                      onLoad={() => console.log('Preview image loaded:', previewImage)}
                      onError={(e) => console.log('Preview image error:', e.nativeEvent.error)}
                    />
                  ) : (
                    <Text style={styles.modalSubText}>No image selected</Text>
                  )}
                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity
                      style={[styles.modalCancelButton, styles.modalButton]}
                      onPress={cancelProfileImage}
                      activeOpacity={0.8}
                      accessible={true}
                      accessibilityLabel="Cancel"
                      accessibilityHint="Discards the selected photo"
                    >
                      <Text style={styles.modalCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.modalButton]}
                      onPress={confirmProfileImage}
                      activeOpacity={0.8}
                      accessible={true}
                      accessibilityLabel="Confirm"
                      accessibilityHint="Saves the selected photo as your profile picture"
                    >
                      <Text style={styles.modalActionButtonText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

          {/* Edit Profile Modal - Updated for visibility and keyboard handling */}
          <Modal
            visible={isEditModalVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleCancelEdit}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContainer}
            >
              <StatusBar backgroundColor={BRAND_COLORS.PURPLE} barStyle="light-content" />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={handleCancelEdit}
                  accessible={true}
                  accessibilityLabel="Close"
                  accessibilityHint="Closes the edit profile modal"
                >
                  <Icon name="x" size={24} color={BRAND_COLORS.YELLOW} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
                <TouchableOpacity
                  style={styles.editModalAvatarWrapper}
                  onPress={() => setIsPhotoModalVisible(true)}
                  accessible={true}
                  accessibilityLabel="Change profile photo"
                  accessibilityHint="Opens options to take or select a photo"
                >
                  {mockUser.profileImage ? (
                    <Image source={{ uri: mockUser.profileImage }} style={styles.editModalAvatar} />
                  ) : (
                    <View style={[styles.editModalAvatar, styles.editModalAvatarPlaceholder]}>
                      <Icon name="user" size={32} color={BRAND_COLORS.YELLOW} />
                    </View>
                  )}
                  <Text style={styles.editModalAvatarText}>Change Photo</Text>
                </TouchableOpacity>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Full name</Text>
                  <TextInput
                    style={[styles.input, styles.visibleInput]}
                    value={tempName}
                    onChangeText={setTempName}
                    placeholder="Enter your name"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    accessible={true}
                    accessibilityLabel="Name input"
                    accessibilityHint="Enter your full name"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Phone number</Text>
                  <TextInput
                    style={[styles.input, styles.visibleInput]}
                    value={tempPhoneNumber}
                    onChangeText={setTempPhoneNumber}
                    placeholder="Enter your phone number"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    keyboardType="phone-pad"
                    accessible={true}
                    accessibilityLabel="Phone number input"
                    accessibilityHint="Enter your phone number"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={[styles.input, styles.visibleInput]}
                    value={profileExtra.Email}
                    onChangeText={(t) => setExtra('Email', t)}
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    accessible={true}
                    accessibilityLabel="Email input"
                    accessibilityHint="Enter your email"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Address line 1</Text>
                  <TextInput
                    style={[styles.input, styles.visibleInput]}
                    value={profileExtra.Address1}
                    onChangeText={(t) => setExtra('Address1', t)}
                    placeholder="House/Street"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    accessible={true}
                    accessibilityLabel="Address line 1"
                    accessibilityHint="Enter first line of your address"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Address line 2</Text>
                  <TextInput
                    style={[styles.input, styles.visibleInput]}
                    value={profileExtra.Address2}
                    onChangeText={(t) => setExtra('Address2', t)}
                    placeholder="Area / Landmark (optional)"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    accessible={true}
                    accessibilityLabel="Address line 2"
                    accessibilityHint="Enter second line of your address"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>City</Text>
                  <TextInput
                    style={[styles.input, styles.visibleInput]}
                    value={profileExtra.City}
                    onChangeText={(t) => setExtra('City', t)}
                    placeholder="City"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    accessible={true}
                    accessibilityLabel="City input"
                    accessibilityHint="Enter your city"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>State</Text>
                  <TextInput
                    style={[styles.input, styles.visibleInput]}
                    value={profileExtra.State}
                    onChangeText={(t) => setExtra('State', t)}
                    placeholder="State"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    accessible={true}
                    accessibilityLabel="State input"
                    accessibilityHint="Enter your state"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Zip</Text>
                  <TextInput
                    style={[styles.input, styles.visibleInput]}
                    value={profileExtra.Zip}
                    onChangeText={(t) => setExtra('Zip', t)}
                    placeholder="Postal code"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    keyboardType="numeric"
                    accessible={true}
                    accessibilityLabel="Zip input"
                    accessibilityHint="Enter your postal code"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Date of Birth</Text>
                  <TextInput
                    style={[styles.input, styles.visibleInput]}
                    value={profileExtra.Dob}
                    onChangeText={(t) => setExtra('Dob', t)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    accessible={true}
                    accessibilityLabel="Date of Birth input"
                    accessibilityHint="Enter your date of birth as YYYY-MM-DD"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Gender Id</Text>
                  <TextInput
                    style={[styles.input, styles.visibleInput]}
                    value={profileExtra.GenderId}
                    onChangeText={(t) => setExtra('GenderId', t)}
                    placeholder="Gender UUID"
                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                    autoCapitalize="none"
                    accessible={true}
                    accessibilityLabel="Gender ID input"
                    accessibilityHint="Enter your gender identifier (UUID)"
                  />
                </View>
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={handleCancelEdit}
                    accessible={true}
                    accessibilityLabel="Cancel"
                    accessibilityHint="Closes the edit profile modal without saving"
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.actionButton, !hasChanges || isSaving ? { opacity: 0.6 } : {}]}
                    onPress={async () => {
                      if (!hasChanges || isSaving) return;
                      await handleSaveProfile();
                    }}
                    accessible={true}
                    accessibilityLabel="Save profile"
                    accessibilityHint="Saves the updated profile details"
                    disabled={!hasChanges || isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color={BRAND_COLORS.PURPLE} />
                    ) : (
                      <Text style={styles.actionButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Modal>

          {/* Plan Details Modal (temporarily disabled; showing "Coming Soon" via alert) */}
          {false && (
            <Modal
              visible={false}
              animationType="fade"
              transparent={true}
              onRequestClose={() => setIsPlanModalVisible(false)}
            >
              <View style={styles.alertModalOverlay}>
                <View style={styles.alertModalContainer}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.alertModalTitle}>Membership Plan</Text>
                    <TouchableOpacity
                      onPress={() => setIsPlanModalVisible(false)}
                      style={{ padding: 4 }}
                      accessible={true}
                      accessibilityLabel="Close"
                      accessibilityHint="Close membership plan details"
                    >
                      <Icon name="x" size={22} color={BRAND_COLORS.YELLOW} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ alignItems: 'flex-start', marginBottom: 24 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: BRAND_COLORS.YELLOW, marginBottom: 8 }}>
                      Plan: <Text style={{ color: '#fff', fontWeight: '600' }}>{mockUser.membershipPlan}</Text>
                    </Text>
                    <Text style={{ fontSize: 15, color: '#fff', marginBottom: 8 }}>
                      Start Date: <Text style={{ color: BRAND_COLORS.YELLOW }}>{mockUser.membershipStart.toLocaleDateString()}</Text>
                    </Text>
                    <Text style={{ fontSize: 15, color: '#fff', marginBottom: 8 }}>
                      Benefits: <Text style={{ color: BRAND_COLORS.YELLOW }}>{plans.find((plan) => plan.name === mockUser.membershipPlan)?.benefits || 'N/A'}</Text>
                    </Text>
                    <Text style={{ fontSize: 15, color: '#fff', marginBottom: 8 }}>
                      Outstanding: <Text style={{ color: STATUS_COLORS.ERROR }}>₹0</Text>
                    </Text>
                  </View>
                  <View style={{ width: '100%', paddingHorizontal: 0, marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                      <TouchableOpacity
                        style={[styles.alertModalButton, { backgroundColor: BRAND_COLORS.YELLOW, flex: 1, marginRight: 6, minWidth: 0 }]}
                        onPress={() => {
                          setIsPlanModalVisible(false);
                          setSelectedPlan({ name: mockUser.membershipPlan || 'Membership', price: 0 });
                          setPaymentStep('select_method');
                          setIsPaymentModalVisible(true);
                        }}
                        accessible={true}
                        accessibilityLabel="Extend"
                        accessibilityHint="Extend your plan"
                      >
                        <Text style={[styles.alertModalButtonText, { color: BRAND_COLORS.PURPLE, fontSize: 15 }]}>Extend</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.alertModalButton, { backgroundColor: STATUS_COLORS.ERROR, flex: 1, marginRight: 6, minWidth: 0 }]}
                        onPress={() => {/* Deactivate plan logic here */}}
                        accessible={true}
                        accessibilityLabel="Stop"
                        accessibilityHint="Stop your plan"
                      >
                        <Text style={[styles.alertModalButtonText, { color: '#fff', fontSize: 15 }]}>Stop</Text>
                      </TouchableOpacity>
                      
                    </View>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* Payment Interface Modal */}
          <Modal
            visible={isPaymentModalVisible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setIsPaymentModalVisible(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <View style={styles.modalContainer}>
                <StatusBar backgroundColor={BRAND_COLORS.PURPLE} barStyle="light-content" />
                <LinearGradient colors={[BRAND_COLORS.PURPLE, LIGHT_PURPLE]} style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {paymentStep === 'select_plan'
                      ? 'Select a Plan'
                      : paymentStep === 'select_method'
                      ? 'Select Payment Method'
                      : paymentStep === 'enter_details'
                      ? 'Enter Card Details'
                      : paymentStep === 'enter_upi'
                      ? 'Enter UPI Details'
                      : 'Confirm Cash Payment'}
                  </Text>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => {
                      setIsPaymentModalVisible(false);
                      setPaymentStep('select_method');
                      setSelectedPlan({ name: mockUser.membershipPlan || 'Membership', price: 0 });
                      setSelectedMethod(null);
                      setCardNumber('');
                      setExpiry('');
                      setCvv('');
                      setCardHolder('');
                      setUpiId('');
                      setErrors({ cardNumber: '', expiry: '', cvv: '', cardHolder: '', upiId: '' });
                      setCountdown(5);
                      setIsCounting(false);
                      progressAnim.setValue(1);
                    }}
                    accessible={true}
                    accessibilityLabel="Close"
                    accessibilityHint="Closes the payment interface modal"
                  >
                    <Icon name="x" size={24} color={BRAND_COLORS.YELLOW} />
                  </TouchableOpacity>
                </LinearGradient>
                <ScrollView contentContainerStyle={styles.modalContent}>
                  {paymentStep === 'select_method' && (
                    <>
                      <Text style={styles.modalSubText}>
                        Plan: {(selectedPlan?.name || 'Membership')} - ₹{Number(selectedPlan?.price ?? 0).toLocaleString('en-IN')}
                      </Text>
                      <View style={styles.paymentMethodContainer}>
                        <TouchableOpacity
                          style={[
                            styles.paymentMethodButton,
                            selectedMethod === 'Cards' && styles.selectedPaymentMethod,
                          ]}
                          onPress={() => handleSelectMethod('Cards')}
                          accessible={true}
                          accessibilityLabel="Pay with Cards"
                          accessibilityHint="Opens card payment details"
                        >
                          <FontAwesome5 name="credit-card" size={24} color={BRAND_COLORS.YELLOW} />
                          <Text style={styles.paymentMethodText}>Card</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.paymentMethodButton,
                            selectedMethod === 'UPI' && styles.selectedPaymentMethod,
                          ]}
                          onPress={() => handleSelectMethod('UPI')}
                          accessible={true}
                          accessibilityLabel="Pay with UPI"
                          accessibilityHint="Opens UPI payment details"
                        >
                          <FontAwesome5 name="qrcode" size={24} color={BRAND_COLORS.YELLOW} />
                          <Text style={styles.paymentMethodText}>UPI</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.paymentMethodButton,
                            selectedMethod === 'Cash' && styles.selectedPaymentMethod,
                          ]}
                          onPress={() => handleSelectMethod('Cash')}
                          accessible={true}
                          accessibilityLabel="Pay with Cash"
                          accessibilityHint="Confirms cash payment"
                        >
                          <FontAwesome5 name="money-bill" size={24} color={BRAND_COLORS.YELLOW} />
                          <Text style={styles.paymentMethodText}>Cash</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  {paymentStep === 'enter_details' && (
                    <>
                      <Text style={styles.modalSubText}>
                        Plan: {(selectedPlan?.name || 'Membership')} - ₹{Number(selectedPlan?.price ?? 0).toLocaleString('en-IN')}
                      </Text>
                      <View style={styles.supportedCardsContainer}>
                        <Text style={styles.fieldLabel}>Supported Cards:</Text>
                        <View style={styles.cardLogosContainer}>
                          {['visa', 'mastercard', 'amex', 'rupay'].map((type) => (
                            <FontAwesome5
                              key={type}
                              name={cardImages[type]}
                              size={24}
                              color={getCardType(cardNumber) === type ? BRAND_COLORS.YELLOW : 'rgba(255, 255, 255, 0.7)'}
                              style={[
                                styles.cardLogo,
                                getCardType(cardNumber) === type && styles.selectedCardLogo,
                              ]}
                            />
                          ))}
                        </View>
                      </View>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Card Number</Text>
                        <View style={styles.inputContainer}>
                          <TextInput
                            style={[styles.input, errors.cardNumber && styles.inputError]}
                            value={cardNumber}
                            onChangeText={handleCardNumberChange}
                            placeholder="1234 5678 9012 3456"
                            placeholderTextColor="rgba(255, 255, 255, 0.7)"
                            keyboardType="numeric"
                            maxLength={19}
                            accessible={true}
                            accessibilityLabel="Card number input"
                            accessibilityHint="Enter your card number"
                          />
                          {getCardType(cardNumber) && (
                            <FontAwesome5
                              name={cardImages[getCardType(cardNumber)]}
                              size={24}
                              color={BRAND_COLORS.YELLOW}
                              style={styles.cardTypeIcon}
                            />
                          )}
                        </View>
                        {errors.cardNumber && <Text style={styles.errorText}>{errors.cardNumber}</Text>}
                      </View>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Expiry Date</Text>
                        <TextInput
                          style={[styles.input, errors.expiry && styles.inputError]}
                          value={expiry}
                          onChangeText={handleExpiryChange}
                          placeholder="MM/YY"
                          placeholderTextColor="rgba(255, 255, 255, 0.7)"
                          maxLength={5}
                          accessible={true}
                          accessibilityLabel="Expiry input"
                          accessibilityHint="Enter card expiry date as MM/YY"
                        />
                        {errors.expiry && <Text style={styles.errorText}>{errors.expiry}</Text>}
                      </View>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>CVV</Text>
                        <TextInput
                          style={[styles.input, errors.cvv && styles.inputError]}
                          value={cvv}
                          onChangeText={handleCvvChange}
                          placeholder="123"
                          placeholderTextColor="rgba(255, 255, 255, 0.7)"
                          keyboardType="numeric"
                          maxLength={4}
                          secureTextEntry
                          accessible={true}
                          accessibilityLabel="CVV input"
                          accessibilityHint="Enter card CVV code"
                        />
                        {errors.cvv && <Text style={styles.errorText}>{errors.cvv}</Text>}
                      </View>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Cardholder Name</Text>
                        <TextInput
                          style={[styles.input, errors.cardHolder && styles.inputError]}
                          value={cardHolder}
                          onChangeText={setCardHolder}
                          placeholder="Cardholder Name"
                          placeholderTextColor="rgba(255, 255, 255, 0.7)"
                          accessible={true}
                          accessibilityLabel="Cardholder name input"
                          accessibilityHint="Enter the name on the card"
                        />
                      </View>
                      <View style={styles.modalButtonContainer}>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => setPaymentStep('select_method')}
                          accessible={true}
                          accessibilityLabel="Back"
                          accessibilityHint="Returns to payment method selection"
                        >
                          <Text style={styles.cancelButtonText}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, isCounting && styles.disabledButton]}
                          onPress={handleSubmitPayment}
                          accessible={true}
                          accessibilityLabel="Pay Now"
                          accessibilityHint="Initiates payment with entered card details"
                          disabled={isCounting}
                        >
                          <LinearGradient
                            colors={[BRAND_COLORS.YELLOW, BRAND_COLORS.YELLOW]}
                            style={StyleSheet.absoluteFill}
                          />
                          <Text style={styles.actionButtonText}>
                            Pay ₹{selectedPlan?.price.toLocaleString('en-IN')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  {paymentStep === 'enter_upi' && (
                    <>
                      <Text style={styles.modalSubText}>
                        Plan: {(selectedPlan?.name || 'Membership')} - ₹{Number(selectedPlan?.price ?? 0).toLocaleString('en-IN')}
                      </Text>
                      <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>UPI ID</Text>
                        <TextInput
                          style={[styles.input, errors.upiId && styles.inputError]}
                          value={upiId}
                          onChangeText={handleUpiChange}
                          placeholder="username@upi"
                          placeholderTextColor="rgba(255, 255, 255, 0.7)"
                          accessible={true}
                          accessibilityLabel="UPI ID input"
                          accessibilityHint="Enter your UPI ID"
                        />
                        {errors.upiId && <Text style={styles.errorText}>{errors.upiId}</Text>}
                      </View>
                      <View style={styles.supportedCardsContainer}>
                        <Text style={styles.fieldLabel}>Supported UPI Apps:</Text>
                        <View style={styles.upiLogosContainer}>
                          {upiOptions.map((app) => (
                            <FontAwesome5
                              key={app}
                              name={upiImages[app]}
                              size={40}
                              color={BRAND_COLORS.YELLOW}
                              style={styles.upiImage}
                            />
                          ))}
                        </View>
                      </View>
                      <View style={styles.modalButtonContainer}>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => setPaymentStep('select_method')}
                          accessible={true}
                          accessibilityLabel="Back"
                          accessibilityHint="Returns to payment method selection"
                        >
                          <Text style={styles.cancelButtonText}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, isCounting && styles.disabledButton]}
                          onPress={handleSubmitPayment}
                          accessible={true}
                          accessibilityLabel="Pay Now"
                          accessibilityHint="Initiates payment with UPI"
                          disabled={isCounting}
                        >
                          <LinearGradient
                            colors={[BRAND_COLORS.YELLOW, BRAND_COLORS.YELLOW]}
                            style={StyleSheet.absoluteFill}
                          />
                          <Text style={styles.actionButtonText}>
                            Pay ₹{selectedPlan?.price.toLocaleString('en-IN')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  {paymentStep === 'confirm_cash' && (
                    <>
                      <Text style={styles.modalSubText}>
                        Plan: {(selectedPlan?.name || 'Membership')} - ₹{Number(selectedPlan?.price ?? 0).toLocaleString('en-IN')}
                      </Text>
                      <View style={styles.cashPaymentContainer}>
                        <Text style={styles.cashPaymentText}>
                          Please pay ₹{selectedPlan.price.toLocaleString('en-IN')} in cash at the gym counter.
                        </Text>
                      </View>
                      <View style={styles.modalButtonContainer}>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={() => setPaymentStep('select_method')}
                          accessible={true}
                          accessibilityLabel="Back"
                          accessibilityHint="Returns to payment method selection"
                        >
                          <Text style={styles.cancelButtonText}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, isCounting && styles.disabledButton]}
                          onPress={handleSubmitPayment}
                          accessible={true}
                          accessibilityLabel="Confirm Cash Payment"
                          accessibilityHint="Confirms cash payment"
                          disabled={isCounting}
                        >
                          <LinearGradient
                            colors={[BRAND_COLORS.YELLOW, BRAND_COLORS.YELLOW]}
                            style={StyleSheet.absoluteFill}
                          />
                          <Text style={styles.actionButtonText}>Confirm Payment</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* Success Popup Modal */}
          <Modal
            visible={isSuccessPopupVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setIsSuccessPopupVisible(false)}
          >
            <View style={styles.successPopupOverlay}>
              <View style={styles.successPopupContainer}>
                <Text style={styles.successPopupText}>
                  Payment of ₹{Number(selectedPlan?.price ?? 0).toLocaleString('en-IN')} for {(selectedPlan?.name || 'Membership')} confirmed!
                </Text>
                <View style={styles.progressBarContainer}>
                  <Animated.View
                    style={[
                      styles.progressBar,
                      {
                        transform: [
                          {
                            scaleX: progressAnim,
                          },
                        ],
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </Modal>

          {/* Profile Sections */}
          {profileSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title || 'Section'}</Text>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={styles.profileItem}
                  onPress={() => handleItemPress(item)}
                  disabled={item.action === 'toggle'}
                  accessible={true}
                  accessibilityLabel={item.label || 'Item'}
                  accessibilityHint={`Select to ${
                    item.action === 'navigate'
                      ? 'navigate to ' + (item.label || 'screen')
                      : item.action === 'toggle'
                      ? 'toggle ' + (item.label || 'setting')
                      : item.action === 'external'
                      ? 'open external link for ' + (item.label || 'link')
                      : item.label || 'item'
                  }`}
                >
                  <View style={styles.itemLeft}>
                    <View style={styles.itemIconContainer}>
                      <Icon name={item.icon || 'info'} size={20} color={BRAND_COLORS.YELLOW} />
                    </View>
                    <Text style={styles.itemLabel}>{item.label || 'Unknown'}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    {item.action === 'toggle' ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{ false: UI_COLORS.BORDER_LIGHT, true: BRAND_COLORS.YELLOW }}
                        thumbColor={BRAND_COLORS.YELLOW}
                        accessible={true}
                        accessibilityLabel={`${item.label || 'Setting'} switch`}
                        accessibilityHint={`Toggle ${item.label || 'setting'} on or off`}
                      />
                    ) : item.action === 'info' ? (
                      <Text style={styles.itemValue}>{item.value || 'N/A'}</Text>
                    ) : (
                      <Text style={styles.itemArrow}>›</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Logout Button */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              accessible={true}
              accessibilityLabel="Logout"
              accessibilityHint="Logs you out of the GFIT app"
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appName}>GFIT</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
            <Text style={styles.appTagline}>Transform Your Fitness Journey</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_PURPLE,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  userCardGradient: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  userCard: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
    letterSpacing: -0.05,
  },
  userMemberSince: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
  editButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BRAND_COLORS.YELLOW,
    borderRadius: 10,
  },
  editButtonText: {
    color: BRAND_COLORS.YELLOW,
    fontSize: 14,
    fontWeight: '600',
  },
  editButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: LIGHT_PURPLE,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalCloseBtn: {
    padding: 8,
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
    flexGrow: 1,
  },
  editModalAvatarWrapper: {
    alignItems: 'center',
    marginBottom: 24, // Increased spacing
  },
  editModalAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: BRAND_COLORS.YELLOW,
    marginBottom: 8,
  },
  editModalAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
  },
  editModalAvatarText: {
    color: BRAND_COLORS.YELLOW,
    fontSize: 14,
    fontWeight: '600',
  },
  fieldGroup: {
    width: '100%',
    marginBottom: 20, // Increased for better visibility/spacing
  },
  fieldLabel: {
    color: '#FFFFFF', // Brighter for visibility
    marginBottom: 8, // Increased
    fontSize: 14, // Slightly larger
    fontWeight: '600',
  },
  modalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  modalSubText: {
    fontSize: 14,
       color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 20,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalActionButton: {
    backgroundColor: BRAND_COLORS.YELLOW,
    borderRadius: 10,
    paddingVertical: 14,
    marginVertical:  10,
    alignItems: 'flex-start',
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND_COLORS.PURPLE,
  },
  photoOptionsContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  photoOptionsList: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingVertical: 16,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 420,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    width: '100%',
  },
  actionRowIcon: {
    marginRight: 10,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)', // Slightly more opaque for visibility
    borderColor: UI_COLORS.BORDER_LIGHT,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 16, // Increased padding
    paddingHorizontal: 16, // Increased padding
    color: '#FFFFFF', // Explicit white text
    marginBottom: 8,
    fontSize: 16, // Standard size
  },
  visibleInput: {
    borderColor: 'rgba(255, 255, 255, 0.3)', // Subtle white border for contrast
    borderWidth: 1.5, // Thicker border
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
  },
  inputError: {
    borderColor: STATUS_COLORS.ERROR,
  },
  errorText: {
    color: STATUS_COLORS.ERROR,
    fontSize: 12,
    marginTop: 4,
  },
  modalCancelButton: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 10,
    paddingVertical: 14,
    marginVertical: 10,
    alignItems: 'flex-start',
    width: '100%',
    borderWidth: 1,
    borderColor: BRAND_COLORS.YELLOW,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND_COLORS.YELLOW,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24, // Increased top margin
    paddingTop: 16,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 6,
  },
  previewImage: {
    width: 250,
    height: 250,
    borderRadius: 125,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: BRAND_COLORS.YELLOW,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  imageLoading: {
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: BRAND_COLORS.YELLOW,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND_COLORS.PURPLE,
  },
  cancelButton: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND_COLORS.YELLOW,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  profileItem: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 12,
    padding: 20,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  itemLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  itemRight: {
    alignItems: 'center',
  },
  itemValue: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
  itemArrow: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  logoutContainer: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  logoutButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: STATUS_COLORS.SUCCESS,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: STATUS_COLORS.SUCCESS,
    fontSize: 16,
    fontWeight: '600',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: BRAND_COLORS.YELLOW,
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  appVersion: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
    marginBottom: 5,
  },
  appTagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },
  alertModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  photoModalBox: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: LIGHT_PURPLE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  photoModalContainer: {
    minHeight: 320,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: BRAND_COLORS.PURPLE,
  },
  photoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 8,
  },
  planList: {
    marginBottom: 20,
  },
  planItem: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 16,
    color: BRAND_COLORS.YELLOW,
    fontWeight: '700',
    marginBottom: 8,
  },
  planBenefits: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  paymentMethodButton: {
    flex: 1,
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  selectedPaymentMethod: {
    borderColor: BRAND_COLORS.YELLOW,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 8,
  },
  upiList: {
    marginBottom: 20,
  },
  upiOption: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  upiText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  upiImage: {
    marginBottom: 8,
  },
  supportedCardsContainer: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
  },
  cardLogosContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  cardLogo: {
    marginHorizontal: 8,
  },
  selectedCardLogo: {
    transform: [{ scale: 1.1 }],
  },
  cardTypeIcon: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  upiLogosContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  cashPaymentContainer: {
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: UI_COLORS.BORDER_LIGHT,
    alignItems: 'center',
  },
  cashPaymentText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  successPopupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successPopupContainer: {
    backgroundColor: BRAND_COLORS.PURPLE,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BRAND_COLORS.YELLOW,
  },
  successPopupText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '80%',
    height: 8,
    backgroundColor: UI_COLORS.OVERLAY_LIGHT,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    width: '100%',
    height: '100%',
    backgroundColor: BRAND_COLORS.YELLOW,
    borderRadius: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
});