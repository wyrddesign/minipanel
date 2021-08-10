#include "Message.h"

// The three button Arduino Nano-based minipanel. This was wired upside-down.
// #define MINIPANEL_V1_3_BTN

// The two button Arduino Nano-based minipanel.
#define MINIPANEL_V1_2_BTN

// The two button Qt Py-based minipanel.
// #define MINIPANEL_V2_2_BTN

#ifdef MINIPANEL_V1_3_BTN
const uint8_t VERSION = MSG_PROBE_V1;
const uint8_t NUM_BUTTONS = 3;
const uint8_t SWITCH_PINS[NUM_BUTTONS] = {2, 4, 6};
const uint8_t LED_PINS[NUM_BUTTONS] = {3, 5, 7};
#endif
#ifdef MINIPANEL_V1_2_BTN
const uint8_t VERSION = MSG_PROBE_V1;
const uint8_t NUM_BUTTONS = 2;
const uint8_t SWITCH_PINS[NUM_BUTTONS] = {7, 5};
const uint8_t LED_PINS[NUM_BUTTONS] = {8, 6};
#endif

static uint8_t values[NUM_BUTTONS];
static uint8_t lastValues[NUM_BUTTONS];
static uint8_t serialBuf[8];

static Message *sending;
static Message *receiving;
static RcvState rcvState;
static Mode mode;

bool rcvMessage(Message *msg, RcvState &rcvState) {
  if (!Serial.available()) {
    return false;
  }
  return readMessage(Serial.read(), msg, rcvState);
}

void sndMessage(Message *msg) {
  Serial.write(serialBuf, writeMessage(msg, serialBuf));
}

void awaitConnection() {
  while(1) {
    if (rcvMessage(receiving, rcvState) && receiving->type == MSG_TYPE_PROBE) {
        // Send the same message back  
        sndMessage(receiving);
        return;
    }
    delay(50);
  }
}

void toggleKey(uint8_t idx, bool isOn) {
  switch(mode) {
    case Mode::SingleKey:
      for (uint8_t i=0; i<NUM_BUTTONS; i+=1) {
        digitalWrite(LED_PINS[i], i == idx && isOn ? HIGH : LOW);
      }
      break;
    case Mode::MultiKey:
      digitalWrite(LED_PINS[idx], isOn ? HIGH : LOW);
      break;
  }
}

void onProbe(Message *msg) {
  // Send the same message back
  sndMessage(msg);
}

void onKeyOn(Message *msg) {
  toggleKey(msg->data, true);
}

void onKeyOff(Message *msg) {
  toggleKey(msg->data, false);
}

void onModeSingleKey(Message *msg) {
  mode = Mode::SingleKey;
}

void onModeMultiKey(Message *msg) {
  mode = Mode::MultiKey;
}

void onMessage(Message *msg) {
  switch(msg->type) {
    case MSG_TYPE_PROBE:
      onProbe(msg);
      break;
    case MSG_TYPE_KEY_ON:
      onKeyOn(msg);
      break;
    case MSG_TYPE_KEY_OFF:
      onKeyOff(msg);
      break;
    case MSG_TYPE_MODE_SINGLE_KEY:
      onModeSingleKey(msg);
      break;
    case MSG_TYPE_MODE_MULTI_KEY:
      onModeMultiKey(msg);
      break;
    default:
      // Message not supported
      break;
  }
}

void setup() {
  for (uint8_t i=0; i < NUM_BUTTONS; i += 1) {
    values[i] = LOW;
    lastValues[i] = HIGH;
    pinMode(SWITCH_PINS[i], INPUT_PULLUP);
    pinMode(LED_PINS[i], OUTPUT);
  }
  sending = new Message();
  receiving = new Message();
  rcvState = RcvState::Idle;
  mode = Mode::SingleKey;
  Serial.begin(9600);
  // awaitConnection();
}

void loop() {
  // Read all the current values
  for (uint8_t i=0; i<NUM_BUTTONS; i+=1) {
    values[i] = digitalRead(SWITCH_PINS[i]);
  }

  // Detect pressed buttons
  int lastPressedIdx = -1;
  bool wasPressed[NUM_BUTTONS] = {false};
  for (uint8_t i=0; i<NUM_BUTTONS; i+=1) {
    if (values[i] == LOW && lastValues[i] == HIGH) {
      wasPressed[i] = true;
      lastPressedIdx = i;
    }
    lastValues[i] = values[i];
  }

  // Pack the pressed indices into a byte
  if (lastPressedIdx != -1) {
    for (uint8_t i=0; i<NUM_BUTTONS; i+=1) {
      if (wasPressed[i]) {
          sending->type = MSG_TYPE_KEY_ON;
          sending->data = i;
          sndMessage(sending);
      }
    }
  }

  if (rcvMessage(receiving, rcvState)) {
    onMessage(receiving);
  }

  delay(5);
}
