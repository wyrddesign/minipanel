#ifndef MESSAGE_H
#define MESSAGE_H

#include <stdint.h>
#include <stddef.h>

const uint8_t START_MSG_MARKER =          0xff;
const uint8_t MSG_TYPE_PROBE =            0x00;
const uint8_t MSG_TYPE_KEY_PRESS =        0x01;
const uint8_t MSG_TYPE_KEY_ON =           0x02;
const uint8_t MSG_TYPE_KEY_OFF =          0x03;
const uint8_t MSG_TYPE_KEY_MODE =         0x04;

const uint8_t MSG_PROBE_QUERY_VERSION =   0x00;
const uint8_t MSG_PROBE_V1 =              0x01;
const uint8_t MSG_PROBE_V2 =              0x02;

const uint8_t MSG_KEY_MODE_SINGLE_KEY =   0x00;
const uint8_t MSG_KEY_MODE_MULTI_KEY =    0x01;


struct ProbeData {
  uint8_t version;
  uint8_t numButtons;
};

struct Message {
  uint8_t type;

  union {
    // Probe
    ProbeData probe;

    // KeyPress, KeyOn, KeyOff
    uint8_t idx;

    // KeyMode
    uint8_t mode;

    // Unsupported message type
    uint8_t data;
  };
};

enum class KeyMode {
  // Only allow one key to be lit or pressed at a time.
  SingleKey,
  
  // Allow any number of keys to be lit or pressed at the same time.
  MultiKey 
};

enum class RcvState {
  Idle,
  AwaitType,
  AwaitData
};

// Write a message to the serial connection byte buffer.
// The number of bytes that should be written are returned.
size_t writeMessage(Message *msg, uint8_t bytes[]);

// Parse a message byte by byte from the serial connection.
// If true is returned, a message has been parsed.
bool readMessage(uint8_t byte, Message *msg, RcvState &rcvState);

#endif