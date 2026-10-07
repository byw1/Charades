import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { saveClip } from '@/media/reels';
import { color, font } from './tokens';

export type RoundCameraProps = {
  /** True while the round is running. Recording stops when it goes false. */
  active: boolean;
  sessionId: string;
  roundId: string;
  /** Where the round's clock stood when called, so the reel can line up. */
  roundTimeNow: () => number;
  /** Silent video, when the voice referee needs the microphone. */
  mute: boolean;
};

/**
 * Films the room during a round.
 *
 * With the phone on someone's forehead the screen — and the front camera —
 * face the room, so this catches the clue-givers losing it. A small live
 * bubble with a red dot sits in the corner so nobody is filmed without
 * seeing that they are. It records only once the camera and microphone have
 * been allowed in Settings, and the clip goes straight into the app's own
 * folder.
 */
export function RoundCamera({ active, sessionId, roundId, roundTimeNow, mute }: RoundCameraProps) {
  const camera = useRef<CameraView>(null);
  const [cameraPermission] = useCameraPermissions();
  const [micPermission] = useMicrophonePermissions();
  const [ready, setReady] = useState(false);
  const started = useRef(false);
  const timeNow = useRef(roundTimeNow);
  useEffect(() => {
    timeNow.current = roundTimeNow;
  });

  const allowed = cameraPermission?.granted === true && (mute || micPermission?.granted === true);

  useEffect(() => {
    const view = camera.current;
    if (!allowed || !ready || !active || !view || started.current) return;
    started.current = true;
    const startRoundMs = timeNow.current();

    void view
      .recordAsync({ maxDuration: 240 })
      .then((result) => {
        if (result?.uri) void saveClip(sessionId, roundId, result.uri, startRoundMs);
      })
      .catch(() => undefined);
  }, [active, allowed, ready, roundId, sessionId]);

  // The round ending, or the screen going away, stops the recording.
  useEffect(() => {
    if (active || !started.current) return;
    void camera.current?.stopRecording();
  }, [active]);
  useEffect(() => {
    const view = camera.current;
    return () => {
      if (started.current) void view?.stopRecording();
    };
  }, []);

  if (!allowed) return null;

  return (
    <View style={styles.bubble} pointerEvents="none" accessible accessibilityLabel="Recording the room">
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing="front"
        mode="video"
        mute={mute}
        videoQuality="720p"
        onCameraReady={() => setReady(true)}
      />
      <View style={styles.rec}>
        <View style={styles.dot} />
        <Text style={styles.recText} allowFontScaling={false}>
          REC
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    left: 44,
    bottom: 22,
    width: 84,
    height: 84,
    borderRadius: 42,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: color.bone,
    backgroundColor: color.ink,
    zIndex: 5,
  },
  rec: {
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF3B47' },
  recText: { fontFamily: font.heavy, fontSize: 10, lineHeight: 14, color: color.bone },
});
