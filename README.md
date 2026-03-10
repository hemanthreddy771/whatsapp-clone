# WhatsApp Clone Mobile App 👋

This is a full-featured WhatsApp clone built with React Native and Expo. It supports real-time messaging, audio/video calls, and push notifications.

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Firebase
Ensure your Firebase configuration is set in `src/config/firebase.js`. You will need:
- Authentication (Phone)
- Firestore Database
- Cloud Messaging (for Push Notifications)

### 3. Run the App

#### Option A: Quick Test (Expo Go)
*Note: Video/Audio calls will NOT work in standard Expo Go because they use native modules.*
```bash
npx expo start
```
Scan the QR code with the Expo Go app on your phone.

#### Option B: Full Features (Development Build)
*Required for Video/Audio calls and Push Notifications.*
1. Build the development client:
```bash
npx eas build --profile development --platform android
```
2. Download and install the resulting APK on your phone.
3. Start the dev server:
```bash
npx expo start --dev-client
```

## 📱 Features
- **Real-time Chat**: Firestore-backed messaging with typing indicators.
- **Voice/Video Calls**: Powered by Agora SDK.
- **Push Notifications**: Receive alerts for messages and calls.
- **Secure Access**: Lock screen with PIN/Biometrics support.

## 🛠 Tech Stack
- **Frontend**: React Native, Expo
- **Backend**: Firebase (Auth, Firestore)
- **Real-time Communication**: Agora SDK
- **Notifications**: Expo Notifications

