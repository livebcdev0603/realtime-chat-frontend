import PropTypes from 'prop-types';
import React, { createContext, useContext, useState } from 'react';
import { initSocket } from '../socket';

const INIT_SOCKET_STATE = {
  socket: null,
  socketId: null,
  onlineUsers: null,
  messageData: null,
  messageReadStatus: null,
  typingNotify: null
};

const SocketContext = createContext(INIT_SOCKET_STATE);
export const useSocketContext = () => useContext(SocketContext);

function SocketContextProvider({ children }) {
  const [socketValue, setSocketValue] = useState(INIT_SOCKET_STATE);

  const socketConnect = () => {
    return initSocket({ setSocketValue });
  };

  const resetSocketValue = (key) => {
    key ? setSocketValue((prev) => ({ ...prev, [key]: null })) : setSocketValue(INIT_SOCKET_STATE);
  };

  return (
    <SocketContext.Provider value={{ socketConnect, socketValue, setSocketValue, resetSocketValue }}>
      {children}
    </SocketContext.Provider>
  );
}

SocketContextProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export default SocketContextProvider;
