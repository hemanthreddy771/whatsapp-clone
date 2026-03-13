import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { RtcSurfaceView } from 'react-native-agora';

const { width, height } = Dimensions.get('window');

// 3:4 Ratio Layout (150x200)
const OVERLAY_WIDTH = 150;
const OVERLAY_HEIGHT = 200;

const CallOverlay = () => {
    const { activeCall, setActiveCall, engineRef } = useAuth();
    const navigation = useNavigation();
    const lastTap = useRef(0);
    const [isTransitioning, setIsTransitioning] = useState(true);

    // Initial position logic
    const pan = useRef(new Animated.ValueXY({
        x: width - OVERLAY_WIDTH - 20,
        y: height - OVERLAY_HEIGHT - 120
    })).current;

    useEffect(() => {
        if (activeCall?.isMinimized) {
            // Safety: Wait for main screen to unmount views before showing ours
            // Increased to 800ms for extra stability on slower devices
            const timer = setTimeout(() => setIsTransitioning(false), 800);
            return () => clearTimeout(timer);
        } else {
            setIsTransitioning(true);
        }
    }, [activeCall?.isMinimized]);

    // Safety check: Don't render if no call or not minimized
    if (!activeCall || !activeCall.isMinimized) {
        return null;
    }

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
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

                // Snapping logic
                if (targetX < width / 2 - OVERLAY_WIDTH / 2) {
                    targetX = 15;
                } else {
                    targetX = width - OVERLAY_WIDTH - 15;
                }

                // Boundary logic
                if (targetY < 60) targetY = 60;
                if (targetY > height - OVERLAY_HEIGHT - 130) targetY = height - OVERLAY_HEIGHT - 130;

                Animated.spring(pan, {
                    toValue: { x: targetX, y: targetY },
                    useNativeDriver: false,
                    damping: 25,
                    stiffness: 120
                }).start();
            },
        })
    ).current;

    const handlePress = () => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
            // Expand call
            setActiveCall(prev => prev ? { ...prev, isMinimized: false } : null);
            navigation.navigate('VideoCalling', {
                channelId: activeCall.channelId,
                callType: activeCall.callType,
                callDocId: activeCall.callDocId,
                callerName: activeCall.callerName
            });
        }
        lastTap.current = now;
    };

    // Render logic for different call types
    const renderContent = () => {
        if (activeCall.callType === 'audio') {
            return (
                <View style={styles.audioContent}>
                    <Ionicons name="call" size={24} color="#fff" />
                    <View style={styles.audioInfo}>
                        <Text style={styles.miniText} numberOfLines={1}>{activeCall.callerName || 'In Call'}</Text>
                        <Text style={styles.miniSubText}>Ongoing...</Text>
                    </View>
                </View>
            );
        }

        // Essential Hardware Check: Only render Agora views if the engine actually exists globally
        if (!engineRef.current || isTransitioning) {
            return (
                <View style={styles.blackBox}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 10 }}>
                        {isTransitioning ? 'Transitioning...' : 'Relinking...'}
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.videoContainer}>
                {/* Remote Video (Receiver) - Fills the 3:4 frame */}
                <View style={styles.fullBackground}>
                    {activeCall.remoteUid !== 0 ? (
                        <RtcSurfaceView
                            canvas={{ uid: activeCall.remoteUid }}
                            style={styles.videoFill}
                        />
                    ) : (
                        <View style={styles.placeholderBox}>
                            <Ionicons name="person" size={50} color="rgba(255,255,255,0.4)" />
                            <Text style={styles.placeholderText}>Connecting...</Text>
                        </View>
                    )}
                </View>

                {/* Local Video - Small Corner Overlay, explicitly set to stay on top */}
                {!activeCall.isVideoOff && (
                    <View style={styles.localPreview}>
                        <RtcSurfaceView
                            canvas={{ uid: 0 }}
                            style={styles.videoFill}
                            zOrderMediaOverlay={true}
                        />
                    </View>
                )}
            </View>
        );
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
            <TouchableOpacity onPress={handlePress} activeOpacity={0.95} style={styles.touchArea}>
                {renderContent()}
                <View style={styles.instruction}>
                    <Text style={styles.instructionText}>2x TAP TO OPEN</Text>
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
        borderColor: 'rgba(255,255,255,0.15)',
    },
    audioOverlay: {
        height: 70,
        width: 190,
        backgroundColor: '#075E54',
    },
    touchArea: {
        flex: 1,
    },
    videoContainer: {
        flex: 1,
    },
    fullBackground: {
        flex: 1,
        backgroundColor: '#000',
    },
    videoFill: {
        flex: 1,
    },
    placeholderBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        marginTop: 5,
    },
    localPreview: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 45,
        height: 60, // Keep 3:4 ratio for local too
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#fff',
        backgroundColor: '#000',
    },
    audioContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
    },
    audioInfo: {
        marginLeft: 12,
    },
    miniText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    miniSubText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
    },
    instruction: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingVertical: 3,
        alignItems: 'center',
    },
    instructionText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    blackBox: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default CallOverlay;
