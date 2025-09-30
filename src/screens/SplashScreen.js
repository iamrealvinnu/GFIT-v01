import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND_COLORS, UI_COLORS } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onAnimationComplete }) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  
  // All animations use native driver to avoid conflicts
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const completionAnim = useRef(new Animated.Value(0)).current;
  const wordAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Words to cycle through
  const words = ['Preparing', 'Loading', 'Ready'];

  useEffect(() => {
    // Phase 1: Logo entrance with elegant effects
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    // Phase 2: Text reveal
    setTimeout(() => {
      Animated.timing(textAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    }, 800);

    // Phase 2.5: Start pulsing glow animation
    setTimeout(() => {
      startGlowAnimation();
    }, 1200);

    // Phase 3: Progress animation
    setTimeout(() => {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    }, 2000);

    // Phase 4: Word cycling
    setTimeout(() => {
      startWordCycling();
    }, 4500);

    // Complete and navigate after word cycling
    setTimeout(() => {
      onAnimationComplete();
    }, 9000);
  }, []);

  const startGlowAnimation = () => {
    const pulseGlow = () => {
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: false,
          easing: Easing.in(Easing.cubic),
        }),
      ]).start(() => pulseGlow());
    };
    pulseGlow();
  };

  const startWordCycling = () => {
    const cycleWords = () => {
      if (currentWordIndex < words.length - 1) {
        // Fade out current word
        Animated.timing(wordAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }).start(() => {
          // Change word and fade in
          setCurrentWordIndex(prev => prev + 1);
          Animated.timing(wordAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }).start();
        });
      }
    };

    // Cycle through words with delays
    setTimeout(() => cycleWords(), 1000);  // First word change
    setTimeout(() => cycleWords(), 2000);  // Second word change
  };

  const logoStyle = {
    opacity: fadeAnim,
    transform: [
      { scale: scaleAnim },
      { translateY: slideAnim },
    ],
  };

  const animatedGlowStyle = {
    shadowOpacity: glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1.0],
    }),
    shadowRadius: glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [15, 30],
    }),
  };

  const textStyle = {
    opacity: textAnim,
    transform: [{
      translateY: textAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0],
      }),
    }],
  };

  const progressStyle = {
    opacity: progressAnim,
  };

  const completionStyle = {
    opacity: completionAnim,
    transform: [{
      translateY: completionAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [10, 0],
      }),
    }],
  };

  const wordStyle = {
    opacity: wordAnim,
    transform: [{
      translateY: wordAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [5, 0],
      }),
    }],
  };

  return (
    <View style={styles.container}>

      {/* Main Content with Proper Spacing */}
      <View style={styles.content}>
        {/* Logo Container */}
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <Animated.Image
            source={require('../../assets/Ben\'s Stamina Factory_Logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Text Content with Elegant Typography */}
        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text style={styles.mainTitle}>BEN'S STAMINA FACTORY</Text>
          <Text style={styles.subTitle}>Premium Fitness Experience</Text>
        </Animated.View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>
          <Text style={styles.progressText}>Initializing...</Text>
        </View>

        {/* Dynamic Word Display */}
        <Animated.View style={[styles.completionContainer, wordStyle]}>
          <Text style={styles.completionText}>{words[currentWordIndex]}</Text>
        </Animated.View>
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoImage: {
    width: 180,
    height: 180,
    opacity: 1.0,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: '#391B58',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 3,
    fontFamily: 'System',
  },
  subTitle: {
    fontSize: 16,
    color: '#391B58',
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 1,
    opacity: 0.8,
  },
  progressContainer: {
    width: '60%',
    marginBottom: 60,
  },
  progressBar: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: BRAND_COLORS.YELLOW,
    borderRadius: 1,
    width: '100%',
  },
  progressText: {
    color: '#391B58',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.6,
    letterSpacing: 1,
    fontWeight: '300',
  },
  completionContainer: {
    alignItems: 'center',
  },
  completionText: {
    fontSize: 14,
    color: '#391B58',
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 2,
    opacity: 0.9,
  },
});
