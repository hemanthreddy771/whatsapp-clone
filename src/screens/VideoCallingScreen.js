import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform, Alert, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  RtcTextureView,
} from 'react-native-agora';
import { nativeDb as db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

const appId = 'd7b226d604b649de85589eb7c5fd0ad1';

const VideoCallingScreen = ({ navigation, route }) => {
  const { channelId, callType = 'video', callDocId, callerName } = route.params || {};
  const { activeCall, setActiveCall, engineRef } = useAuth();

  const [isJoined, setIsJoined] = useState(activeCall?.isJoined || false);
  const [remoteUid, setRemoteUid] = useState(activeCall?.remoteUid || 0);
  const [isMuted, setIsMuted] = useState(activeCall?.isMuted || false);
  const [isVideoOff, setIsVideoOff] = useState(activeCall?.isVideoOff ?? (callType === 'audio'));
  const [isSpeakerOn, setIsSpeakerOn] = useState(activeCall?.isSpeakerOn ?? (callType === 'video'));
  const [isSwapped, setIsSwapped] = useState(false);
  const [isMinimizing, setIsMinimizing] = useState(false);

  useEffect(() => {
    // Persistent engine setup
    if (!engineRef.current) {
      setupVideoSDKEngine();
    } else {
      console.log("[VideoCall] Reusing global engine");
      registerEngineEvents();
    }

    // Sync initial state to global context immediately on mount
    // This prevents "null spread" crashes if minimizing before joining
    setActiveCall({
      channelId,
      callType,
      callDocId,
      callerName,
      isJoined: isJoined,
      remoteUid: remoteUid,
      isMuted: isMuted,
      isVideoOff: isVideoOff,
      isSpeakerOn: isSpeakerOn,
      isMinimized: false
    });

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
    };
  }, []);

  // Dedicated stable BackHandler listener for PiP handover
  useEffect(() => {
    const backAction = () => {
      if (channelId && !isMinimizing) {
        handleMinimize();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [channelId, isMinimizing]);

  useEffect(() => {
    // Sync state to global context as soon as we join/get updates
    // But ONLY if we are the active screen (not minimized)
    if (isJoined && !activeCall?.isMinimized && !isMinimizing) {
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
  }, [isJoined, remoteUid, isMuted, isVideoOff, isSpeakerOn, isMinimizing]);

  const registerEngineEvents = () => {
    const engine = engineRef.current;
    if (!engine) return;

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
        handleEndCall(false);
      },
    });
  };

  const setupVideoSDKEngine = async () => {
    try {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ]);
      }

      engineRef.current = createAgoraRtcEngine();
      const engine = engineRef.current;

      engine.initialize({ appId });
      registerEngineEvents();

      if (callType === 'video') {
        engine.enableVideo();
      } else {
        engine.enableAudio();
      }

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

    engineRef.current?.leaveChannel();
    engineRef.current?.release();
    engineRef.current = null;
    setActiveCall(null);
    navigation.navigate('Main');
  };

  const handleMinimize = () => {
    // 1. WhatsApp Style: Hide views locally first
    setIsMinimizing(true);

    // 2. NAVIGATE FIRST. This unmounts the current screen's video views.
    navigation.navigate('Main');

    // 3. WAIT until the main screen starts unmounting before activating the overlay
    // This is the CRITICAL fix for the crash: Overlay must not exist while main view is active.
    setTimeout(() => {
      setActiveCall(prev => {
        if (!prev) return null;
        return {
          ...prev,
          isMinimized: true
        };
      });
    }, 400); // 400ms is enough for the screen transition to begin
  };

  const toggleMute = () => {
    engineRef.current?.muteLocalAudioStream(!isMuted);
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (callType === 'audio') return;
    engineRef.current?.muteLocalVideoStream(!isVideoOff);
    setIsVideoOff(!isVideoOff);
  };

  const switchCamera = () => {
    if (callType === 'audio') return;
    engineRef.current?.switchCamera();
  };

  const toggleSpeaker = () => {
    const newState = !isSpeakerOn;
    engineRef.current?.setEnableSpeakerphone(newState);
    setIsSpeakerOn(newState);
  };

  const swapVideos = () => setIsSwapped(!isSwapped);

  return (
    <View style={styles.container}>
      {/* Main Video Area */}
      {callType === 'video' && isJoined && !activeCall?.isMinimized && !isMinimizing ? (
        isSwapped ? (
          !isVideoOff ? (
            <RtcSurfaceView canvas={{ uid: 0 }} style={styles.remoteVideo} />
          ) : (
            <View style={styles.videoPlaceholder}>
              <Ionicons name="videocam-off" size={60} color="#fff" />
            </View>
          )
        ) : (
          remoteUid !== 0 ? (
            <RtcSurfaceView canvas={{ uid: remoteUid }} style={styles.remoteVideo} />
          ) : (
            <View style={styles.videoPlaceholder}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={80} color="#fff" />
              </View>
              <Text style={styles.callerName}>
                {callerName || 'Video Call'}
              </Text>
              <Text style={styles.callingStatus}>
                Ringing...
              </Text>
            </View>
          )
        )
      ) : !activeCall?.isMinimized && !isMinimizing ? (
        <View style={styles.videoPlaceholder}>
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
      ) : <View style={{ flex: 1, backgroundColor: '#000' }} />}

      {/* Picture-in-Picture Video (Self Preview) */}
      {callType === 'video' && isJoined && !activeCall?.isMinimized && !isMinimizing && (
        <TouchableOpacity
          style={styles.localVideo}
          activeOpacity={0.8}
          onPress={swapVideos}
        >
          {isSwapped ? (
            remoteUid !== 0 ? (
              <RtcSurfaceView canvas={{ uid: remoteUid }} style={styles.miniVideoInner} />
            ) : (
              <View style={styles.miniPlaceholderInner}><Ionicons name="person" size={30} color="#fff" /></View>
            )
          ) : (
            !isVideoOff ? (
              <RtcSurfaceView canvas={{ uid: 0 }} style={styles.miniVideoInner} zOrderMediaOverlay={true} />
            ) : (
              <View style={styles.miniPlaceholderInner}><Ionicons name="videocam-off" size={20} color="#fff" /></View>
            )
          )}
        </TouchableOpacity>
      )}

      {/* Header Controls (Minimize) */}
      {!activeCall?.isMinimized && !isMinimizing && (
        <TouchableOpacity style={styles.minimizeBtn} onPress={handleMinimize}>
          <Ionicons name="chevron-down" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Bottom Controls */}
      {!activeCall?.isMinimized && (
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
      )}
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
  miniVideoInner: {
    flex: 1,
  },
  miniPlaceholderInner: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
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
