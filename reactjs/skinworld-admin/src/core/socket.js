import openSocket from 'socket.io-client';
import { toastr } from 'react-redux-toastr';

const socket = openSocket(process.env.REACT_APP_SOCKET_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax : 5000,
    reconnectionAttempts: 5,
    transports: ['websocket']
});

const subscribe = (cb) => {
  socket.on('sync', payload => {
    toastr.info(payload.type, payload.message);
  });
}
export { subscribe };