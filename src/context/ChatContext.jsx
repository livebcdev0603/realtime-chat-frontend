import PropTypes from 'prop-types';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAxios } from '../hooks/useAxios';
import { chatAPI } from '../api';
import { useAuthContext } from '../context/AuthContext';
import { useSocketContext } from '../context/SocketContext';
import { socketEmitEvent } from '../socket/emit';

export const ChatContext = createContext({});

export const useChatContext = () => useContext(ChatContext);

function ChatContextProvider({ children }) {
  const { user } = useAuthContext();
  const {
    socketValue: { socket, onlineUsers, messageData }
  } = useSocketContext();
  const [chatInfo, setChatInfo] = useLocalStorage('chat-app-chat-info', null);
  const [contacts, setContacts] = useState([]);

  const { sendRequest: getUserContacts } = useAxios();
  const { sendRequest: updateReadStatus } = useAxios();

  const chatId = chatInfo?._id || null;
  const contactsWithOnlineStatus = contacts.map((contact) => ({
    ...contact,
    isOnline: onlineUsers?.some((user) => user.userId === contact._id) || false
  }));

  const fetchUserContacts = useCallback(() => {
    if (user) {
      return getUserContacts(
        {
          method: 'GET',
          url: chatAPI.getUserContacts(user._id)
        },
        (data) => {
          setContacts(data.data);
        }
      );
    }
  }, [user, getUserContacts]);

  // fetch user contacts
  useEffect(() => {
    fetchUserContacts();
  }, [fetchUserContacts]);

  // 更新最新訊息
  const updateContactLatestMessage = useCallback(
    (latestMessageData) => {
      const { updateId, sender, message, updatedAt, unreadCount } = latestMessageData;

      setContacts((prevContact) =>
        prevContact.map((contact) => {
          return contact._id === updateId
            ? {
                ...contact,
                latestMessage: message,
                latestMessageSender: sender,
                latestMessageUpdatedAt: updatedAt,
                unreadCount: chatId === sender ? 0 : unreadCount
              }
            : contact;
        })
      );
    },
    [chatId]
  );

  // 有新訊息時，更新 contact 最新訊息
  useEffect(() => {
    if (messageData) {
      updateContactLatestMessage({ ...messageData, updateId: messageData.sender });
    }
  }, [messageData, updateContactLatestMessage]);

  // 通知對方自己已讀
  const updateMessageStatusToRead = (chatId, type) => {
    // API 更新對方發出的訊息為已讀
    updateReadStatus({
      method: 'PUT',
      url: chatAPI.updateReadStatus({
        userId: user._id,
        chatId,
        type
      })
    });
    // socket 告知對方「自己」已讀
    // socketEmitEvent(socket).updateMessageStatus({
    //   readerId: user._id,
    //   messageSender: chatId,
    //   type
    // });
    // TODO:
    socketEmitEvent(socket).updateMessageReaders({
      readerId: user._id,
      toId: chatId,
      type
    });
  };

  const handleChatSelect = async (selected) => {
    if (selected._id !== chatId) {
      if (selected.chatType === 'room') {
        socketEmitEvent(socket).enterChatRoom({ roomId: selected._id, message: `${user.name} 已加入聊天` });
      }
      if (chatInfo?.chatType === 'room') {
        socketEmitEvent(socket).leaveChatRoom({ roomId: chatId, message: `${user.name} 已離開聊天` });
      }
      setChatInfo(selected);
      // updateMessageStatusToRead(selected._id, selected.chatType);
      setContacts((prevContacts) =>
        prevContacts.map((prev) => (prev._id === selected._id ? { ...prev, unreadCount: 0 } : prev))
      );
    }
  };

  return (
    <ChatContext.Provider
      value={{
        chatId,
        chatInfo,
        setChatInfo,
        setContacts,
        handleChatSelect,
        contactsWithOnlineStatus,
        updateContactLatestMessage,
        updateMessageStatusToRead,
        fetchUserContacts
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

ChatContextProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default ChatContextProvider;
