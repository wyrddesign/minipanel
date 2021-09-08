#include "Message.h"

size_t writeMessage(Message *msg, uint8_t bytes[]) {
  bytes[0] = START_MSG_MARKER;
  bytes[1] = msg->type;
  switch(msg->type) {
    case MSG_TYPE_PROBE:
      bytes[2] = msg->probe.version + ((msg->probe.numButtons - 1) << 4);
      break;
    case MSG_TYPE_KEY_PRESS:
      bytes[2] = msg->idx;
      break;
    case MSG_TYPE_KEY_ON:
      bytes[2] = msg->idx;
      break;
    case MSG_TYPE_KEY_OFF:
      bytes[2] = msg->idx;
      break;
    case MSG_TYPE_KEY_MODE:
      bytes[2] = msg->idx;
      break;
    default:
      bytes[2] = msg->data;
      break;
  }
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
      switch(msg->type) {
        case MSG_TYPE_PROBE:
          msg->probe.version = byte & 0xf;
          msg->probe.numButtons = (byte >> 4) + 1;
          break;
        case MSG_TYPE_KEY_PRESS:
          msg->idx = byte;
          break;
        case MSG_TYPE_KEY_ON:
          msg->idx = byte;
          break;
        case MSG_TYPE_KEY_OFF:
          msg->idx = byte;
          break;
        case MSG_TYPE_KEY_MODE:
          msg->mode = byte;
          break;
        default:
          msg->data = byte;
          break;
      }
      rcvState = RcvState::Idle;
      return true;
    default:
      return false;
  }
}