//
//  Folder.cpp
//  MailSync
//
//  Created by Ben Gotow on 6/17/17.
//  Copyright © 2017 Foundry 376. All rights reserved.
//
//  Use of this file is subject to the terms and conditions defined
//  in 'LICENSE.md', which is part of the Mailspring-Sync package.
//

#include <algorithm>
#include "Account.hpp"
#include "MailUtils.hpp"
#include "Thread.hpp"
#include "Message.hpp"

using namespace std;
using namespace mailcore;

string Account::TABLE_NAME = "Account";

Account::Account(json json) : MailModel(json) {
    
}

Account::Account(SQLite::Statement & query) :
    MailModel(query)
{
}

int Account::startDelay() {
    string s = id().substr(0, 1);
    if (s == "0" || s == "1" || s == "2") return 1;
    if (s == "3" || s == "4" || s == "5") return 2;
    if (s == "6" || s == "7" || s == "8") return 3;
    if (s == "9" || s == "a" || s == "b") return 4;
    return 0;
}

string Account::valid() {
    if (!_data.count("id") || !_data.count("settings")) {
        return "id or settings";
    }
    if (!_data.count("provider")) {
        return "provider";
    }

    json & s = _data["settings"];

    // POP3 accounts have no IMAP settings at all. Requiring imap_* here
    // made every POP3 onboarding fail with
    // "Account is missing required fields:imap_password or refresh_token".
    if (isPOP3()) {
        if (!(s.count("refresh_token") || s.count("pop3_password"))) {
            return "pop3_password or refresh_token";
        }
        if (!(s.count("refresh_token") || s.count("smtp_password"))) {
            return "smtp_password or refresh_token";
        }
        // pop3_username is optional (defaults to the email address).
        if (!(s.count("pop3_port") && s.count("pop3_host"))) {
            return "pop3 configuration";
        }
        if (!(s.count("smtp_port") && s.count("smtp_host"))) {
            return "smtp configuration";
        }
        if (s.count("pop3_allow_insecure_ssl") && !s["pop3_allow_insecure_ssl"].is_boolean()) {
            return "pop3_allow_insecure_ssl";
        }
        if (!(s.count("smtp_allow_insecure_ssl") && s["smtp_allow_insecure_ssl"].is_boolean())) {
            return "smtp_allow_insecure_ssl";
        }
        return ""; // true
    }

    if (!(s.count("refresh_token") || s.count("imap_password"))) {
        return "imap_password or refresh_token";
    }
    if (!(s.count("refresh_token") || s.count("smtp_password"))) {
        return "smtp_password or refresh_token";
    }
    if (!(s.count("imap_port") && s.count("imap_host") && s.count("imap_username"))) {
        return "imap configuration";
    }
    if (!(s.count("smtp_port") && s.count("smtp_host"))) {
        return "smtp configuration";
    }
    if (!(s.count("imap_allow_insecure_ssl") && s["imap_allow_insecure_ssl"].is_boolean())) {
        return "imap_allow_insecure_ssl";
    }
    if (!(s.count("smtp_allow_insecure_ssl") && s["smtp_allow_insecure_ssl"].is_boolean())) {
        return "smtp_allow_insecure_ssl";
    }
    return ""; // true
}

string Account::provider() {
    return _data["provider"].get<string>();
}

string Account::emailAddress() {
    return _data["emailAddress"].get<string>();
}

string Account::refreshToken() {
    if (_data["settings"].count("refresh_token") == 0) {
        return "";
    }
    return _data["settings"]["refresh_token"].get<string>();
}

void Account::setRefreshToken(string value) {
    _data["settings"]["refresh_token"] = value;
}

string Account::refreshClientId() {
    if (_data["settings"].count("refresh_client_id") == 0) {
        return "";
    }
    return _data["settings"]["refresh_client_id"].get<string>();
}

unsigned int Account::IMAPPort() {
    json & s = _data["settings"];
    if (!s.count("imap_port")) return 993;
    json & val = s["imap_port"];
    return val.is_string() ? stoi(val.get<string>()) : val.get<unsigned int>();
}

string Account::IMAPHost() {
    json & s = _data["settings"];
    return s.count("imap_host") ? s["imap_host"].get<string>() : "";
}

string Account::IMAPUsername() {
    json & s = _data["settings"];
    return s.count("imap_username") ? s["imap_username"].get<string>() : "";
}

string Account::IMAPPassword() {
    json & s = _data["settings"];
    return s.count("imap_password") ? s["imap_password"].get<string>() : "";
}

string Account::IMAPSecurity() {
    json & s = _data["settings"];
    return s.count("imap_security") ? s["imap_security"].get<string>() : "SSL / TLS";
}

bool Account::IMAPAllowInsecureSSL() {
    json & s = _data["settings"];
    return s.count("imap_allow_insecure_ssl") ? s["imap_allow_insecure_ssl"].get<bool>() : false;
}

bool Account::isPOP3() {
    if (provider() == "pop3") return true;
    if (_data.count("settings") && _data["settings"].count("pop3_host")) {
        return !_data["settings"]["pop3_host"].get<string>().empty();
    }
    return false;
}

unsigned int Account::POP3Port() {
    if (_data["settings"].count("pop3_port") == 0) return 995;
    json & val = _data["settings"]["pop3_port"];
    return val.is_string() ? stoi(val.get<string>()) : val.get<unsigned int>();
}

string Account::POP3Host() {
    json & s = _data["settings"];
    return s.count("pop3_host") ? s["pop3_host"].get<string>() : "";
}

string Account::POP3Username() {
    json & s = _data["settings"];
    if (s.count("pop3_username") && !s["pop3_username"].get<string>().empty()) {
        return s["pop3_username"].get<string>();
    }
    return emailAddress();
}

string Account::POP3Password() {
    json & s = _data["settings"];
    return s.count("pop3_password") ? s["pop3_password"].get<string>() : "";
}

string Account::POP3Security() {
    json & s = _data["settings"];
    return s.count("pop3_security") ? s["pop3_security"].get<string>() : "SSL / TLS";
}

bool Account::POP3AllowInsecureSSL() {
    json & s = _data["settings"];
    return s.count("pop3_allow_insecure_ssl") ? s["pop3_allow_insecure_ssl"].get<bool>() : false;
}

bool Account::isICloud() {
    return IMAPHost().find("imap.mail.me.com") != string::npos;
}

unsigned int Account::SMTPPort() {
    json & s = _data["settings"];
    if (!s.count("smtp_port")) return 587;
    json & val = s["smtp_port"];
    return val.is_string() ? stoi(val.get<string>()) : val.get<unsigned int>();
}

string Account::SMTPHost() {
    json & s = _data["settings"];
    return s.count("smtp_host") ? s["smtp_host"].get<string>() : "";
}

string Account::SMTPUsername() {
    json & s = _data["settings"];
    return s.count("smtp_username") ? s["smtp_username"].get<string>() : "";
}

string Account::SMTPPassword() {
    json & s = _data["settings"];
    return s.count("smtp_password") ? s["smtp_password"].get<string>() : "";
}

string Account::SMTPSecurity() {
    json & s = _data["settings"];
    return s.count("smtp_security") ? s["smtp_security"].get<string>() : "STARTTLS";
}

bool Account::SMTPAllowInsecureSSL() {
    json & s = _data["settings"];
    return s.count("smtp_allow_insecure_ssl") ? s["smtp_allow_insecure_ssl"].get<bool>() : false;
}

string Account::SMTPVerification() {
    json & s = _data["settings"];
    return s.count("smtp_verification") ? s["smtp_verification"].get<string>() : "";
}

bool Account::createHelperFolders() {
    json & s = _data["settings"];
    return s.count("create_helper_folders") ? s["create_helper_folders"].get<bool>() : true;
}

// Set by the client's Microsoft onboarding only when the user consented to Graph Mail.Send
// and Mail.ReadWrite. Accounts authorized before that keep sending over SMTP: their refresh
// tokens cannot be exchanged for a Graph mail token without the user signing in again.
bool Account::sendsViaGraph() {
    json & s = _data["settings"];
    return s.count("graph_send") && s["graph_send"].is_boolean() && s["graph_send"].get<bool>();
}

string Account::constructorName() {
    return _data["__cls"].get<string>();
}

/* Account objects are not stored in the database. */

string Account::tableName(){
    assert(false);
    return "";
}

vector<string> Account::columnsForQuery() {
    assert(false);
    return {};
}

void Account::bindToQuery(SQLite::Statement * query) {
    assert(false);
}

string Account::containerFolder() {
    json & s = _data["settings"];
    return s.count("container_folder") ? s["container_folder"].get<string>() : "";
}
