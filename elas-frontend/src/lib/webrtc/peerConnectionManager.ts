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

function normalizeParticipant(p: Participant): Participant {
  return {
    id: p.id,
    userId: p.userId,
    role: p.role,
    sessionId: p.sessionId,
    displayName:
      typeof p.displayName === "string" && p.displayName.trim().length > 0
        ? p.displayName.trim()
        : undefined,
    email:
      typeof p.email === "string" && p.email.trim().length > 0
        ? p.email.trim().toLowerCase()
        : undefined,
    firstName:
      typeof p.firstName === "string" && p.firstName.trim().length > 0
        ? p.firstName.trim()
        : undefined,
    lastName:
      typeof p.lastName === "string" && p.lastName.trim().length > 0
        ? p.lastName.trim()
        : undefined,
    fullName:
      typeof p.fullName === "string" && p.fullName.trim().length > 0
        ? p.fullName.trim()
        : undefined,
    avatarUrl:
      typeof p.avatarUrl === "string" && p.avatarUrl.trim().length > 0
        ? p.avatarUrl.trim()
        : undefined,
  };
}

function upsertParticipant(list: Participant[], next: Participant): Participant[] {
  const safe = normalizeParticipant(next);
  const idx = list.findIndex((p) => p.id === safe.id);

  if (idx === -1) {
    return [...list, safe];
  }

  const current = list[idx];
  const merged: Participant = {
    ...current,
    ...safe,
    userId: safe.userId ?? current.userId,
    email: safe.email ?? current.email,
    firstName: safe.firstName ?? current.firstName,
    lastName: safe.lastName ?? current.lastName,
    fullName: safe.fullName ?? current.fullName,
    avatarUrl: safe.avatarUrl ?? current.avatarUrl,
    displayName: safe.displayName ?? current.displayName,
  };

  const copy = [...list];
  copy[idx] = merged;
  return copy;
}

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

      const normalized = participants
        .map(normalizeParticipant)
        .filter((p) => p.id !== self.id);

      this.participants = normalized;
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
      const safe = normalizeParticipant(p);
      if (this.selfId && safe.id === this.selfId) return;

      this.participants = upsertParticipant(this.participants, safe);
      this.callbacks.onPeersChange?.(this.participants);

      if (this.role === "teacher" && this.localStream) {
        void this.createPeerAndOffer(safe.id);
      }
    });

    this.signaling.on("user-left", (p) => {
      const peerId = p.id;
      const pc = this.peers.get(peerId);

      if (pc) {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.close();
      }

      this.peers.delete(peerId);
      this.participants = this.participants.filter((x) => x.id !== peerId);
      this.callbacks.onPeersChange?.(this.participants);
      this.callbacks.onPeerLeft?.(peerId);
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
      void pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
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

  getParticipants() {
    return this.participants;
  }

  join(user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    avatarUrl?: string;
  }) {
    this.signaling.join(this.sessionId, this.role, user);
  }

  leave() {
    this.signaling.leave();

    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;

    this.peers.forEach((pc) => {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
    });

    this.peers.clear();
    this.participants = [];
    this.selfId = null;
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
        this.signaling.sendIceCandidate(peerId, event.candidate.toJSON());
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
    if (this.peers.has(peerId)) return;

    const pc = this.getOrCreatePeer(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (pc.localDescription) {
      this.signaling.sendOffer(peerId, pc.localDescription);
    }
  }
}