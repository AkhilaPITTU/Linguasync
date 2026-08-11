import "./MeetingRoom.css";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { joinMeeting } from "../services/meetingService";
import VideoGrid from "../components/meeting/VideoGrid";
import RightSidebar from "../components/meeting/RightSidebar";
import BottomControls from "../components/meeting/BottomControls";
import ShowUIButton from "../components/meeting/ShowUIButton";
import AddParticipants from "./AddParticipants";
import websocketService from "../services/websocketService";
import webrtcService from "../services/webrtcService";
import audioService from "../services/audioService";

// Minimum time between audio_stream sends. The AI pipeline
// (noise check -> transcribe -> grammar -> translate -> deliver)
// takes real time per chunk; sending faster than that just builds
// a backlog server-side and was contributing to WebSocket ping
// timeouts under load. Throttling here keeps us close to what the
// server can actually keep up with.
const AUDIO_SEND_INTERVAL_MS = 1000;

const MeetingRoom = () => {
  const { meetingId } = useParams();

  // Safely extract and sanitize userId by removing any trailing colon suffixes or invalid spaces
  const rawUserId = localStorage.getItem("user_id") || "";
  const userId = rawUserId.includes(":") ? rawUserId.split(":")[0].trim() : rawUserId.trim();

  const userName = localStorage.getItem("user_name") || "Participant";

  const [participants, setParticipants] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [transcript, setTranscript] = useState([]);
  const [translations, setTranslations] = useState([]);
  const [language, setLanguage] = useState("English");
  const [showAddParticipants, setShowAddParticipants] = useState(false);
  const subtitleTimeoutsRef = useRef({});
  const lastAudioSentAtRef = useRef(0);

  useEffect(() => {
    if (!userId) {
      console.error("Initialization aborted: Missing user_id in localStorage.");
      return;
    }

    const initializeMeeting = async () => {
      try {
        const stream = await webrtcService.startLocalStream();

        setParticipants([
          {
            id: userId,
            name: userName,
            stream,
            local: true,
            language,
            mic: true,
            camera: true,
            speaking: false,
          },
        ]);

        await joinMeeting(meetingId, userName, language);

        // Keep track of names we've learned from user_joined/offer/answer
        // messages, so any participant record we create (whichever
        // message triggers it first) gets the real name instead of a
        // hardcoded fallback.
        const knownNames = {};

        const upsertParticipant = (remoteUserId, updates) => {
          setParticipants((prev) => {
            const exists = prev.find((p) => p.id === remoteUserId);

            if (exists) {
              return prev.map((p) =>
                p.id === remoteUserId ? { ...p, ...updates } : p
              );
            }

            return [
              ...prev,
              {
                id: remoteUserId,
                name: updates.name || knownNames[remoteUserId] || "Participant",
                stream: updates.stream || null,
                local: false,
                language: "English",
                mic: true,
                camera: true,
                speaking: false,
                ...updates,
              },
            ];
          });
        };

        await websocketService.connect(
          meetingId,
          userId,
          async (data) => {
            switch (data.type) {
              case "user_joined": {
                console.log("========== USER JOINED ==========");
                console.log("Current User:", userId);
                console.log("Joined User:", data.user_id);
                console.log("Data:", data);

                if (data.user_name) {
                  knownNames[data.user_id] = data.user_name;
                  // Update the name if we already created a participant
                  // record for this user before learning their name.
                  setParticipants((prev) =>
                    prev.map((p) =>
                      p.id === data.user_id
                        ? { ...p, name: data.user_name }
                        : p
                    )
                  );
                }

                if (data.user_id !== userId) {
                  console.log("Creating PeerConnection for:", data.user_id);

                  await webrtcService.createPeerConnection(
                    data.user_id,
                    (remoteUserId, remoteStream) => {
                      console.log("Remote Stream From:", remoteUserId);
                      upsertParticipant(remoteUserId, { stream: remoteStream });
                    }
                  );

                  console.log("Creating Offer For:", data.user_id);
                  await webrtcService.createOffer(data.user_id);
                }
                break;
              }

              case "offer": {
                console.log("Received OFFER from:", data.from);

                if (data.user_name) {
                  knownNames[data.from] = data.user_name;
                }

                await webrtcService.createPeerConnection(
                  data.from,
                  (remoteUserId, remoteStream) => {
                    upsertParticipant(remoteUserId, { stream: remoteStream });
                  }
                );

                // Make sure the participant entry has the real name,
                // even if createPeerConnection's onRemoteStream callback
                // hasn't fired yet.
                upsertParticipant(data.from, {
                  name: data.user_name || knownNames[data.from] || "Participant",
                });

                await webrtcService.createAnswer(data.from, data.offer);
                break;
              }

              case "answer": {
                console.log("Received ANSWER from:", data.from);

                if (data.user_name) {
                  knownNames[data.from] = data.user_name;
                  upsertParticipant(data.from, { name: data.user_name });
                }

                await webrtcService.setRemoteAnswer(data.from, data.answer);
                break;
              }

              case "ice_candidate": {
                console.log("Received ICE Candidate from:", data.from);
                await webrtcService.addIceCandidate(
                  data.from,
                  data.candidate
                );
                break;
              }

              case "chat": {
                setChatMessages((prev) => [...prev, data]);
                break;
              }

              case "transcript": {
                setTranscript((prev) => [...prev, data]);
                break;
              }

              case "translation": {
                setTranslations((prev) => [...prev, data]);

                // Show the translated text as a live subtitle under
                // that speaker's video tile, and auto-clear it a
                // few seconds later so it doesn't stay frozen once
                // they've stopped talking.
                if (data.text) {
                  setParticipants((prev) =>
                    prev.map((p) =>
                      p.id === data.user_id
                        ? { ...p, subtitle: data.text }
                        : p
                    )
                  );

                  if (subtitleTimeoutsRef.current[data.user_id]) {
                    clearTimeout(subtitleTimeoutsRef.current[data.user_id]);
                  }

                  subtitleTimeoutsRef.current[data.user_id] = setTimeout(() => {
                    setParticipants((prev) =>
                      prev.map((p) =>
                        p.id === data.user_id
                          ? { ...p, subtitle: "" }
                          : p
                      )
                    );
                  }, 5000);
                }
                break;
              }

              case "speaking": {
                setParticipants((prev) =>
                  prev.map((participant) =>
                    participant.id === data.user_id
                      ? { ...participant, speaking: true }
                      : participant
                  )
                );

                setTimeout(() => {
                  setParticipants((prev) =>
                    prev.map((participant) =>
                      participant.id === data.user_id
                        ? { ...participant, speaking: false }
                        : participant
                    )
                  );
                }, 1000);
                break;
              }

              case "user_left": {
                webrtcService.closePeerConnection(data.user_id);
                setParticipants((prev) =>
                  prev.filter((p) => p.id !== data.user_id)
                );
                break;
              }

              default:
                console.log("Unhandled websocket message:", data);
            }
          }
        );

        await new Promise((resolve) => setTimeout(resolve, 500));

        await audioService.startRecording((audioChunk) => {
          const now = Date.now();

          // Throttle: skip this chunk if we sent one too recently.
          // See AUDIO_SEND_INTERVAL_MS comment above.
          if (now - lastAudioSentAtRef.current < AUDIO_SEND_INTERVAL_MS) {
            return;
          }

          if (
            websocketService.socket &&
            websocketService.socket.readyState === WebSocket.OPEN
          ) {
            lastAudioSentAtRef.current = now;

            websocketService.send({
              type: "audio_stream",
              meeting_id: meetingId,
              user_id: userId,
              language,
              audio: Array.from(new Uint8Array(audioChunk)),
            });
          }
        });
      } catch (error) {
        console.error("Meeting initialization failed:", error);
      }
    };

    initializeMeeting();

    return () => {
      audioService.stopRecording();
      websocketService.disconnect();
      webrtcService.closeAllConnections();

      Object.values(subtitleTimeoutsRef.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });

      if (webrtcService.localStream) {
        webrtcService.localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [meetingId, userId, userName, language]);

  useEffect(() => {
    setParticipants((prev) =>
      prev.map((p) => (p.local ? { ...p, language } : p))
    );
  }, [language]);

  return (
    <div className="meeting-room">
      <header className="meeting-header">
        <div className="meeting-logo">
          <div className="logo-circle">🌐</div>
          <h2>LINGUASYNC</h2>
        </div>
        <div className="focus-mode">
          <span className="status-dot"></span>
          <span>Focus Mode</span>
        </div>
        <ShowUIButton />
      </header>

      <main className="meeting-main">
        <section className="meeting-left">
          <VideoGrid participants={participants} />
        </section>

        <aside className="meeting-right">
          <RightSidebar
            participants={participants}
            transcript={transcript}
            translations={translations}
            chatMessages={chatMessages}
            language={language}
            setLanguage={setLanguage}
          />
        </aside>
      </main>

      <BottomControls
        participants={participants}
        meetingId={meetingId}
        userId={userId}
        language={language}
        onAddParticipants={() => setShowAddParticipants(true)}
      />

      {showAddParticipants && (
        <AddParticipants
          meetingId={meetingId}
          onClose={() => setShowAddParticipants(false)}
        />
      )}
    </div>
  );
};

export default MeetingRoom;
