import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      welcome_title: "Find Your Perfect Housemate",
      welcome_sub: "Debale connects room seekers with room providers across Ethiopia",
      get_started: "Get Started",
      i_have_account: "I already have an account",
      onboard_1_title: "Browse Verified Rooms",
      onboard_1_sub: "See real, verified listings across Addis Ababa and beyond",
      onboard_2_title: "AI-Powered Matching",
      onboard_2_sub: "Smart compatibility scoring helps you find the right fit",
      onboard_3_title: "Safe & Local Payments",
      onboard_3_sub: "Pay with Telebirr, CBE Birr or Dashen Bank — fully Ethiopian",
      next: "Next",
      skip: "Skip",
      login_title: "Welcome Back",
      login_sub: "Sign in to your Debale account",
      email: "Email Address",
      password: "Password",
      forgot_password: "Forgot password?",
      sign_in: "Sign In",
      no_account: "Don't have an account?",
      sign_up: "Sign Up",
      register_title: "Join Debale",
      register_sub: "Create your account to get started",
      full_name: "Full Name",
      phone: "Phone Number",
      confirm_password: "Confirm Password",
      i_am: "I am a...",
      room_seeker: "Room Seeker",
      room_provider: "Room Provider",
      seeker_desc: "Looking for a room",
      provider_desc: "Have a room to offer",
      create_account: "Create Account",
      have_account: "Already have an account?",
      home: "Home",
      browse: "Browse",
      dashboard: "Dashboard",
      messages: "Messages",
      settings: "Settings",
    }
  },
  am: {
    translation: {
      welcome_title: "ፍጹም ቤት ጓደኛ ይፈልጉ",
      welcome_sub: "ደባሌ ክፍል ፈላጊዎችን ከክፍል ባለቤቶች ጋር ያገናኛል",
      get_started: "ጀምር",
      i_have_account: "መለያ አለኝ",
      login_title: "እንኳን ደህና መጡ",
      email: "ኢሜይል",
      password: "የይለፍ ቃል",
      sign_in: "ግባ",
      full_name: "ሙሉ ስም",
      phone: "ስልክ ቁጥር",
      create_account: "መለያ ፍጠር",
      home: "መነሻ",
      browse: "ያስሱ",
      dashboard: "ዳሽቦርድ",
      messages: "መልዕክቶች",
      settings: "ቅንብሮች",
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v3',
});

export default i18n;
