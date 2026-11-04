//
//  POP3SyncWorker.cpp
//  MailSync
//
//  Created for Mailspring POP3 Support.
//  Copyright © 2026 Foundry 376 / Mailspring Contributors. All rights reserved.
//

#include "POP3SyncWorker.hpp"
#include "MailUtils.hpp"
#include "SyncException.hpp"

POP3SyncWorker::POP3SyncWorker(shared_ptr<Account> account) :
    logger(spdlog::get("logger")),
    store(new MailStore()),
    processor(new MailProcessor(account, store)),
    account(account)
{
    store->setStreamDelay(500);

    // Initialize the UIDL tracking table for POP3 sync
    store->db().exec(
        "CREATE TABLE IF NOT EXISTS POP3UIDL ("
        "accountId TEXT NOT NULL, "
        "uidl TEXT NOT NULL, "
        "messageId TEXT, "
        "pop3_uid INTEGER, "
        "fetchedAt INTEGER, "
        "PRIMARY KEY (accountId, uidl));"
    );
}

POP3SyncWorker::~POP3SyncWorker()
{
    stop();
    delete processor;
    delete store;
}

void POP3SyncWorker::wake()
{
    shouldWake = true;
    cv.notify_all();
}

void POP3SyncWorker::stop()
{
    shouldStop = true;
    cv.notify_all();
}

mailpop3 * POP3SyncWorker::connectAndLogin(string & errorService, ErrorCode & outErr)
{
    errorService = "pop3";
    outErr = ErrorCode::ErrorNone;

    mailpop3 * pop3 = mailpop3_new(0, NULL);
    if (!pop3) {
        logger->error("Failed to allocate mailpop3 session");
        outErr = ErrorCode::ErrorMemory;
        return nullptr;
    }
    mailpop3_set_timeout(pop3, 30);

    string host = account->POP3Host();
    uint16_t port = (uint16_t)account->POP3Port();
    string security = account->POP3Security();
    int r = 0;

    logger->info("Connecting to POP3 server {}:{} (security: {})", host, port, security);

    if (security == "SSL / TLS") {
        r = mailpop3_ssl_connect(pop3, host.c_str(), port);
    } else {
        r = mailpop3_socket_connect(pop3, host.c_str(), port);
        if (r == MAILPOP3_NO_ERROR && security == "STARTTLS") {
            r = mailpop3_stls(pop3);
        }
    }

    if (r != MAILPOP3_NO_ERROR) {
        logger->error("POP3 connection failed: code {}", r);
        if (r == MAILPOP3_ERROR_SSL || r == MAILPOP3_ERROR_STLS_NOT_SUPPORTED) {
            outErr = ErrorCode::ErrorTLSNotAvailable;
        } else {
            outErr = ErrorCode::ErrorConnection;
        }
        mailpop3_free(pop3);
        return nullptr;
    }

    r = mailpop3_user(pop3, account->POP3Username().c_str());
    if (r != MAILPOP3_NO_ERROR) {
        logger->error("POP3 USER command rejected: code {}", r);
        outErr = ErrorCode::ErrorAuthentication;
        disconnect(pop3);
        return nullptr;
    }

    r = mailpop3_pass(pop3, account->POP3Password().c_str());
    if (r != MAILPOP3_NO_ERROR) {
        logger->error("POP3 PASS command rejected: code {}", r);
        outErr = ErrorCode::ErrorAuthentication;
        disconnect(pop3);
        return nullptr;
    }

    logger->info("POP3 authentication successful for {}", account->emailAddress());
    return pop3;
}

void POP3SyncWorker::disconnect(mailpop3 * pop3)
{
    if (!pop3) return;
    mailpop3_quit(pop3);
    mailpop3_free(pop3);
}

std::vector<std::shared_ptr<Folder>> POP3SyncWorker::ensureFolders()
{
    std::vector<std::shared_ptr<Folder>> folders;
    struct FolderDef {
        string path;
        string role;
    };
    vector<FolderDef> defaults = {
        {"INBOX", "inbox"},
        {"Sent Messages", "sent"},
        {"Drafts", "drafts"},
        {"Trash", "trash"},
        {"Archive", "archive"},
        {"Spam", "spam"},
    };

    MailStoreTransaction transaction{store, "ensurePOP3Folders"};
    for (const auto & def : defaults) {
        string fid = MailUtils::idForFolder(account->id(), def.path);
        auto existing = store->find<Folder>(Query().equal("id", fid));
        if (existing == nullptr) {
            auto created = make_shared<Folder>(fid, account->id(), 0);
            created->setPath(def.path);
            created->setRole(def.role);
            created->localStatus()["busy"] = false;
            store->save(created.get());
            folders.push_back(created);
        } else {
            existing->localStatus()["busy"] = false;
            store->save(existing.get());
            folders.push_back(existing);
        }
    }
    transaction.commit();
    return folders;
}

uint32_t POP3SyncWorker::getNextPOP3UID()
{
    uint32_t nextUid = 1;
    try {
        SQLite::Statement maxQ(store->db(), "SELECT MAX(pop3_uid) FROM POP3UIDL WHERE accountId = ?");
        maxQ.bind(1, account->id());
        if (maxQ.executeStep() && !maxQ.getColumn(0).isNull()) {
            nextUid = (uint32_t)maxQ.getColumn(0).getInt() + 1;
        }
    } catch (...) {
        nextUid = 1;
    }
    return nextUid;
}

bool POP3SyncWorker::syncNow()
{
    AutoreleasePool pool;
    logger->info("Starting POP3 sync pass for {}", account->emailAddress());

    auto folders = ensureFolders();
    shared_ptr<Folder> inbox = nullptr;
    for (auto & f : folders) {
        if (f->role() == "inbox") {
            inbox = f;
            break;
        }
    }
    if (!inbox) {
        logger->error("POP3 sync: could not find Inbox folder");
        return false;
    }

    inbox->localStatus()["busy"] = true;
    store->save(inbox.get());

    string errorService = "";
    ErrorCode err = ErrorCode::ErrorNone;
    mailpop3 * pop3 = connectAndLogin(errorService, err);
    if (!pop3) {
        inbox->localStatus()["busy"] = false;
        store->save(inbox.get());
        throw SyncException(err, "POP3 connection / authentication failed", true);
    }

    // Load all existing UIDLs for this account
    std::set<string> knownUIDLs;
    try {
        SQLite::Statement query(store->db(), "SELECT uidl FROM POP3UIDL WHERE accountId = ?");
        query.bind(1, account->id());
        while (query.executeStep()) {
            knownUIDLs.insert(query.getColumn(0).getString());
        }
    } catch (std::exception & ex) {
        logger->error("Error querying POP3UIDL table: {}", ex.what());
    }

    uint32_t nextUid = getNextPOP3UID();

    // Call mailpop3_list which queries LIST and populates UIDL for all messages
    carray * msg_tab = nullptr;
    int r = mailpop3_list(pop3, &msg_tab);
    if (r != MAILPOP3_NO_ERROR || !msg_tab) {
        logger->error("POP3 LIST / UIDL failed (code {})", r);
        disconnect(pop3);
        inbox->localStatus()["busy"] = false;
        store->save(inbox.get());
        throw SyncException(ErrorCode::ErrorConnection, "POP3 LIST failed", true);
    }

    unsigned int totalCount = carray_count(msg_tab);
    logger->info("POP3 server reports {} message(s) in mailbox", totalCount);

    int newMessagesCount = 0;
    for (unsigned int i = 0; i < totalCount; i++) {
        if (shouldStop) break;

        struct mailpop3_msg_info * info = (struct mailpop3_msg_info *)carray_get(msg_tab, i);
        if (!info) continue;

        string uidl = info->msg_uidl ? info->msg_uidl : "";
        if (uidl.empty()) {
            // Fallback for servers without UIDL extension
            uidl = "idx_" + to_string(info->msg_index) + "_" + to_string(info->msg_size);
        }

        if (knownUIDLs.count(uidl) > 0) {
            continue; // Already fetched
        }

        logger->info("Fetching new POP3 message #{} (size: {}, UIDL: {})", info->msg_index, info->msg_size, uidl);

        char * rawContent = nullptr;
        size_t rawLen = 0;
        int retrResult = mailpop3_retr(pop3, info->msg_index, &rawContent, &rawLen);
        if (retrResult != MAILPOP3_NO_ERROR || !rawContent) {
            logger->warn("Failed to RETR POP3 message #{} (code {})", info->msg_index, retrResult);
            continue;
        }

        Data * msgData = Data::dataWithBytes(rawContent, (unsigned int)rawLen);
        MessageParser * parser = MessageParser::messageParserWithData(msgData);
        mailpop3_retr_free(rawContent);

        if (!parser || !parser->header()) {
            logger->warn("Failed to parse RFC822 message for POP3 UIDL {}", uidl);
            continue;
        }

        // Construct IMAPMessage envelope for MailProcessor
        IMAPMessage * imapMsg = new IMAPMessage();
        imapMsg->setHeader(parser->header());
        imapMsg->setUid(nextUid);
        imapMsg->setFlags(MessageFlagNone);

        time_t syncTime = time(0);
        shared_ptr<Message> localMsg = processor->insertMessage(imapMsg, *inbox, syncTime);
        if (localMsg) {
            processor->retrievedMessageBody(localMsg.get(), parser);

            // Record in POP3UIDL table
            try {
                SQLite::Statement ins(store->db(), "INSERT OR REPLACE INTO POP3UIDL (accountId, uidl, messageId, pop3_uid, fetchedAt) VALUES (?, ?, ?, ?, ?)");
                ins.bind(1, account->id());
                ins.bind(2, uidl);
                ins.bind(3, localMsg->id());
                ins.bind(4, (int)nextUid);
                ins.bind(5, (int)syncTime);
                ins.exec();
            } catch (std::exception & ex) {
                logger->error("Error saving POP3 UIDL record: {}", ex.what());
            }

            knownUIDLs.insert(uidl);
            nextUid++;
            newMessagesCount++;
            logger->info("Successfully ingested POP3 message (UIDL {} -> local ID {})", uidl, localMsg->id());
        }

        imapMsg->release();
    }

    disconnect(pop3);

    inbox->localStatus()["busy"] = false;
    store->save(inbox.get());

    logger->info("POP3 sync pass finished: {} new message(s) ingested", newMessagesCount);
    return false;
}
