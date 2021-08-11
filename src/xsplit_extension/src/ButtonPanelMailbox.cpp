#include "ButtonPanel.h"
#include <thread>

ButtonPanelMailbox::ButtonPanelMailbox(unique_ptr<serial::Serial> connection) {
    this->message = unique_ptr<Message>(new Message);
    this->rcvState = RcvState::Idle;
    this->connection = move(connection);
}

unique_ptr<Message> ButtonPanelMailbox::receive() {
    if (!connection->available()) {
        return nullptr;
    }
    if (!connection->read(readBuf, 1)) {
        return nullptr;
    }
    if (::readMessage(readBuf[0], message.get(), rcvState)) {
        auto message = unique_ptr<Message>(new Message);
        this->message.swap(message);
        return message;
    } else {
        return nullptr;
    }
}

unique_ptr<Message> ButtonPanelMailbox::send(unique_ptr<Message> message, milliseconds timeoutMs) {
    sendNoWait(move(message));
    auto startTimeMs = system_clock::now();
    while(system_clock::now() - startTimeMs < timeoutMs) {
        auto received = receive();
        if (received) {
            return received;
        }
        this_thread::sleep_for(10ms);
    }
    return unique_ptr<Message>();
}

void ButtonPanelMailbox::sendNoWait(unique_ptr<Message> message) {
    size_t size = ::writeMessage(message.get(), writeBuf);
    connection->write(writeBuf, size);
}
