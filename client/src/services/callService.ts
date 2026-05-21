import api from "./api";

export type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export async function fetchIceServers(): Promise<{
  iceServers: RTCIceServer[];
  turnConfigured: boolean;
}> {
  const res = await api.get<{
    success: boolean;
    data: { iceServers: IceServerConfig[]; turnConfigured: boolean };
  }>("/api/calls/ice-servers");

  const iceServers: RTCIceServer[] = res.data.data.iceServers.map((s) => ({
    urls: s.urls,
    ...(s.username ? { username: s.username } : {}),
    ...(s.credential ? { credential: s.credential } : {}),
  }));

  return {
    iceServers,
    turnConfigured: res.data.data.turnConfigured,
  };
}
