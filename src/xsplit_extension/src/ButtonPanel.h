#ifndef BUTTON_PANEL_H
#define BUTTON_PANEL_H

#include <atomic>
#include <memory>
#include <chrono>
#include <functional>

#include "Message.h"
#include "serial/serial.h"

using namespace std;
using namespace chrono;

const size_t WRITE_BUF_SIZE = 8;
const size_t READ_BUF_SIZE = 8;
const uint32_t BUTTON_PANEL_BAUD_RATE = 9600;
const milliseconds PROBE_TIMEOUT_MS = 500ms;
const milliseconds PROBE_READ_TIMEOUT_MS = 3000ms;
const milliseconds ARDUINO_RESET_TIME_MS = 2000ms;

unique_ptr<Message> msgProbe();
unique_ptr<Message> msgKeyPress(uint8_t key);

class ButtonPanelMailbox;

class ButtonPanel {
    public:
        // Discover which port the button panel is on.
        static unique_ptr<ButtonPanel> probe();

        // Listen for new messages forever. Any message return from the lambda will be sent as a response.
        // This is a syncronous function.
        void listenForever(function<unique_ptr<Message>(unique_ptr<Message>)> onMessage);
    
        // Stop listening for messages.
        void cancelListenForever();

        explicit ButtonPanel(unique_ptr<serial::Serial> connection);
    
    private:
        atomic_bool shouldCancelListenForever;

        unique_ptr<ButtonPanelMailbox> mailbox;

        // Send a message and await the response.
        unique_ptr<Message> send(unique_ptr<Message> message, milliseconds timeoutMs);

        // Send and await a probe response, returning true if it was received.
        bool sendProbe(milliseconds timeoutMs);
};

class ButtonPanelMailbox {
    public:
        // Send a message and await the response.
        unique_ptr<Message> send(unique_ptr<Message> message, milliseconds timeoutMs);

        // Send a message but not await the response.
        void sendNoWait(unique_ptr<Message> message);

        // Read incoming data until a message is ready, then return it.
        unique_ptr<Message> receive();

        explicit ButtonPanelMailbox(unique_ptr<serial::Serial> connection);

    private:
        // Messages sent to the Arduino are written to this buffer.
        uint8_t writeBuf[WRITE_BUF_SIZE];

        // Messages received from the Arduino are written to this buffer.
        uint8_t readBuf[READ_BUF_SIZE];

        // A message being built from calls to readMessage().
        unique_ptr<Message> message;

        // The current state of reading a message.
        RcvState rcvState;

        // The serial connection, owned by this object
        unique_ptr<serial::Serial> connection;
};

#endif