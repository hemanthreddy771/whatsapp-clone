import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { nativeDb as db } from '../config/firebase';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
} from 'react-native-agora';

import { useAuth } from '../context/AuthContext';

const appId = 'd7b226d604b649de85589eb7c5fd0ad1'; // Replace with your Agora App ID

const VideoCallingScreen = ({ navigation, route }) => {
  const { channelId, callType = 'video', callDocId, callerName } = route.params || {};
  const { activeCall, setActiveCall } = useAuth();
  const agoraEngine = useRef();

  const [isJoined, setIsJoined] = useState(activeCall?.isJoined || false);
  const [remoteUid, setRemoteUid] = useState(activeCall?.remoteUid || 0);
  const [isMuted, setIsMuted] = useState(activeCall?.isMuted || false);
  const [isVideoOff, setIsVideoOff] = useState(activeCall?.isVideoOff ?? (callType === 'audio'));
  const [isSpeakerOn, setIsSpeakerOn] = useState(activeCall?.isSpeakerOn ?? (callType === 'video'));

  useEffect(() => {
    // If there's an existing active call and it's this one, we don't re-init
    if (activeCall && activeCall.callDocId === callDocId && activeCall.isJoined) {
      console.log("[VideoCall] Reusing existing engine");
      // Re-assign engine if needed (if it was destroyed, we'd need a new one, but here we try to keep it)
    } else {
      setupVideoSDKEngine();
    }

    let unsubscribe = () => { };
    if (callDocId) {
      unsubscribe = db.collection('calls').doc(callDocId).onSnapshot((doc) => {
        if (doc && doc.exists) {
          const status = doc.data().status;
          if (status === 'rejected') {
            Alert.alert('Call Declined', 'The person you called declined the call.');
            handleEndCall(false);
          } else if (status === 'ended') {
            handleEndCall(false);
          }
        }
      });
    }

    return () => {
      unsubscribe();
      // We DON'T end the call here anymore. The user must press "End" explicitly.
      // If we are just navigating back, we mark the call as minimized.
    };
  }, []);

  // Update global state whenever local state changes
  useEffect(() => {
    if (isJoined) {
      setActiveCall({
        channelId,
        callType,
        callDocId,
        callerName,
        isJoined,
        remoteUid,
        isMuted,
        isVideoOff,
        isSpeakerOn,
        isMinimized: false
      });
    }
  }, [isJoined, remoteUid, isMuted, isVideoOff, isSpeakerOn]);

  const setupVideoSDKEngine = async () => {
    try {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ]);
      }

      agoraEngine.current = createAgoraRtcEngine();
      const engine = agoraEngine.current;

      engine.initialize({ appId });

      if (callType === 'video') {
        engine.enableVideo();
      } else {
        engine.enableAudio();
      }

      engine.registerEventHandler({
        onError: (err, msg) => {
          console.log('[Agora] Error:', err, msg);
        },
        onJoinChannelSuccess: (connection, elapsed) => {
          console.log('[Agora] onJoinChannelSuccess:', connection, elapsed);
          setIsJoined(true);
        },
        onUserJoined: (connection, uid, elapsed) => {
          console.log('[Agora] onUserJoined:', uid);
          setRemoteUid(uid);
        },
        onUserOffline: (connection, uid, reason) => {
          console.log('[Agora] onUserOffline:', uid, reason);
          setRemoteUid(0);
          handleEndCall(false); // In communication mode, if remote leaves, call is effectively over
        },
      });

      engine.joinChannel('', channelId, 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      engine.setEnableSpeakerphone(isSpeakerOn);
    } catch (e) {
      console.error('[Agora SDK Error]', e);
      Alert.alert('Call Error', 'Failed to initialize the calling engine.');
    }
  };

  const handleEndCall = (shouldUpdateDb = true) => {
    if (shouldUpdateDb && callDocId) {
      db.collection('calls').doc(callDocId).update({ status: 'ended' }).catch(() => { });
    }

    agoraEngine.current?.leaveChannel();
    agoraEngine.current?.release();
    setActiveCall(null);
    navigation.navigate('Main'); // Go back to the main screen
  };

  const handleMinimize = () => {
    if (activeCall) {
      setActiveCall({ ...activeCall, isMinimized: true });
    }
    navigation.goBack();
  };

  const toggleMute = () => {
    agoraEngine.current?.muteLocalAudioStream(!isMuted);
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (callType === 'audio') return;
    agoraEngine.current?.muteLocalVideoStream(!isVideoOff);
    setIsVideoOff(!isVideoOff);
  };

  const switchCamera = () => {
    if (callType === 'audio') return;
    agoraEngine.current?.switchCamera();
  };

  const toggleSpeaker = () => {
    const newState = !isSpeakerOn;
    agoraEngine.current?.setEnableSpeakerphone(newState);
    setIsSpeakerOn(newState);
  };

  return (
    <View style={styles.container}>
      {/* Background/Remote Video */}
      {callType === 'video' && isJoined && remoteUid !== 0 ? (
        <RtcSurfaceView
          canvas={{ uid: remoteUid }}
          style={styles.remoteVideo}
        />
      ) : (
        <View style={styles.videoPlaceholder}>
          <TouchableOpacity style={styles.minimizeBtn} onPress={handleMinimize}>
            <Ionicons name="chevron-down" size={30} color="#fff" />
          </TouchableOpacity>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={80} color="#fff" />
          </View>
          <Text style={styles.callerName}>
            {callerName || (callType === 'video' ? 'Video Call' : 'Audio Call')}
          </Text>
          <Text style={styles.callingStatus}>
            {remoteUid !== 0 ? 'Connected' : isJoined ? 'Ringing...' : 'Connecting...'}
          </Text>
        </View>
      )}

      {/* Local Video Preview */}
      {callType === 'video' && isJoined && !isVideoOff && (
        <RtcSurfaceView
          canvas={{ uid: 0 }}
          style={styles.localVideo}
        />
      )}

      {/* Minimize Button for Video */}
      {callType === 'video' && isJoined && (
        <TouchableOpacity style={styles.minimizeBtn} onPress={handleMinimize}>
          <Ionicons name="chevron-down" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Controls Overlay */}
      <View style={styles.controlsContainer}>
        {callType === 'video' && (
          <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
            <Ionicons name="camera-reverse" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        {callType === 'video' && (
          <TouchableOpacity
            style={[styles.controlButton, isVideoOff && styles.activeControl]}
            onPress={toggleVideo}
          >
            <Ionicons name={isVideoOff ? "videocam-off" : "videocam"} size={28} color={isVideoOff ? "#000" : "#fff"} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.activeControl]}
          onPress={toggleMute}
        >
          <Ionicons name={isMuted ? "mic-off" : "mic"} size={28} color={isMuted ? "#000" : "#fff"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isSpeakerOn && styles.activeControl]}
          onPress={toggleSpeaker}
        >
          <Ionicons name={isSpeakerOn ? "volume-high" : "volume-mute"} size={28} color={isSpeakerOn ? "#000" : "#fff"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={() => handleEndCall(true)}
        >
          <Ionicons name="call" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#075E54',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#000',
  },
  localVideo: {
    width: 110,
    height: 160,
    position: 'absolute',
    top: 50,
    right: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#075E54',
  },
  minimizeBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  avatarContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  callerName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  callingStatus: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginTop: 8,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingBottom: 50,
    paddingTop: 30,
    backgroundColor: 'rgba(0,0,0,0.4)',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeControl: {
    backgroundColor: '#fff',
  },
  endCallButton: {
    backgroundColor: '#FF3B30',
    transform: [{ rotate: '135deg' }],
  },
});

export default VideoCallingScreen;
