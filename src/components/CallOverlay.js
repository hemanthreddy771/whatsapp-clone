import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { RtcSurfaceView } from 'react-native-agora';

const { width, height } = Dimensions.get('window');

const OVERLAY_WIDTH = 140;
const OVERLAY_HEIGHT = 190;

const CallOverlay = () => {
    const { activeCall, setActiveCall } = useAuth();
    const navigation = useNavigation();
    const lastTap = React.useRef(0);

    if (!activeCall || !activeCall.isMinimized) return null;

    const pan = React.useRef(new Animated.ValueXY({ x: width - OVERLAY_WIDTH - 20, y: height - OVERLAY_HEIGHT - 100 })).current;

    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({
                    x: pan.x._value,
                    y: pan.y._value
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
            onPanResponderRelease: (e, gesture) => {
                pan.flattenOffset();

                let targetX = pan.x._value;
                let targetY = pan.y._value;

                // Snap to horizontal edges
                if (targetX < width / 2 - OVERLAY_WIDTH / 2) {
                    targetX = 10;
                } else {
                    targetX = width - OVERLAY_WIDTH - 10;
                }

                // Vertical boundaries
                if (targetY < 50) targetY = 50;
                if (targetY > height - OVERLAY_HEIGHT - 120) targetY = height - OVERLAY_HEIGHT - 120;

                Animated.spring(pan, {
                    toValue: { x: targetX, y: targetY },
                    useNativeDriver: false,
                    damping: 20,
                    stiffness: 150
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
                                    <Ionicons name="person" size={40} color="#fff" />
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
                        <Ionicons name="call" size={24} color="#fff" />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.miniText} numberOfLines={1}>{activeCall.callerName || 'In Call'}</Text>
                            <Text style={{ color: '#aaa', fontSize: 10 }}>Minimized</Text>
                        </View>
                    </View>
                )}
                <View style={styles.expandInfo}>
                    <Text style={{ color: '#fff', fontSize: 8, fontWeight: 'bold' }}>2X TAP TO OPEN</Text>
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
        borderRadius: 12,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 6,
        overflow: 'hidden',
        zIndex: 9999,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    audioOverlay: {
        height: 60,
        width: 180,
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
        bottom: 10,
        right: 10,
        width: 45,
        height: 65,
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 1.5,
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
        fontSize: 14,
        fontWeight: 'bold',
    },
    expandInfo: {
        position: 'absolute',
        bottom: 5,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingVertical: 2,
        alignItems: 'center',
    }
});

export default CallOverlay;
