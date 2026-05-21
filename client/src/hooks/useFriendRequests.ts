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
  const { pendingRequests, setPendingRequests, addPendingRequest, removePendingRequest } =
    useChatStore();

  useEffect(() => {
    getPendingRequests()
      .then(setPendingRequests)
      .catch(console.error);
  }, [setPendingRequests]);

  useEffect(() => {
    if (!socket) return;
    const onFriendRequest = (req: FriendRequest) => {
      addPendingRequest(req);
    };
    socket.on("friend_request", onFriendRequest);
    return () => {
      socket.off("friend_request", onFriendRequest);
    };
  }, [socket, addPendingRequest]);

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
