import type { ClientId, Participant, Role } from "./types";
import { SignalingClient } from "./signalingClient";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  // Потом обязательно добавь TURN:
  // {
  //   urls: "turn:YOUR_TURN_SERVER:3478",
  //   username: "YOUR_USERNAME",
  //   credential: "YOUR_PASSWORD",
  // },
];

type PeerCallbacks = {
  onRemoteStream?: (peerId: ClientId, stream: MediaStream) => void;
  onPeersChange?: (peers: Participant[]) => void;
  onDisconnect?: () => void;
  onPeerLeft?: (peerId: ClientId) => void;
};

export class PeerConnectionManager {
  private signaling: SignalingClient;
  private localStream: MediaStream | null = null;
  private peers = new Map<ClientId, RTCPeerConnection>();
  private selfId: ClientId | null = null;
  private sessionId: string;
  private role: Role;
  private callbacks: PeerCallbacks;
  private participants: Participant[] = [];

  constructor(
    signaling: SignalingClient,
    sessionId: string,
    role: Role,
    callbacks: PeerCallbacks
  ) {
    this.signaling = signaling;
    this.sessionId = sessionId;
    this.role = role;
    this.callbacks = callbacks;

    this.signaling.on("joined", (self, participants) => {
      this.selfId = self.id;
      this.participants = participants.filter((p) => p.id !== self.id);
      this.callbacks.onPeersChange?.(this.participants);

      if (this.role === "teacher") {
        this.participants.forEach((p) => {
          if (this.localStream) {
            void this.createPeerAndOffer(p.id);
          }
        });
      }
    });

    this.signaling.on("user-joined", (p) => {
      if (this.selfId && p.id === this.selfId) return;

      this.participants = [...this.participants.filter((x) => x.id !== p.id), p];
      this.callbacks.onPeersChange?.(this.participants);

      if (this.role === "teacher" && this.localStream) {
        void this.createPeerAndOffer(p.id);
      }
    });

    this.signaling.on("user-left", (p) => {
      const pc = this.peers.get(p.id);
      if (pc) {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.close();
      }

      this.peers.delete(p.id);
      this.participants = this.participants.filter((x) => x.id !== p.id);
      this.callbacks.onPeersChange?.(this.participants);
      this.callbacks.onPeerLeft?.(p.id);
    });

    this.signaling.on("webrtc-offer", async (from, sdp) => {
      if (!this.localStream) return;

      const pc = this.getOrCreatePeer(from);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.signaling.sendAnswer(from, answer);
    });

    this.signaling.on("webrtc-answer", async (from, sdp) => {
      const pc = this.peers.get(from);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    this.signaling.on("webrtc-ice", (from, candidate) => {
      const pc = this.peers.get(from);
      if (!pc) return;
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    });

    this.signaling.on("close", () => {
      this.callbacks.onDisconnect?.();
    });
  }

  async initLocalStream(
    constraints: MediaStreamConstraints = { video: true, audio: true }
  ) {
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    return this.localStream;
  }

  getLocalStream() {
    return this.localStream;
  }

  join() {
    this.signaling.join(this.sessionId, this.role);
  }

  leave() {
    this.signaling.leave();

    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;

    this.peers.forEach((pc) => {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.close();
    });

    this.peers.clear();
    this.participants = [];
  }

  setAudioEnabled(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  setVideoEnabled(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  async replaceOutgoingVideoTrack(track: MediaStreamTrack | null) {
    const tasks: Promise<void>[] = [];

    this.peers.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        tasks.push(sender.replaceTrack(track).then(() => undefined));
      }
    });

    await Promise.all(tasks);
  }

  private getOrCreatePeer(peerId: ClientId): RTCPeerConnection {
    let pc = this.peers.get(peerId);
    if (pc) return pc;

    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc!.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.sendIceCandidate(peerId, event.candidate);
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        this.callbacks.onRemoteStream?.(peerId, stream);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc?.connectionState;
      if (state === "failed" || state === "closed" || state === "disconnected") {
        this.callbacks.onPeerLeft?.(peerId);
      }
    };

    this.peers.set(peerId, pc);
    return pc;
  }

  private async createPeerAndOffer(peerId: ClientId) {
    const pc = this.getOrCreatePeer(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (pc.localDescription) {
      this.signaling.sendOffer(peerId, pc.localDescription);
    }
  }
}