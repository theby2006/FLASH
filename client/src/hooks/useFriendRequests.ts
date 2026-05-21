import { useEffect, useCallback } from "react";
import { useSocket } from "./useSocket";
import { useChatStore } from "../store/useChatStore";
import { respondToRequest, getContacts } from "../services/userService";
import { getConversations } from "../services/chatService";
import type { FriendRequest } from "../types";

export const useFriendRequests = () => {
  const { socket } = useSocket();
  const {
    pendingRequests,
    addPendingRequest,
    removePendingRequest,
    setContacts,
    setConversations,
  } = useChatStore();

  const refreshFriendsAndChats = useCallback(async () => {
    const [contacts, convs] = await Promise.all([
      getContacts(),
      getConversations(),
    ]);
    setContacts(contacts);
    setConversations(convs);
  }, [setContacts, setConversations]);

  useEffect(() => {
    if (!socket) return;

    const onFriendRequest = (req: FriendRequest) => {
      addPendingRequest(req);
    };

    const onFriendAccepted = () => {
      void refreshFriendsAndChats();
    };

    socket.on("friend_request", onFriendRequest);
    socket.on("friend_accepted", onFriendAccepted);
    return () => {
      socket.off("friend_request", onFriendRequest);
      socket.off("friend_accepted", onFriendAccepted);
    };
  }, [socket, addPendingRequest, refreshFriendsAndChats]);

  const acceptRequest = useCallback(
    async (requestId: string) => {
      await respondToRequest(requestId, "ACCEPT");
      removePendingRequest(requestId);
      await refreshFriendsAndChats();
    },
    [removePendingRequest, refreshFriendsAndChats]
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
