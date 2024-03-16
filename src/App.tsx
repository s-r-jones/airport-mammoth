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

const LENS_GROUP_ID = "f73e0162-1b55-4344-a050-4dfa2b54af43";

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

  const recordBtnClick = async () => {
    console.log("recordBtnClick");
    if (!isRecording) {
      console.log("start recording");
      setIsRecording(true);
      if (!canvasRef.current) return;
      console.log("creating stream");
      const stream: MediaStream = canvasRef.current?.captureStream(30);
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.addEventListener("dataavailable", (event) => {
        if (!event.data.size) {
          console.warn("No recorded data available");
          return;
        }

        const blob = new Blob([event.data]);

        downLoardUrlRef.current = window.URL.createObjectURL(blob);
        console.log(downLoardUrlRef.current);

        downLoardUrlRef.current;
      });

      mediaRecorderRef.current.start();
    } else if (isRecording) {
      console.log("stop recording");
      mediaRecorderRef.current?.stop();
      const link = document.createElement("a");
      link.setAttribute("style", "display: none");

      if (!downLoardUrlRef.current) return;
      console.log(downLoardUrlRef.current);

      link.href = downLoardUrlRef.current;
      link.download = "video.webm";
      link.click();
      link.remove();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    async function initCameraKit() {
      // Init CameraKit

      const cameraKit = await bootstrapCameraKit({
        logger: "console",
        apiToken:
          "eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzA4NTQ0MTU3LCJzdWIiOiI3YjQwZWM4Ny1hNTk3LTQ0OTMtYjAyZi04YTFkOWVlYTNjZTN-U1RBR0lOR340ZGE0ZmUwYi05OTNmLTRkOGYtYjNiNC0yNjg3NjM2NjkxMzgifQ.BfK9vetSFkfUkL5_ueLB7xJv3S60SRfwIuISh_5F0V8",
      });
      cameraKitRef.current = cameraKit;

      const { lenses } = await cameraKit.lensRepository.loadLensGroups([
        LENS_GROUP_ID,
      ]);

      //console.log(lenses);

      // Init Session
      const session = await cameraKit.createSession({
        liveRenderTarget: canvasRef.current || undefined,
      });
      sessionRef.current = session;
      session.events.addEventListener("error", (event) =>
        console.error(event.detail)
      );
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isBackFacing ? "environment" : "user",
          width: window.innerWidth * window.devicePixelRatio,
          height: window.innerHeight * window.devicePixelRatio,
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
        style={{ width: "100%", height: "100%" }}
      />

      <button
        className="record-button"
        onClick={recordBtnClick}
      />
    </div>
  );
};
