#!/usr/bin/env node
"use strict";

const os = require("os");
const path = require("path");
const program = require('commander');
const pkg = require('./package.json');
const {Account} = require('@wireapp/core');
const {FileEngine} = require('@wireapp/store-engine-fs');
const {APIClient} = require("@wireapp/api-client");
const {ClientType, RegisteredClient} = require('@wireapp/api-client/dist/commonjs/client/');
const {ClientClassification} = require('@wireapp/api-client/dist/commonjs/client/');

require('dotenv').config();

program
  .version(pkg.version)
  .description(pkg.description)
  .option('-e, --email <address>', 'Your email address')
  .option('-p, --password <password>', 'Your password')
  .option('-l, --list', 'List all conversations of the given account')
  .option('-c, --conversation <conversationId>', 'The conversation to write in')
  .option('-s, --send <message>', 'Send the given message to the conversation')
  .parse(process.argv);

var loginData = {
  clientType: ClientType.PERMANENT,
  email: program.email || process.env.WIRE_LOGIN_EMAIL,
  password: program.password || process.env.WIRE_LOGIN_PASSWORD
};

var clientInfo = {
  classification: ClientClassification.DESKTOP,
  cookieLabel: "default",
  model: "wire-send",
  location: null,
};

var conversationID = program.conversation || process.env.WIRE_CONVERSATION_ID;

var directory = path.join(os.homedir(), '.wire-send', loginData.email);
var storeEngine = new FileEngine(directory);

storeEngine
  .init('', { fileExtension: '.json' })
  .then(() => {
    var apiClient = new APIClient({store: storeEngine, urls: APIClient.BACKEND.PRODUCTION});
    var account = new Account(apiClient);

    account
      .login(loginData, true, clientInfo)
      .then(() => {
        if (program.list) {
          account.apiClient.conversation.api.getConversations()
            .then((convlist) => {
              for (let conv of convlist.conversations) {
                console.log(conv.id + ": " + conv.name);
              }
              process.exit(0);
            })
            .catch((error) => {
              console.error(error);
              process.exit(1);
            });
        } else if (program.send) {
          const payload = account.service.conversation.createText(program.send);
          account.service.conversation.send(conversationID, payload)
            .then(() => { process.exit(0); })
            .catch((error) => {
              console.error(error);
              process.exit(1);
            });
        } else {
          console.error("must specify either --list or --send");
          process.exit(1);
        }
      })
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
