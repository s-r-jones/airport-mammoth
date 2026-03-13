import { useRef, useEffect, useState, useCallback } from "react";
import {
  bootstrapCameraKit,
  Transform2D,
  createMediaStreamSource,
  CameraKit,
  CameraKitSession,
} from "@snap/camera-kit";
import { Push2Web } from "@snap/push2web";

import "./App.css";

const LENS_GROUP_ID = "f73e0162-1b55-4344-a050-4dfa2b54af43";

// const apiService: RemoteApiService = {
//   apiSpecId: "af9a7f93-3a8d-4cf4-85d2-4dcdb8789b3d",
//   getRequestHandler(request) {
//     console.log("Request", request);

//     return (reply) => {
//       fetch("https://catfact.ninja/fact", {
//         headers: {
//           Accept: "application/json",
//         },
//       })
//         .then((res) => res.text())
//         .then((res) =>
//           reply({
//             status: "success",
//             metadata: {},
//             body: new TextEncoder().encode(res),
//           })
//         );
//     };
//   },
// };

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
      cameraType: isNowBackFacing ? "environment" : "user",
    });

    await sessionRef.current?.setSource(source);
    if (!isNowBackFacing) source.setTransform(Transform2D.MirrorX);
    sessionRef.current?.play();
  };

  useEffect(() => {
    async function initCameraKit() {
      // Init PUSH2WEB
      // const push2Web = new Push2Web();
      // push2WebRef.current = push2Web;
      // // Init CameraKit
      // //@ts-ignore
      // const apiServiceInjectable = Injectable(
      //   remoteApiServicesFactory.token,
      //   [remoteApiServicesFactory.token] as const,
      //   (existing: RemoteApiServices) => [...existing, apiService]
      // );
      const cameraKit = await bootstrapCameraKit(
        {
          logger: "console",
          apiToken:
            "eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzE0NTg3MjYyLCJzdWIiOiJhODFmMjA2Yi1kNDY4LTQzNGUtYjg4ZC1mYWI4OTA1MTk0ZGJ-U1RBR0lOR34wOTk0NjM0ZC0wMDM0LTRiMDktYjdhNS1hYzUzOTk1ODQ4YzEifQ.Y_dNB_i7PnERGX9qie9XSh3JNF3959WS-jr96KIdNaY",
        }
        //(container) => container.provides(apiServiceInjectable)
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
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log("device", devices);
      const backCamera = devices.find(
        (device) =>
          device.kind === "videoinput" &&
          device.label === "Back Ultra Wide Camera" // Get the wider camera on iPhone / TODO test on Android
      );
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          // width: window.innerWidth * window.devicePixelRatio,
          // height: window.innerHeight * window.devicePixelRatio,
          width: { min: 640, ideal: 1920 },
          height: { min: 400, ideal: 1080 },
          deviceId: backCamera ? { exact: backCamera?.deviceId } : undefined,
        },
      });

      mediaStreamRef.current = mediaStream;

      const source = createMediaStreamSource(mediaStream, {
        cameraType: "environment",
      });
      await session.setSource(source);
      await session.applyLens(lenses[0]);

      //Config Push2Web
      // window.addEventListener("loginkit_token", (event: Event) => {
      //   const tokenEvent = event as CustomEvent<string>;
      //   const token = tokenEvent.detail;

      //   console.log("token recieved", token);

      //   push2Web.subscribe(token, session, cameraKit.lensRepository);
      //   push2Web.events.addEventListener("error", (event) => {
      //     console.error(event.detail);
      //   });
      //   push2Web.events.addEventListener("lensReceived", async (event) => {
      //     const { id } = event.detail;

      //     const newLens = await cameraKit.lensRepository.loadLens(
      //       id,
      //       LENS_GROUP_ID
      //     );
      //     await session.applyLens(newLens);
      //   });
      // });

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
    </div>
  );
};