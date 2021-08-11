#include "ButtonPanel.h"

using namespace std;

int main() {
    auto buttonPanel = ButtonPanel::probe();
    if (buttonPanel) {
        buttonPanel->listenForever([](unique_ptr<Message> message) -> auto{
            printf("%02x %02x\n", message->type, message->data);
            if (message->type == MSG_TYPE_KEY_ON) {
                // Send this message back to light up the pressed key
                return msgKeyPress(message->data);
            } else {
                return unique_ptr<Message>();
            }
        });
    }
}