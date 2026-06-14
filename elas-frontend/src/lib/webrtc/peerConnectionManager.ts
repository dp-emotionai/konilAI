import type { ClientId, Participant, Role } from "./types";
import { SignalingClient } from "./signalingClient";

/**
 * STUN позволяет участникам обнаружить свои публичные сетевые адреса.
 *
 * TURN необходим, когда прямое P2P-соединение невозможно:
 * корпоративная сеть, мобильный интернет, строгий NAT и т. д.
 *
 * Для TURN добавь в Vercel:
 *
 * NEXT_PUBLIC_TURN_URL=turn:your-turn-server.com:3478
 * NEXT_PUBLIC_TURN_USERNAME=your-username
 * NEXT_PUBLIC_TURN_CREDENTIAL=your-password
 */
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
      ],
    },
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL?.trim();
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME?.trim();
  const turnCredential =
      process.env.NEXT_PUBLIC_TURN_CREDENTIAL?.trim();

  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: turnUsername || undefined,
      credential: turnCredential || undefined,
    });
  }

  return servers;
}

const ICE_SERVERS = buildIceServers();

const DISCONNECTED_GRACE_PERIOD_MS = 8_000;

type PeerCallbacks = {
  onRemoteStream?: (
      peerId: ClientId,
      stream: MediaStream
  ) => void;

  onPeersChange?: (
      peers: Participant[]
  ) => void;

  onDisconnect?: () => void;

  onPeerLeft?: (
      peerId: ClientId
  ) => void;
};

function normalizeParticipant(
    participant: Participant
): Participant {
  return {
    id: participant.id,
    userId: participant.userId,
    role: participant.role,
    sessionId: participant.sessionId,

    email:
        typeof participant.email === "string" &&
        participant.email.trim().length > 0
            ? participant.email.trim().toLowerCase()
            : undefined,

    firstName:
        typeof participant.firstName === "string" &&
        participant.firstName.trim().length > 0
            ? participant.firstName.trim()
            : undefined,

    lastName:
        typeof participant.lastName === "string" &&
        participant.lastName.trim().length > 0
            ? participant.lastName.trim()
            : undefined,

    fullName:
        typeof participant.fullName === "string" &&
        participant.fullName.trim().length > 0
            ? participant.fullName.trim()
            : undefined,

    avatarUrl:
        typeof participant.avatarUrl === "string" &&
        participant.avatarUrl.trim().length > 0
            ? participant.avatarUrl.trim()
            : undefined,
  };
}

function upsertParticipant(
    list: Participant[],
    next: Participant
): Participant[] {
  const safe = normalizeParticipant(next);

  const index = list.findIndex(
      (participant) => participant.id === safe.id
  );

  if (index === -1) {
    return [...list, safe];
  }

  const current = list[index];

  const merged: Participant = {
    ...current,
    ...safe,

    userId:
        safe.userId ??
        current.userId,

    email:
        safe.email ??
        current.email,

    firstName:
        safe.firstName ??
        current.firstName,

    lastName:
        safe.lastName ??
        current.lastName,

    fullName:
        safe.fullName ??
        current.fullName,

    avatarUrl:
        safe.avatarUrl ??
        current.avatarUrl,
  };

  const copy = [...list];
  copy[index] = merged;

  return copy;
}

export class PeerConnectionManager {
  private signaling: SignalingClient;

  private localStream: MediaStream | null = null;

  private peers =
      new Map<ClientId, RTCPeerConnection>();

  /**
   * ICE-кандидаты могут прийти:
   *
   * 1. раньше создания RTCPeerConnection;
   * 2. раньше установки remoteDescription.
   *
   * В обоих случаях нельзя их терять.
   */
  private pendingIceCandidates =
      new Map<ClientId, RTCIceCandidateInit[]>();

  /**
   * Защищает от одновременной отправки нескольких offer
   * одному и тому же участнику.
   */
  private offerInProgress =
      new Set<ClientId>();

  /**
   * WebRTC может кратковременно перейти в disconnected,
   * например при смене Wi-Fi.
   *
   * Не удаляем участника сразу — даём соединению восстановиться.
   */
  private disconnectTimers =
      new Map<ClientId, ReturnType<typeof setTimeout>>();

  private selfId: ClientId | null = null;

  private sessionId: string;

  private role: Role;

  private callbacks: PeerCallbacks;

  private participants: Participant[] = [];

  private isLeaving = false;

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

    this.registerSignalingHandlers();
  }

  private registerSignalingHandlers() {
    this.signaling.on(
        "joined",
        (self, participants) => {
          if (this.selfId && this.selfId !== self.id) {
            for (const pc of this.peers.values()) {
              this.closePeerConnection(pc);
            }

            this.peers.clear();
            this.pendingIceCandidates.clear();
            this.offerInProgress.clear();
          }

          this.selfId = self.id;

          const normalized = participants
              .map(normalizeParticipant)
              .filter(
                  (participant) =>
                      participant.id !== self.id
              );

          this.participants = normalized;

          this.callbacks.onPeersChange?.(
              this.participants
          );

          /**
           * В текущей архитектуре преподаватель является инициатором offer.
           */
          if (
              this.role === "teacher" &&
              this.localStream
          ) {
            for (const participant of this.participants) {
              void this.createPeerAndOffer(
                  participant.id
              );
            }
          }
        }
    );

    this.signaling.on(
        "user-joined",
        (participant) => {
          const safe =
              normalizeParticipant(participant);

          if (
              this.selfId &&
              safe.id === this.selfId
          ) {
            return;
          }

          this.participants =
              upsertParticipant(
                  this.participants,
                  safe
              );

          this.callbacks.onPeersChange?.(
              this.participants
          );

          if (
              this.role === "teacher" &&
              this.localStream
          ) {
            void this.createPeerAndOffer(
                safe.id
            );
          }
        }
    );

    this.signaling.on(
        "user-left",
        (participant) => {
          this.removePeer(
              participant.id,
              true
          );
        }
    );

    this.signaling.on(
        "webrtc-offer",
        (from, sdp) => {
          void this.handleOffer(
              from,
              sdp
          );
        }
    );

    this.signaling.on(
        "webrtc-answer",
        (from, sdp) => {
          void this.handleAnswer(
              from,
              sdp
          );
        }
    );

    this.signaling.on(
        "webrtc-ice",
        (from, candidate) => {
          void this.handleIceCandidate(
              from,
              candidate
          );
        }
    );

    this.signaling.on(
        "error",
        (message) => {
          console.error(
              "WebRTC signaling error:",
              message
          );
        }
    );

    this.signaling.on(
        "close",
        () => {
          if (!this.isLeaving) {
            this.callbacks.onDisconnect?.();
          }
        }
    );
  }

  async initLocalStream(
      constraints: MediaStreamConstraints = {
        video: true,
        audio: true,
      }
  ): Promise<MediaStream> {
    /**
     * Если поток уже создан, не запрашиваем камеру повторно.
     */
    if (this.localStream) {
      return this.localStream;
    }

    const stream =
        await navigator.mediaDevices.getUserMedia(
            constraints
        );

    if (this.isLeaving) {
      stream.getTracks().forEach((track) => track.stop());
      throw new DOMException("Media initialization was cancelled", "AbortError");
    }

    this.localStream = stream;

    /**
     * Если какие-то peer connections уже появились
     * до получения камеры, добавляем в них треки.
     */
    for (const pc of this.peers.values()) {
      this.attachLocalTracks(pc);
    }

    return stream;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getParticipants(): Participant[] {
    return this.participants;
  }

  join(user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    avatarUrl?: string;
  }) {
    this.isLeaving = false;

    return this.signaling.join(
        this.sessionId,
        this.role,
        user
    );
  }

  leave() {
    this.isLeaving = true;

    this.signaling.leave();

    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }

    this.disconnectTimers.clear();

    this.localStream
        ?.getTracks()
        .forEach((track) => {
          track.stop();
        });

    this.localStream = null;

    for (const pc of this.peers.values()) {
      this.closePeerConnection(pc);
    }

    this.peers.clear();
    this.pendingIceCandidates.clear();
    this.offerInProgress.clear();

    this.participants = [];
    this.selfId = null;
  }

  setAudioEnabled(
      enabled: boolean
  ) {
    this.localStream
        ?.getAudioTracks()
        .forEach((track) => {
          track.enabled = enabled;
        });
  }

  setVideoEnabled(
      enabled: boolean
  ) {
    this.localStream
        ?.getVideoTracks()
        .forEach((track) => {
          track.enabled = enabled;
        });
  }

  async replaceOutgoingVideoTrack(
      track: MediaStreamTrack | null
  ) {
    const tasks: Promise<void>[] = [];

    for (const pc of this.peers.values()) {
      const sender = pc
          .getSenders()
          .find(
              (item) =>
                  item.track?.kind === "video"
          );

      if (sender) {
        tasks.push(
            sender
                .replaceTrack(track)
                .then(() => undefined)
        );
      }
    }

    await Promise.all(tasks);
  }

  private async handleOffer(
      from: ClientId,
      sdp: RTCSessionDescriptionInit
  ) {
    try {
      if (!this.localStream) {
        console.warn(
            "Offer received before local stream was initialized."
        );
        return;
      }

      const pc =
          this.getOrCreatePeer(from);

      /**
       * Если по какой-либо причине одновременно началась
       * локальная negotiation, возвращаем peer в stable.
       */
      if (
          pc.signalingState !== "stable" &&
          pc.signalingState !== "have-remote-offer"
      ) {
        try {
          await pc.setLocalDescription({
            type: "rollback",
          });
        } catch {
          // Некоторые браузеры могут не поддержать rollback.
        }
      }

      await pc.setRemoteDescription(
          new RTCSessionDescription(sdp)
      );

      await this.flushPendingIceCandidates(
          from,
          pc
      );

      const answer =
          await pc.createAnswer();

      await pc.setLocalDescription(
          answer
      );

      if (pc.localDescription) {
        this.signaling.sendAnswer(
            from,
            pc.localDescription
        );
      }
    } catch (error) {
      console.error(
          `Failed to handle WebRTC offer from ${from}:`,
          error
      );
    }
  }

  private async handleAnswer(
      from: ClientId,
      sdp: RTCSessionDescriptionInit
  ) {
    try {
      const pc =
          this.peers.get(from);

      if (!pc) {
        console.warn(
            `Answer received for unknown peer ${from}.`
        );
        return;
      }

      if (
          pc.signalingState !== "have-local-offer"
      ) {
        console.warn(
            `Ignoring answer from ${from} because signaling state is ${pc.signalingState}.`
        );
        return;
      }

      await pc.setRemoteDescription(
          new RTCSessionDescription(sdp)
      );

      await this.flushPendingIceCandidates(
          from,
          pc
      );
    } catch (error) {
      console.error(
          `Failed to handle WebRTC answer from ${from}:`,
          error
      );
    }
  }

  private async handleIceCandidate(
      from: ClientId,
      candidate: RTCIceCandidateInit
  ) {
    if (!candidate) return;

    /**
     * Создаём peer даже если offer ещё не пришёл.
     *
     * Но сам ICE-кандидат добавляем только после
     * установки remoteDescription.
     */
    const pc =
        this.getOrCreatePeer(from);

    if (!pc.remoteDescription) {
      this.queueIceCandidate(
          from,
          candidate
      );

      return;
    }

    try {
      await pc.addIceCandidate(
          new RTCIceCandidate(candidate)
      );
    } catch (error) {
      console.warn(
          `Failed to add ICE candidate from ${from}. Candidate queued for retry.`,
          error
      );

      this.queueIceCandidate(
          from,
          candidate
      );
    }
  }

  private queueIceCandidate(
      peerId: ClientId,
      candidate: RTCIceCandidateInit
  ) {
    const queue =
        this.pendingIceCandidates.get(peerId) ??
        [];

    queue.push(candidate);

    this.pendingIceCandidates.set(
        peerId,
        queue
    );
  }

  private async flushPendingIceCandidates(
      peerId: ClientId,
      pc: RTCPeerConnection
  ) {
    if (!pc.remoteDescription) {
      return;
    }

    const queue =
        this.pendingIceCandidates.get(peerId);

    if (!queue?.length) {
      return;
    }

    this.pendingIceCandidates.delete(peerId);

    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(
            new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.warn(
            `Failed to flush ICE candidate for ${peerId}:`,
            error
        );
      }
    }
  }

  private getOrCreatePeer(
      peerId: ClientId
  ): RTCPeerConnection {
    const existing =
        this.peers.get(peerId);

    if (existing) {
      return existing;
    }

    const pc =
        new RTCPeerConnection({
          iceServers: ICE_SERVERS,
          iceCandidatePoolSize: 10,
        });

    this.attachLocalTracks(pc);

    pc.onicecandidate = (
        event
    ) => {
      if (!event.candidate) {
        return;
      }

      this.signaling.sendIceCandidate(
          peerId,
          event.candidate.toJSON()
      );
    };

    pc.ontrack = (
        event
    ) => {
      const [firstStream] =
          event.streams;

      if (firstStream) {
        this.callbacks.onRemoteStream?.(
            peerId,
            firstStream
        );

        return;
      }

      /**
       * Safari иногда может прислать track без event.streams.
       */
      const fallbackStream =
          new MediaStream([
            event.track,
          ]);

      this.callbacks.onRemoteStream?.(
          peerId,
          fallbackStream
      );
    };

    pc.onconnectionstatechange = () => {
      this.handleConnectionStateChange(
          peerId,
          pc
      );
    };

    pc.oniceconnectionstatechange = () => {
      const state =
          pc.iceConnectionState;

      if (
          state === "failed" &&
          this.role === "teacher"
      ) {
        void this.restartIce(
            peerId,
            pc
        );
      }
    };

    pc.onnegotiationneeded = () => {
      if (
          this.role === "teacher" &&
          pc.signalingState === "stable"
      ) {
        void this.createPeerAndOffer(
            peerId
        );
      }
    };

    this.peers.set(
        peerId,
        pc
    );

    return pc;
  }

  private attachLocalTracks(
      pc: RTCPeerConnection
  ) {
    if (!this.localStream) {
      return;
    }

    const existingTrackIds =
        new Set(
            pc
                .getSenders()
                .map(
                    (sender) =>
                        sender.track?.id
                )
                .filter(
                    (id): id is string =>
                        Boolean(id)
                )
        );

    for (
        const track of
        this.localStream.getTracks()
        ) {
      if (
          existingTrackIds.has(track.id)
      ) {
        continue;
      }

      pc.addTrack(
          track,
          this.localStream
      );
    }
  }

  private handleConnectionStateChange(
      peerId: ClientId,
      pc: RTCPeerConnection
  ) {
    const state =
        pc.connectionState;

    console.info(
        `WebRTC peer ${peerId} connection state: ${state}`
    );

    if (
        state === "connected"
    ) {
      this.clearDisconnectTimer(
          peerId
      );

      return;
    }

    if (
        state === "disconnected"
    ) {
      this.startDisconnectTimer(
          peerId,
          pc
      );

      return;
    }

    if (
        state === "failed"
    ) {
      this.clearDisconnectTimer(
          peerId
      );

      if (
          this.role === "teacher"
      ) {
        void this.restartIce(
            peerId,
            pc
        );

        return;
      }

      this.callbacks.onPeerLeft?.(
          peerId
      );

      return;
    }

    if (
        state === "closed"
    ) {
      this.clearDisconnectTimer(
          peerId
      );

      this.callbacks.onPeerLeft?.(
          peerId
      );
    }
  }

  private startDisconnectTimer(
      peerId: ClientId,
      pc: RTCPeerConnection
  ) {
    this.clearDisconnectTimer(
        peerId
    );

    const timer =
        setTimeout(() => {
          this.disconnectTimers.delete(
              peerId
          );

          if (
              pc.connectionState ===
              "disconnected"
          ) {
            if (
                this.role === "teacher"
            ) {
              void this.restartIce(
                  peerId,
                  pc
              );
            } else {
              this.callbacks.onPeerLeft?.(
                  peerId
              );
            }
          }
        }, DISCONNECTED_GRACE_PERIOD_MS);

    this.disconnectTimers.set(
        peerId,
        timer
    );
  }

  private clearDisconnectTimer(
      peerId: ClientId
  ) {
    const timer =
        this.disconnectTimers.get(peerId);

    if (timer) {
      clearTimeout(timer);

      this.disconnectTimers.delete(
          peerId
      );
    }
  }

  private async restartIce(
      peerId: ClientId,
      pc: RTCPeerConnection
  ) {
    if (
        this.role !== "teacher" ||
        this.offerInProgress.has(peerId) ||
        pc.signalingState !== "stable" ||
        pc.connectionState === "closed"
    ) {
      return;
    }

    this.offerInProgress.add(
        peerId
    );

    try {
      pc.restartIce();

      const offer =
          await pc.createOffer({
            iceRestart: true,
          });

      await pc.setLocalDescription(
          offer
      );

      if (pc.localDescription) {
        this.signaling.sendOffer(
            peerId,
            pc.localDescription
        );
      }
    } catch (error) {
      console.error(
          `Failed to restart ICE for ${peerId}:`,
          error
      );
    } finally {
      this.offerInProgress.delete(
          peerId
      );
    }
  }

  private async createPeerAndOffer(
      peerId: ClientId
  ) {
    if (
        this.role !== "teacher" ||
        !this.localStream ||
        this.offerInProgress.has(peerId)
    ) {
      return;
    }

    const pc =
        this.getOrCreatePeer(peerId);

    /**
     * В старом коде было:
     *
     * if (this.peers.has(peerId)) return;
     *
     * Это ломало соединение, когда peer был создан
     * раньше из-за входящего ICE-кандидата.
     */
    if (
        pc.connectionState === "closed" ||
        pc.signalingState !== "stable"
    ) {
      return;
    }

    this.offerInProgress.add(
        peerId
    );

    try {
      const offer =
          await pc.createOffer();

      await pc.setLocalDescription(
          offer
      );

      if (pc.localDescription) {
        this.signaling.sendOffer(
            peerId,
            pc.localDescription
        );
      }
    } catch (error) {
      console.error(
          `Failed to create WebRTC offer for ${peerId}:`,
          error
      );
    } finally {
      this.offerInProgress.delete(
          peerId
      );
    }
  }

  private removePeer(
      peerId: ClientId,
      notify: boolean
  ) {
    this.clearDisconnectTimer(
        peerId
    );

    const pc =
        this.peers.get(peerId);

    if (pc) {
      this.closePeerConnection(
          pc
      );
    }

    this.peers.delete(peerId);
    this.pendingIceCandidates.delete(peerId);
    this.offerInProgress.delete(peerId);

    this.participants =
        this.participants.filter(
            (participant) =>
                participant.id !== peerId
        );

    this.callbacks.onPeersChange?.(
        this.participants
    );

    if (notify) {
      this.callbacks.onPeerLeft?.(
          peerId
      );
    }
  }

  private closePeerConnection(
      pc: RTCPeerConnection
  ) {
    pc.ontrack = null;
    pc.onicecandidate = null;
    pc.onconnectionstatechange = null;
    pc.oniceconnectionstatechange = null;
    pc.onnegotiationneeded = null;

    if (
        pc.signalingState !== "closed"
    ) {
      pc.close();
    }
  }
}