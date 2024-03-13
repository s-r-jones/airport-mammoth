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

const LENS_GROUP_ID = "542c15e5-1f57-450b-b0c6-f3f29df229aa";

const apiService: RemoteApiService = {
  apiSpecId: "af9a7f93-3a8d-4cf4-85d2-4dcdb8789b3d",
  getRequestHandler(request) {
    console.log("Request", request);

    return (reply) => {
      fetch("https://catfact.ninja/fact", {
        headers: {
          Accept: "application/json",
        },
      })
        .then((res) => res.text())
        .then((res) =>
          reply({
            status: "success",
            metadata: {},
            body: new TextEncoder().encode(res),
          })
        );
    };
  },
};

export const App = () => {
  const cameraKitRef = useRef<CameraKit>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<CameraKitSession>();
  const push2WebRef = useRef<Push2Web>();

  const mediaStreamRef = useRef<MediaStream>();

  const [isBackFacing, setIsBackFacing] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

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
      // Init PUSH2WEB
      const push2Web = new Push2Web();
      push2WebRef.current = push2Web;
      // Init CameraKit
      //@ts-ignore
      const apiServiceInjectable = Injectable(
        remoteApiServicesFactory.token,
        [remoteApiServicesFactory.token] as const,
        (existing: RemoteApiServices) => [...existing, apiService]
      );
      const cameraKit = await bootstrapCameraKit(
        {
          logger: "console",
          apiToken:
            "eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzA4NTQ0MTU3LCJzdWIiOiI3YjQwZWM4Ny1hNTk3LTQ0OTMtYjAyZi04YTFkOWVlYTNjZTN-U1RBR0lOR340ZGE0ZmUwYi05OTNmLTRkOGYtYjNiNC0yNjg3NjM2NjkxMzgifQ.BfK9vetSFkfUkL5_ueLB7xJv3S60SRfwIuISh_5F0V8",
        },
        (container) => container.provides(apiServiceInjectable)
      );
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
        video: { facingMode: isBackFacing ? "environment" : "user" },
      });

      mediaStreamRef.current = mediaStream;

      const source = createMediaStreamSource(mediaStream, {
        cameraType: "back",
      });
      await session.setSource(source);
      await session.applyLens(lenses[0]);

      //Config Push2Web
      window.addEventListener("loginkit_token", (event: Event) => {
        const tokenEvent = event as CustomEvent<string>;
        const token = tokenEvent.detail;

        console.log("token recieved", token);

        push2Web.subscribe(token, session, cameraKit.lensRepository);
        push2Web.events.addEventListener("error", (event) => {
          console.error(event.detail);
        });
        push2Web.events.addEventListener("lensReceived", async (event) => {
          const { id } = event.detail;

          const newLens = await cameraKit.lensRepository.loadLens(
            id,
            LENS_GROUP_ID
          );
          await session.applyLens(newLens);
        });
      });

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
      <button
        onClick={updateCamera}
        style={{ position: "absolute", top: "2rem", right: "2rem" }}
      >
        {isBackFacing ? "switch to front" : "switch to back"}
      </button>

      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};
