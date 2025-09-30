import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Animated,
  Linking,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { BRAND_COLORS } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

export default function GymPlansScreen({ navigation, route }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const gymPlans = [
    {
      id: 1,
      name: "STARTER",
      price: "₹2,999",
      duration: "3 Months",
      originalPrice: "₹3,999",
      discount: "25% OFF",
      features: [
        "3 sessions per week",
        "Basic equipment access",
        "Group training sessions",
        "Progress tracking",
        "Locker facility"
      ],
      popular: false,
      color: ['#667eea', '#764ba2'],
      icon: "fitness-center",
      iconLibrary: "MaterialIcons", // Specify icon library
    },
    {
      id: 2,
      name: "PREMIUM",
      price: "₹4,999",
      duration: "6 Months",
      originalPrice: "₹6,999",
      discount: "28% OFF",
      features: [
        "5 sessions per week",
        "Full equipment access",
        "Personal training sessions",
        "Nutrition guidance",
        "Progress tracking",
        "Recovery sessions",
        "Sauna access"
      ],
      popular: true,
      color: [BRAND_COLORS.PURPLE, BRAND_COLORS.YELLOW],
      icon: "star",
      iconLibrary: "MaterialIcons", // Specify icon library
    },
    {
      id: 3,
      name: "ELITE",
      price: "₹7,999",
      duration: "12 Months",
      originalPrice: "₹9,999",
      discount: "20% OFF",
      features: [
        "Unlimited sessions",
        "Premium equipment access",
        "1-on-1 personal training",
        "Custom nutrition plan",
        "Advanced progress tracking",
        "Recovery & massage therapy",
        "Priority booking",
        "VIP lounge access"
      ],
      popular: false,
      color: ['#ff6b6b', '#feca57'],
      icon: "crown",
      iconLibrary: "FontAwesome5", // Use FontAwesome5 for crown
    }
  ];

  const gymLocation = {
    name: "Ben's Stamina Factory",
    address: "123 Fitness Street, Health District",
    city: "Mumbai, Maharashtra 400001",
    phone: "+91 98765 43210",
    hours: "6:00 AM - 10:00 PM (Mon-Sun)",
    coordinates: {
      latitude: 19.0760,
      longitude: 72.8777
    }
  };

  const instructors = [
    {
      name: "Ben",
      role: "Head Trainer & Founder",
      specialization: "Strength & Conditioning, Rehabilitation",
      experience: "8+ years",
      description: "Expert in sports injury recovery and functional training",
      achievements: ["Certified Physiotherapist", "Sports Medicine Specialist", "500+ Success Stories"],
      icon: "user-tie",
    },
    {
      name: "David",
      role: "Senior Trainer",
      specialization: "Pain Management, Postural Correction",
      experience: "6+ years",
      description: "Specialized in chronic pain relief and mobility training",
      achievements: ["Pain Management Expert", "Postural Analysis Specialist", "300+ Transformations"],
      icon: "user-md",
    }
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const openMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${gymLocation.coordinates.latitude},${gymLocation.coordinates.longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open maps');
    });
  };

  const callGym = () => {
    Linking.openURL(`tel:${gymLocation.phone}`).catch(() => {
      Alert.alert('Error', 'Unable to make call');
    });
  };

  const handlePlanSelection = (plan) => {
    navigation.navigate('PhoneNumberScreen', { plan: plan.name });
  };

  const handleGoToPayments = () => {
    navigation.navigate('Profile', { openPaymentModal: true });
  };

  const renderPlanCard = (plan, index) => {
    const cardFade = useRef(new Animated.Value(0)).current;
    const cardSlide = useRef(new Animated.Value(50)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 600,
          delay: index * 200,
          useNativeDriver: true,
        }),
        Animated.timing(cardSlide, {
          toValue: 0,
          duration: 600,
          delay: index * 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    return (
      <Animated.View
        key={plan.id}
        style={[
          styles.planCard,
          plan.popular && styles.popularPlan,
          {
            opacity: cardFade,
            transform: [{ translateY: cardSlide }],
          }
        ]}
      >
        {plan.popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
        )}
        
        <View style={styles.planContent}>
          <View style={styles.planHeader}>
            {plan.iconLibrary === 'FontAwesome5' ? (
              <FontAwesome5 name={plan.icon} size={40} color="#391B58" />
            ) : (
              <MaterialIcons name={plan.icon} size={40} color="#391B58" />
            )}
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.originalPrice}>{plan.originalPrice}</Text>
              <Text style={styles.planPrice}>{plan.price}</Text>
              <Text style={styles.discountBadge}>{plan.discount}</Text>
            </View>
            <Text style={styles.planDuration}>{plan.duration}</Text>
          </View>
          
          <View style={styles.planFeatures}>
            {plan.features.map((feature, idx) => (
              <View key={idx} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={BRAND_COLORS.YELLOW} style={styles.featureIcon} />
                <Text style={styles.planFeature}>{feature}</Text>
              </View>
            ))}
          </View>
          
          <TouchableOpacity
            style={styles.selectPlanButton}
            onPress={() => handlePlanSelection(plan)}
          >
            <LinearGradient
              colors={plan.color}
              style={styles.buttonGradient}
            >
              <Text style={styles.selectPlanButtonText}>Select Plan</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#391B58" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.heroTitle}>Transform Your Fitness Journey</Text>
          <Text style={styles.heroSubtitle}>Premium training with expert guidance</Text>
        </Animated.View>

        {/* Redirect to Payments (plans moved there) */}
        <View style={styles.plansSection}>
          <View style={styles.redirectCard}>
            <Text style={styles.redirectTitle}>Plans moved to Payments</Text>
            <Text style={styles.redirectText}>
              You can view and select all membership plans directly from the Payments section.
            </Text>
            <TouchableOpacity style={styles.redirectBtn} onPress={handleGoToPayments}>
              <LinearGradient colors={[BRAND_COLORS.PURPLE, BRAND_COLORS.YELLOW]} style={styles.buttonGradient}>
                <Text style={styles.selectPlanButtonText}>Go to Payments</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Location Section */}
        <Animated.View
          style={[
            styles.locationSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Our Location</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <MaterialIcons name="location-on" size={30} color="#391B58" style={styles.locationIcon} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{gymLocation.name}</Text>
                <Text style={styles.locationAddress}>{gymLocation.address}</Text>
                <Text style={styles.locationCity}>{gymLocation.city}</Text>
              </View>
            </View>
            
            <View style={styles.locationDetails}>
              <TouchableOpacity style={styles.locationAction} onPress={openMaps}>
                <Ionicons name="map" size={16} color="#391B58" style={styles.locationActionIcon} />
                <Text style={styles.locationActionText}>View on Maps</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.locationAction} onPress={callGym}>
                <Ionicons name="call" size={16} color="#391B58" style={styles.locationActionIcon} />
                <Text style={styles.locationActionText}>Call Now</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.hoursContainer}>
              <Ionicons name="time" size={16} color="#391B58" style={styles.hoursIcon} />
              <Text style={styles.hoursText}>{gymLocation.hours}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Trainers Section */}
        <Animated.View
          style={[
            styles.trainersSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Our Expert Trainers</Text>
          {instructors.map((instructor, index) => (
            <View key={index} style={styles.trainerCard}>
              <View style={styles.trainerContent}>
                <View style={styles.trainerHeader}>
                  <FontAwesome5 name={instructor.icon} size={40} color="#391B58" style={styles.trainerImage} />
                  <View style={styles.trainerInfo}>
                    <Text style={styles.trainerName}>{instructor.name}</Text>
                    <Text style={styles.trainerRole}>{instructor.role}</Text>
                    <Text style={styles.trainerExperience}>Experience: {instructor.experience}</Text>
                  </View>
                </View>
                
                <View style={styles.trainerDetails}>
                  <Text style={styles.trainerSpecialization}>
                    Specialization: {instructor.specialization}
                  </Text>
                  <Text style={styles.trainerDescription}>{instructor.description}</Text>
                  
                  <View style={styles.achievementsContainer}>
                    {instructor.achievements.map((achievement, idx) => (
                      <View key={idx} style={styles.achievementBadge}>
                        <Text style={styles.achievementText}>{achievement}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Ready to start your transformation?</Text>
          <Text style={styles.footerSubtext}>Join 1000+ satisfied members</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Solid white to match SplashScreen
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#ffffff', // Ensure header is white
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(57, 27, 88, 0.1)', // Subtle #391B58-based background
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#391B58', // Matches SplashScreen
    letterSpacing: 0.5,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#391B58', // Matches SplashScreen
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1.2,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#391B58', // Matches SplashScreen
    textAlign: 'center',
    opacity: 0.8,
    fontWeight: '400',
  },
  plansSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#391B58', // Matches SplashScreen
    marginBottom: 20,
    letterSpacing: 0.8,
  },
  planCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ffffff', // White card background
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  popularPlan: {
    borderWidth: 2,
    borderColor: BRAND_COLORS.YELLOW,
  },
  popularBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: BRAND_COLORS.YELLOW,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    zIndex: 10,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#391B58', // Matches SplashScreen
    letterSpacing: 0.5,
  },
  planContent: {
    padding: 25,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#391B58', // Matches SplashScreen
    marginBottom: 15,
    letterSpacing: 1,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  originalPrice: {
    fontSize: 16,
    color: 'rgba(57, 27, 88, 0.6)', // Subtle #391B58-based color
    textDecorationLine: 'line-through',
    marginBottom: 5,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: '800',
    color: '#391B58', // Matches SplashScreen
    marginBottom: 5,
  },
  discountBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: BRAND_COLORS.PURPLE,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  planDuration: {
    fontSize: 14,
    color: 'rgba(57, 27, 88, 0.8)', // Subtle #391B58-based color
    fontWeight: '500',
  },
  planFeatures: {
    marginBottom: 25,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIcon: {
    marginRight: 12,
  },
  planFeature: {
    fontSize: 14,
    color: '#391B58', // Matches SplashScreen
    flex: 1,
    fontWeight: '400',
  },
  selectPlanButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  selectPlanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  locationSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  locationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  locationIcon: {
    marginRight: 15,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#391B58', // Matches SplashScreen
    marginBottom: 5,
  },
  locationAddress: {
    fontSize: 14,
    color: 'rgba(57, 27, 88, 0.7)', // Subtle #391B58-based color
    marginBottom: 2,
  },
  locationCity: {
    fontSize: 14,
    color: 'rgba(57, 27, 88, 0.7)', // Subtle #391B58-based color
  },
  locationDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  locationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(57, 27, 88, 0.1)', // Subtle #391B58-based background
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  locationActionIcon: {
    marginRight: 8,
  },
  locationActionText: {
    fontSize: 14,
    color: '#391B58', // Matches SplashScreen
    fontWeight: '500',
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(57, 27, 88, 0.05)', // Subtle #391B58-based background
    paddingVertical: 10,
    borderRadius: 10,
  },
  hoursIcon: {
    marginRight: 8,
  },
  hoursText: {
    fontSize: 14,
    color: '#391B58', // Matches SplashScreen
    fontWeight: '500',
  },
  trainersSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  trainerCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  trainerContent: {
    padding: 20,
  },
  trainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  trainerImage: {
    marginRight: 15,
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#391B58', // Matches SplashScreen
    marginBottom: 5,
  },
  trainerRole: {
    fontSize: 14,
    color: BRAND_COLORS.YELLOW,
    marginBottom: 3,
    fontWeight: '500',
  },
  trainerExperience: {
    fontSize: 12,
    color: 'rgba(57, 27, 88, 0.7)', // Subtle #391B58-based color
  },
  trainerDetails: {
    marginTop: 10,
  },
  trainerSpecialization: {
    fontSize: 14,
    color: '#391B58', // Matches SplashScreen
    marginBottom: 8,
    fontWeight: '500',
  },
  trainerDescription: {
    fontSize: 13,
    color: 'rgba(57, 27, 88, 0.7)', // Subtle #391B58-based color
    marginBottom: 15,
    lineHeight: 20,
  },
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  achievementBadge: {
    backgroundColor: 'rgba(57, 27, 88, 0.1)', // Subtle #391B58-based background
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  achievementText: {
    fontSize: 11,
    color: '#391B58', // Matches SplashScreen
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#391B58', // Matches SplashScreen
    textAlign: 'center',
    marginBottom: 5,
  },
  footerSubtext: {
    fontSize: 14,
    color: 'rgba(57, 27, 88, 0.8)', // Subtle #391B58-based color
    textAlign: 'center',
  },
  redirectCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  redirectTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#391B58',
    marginBottom: 8,
  },
  redirectText: {
    fontSize: 14,
    color: 'rgba(57, 27, 88, 0.8)',
    marginBottom: 16,
  },
  redirectBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    minWidth: 160,
  },
});