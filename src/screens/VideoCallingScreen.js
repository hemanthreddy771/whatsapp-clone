import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
} from 'react-native-agora';

const appId = 'b85e3bfa8da140f3bb8c1a20687f9a7b'; // Replace with your Agora App ID

const VideoCallingScreen = ({ navigation, route }) => {
  const { channelId } = route.params || { channelId: 'test_channel' };
  const agoraEngine = useRef();
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    setupVideoSDKEngine();
    return () => {
      agoraEngine.current?.leaveChannel();
      agoraEngine.current?.release();
    };
  }, []);

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
      engine.enableVideo();

      engine.registerEventHandler({
        onJoinChannelSuccess: () => setIsJoined(true),
        onUserJoined: (_connection, uid) => setRemoteUid(uid),
        onUserOffline: () => setRemoteUid(0),
      });

      engine.joinChannel('', channelId, 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMute = () => {
    agoraEngine.current?.muteLocalAudioStream(!isMuted);
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    agoraEngine.current?.muteLocalVideoStream(!isVideoOff);
    setIsVideoOff(!isVideoOff);
  };

  const switchCamera = () => {
    agoraEngine.current?.switchCamera();
  };

  return (
    <View style={styles.container}>
      {isJoined && remoteUid !== 0 ? (
        <RtcSurfaceView
          canvas={{ uid: remoteUid }}
          style={styles.remoteVideo}
        />
      ) : (
        <View style={styles.videoPlaceholder}>
          <Ionicons name="person" size={100} color="#fff" />
          <Text style={styles.callingText}>
            {isJoined ? 'Waiting for others...' : 'Joining...'}
          </Text>
        </View>
      )}

      {isJoined && !isVideoOff && (
        <RtcSurfaceView
          canvas={{ uid: 0 }}
          style={styles.localVideo}
        />
      )}

      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
          <Ionicons name="camera-reverse" size={30} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isVideoOff && styles.activeControl]}
          onPress={toggleVideo}
        >
          <Ionicons name={isVideoOff ? "videocam-off" : "videocam"} size={30} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.activeControl]}
          onPress={toggleMute}
        >
          <Ionicons name={isMuted ? "mic-off" : "mic"} size={30} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={() => navigation.goBack()}
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
    backgroundColor: '#1E1E1E', // Dark background for video
  },
  remoteVideo: {
    flex: 1,
  },
  localVideo: {
    width: 120,
    height: 180,
    position: 'absolute',
    top: 50,
    right: 20,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callingText: {
    color: '#fff',
    fontSize: 20,
    marginTop: 20,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 60,
    height: 60,
    borderRadius: 30,
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
