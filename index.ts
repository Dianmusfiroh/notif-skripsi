import { Boom } from "@hapi/boom";
// import * as dateFormat from "dateformat";
import {unlink,existsSync,writeFileSync,readFileSync,writeFile} from "fs";
import * as express from "express";
import * as http from "http";
import * as qrcode from "qrcode";
import { Server } from "socket.io";
import { pino } from "pino";
import * as path from "path";
import * as mysql from "mysql";
import * as cron from "node-cron";
import makeWASocket, { DisconnectReason, useSingleFileAuthState, downloadMediaMessage } from "@adiwajshing/baileys";
const { compile } = require('html-to-text');

const useStore = !process.argv.includes("--no-store");
const doReplies = !process.argv.includes("--no-reply");

const port = '3000';
const local = 'http://localhost';
const app = express();
const server = http.createServer(app);
// const io = new Server(server);
const io = new Server(server, {
    cors: {
      origin: '*',
      allowedHeaders: ["Access-Control-Allow-Origin: *"],
      credentials: true
    }
});

var sock = {};
var QRCODE = []
var CONNECT = []
var NUMBER = []
var NAME = []
var SConnection = '';
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessions = [];
const SESSIONS_FILE = "./sessions/whatsapp-id.json";

const createSessionsFileIfNotExists = function() {
    if (!existsSync(SESSIONS_FILE)) {
        try {
            writeFileSync(SESSIONS_FILE, JSON.stringify([]));
            console.log("Sessions file created successfully");
        } catch (err) {
            console.log("Failed to create sessions file: ", err);
        }
    }
};
createSessionsFileIfNotExists();

const getSessionsFile = function() {
    try {
        return JSON.parse(readFileSync(SESSIONS_FILE).toString());
    } catch (error) {
        return [];
    }
};

const setSessionsFile = function(sessions) {
    writeFile(SESSIONS_FILE, JSON.stringify(sessions), function(err) {
        if (err) { // console.log(err)
        }
    });
};

const startSock = async(id: string) => {
    try { // console.log(`ObjectID: ${id}`)

        const { state, saveState } = useSingleFileAuthState(`./sessions/session-${id}.json`);
        sock[id] = makeWASocket({
            connectTimeoutMs: 10000,
            defaultQueryTimeoutMs: 10000000,
            keepAliveIntervalMs: 10000000,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: [
                "jannah", "Safari", "1.0.0"
            ],
            syncFullHistory: true,
            auth: state
        });
        sock[id].ev.on("connection.update", async(data) => {
            try {
                const { connection, lastDisconnect, qr } = data;
                if (qr) {
                    qrcode.toDataURL(qr, (err, url) => {
                        CONNECT[id] = '0'
                        QRCODE[id] = url
                    });
                }
                if (connection === "close") { 
                    if ((lastDisconnect.error as Boom) ?.output ?.statusCode !== DisconnectReason.loggedOut) { 
                        setTimeout(() => {
                            try {
                                startSock(id);
                            } catch (error) {}
                        }, 200);
                    } else {
                        if (existsSync(`./sessions/session-${id}.json`)) {
                            unlink(`./sessions/session-${id}.json`, (err) => {
                                if (err)
                                    throw err;
                                const savedSessions = getSessionsFile();
                                const sessionIndex = savedSessions.findIndex((e) => e.id == id);
                                savedSessions.splice(sessionIndex, 1);
                                setSessionsFile(savedSessions);
                            });
                        }
                    }
                } else if (connection === "open") { 
                    var no = state.creds.me.id.split(':');
                    CONNECT[id] = '1'
                    QRCODE[id] = ''
                    NUMBER[id] = no[0]
                    NAME[id] = state.creds.me.name
                }
            } catch (error) {}
        });

        sock[id].ev.on("messages.upsert", async(data) => {
            if (data.type === "notify") {
                for (const msg of data.messages) {
                    if (!msg.message)
                        return;
                    const messageType = Object.keys(msg.message)[0];
                    if (!msg.key.fromMe && doReplies) {} else {}
                }
            }
        });

        sock[id].ev.on("creds.update", saveState);
        const savedSessions = getSessionsFile();
        const sessionIndex = savedSessions.findIndex((sess) => sess.id == id);

        if (sessionIndex == -1) {
            savedSessions.push({ id: id });
            setSessionsFile(savedSessions);
        }
        return false;
    } catch (error) {
        console.log("error: startSock");
        console.log(error);
    }
};

const init = async(socket ? ) => {
    const savedSessions = getSessionsFile();
    // console.log('run init')
    savedSessions.forEach((e) => {
        try { // console.log(`init :${e.id}`)
            startSock(e.id);
        } catch (error) {}
    });
};
init();

app.get("/", (req, res) => {
    res.json('oke');
});

app.post("/send-message", async(req, res) => {
    const sender = req.body.sender;
    const nomor = req.body.nomor;
    const message = req.body.message;
    const number = `${nomor}@s.whatsapp.net`;
    var timeout = 200;
    setTimeout(async() => {
        try {
            const sendMessage = await sock[sender].sendMessage(number, { text: message });
            timeout = 200;
            res.status(200).json({ status: true, response: sendMessage });
        } catch (error) {
            timeout = 1000;
            res.status(500).json({ status: false, response: error });
        }
    }, timeout);
});

app.get("/session", async(req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    const id = req.query.perangkat;

    var timeout = 200;
    setTimeout(async() => {
        try {
            const { state, saveState } = useSingleFileAuthState(`./sessions/session-${id}.json`);
            sock[id] = makeWASocket({
                connectTimeoutMs: 10000,
                defaultQueryTimeoutMs: 10000000,
                keepAliveIntervalMs: 10000000,
                printQRInTerminal: true,
                logger: pino({ level: 'silent' }),
                browser: [
                    "jannah", "Safari", "1.0.0"
                ],
                syncFullHistory: true,
                auth: state
            });
            sock[id].ev.on("connection.update", async(data) => {
                try {
                    const { connection, lastDisconnect, qr } = data;
                    
                    if (qr) {
                        qrcode.toDataURL(qr, (err, url) => {
                            CONNECT[id] = '0'
                            QRCODE[id] = url
                        });
                    }
                    if (connection === "close") { 
                        if ((lastDisconnect.error as Boom) ?.output ?.statusCode !== DisconnectReason.loggedOut) { 
                            setTimeout(() => {
                                try {
                                    startSock(id);
                                } catch (error) {}
                            }, 200);
                        } else {
                            if (existsSync(`./sessions/session-${id}.json`)) {
                                unlink(`./sessions/session-${id}.json`, (err) => {
                                    if (err)
                                        throw err;
                                    const savedSessions = getSessionsFile();
                                    const sessionIndex = savedSessions.findIndex((e) => e.id == id);
                                    savedSessions.splice(sessionIndex, 1);
                                    setSessionsFile(savedSessions);
                                });
                            }
                        }
                    } else if (connection === "open") { 
                        var no = state.creds.me.id.split(':');
                        CONNECT[id] = '1'
                        QRCODE[id] = ''
                        SConnection = CONNECT[id]
                        NUMBER[id] = no[0]
                        NAME[id] = state.creds.me.name
                        
                    }
                } catch (error) {}
            });
            timeout = 200;
            if(CONNECT[id] === '1'){
                res.status(200).json({ status: true, response:  {
                    status: 'connect',
                    number: NUMBER[id],
                    name: NAME[id] 
                 }});
            }else{
                res.status(200).json({ status: true, response:  {
                    status: 'disconnet',
                    qrcode: QRCODE[id],
                 }});
            }
        } catch (error) {
            timeout = 1000;
            res.status(500).json({ status: false, response: error });
        }
    }, timeout);
});

server.listen(port, function() { 
    console.log(`${local}:${port}`)
});

server.timeout = 99999999;