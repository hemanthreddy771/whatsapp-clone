import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { RtcSurfaceView } from 'react-native-agora';

const { width, height } = Dimensions.get('window');

const OVERLAY_WIDTH = 160;
const OVERLAY_HEIGHT = 220;

const CallOverlay = () => {
    const { activeCall, setActiveCall } = useAuth();
    const navigation = useNavigation();
    const lastTap = React.useRef(0);

    // Initial position using a ref to track current value without re-renders
    const pan = React.useRef(new Animated.ValueXY({
        x: width - OVERLAY_WIDTH - 20,
        y: height - OVERLAY_HEIGHT - 120
    })).current;

    if (!activeCall || !activeCall.isMinimized) return null;

    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                // Safely set offset
                pan.setOffset({
                    x: pan.x._value || 0,
                    y: pan.y._value || 0
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
            onPanResponderRelease: (e, gesture) => {
                pan.flattenOffset();

                let targetX = pan.x._value;
                let targetY = pan.y._value;

                // Edge snapping logic
                if (targetX < width / 2 - OVERLAY_WIDTH / 2) {
                    targetX = 15;
                } else {
                    targetX = width - OVERLAY_WIDTH - 15;
                }

                // Vertical boundary checks
                if (targetY < 60) targetY = 60;
                if (targetY > height - OVERLAY_HEIGHT - 130) targetY = height - OVERLAY_HEIGHT - 130;

                Animated.spring(pan, {
                    toValue: { x: targetX, y: targetY },
                    useNativeDriver: false,
                    damping: 25, // Smoother damping
                    stiffness: 120
                }).start();
            },
        })
    ).current;

    const handlePress = () => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
            // Double tap to expand
            setActiveCall({ ...activeCall, isMinimized: false });
            navigation.navigate('VideoCalling', {
                channelId: activeCall.channelId,
                callType: activeCall.callType,
                callDocId: activeCall.callDocId,
                callerName: activeCall.callerName
            });
        }
        lastTap.current = now;
    };

    return (
        <Animated.View
            {...panResponder.panHandlers}
            style={[
                pan.getLayout(),
                styles.overlay,
                activeCall.callType === 'audio' && styles.audioOverlay
            ]}
        >
            <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.content}>
                {activeCall.callType === 'video' ? (
                    <View style={styles.videoSplit}>
                        <View style={styles.remoteHalf}>
                            {activeCall.remoteUid !== 0 ? (
                                <RtcSurfaceView canvas={{ uid: activeCall.remoteUid }} style={styles.miniVideo} />
                            ) : (
                                <View style={styles.miniPlaceholder}>
                                    <Ionicons name="person" size={50} color="#fff" />
                                </View>
                            )}
                        </View>
                        {!activeCall.isVideoOff && (
                            <View style={styles.localCorner}>
                                <RtcSurfaceView canvas={{ uid: 0 }} style={styles.miniVideo} />
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.miniPlaceholder}>
                        <Ionicons name="call" size={26} color="#fff" />
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.miniText} numberOfLines={1}>{activeCall.callerName || 'In Call'}</Text>
                            <Text style={{ color: '#ccc', fontSize: 10 }}>Minimized</Text>
                        </View>
                    </View>
                )}
                <View style={styles.expandInfo}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>2X TAP TO OPEN</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        width: OVERLAY_WIDTH,
        height: OVERLAY_HEIGHT,
        backgroundColor: '#1c1c1c',
        borderRadius: 15,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        overflow: 'hidden',
        zIndex: 9999,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    audioOverlay: {
        height: 70,
        width: 200,
        backgroundColor: '#075E54',
    },
    content: {
        flex: 1,
    },
    videoSplit: {
        flex: 1,
    },
    remoteHalf: {
        flex: 1,
        backgroundColor: '#2c3e50',
    },
    localCorner: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 50,
        height: 75,
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: '#000',
    },
    miniVideo: {
        flex: 1,
    },
    miniPlaceholder: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5,
    },
    miniText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    expandInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingVertical: 3,
        alignItems: 'center',
    }
});

export default CallOverlay;
