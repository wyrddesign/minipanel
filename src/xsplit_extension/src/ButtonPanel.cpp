#include <cstdio>
#include <queue>
#include <future>

#include "ButtonPanel.h"

unique_ptr<Message> msgProbe() {
    return unique_ptr<Message>(new Message{MSG_TYPE_PROBE, 0x0});
}

unique_ptr<Message> msgKeyOn(uint8_t key) {
    return unique_ptr<Message>(new Message{MSG_TYPE_KEY_ON, key});
}

unique_ptr<Message> msgKeyOff(uint8_t key) {
    return unique_ptr<Message>(new Message{MSG_TYPE_KEY_OFF, key});
}

ButtonPanel::ButtonPanel(unique_ptr<serial::Serial> connection) {
    this->shouldCancelListenForever = false;
    this->mailbox = make_unique<ButtonPanelMailbox>(move(connection));
}

unique_ptr<ButtonPanel> ButtonPanel::probe() {
    auto devices_found = serial::list_ports();
    auto iter = devices_found.begin();
    unique_ptr<serial::Serial> connection;

    while(iter != devices_found.end()) {
        try {
            auto device = *iter++;
            connection = make_unique<serial::Serial>(device.port, BUTTON_PANEL_BAUD_RATE, serial::Timeout::simpleTimeout(PROBE_TIMEOUT_MS.count()));
            printf("%s: Probing.\n", connection->getPort().c_str());

            // Disable the Arduino from resetting the wrong way?
            connection->setDTR(false);
            
            // Wait for the Arduino to reset.
            this_thread::sleep_for(ARDUINO_RESET_TIME_MS);
            
            // Treat this connection as a button panel
            auto buttonPanel = make_unique<ButtonPanel>(move(connection));

            // Confirm it's a button panel
            if (buttonPanel->sendProbe(PROBE_READ_TIMEOUT_MS)) {
                printf("Button panel found.\n");
                return buttonPanel;
            }
        } catch (std::exception _) {
            // Ignore this com port
        }
    }
    return unique_ptr<ButtonPanel>();
}

unique_ptr<Message> ButtonPanel::send(unique_ptr<Message> message, milliseconds timeoutMs) {
    return mailbox->send(move(message), timeoutMs);
}

bool ButtonPanel::sendProbe(milliseconds timeoutMs) {
    auto message = mailbox->send(msgProbe(), timeoutMs);
    return message && message->type == MSG_TYPE_PROBE;
}

void ButtonPanel::listenForever(function<unique_ptr<Message>(unique_ptr<Message>)> onMessage) {
    auto inbox = make_unique<queue<unique_ptr<Message>>>();

    while(!shouldCancelListenForever.load()) {
        auto received = mailbox->receive();
        if (received) {
            inbox->push(move(received));
        }
        if (!inbox->empty()) {
            auto message = move(inbox->front());
            inbox->pop();
            auto toSend = onMessage(move(message));
            if (toSend) {
                mailbox->sendNoWait(move(toSend));
            }
        }
        this_thread::sleep_for(10ms);
    }
}

void ButtonPanel::cancelListenForever() {
    shouldCancelListenForever = true;
}