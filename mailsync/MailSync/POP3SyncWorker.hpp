//
//  POP3SyncWorker.hpp
//  MailSync
//
//  Created for Mailspring POP3 Support.
//  Copyright © 2026 Foundry 376 / Mailspring Contributors. All rights reserved.
//

#ifndef POP3SyncWorker_hpp
#define POP3SyncWorker_hpp

#include <stdio.h>
#include <atomic>
#include <condition_variable>
#include <memory>
#include <mutex>
#include <set>
#include <string>
#include <vector>

#include <libetpan/mailpop3.h>
#include <libetpan/mailpop3_ssl.h>
#include <libetpan/mailpop3_socket.h>

#include <MailCore/MailCore.h>

#include "Account.hpp"
#include "MailStore.hpp"
#include "MailProcessor.hpp"
#include "DeltaStream.hpp"
#include "Folder.hpp"

using namespace std;
using namespace mailcore;

class POP3SyncWorker {
    shared_ptr<spdlog::logger> logger;
    MailStore * store;
    MailProcessor * processor;

    std::atomic<bool> shouldStop{false};
    std::atomic<bool> shouldWake{false};
    std::mutex cvMtx;
    std::condition_variable cv;

public:
    shared_ptr<Account> account;

    POP3SyncWorker(shared_ptr<Account> account);
    ~POP3SyncWorker();

    void wake();
    void stop();

    bool syncNow();
    std::vector<std::shared_ptr<Folder>> ensureFolders();

private:
    mailpop3 * connectAndLogin(string & errorService, ErrorCode & outErr);
    void disconnect(mailpop3 * pop3);
    uint32_t getNextPOP3UID();
};

#endif /* POP3SyncWorker_hpp */
