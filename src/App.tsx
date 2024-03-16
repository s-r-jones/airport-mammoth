import { useRef, useEffect, useState, useCallback } from "react";
import {
  bootstrapCameraKit,
  Transform2D,
  createMediaStreamSource,
  CameraKit,
  CameraKitSession,
  RemoteApiService,
  RemoteApiServices,
  Injectable,
  remoteApiServicesFactory,
} from "@snap/camera-kit";
import { Push2Web } from "@snap/push2web";

import "./App.css";

function requestDeviceMotionPermission() {
  console.log("requestDeviceMotionPermission");
  //@ts-ignore
  if (typeof DeviceMotionEvent.requestPermission === "function") {
    //@ts-ignore
    DeviceMotionEvent.requestPermission()
      //@ts-ignore
      .then((permissionState) => {
        console.log(permissionState);
        if (permissionState === "granted") {
          window.addEventListener("devicemotion", (event) => {
            // Handle device motion event
          });
        }
      })
      .catch(console.error);
  } else {
    // Handle regular non iOS 13+ devices
    window.addEventListener("devicemotion", (event) => {
      // Handle device motion event
    });
  }
}

//@ts-ignore
function requestDeviceOrientationPermission() {
  //@ts-ignore
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    //@ts-ignore
    DeviceOrientationEvent.requestPermission()
      //@ts-ignore
      .then((permissionState) => {
        if (permissionState === "granted") {
          window.addEventListener("deviceorientation", (event) => {
            // Handle device orientation event
          });
        }
      })
      .catch(console.error);
  } else {
    // Handle regular non iOS 13+ devices
    window.addEventListener("deviceorientation", (event) => {
      // Handle device orientation event
    });
  }
}

const LENS_GROUP_ID = "006982dd-596f-4cee-8ea4-0efd2078f2d3";

export const App = () => {
  const cameraKitRef = useRef<CameraKit>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<CameraKitSession>();
  const push2WebRef = useRef<Push2Web>();
  const mediaRecorderRef = useRef<MediaRecorder>();
  const downLoardUrlRef = useRef<string>();

  const mediaStreamRef = useRef<MediaStream>();

  const [isBackFacing, setIsBackFacing] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const updateCamera = async () => {
    const isNowBackFacing = !isBackFacing;
    setIsBackFacing(isNowBackFacing);

    if (mediaStreamRef.current) {
      sessionRef.current?.pause();
      mediaStreamRef.current?.getVideoTracks()[0].stop();
    }

    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: isNowBackFacing ? "environment" : "user" },
    });

    mediaStreamRef.current = mediaStream;

    const source = createMediaStreamSource(mediaStream, {
      cameraType: isNowBackFacing ? "back" : "front",
    });

    await sessionRef.current?.setSource(source);
    if (!isNowBackFacing) source.setTransform(Transform2D.MirrorX);
    sessionRef.current?.play();
  };

  useEffect(() => {
    async function initCameraKit() {
      // Init CameraKit
      // requestDeviceMotionPermission();
      // requestDeviceOrientationPermission();
      const cameraKit = await bootstrapCameraKit({
        logger: "console",
        apiToken:
          "eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzA4NTQ0MTU3LCJzdWIiOiI3YjQwZWM4Ny1hNTk3LTQ0OTMtYjAyZi04YTFkOWVlYTNjZTN-U1RBR0lOR340ZGE0ZmUwYi05OTNmLTRkOGYtYjNiNC0yNjg3NjM2NjkxMzgifQ.BfK9vetSFkfUkL5_ueLB7xJv3S60SRfwIuISh_5F0V8",
      });
      cameraKitRef.current = cameraKit;

      const { lenses } = await cameraKit.lensRepository.loadLensGroups([
        LENS_GROUP_ID,
      ]);

      console.log(lenses);

      // Init Session
      const session = await cameraKit.createSession({
        liveRenderTarget: canvasRef.current || undefined,
      });
      sessionRef.current = session;
      session.events.addEventListener("error", (event) =>
        console.error(event.detail)
      );
      const devices = await navigator.mediaDevices.enumerateDevices();
      const backCamera = devices.find(
        (device) =>
          device.kind === "videoinput" &&
          device.label === "Back Ultra Wide Camera" // Get the wider camera on iPhone / TODO test on Android
      );
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isBackFacing ? "environment" : "user",
          width: window.innerWidth * window.devicePixelRatio,
          height: window.innerHeight * window.devicePixelRatio,
          deviceId: backCamera ? { exact: backCamera?.deviceId } : undefined,
        },
      });

      mediaStreamRef.current = mediaStream;

      const source = createMediaStreamSource(mediaStream, {
        cameraType: "back",
      });
      await session.setSource(source);
      await session.applyLens(lenses[0]);

      session.play();
      setIsInitialized(true);
    }

    if (!cameraKitRef.current) {
      initCameraKit();
    }

    return () => {
      sessionRef.current?.pause();
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ height: "100%", width: " 100%" }}
      />
    </div>
  );
};
