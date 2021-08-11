#include "ButtonPanel.h"

// using namespace std;

// MessageHub::MessageHub(unique_ptr<serial::Serial> connection) {
//     this->connection = move(connection);
//     message = make_unique<Message>();
//     rcvState = RcvState::Idle;
// }

// void MessageHub::writeMessage(uint8_t type, uint8_t data) {
//     unique_ptr<Message> message(new Message);
//     message->type = type;
//     message->data = data;
//     writeMessage(move(message));
// }

// void MessageHub::writeMessage(unique_ptr<Message> message) {
//     size_t size = ::writeMessage(message.get(), writeBuf);
//     connection->write(writeBuf, size);
// }

// unique_ptr<Message> MessageHub::readMessageSync(unsigned long timeoutMs) { 
//     chrono::system_clock::time_point startTimeMs = chrono::system_clock::now();
//     chrono::milliseconds timeoutChronoMs = chrono::milliseconds(timeoutMs);
//     while(chrono::system_clock::now() - startTimeMs < timeoutChronoMs) {
//         unique_ptr<Message> message = readMessage();
//         if (message) {
//             return message;
//         }
//         this_thread::sleep_for(10ms);
//     }
//     return unique_ptr<Message>();
// }

// unique_ptr<Message> MessageHub::readMessage() {
//     if (!connection->available()) {
//         return NULL;
//     }
//     if (!connection->read(readBuf, 1)) {
//         return NULL;
//     }
//     if (::readMessage(readBuf[0], message.get(), &rcvState)) {
//         unique_ptr<Message> retMessage(new Message);
//         retMessage.swap(message);
//         return retMessage;
//     } else {
//         return NULL;
//     }
// }