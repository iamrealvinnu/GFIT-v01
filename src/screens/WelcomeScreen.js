import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND_COLORS, UI_COLORS } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const testimonialAnim = useRef(new Animated.Value(1)).current;

  const slides = [
    {
      title: "Mindful Exercising",
      subtitle: "for Sustainable Fitness",
      description: "Expert physiotherapy meets personalized training",
      color: [BRAND_COLORS.YELLOW_TRANSPARENT, 'rgba(207, 219, 39, 0.2)', 'rgba(207, 219, 39, 0.25)']
    },
    {
      title: "The BSF Edge",
      subtitle: "Science-Backed Training",
      description: "Preventive approach that builds lasting resilience",
      color: [BRAND_COLORS.YELLOW_TRANSPARENT, 'rgba(207, 219, 39, 0.2)', 'rgba(207, 219, 39, 0.25)']
    },
    {
      title: "Life-Changing",
      subtitle: "Experiences",
      description: "Transform your fitness journey into a sustainable lifestyle",
      color: [BRAND_COLORS.YELLOW_TRANSPARENT, 'rgba(207, 219, 39, 0.2)', 'rgba(207, 219, 39, 0.25)']
    }
  ];

  const testimonials = [
    {
      name: "Ritu",
      challenge: "Rehabilitation Training",
      story: "How Ritu reclaimed her strength through Rehabilitation Training"
    },
    {
      name: "Pankhuri",
      challenge: "Pre & Post Natal Strength Training",
      story: "How Pankhuri reduced Pre and Post Natal worries with Strength Training"
    },
    {
      name: "Neel",
      challenge: "Sports Injury Management",
      story: "How Neel knocked out his injury bout with Sports Injury Management"
    },
    {
      name: "Balaji",
      challenge: "Post-surgery Repair & Rejuvenation",
      story: "How Balaji bounced back post-surgery with Repair & Rejuvenation"
    },
    {
      name: "Anuj",
      challenge: "Pain Management & Mobility Training",
      story: "How Anuj went from chronic pain to mountaineering with Pain Management"
    },
    {
      name: "Vijay",
      challenge: "Geriatric Functional Efficiency",
      story: "How Vijay embraced good posture and age-appropriate stamina"
    },
    {
      name: "Asha",
      challenge: "Geriatric Functional Efficiency",
      story: "How Asha turned ageing into an Adventure with Geriatric Training"
    },
    {
      name: "Sunanda",
      challenge: "Mental & Physical Agility Training",
      story: "How Sunanda welcomed fitness after 40 with Mental & Physical Agility"
    },
    {
      name: "Radha",
      challenge: "Postural Correction",
      story: "How Radha powered posture, stability, and muscle mobility"
    },
    {
      name: "Rohini",
      challenge: "Strength & Conditioning",
      story: "How Rohini fired up her stamina and mental agility"
    },
    {
      name: "Hari",
      challenge: "Pre & Post Surgical Rehabilitation",
      story: "How Hari was back on his feet within two weeks of joint surgery"
    },
    {
      name: "Lakshmi",
      challenge: "Strength & Conditioning",
      story: "How Lakshmi booted out stress and welcomed stamina"
    }
  ];



  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Testimonial rotation effect
  useEffect(() => {
    const testimonialInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(testimonialAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(testimonialAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
      });
    }, 3000); // 3 seconds as requested

    return () => clearInterval(testimonialInterval);
  }, []);

  const openVideoModal = () => {
    setShowVideoModal(true);
  };

  const closeVideoModal = () => {
    setShowVideoModal(false);
  };



  return (
    <View style={styles.container}>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/Ben\'s Stamina Factory_Logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>BEN'S STAMINA FACTORY</Text>
        </View>

        {/* Dynamic Slides */}
        <View style={styles.slidesContainer}>
          <Animated.View style={[styles.slide, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={slides[currentSlide].color}
              style={styles.slideGradient}
            >
              <Text style={styles.slideTitle}>{slides[currentSlide].title}</Text>
              <Text style={styles.slideSubtitle}>{slides[currentSlide].subtitle}</Text>
              <Text style={styles.slideDescription}>{slides[currentSlide].description}</Text>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureNumber}>01</Text>
            </View>
            <Text style={styles.featureTitle}>Rehabilitation Training</Text>
            <Text style={styles.featureDesc}>Expert physiotherapy for recovery</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureNumber}>02</Text>
            </View>
            <Text style={styles.featureTitle}>Strength & Conditioning</Text>
            <Text style={styles.featureDesc}>Build lasting resilience</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureNumber}>03</Text>
            </View>
            <Text style={styles.featureTitle}>Pain Management</Text>
            <Text style={styles.featureDesc}>From chronic pain to peak performance</Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Text style={styles.featureNumber}>04</Text>
            </View>
            <Text style={styles.featureTitle}>Postural Correction</Text>
            <Text style={styles.featureDesc}>Improve stability and mobility</Text>
          </View>
        </View>

        {/* Testimonial Preview */}
        <View style={styles.testimonialSection}>
          <Text style={styles.testimonialTitle}>Life-Changing Experiences</Text>
          <View style={styles.testimonialCard}>
            <Animated.View style={[styles.testimonialContent, { opacity: testimonialAnim }]}>
              <Text style={styles.testimonialName}>{testimonials[currentTestimonial].name}</Text>
              <Text style={styles.testimonialChallenge}>{testimonials[currentTestimonial].challenge}</Text>
              <Text style={styles.testimonialText}>
                "{testimonials[currentTestimonial].story}"
              </Text>
            </Animated.View>
          
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('KnowMoreVideo')}
          >
            <Text style={styles.primaryButtonText}>Know More</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('PhoneNumber', { isLogin: true })}
          >
            <Text style={styles.secondaryButtonText}>I'm Already a Member</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Transform • Endure • Conquer</Text>
          <Text style={styles.footerSubtext}>Premium Fitness Experience</Text>
        </View>
      </ScrollView>

      {/* Video Modal */}
      {showVideoModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.videoModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Watch Their Story</Text>
              <TouchableOpacity onPress={closeVideoModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoPlaceholderText}>🎬</Text>
              <Text style={styles.videoPlaceholderTitle}>Video Coming Soon!</Text>
              <Text style={styles.videoPlaceholderDesc}>
                {testimonials[currentTestimonial].name}'s transformation video will be added here
              </Text>
            </View>
            <View style={styles.modalFooter}>
              <Text style={styles.modalFooterText}>
                {testimonials[currentTestimonial].name} - {testimonials[currentTestimonial].challenge}
              </Text>
            </View>
          </View>
        </View>
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '300',
    color: '#391B58',
    letterSpacing: 3,
    textAlign: 'center',
  },
  slidesContainer: {
    height: 200,
    marginBottom: 40,
  },
  slide: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  slideGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#391B58',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 2,
  },
  slideSubtitle: {
    fontSize: 20,
    fontWeight: '400',
    color: '#391B58',
    textAlign: 'center',
    marginBottom: 15,
    opacity: 0.9,
  },
  slideDescription: {
    fontSize: 14,
    color: '#391B58',
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  featureCard: {
    width: '48%',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    marginHorizontal: '1%',
    alignItems: 'center',
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: BRAND_COLORS.YELLOW_TRANSPARENT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureNumber: {
    fontSize: 18,
    fontWeight: '400',
    color: '#391B58',
    letterSpacing: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#391B58',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  featureDesc: {
    fontSize: 12,
    color: '#391B58',
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 16,
  },
  testimonialSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  testimonialTitle: {
    fontSize: 20,
    fontWeight: '300',
    color: '#391B58',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 2,
  },
  testimonialCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 25,
    alignItems: 'center',
  },
  testimonialContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  testimonialName: {
    fontSize: 18,
    fontWeight: '600',
    color: BRAND_COLORS.YELLOW,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  testimonialChallenge: {
    fontSize: 14,
    fontWeight: '400',
    color: '#391B58',
    textAlign: 'center',
    marginBottom: 15,
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  testimonialText: {
    fontSize: 16,
    color: '#391B58',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  knowMoreButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  knowMoreText: {
    color: '#391B58',
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 1,
  },
  actions: {
    paddingHorizontal: 20,
    marginBottom: 40,
    // ensure some spacing from above sections
    marginTop: 10,
  },
  primaryButton: {
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: BRAND_COLORS.YELLOW, // make it visible
    paddingVertical: 16,
    alignItems: 'center',
    // add slight elevation/shadow for visibility
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  primaryButtonText: {
    color: '#111', // dark text on yellow
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  secondaryButtonText: {
    color: '#391B58',
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 1,
    opacity: 0.8,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    color: '#391B58',
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: 2,
    marginBottom: 5,
  },
  footerSubtext: {
    color: '#391B58',
    fontSize: 10,
    fontWeight: '300',
    letterSpacing: 1,
    opacity: 0.6,
  },
  // Video Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  videoModal: {
    backgroundColor: 'rgba(57, 27, 88, 0.95)',
    borderRadius: 20,
    padding: 25,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: BRAND_COLORS.YELLOW_TRANSPARENT,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#391B58',
    letterSpacing: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#391B58',
    fontWeight: '300',
  },
  videoPlaceholder: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: BRAND_COLORS.YELLOW_TRANSPARENT,
    borderRadius: 15,
    marginBottom: 20,
  },
  videoPlaceholderText: {
    fontSize: 48,
    marginBottom: 15,
  },
  videoPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#391B58',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 1,
  },
  videoPlaceholderDesc: {
    fontSize: 14,
    color: '#391B58',
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  modalFooter: {
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.YELLOW_TRANSPARENT,
  },
  modalFooterText: {
    fontSize: 14,
    color: BRAND_COLORS.YELLOW,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

});
