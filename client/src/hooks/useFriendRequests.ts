import { useEffect, useCallback } from "react";
import { useSocket } from "./useSocket";
import { useChatStore } from "../store/useChatStore";
import {
  getPendingRequests,
  respondToRequest,
} from "../services/userService";
import type { FriendRequest } from "../types";

export const useFriendRequests = () => {
  const { socket } = useSocket();
  const { pendingRequests, setPendingRequests, removePendingRequest } =
    useChatStore();

  // Fetch on mount
  useEffect(() => {
    getPendingRequests()
      .then(setPendingRequests)
      .catch(console.error);
  }, [setPendingRequests]);

  // Listen for real-time friend request notifications
  useEffect(() => {
    if (!socket) return;
    const onFriendRequest = (req: FriendRequest) => {
      setPendingRequests([req, ...pendingRequests]);
    };
    socket.on("friend_request", onFriendRequest);
    return () => { socket.off("friend_request", onFriendRequest); };
  }, [socket, pendingRequests, setPendingRequests]);

  const acceptRequest = useCallback(
    async (requestId: string) => {
      await respondToRequest(requestId, "ACCEPT");
      removePendingRequest(requestId);
    },
    [removePendingRequest]
  );

  const rejectRequest = useCallback(
    async (requestId: string) => {
      await respondToRequest(requestId, "REJECT");
      removePendingRequest(requestId);
    },
    [removePendingRequest]
  );

  return { pendingRequests, acceptRequest, rejectRequest };
};
