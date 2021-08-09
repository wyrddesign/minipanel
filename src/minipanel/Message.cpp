#include "Message.h"

size_t writeMessage(Message *msg, uint8_t bytes[]) {
  bytes[0] = START_MSG_MARKER;
  bytes[1] = msg->type;
  bytes[2] = msg->data;
  return 3;
}

bool readMessage(uint8_t byte, Message *msg, RcvState &rcvState) {
  switch(rcvState) {
    case RcvState::Idle:
      if (byte == START_MSG_MARKER) {
        rcvState = RcvState::AwaitType;
      }
      return false;
    case RcvState::AwaitType:
      msg->type = byte;
      rcvState = RcvState::AwaitData;
      return false;
    case RcvState::AwaitData:
      msg->data = byte;
      rcvState = RcvState::Idle;
      return true;
    default:
      return false;
  }
}