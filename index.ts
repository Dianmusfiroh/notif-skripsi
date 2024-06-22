import { Boom } from "@hapi/boom";
// import * as dateFormat from "dateformat";
import { unlink, existsSync, writeFileSync, readFileSync, writeFile,readdirSync,lstatSync,unlinkSync,rmdirSync } from "fs";
import * as express from "express";
import * as http from "http";
import * as qrcode from "qrcode";
import { Server } from "socket.io";
import { pino } from "pino";
import * as path from "path";
import * as mysql from "mysql";
import * as cron from "node-cron";
import MAIN_LOGGER from './src/Utils/logger';

import makeWASocket, { DisconnectReason, useMultiFileAuthState, downloadMediaMessage } from "@whiskeysockets/baileys";
const { compile } = require('html-to-text');

const useStore = !process.argv.includes("--no-store");
const doReplies = !process.argv.includes("--no-reply");
const { v4: uuidv4 } = require('uuid');
const logger = MAIN_LOGGER.child({})
logger.level = 'trace'
const port = '3000';
const local = 'http://localhost';
const app = express();
const server = http.createServer(app);
// const io = new Server(server);
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_skripsi'
});
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
const deleteFolderRecursive = function (directoryPath) {
  if (existsSync(directoryPath)) {
      readdirSync(directoryPath).forEach((file, index) => {
        const curPath = path.join(directoryPath, file);
        if (lstatSync(curPath).isDirectory()) {
         // recurse
          deleteFolderRecursive(curPath);
        } else {
          // delete file
          unlinkSync(curPath);
        }
      });
      rmdirSync(directoryPath);
    }
  };
const startSock = async(id: string) => {
    try {// console.log(`ObjectID: ${id}`)

        const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${id}`);
        sock[id] = makeWASocket({
            connectTimeoutMs: 10000,
            defaultQueryTimeoutMs: 10000000,
            keepAliveIntervalMs: 10000000,
            printQRInTerminal: false,
            // logger: pino, /** P for hidden logger log */

            browser: [
                "kdt-skripsi", "Safari", "1.0.0"
            ],
            syncFullHistory: true,
            auth: state,

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
                        if (existsSync(`./sessions/${id}`)) {
                            // unlink(`./sessions/${id}`, (err) => {
                                // if (err)
                                //     throw err;
                                deleteFolderRecursive(`./sessions/${id}`);
                                const savedSessions = getSessionsFile();
                                const sessionIndex = savedSessions.findIndex((e) => e.id == id);
                                savedSessions.splice(sessionIndex, 1);
                                setSessionsFile(savedSessions);
                            // });
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

        sock[id].ev.on("creds.update", saveCreds);
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
function getTimeFromDatabase(callback) {
    connection.query('SELECT waktu FROM t_set_alarm WHERE id = 1', (error, results) => {
      if (error) {
        console.error('Error fetching schedule time:', error);
        return;
      }
  
      if (results.length > 0) {
        const scheduleTime = results[0].waktu;
        callback(scheduleTime);
      } else {
        console.log('No schedule time found.');
      }
    });
}
function scheduleCronJob(time) {
    const [hour, minute] = time.split(':');
    const cronExpression = `${minute} ${hour} * * 1-6`; // Senin hingga sabtu
  
    //   cron.schedule('45 06 * * 1-6', () => {
        cron.schedule(cronExpression, () => {
        console.log('Running cron job to fetch data and send messages');
        getDataFromDatabase((tasks) => {
            tasks.forEach(task => {
                const logId = uuidv4(); // Generate a UUID
                const message = `Hello ${task.name}, kamu punya deathline tugas yang harus kamu selesaikan hari ini!`;
         
               
                const query2 = `INSERT INTO t_broadcast (kd_list_broadcast, nomor,pesan, status) VALUES ('${logId}','${task.no_hp}','${message}', '0');`;
                connection.query(query2, (error, results) => {
                    if (error) {
                        console.error('Error fetching data:', error);
                        return;
                    }
                  
                    return results;
                });
              
            });
        });
    });
    console.log(`Scheduled task to run at ${cronExpression} ${time} every weekday`);
}
  
getTimeFromDatabase((scheduleTime) => {
    if (scheduleTime) {
    scheduleCronJob(scheduleTime);
    }
});
function getDataFromDatabase(callback) {

    const query = `
        SELECT t.*, a.* 
        FROM t_tugas t, t_anggota a 
        WHERE t.id_anggota = a.id 
          AND t.target_akhir <= DATE(NOW()) 
          AND t.status_progres != 'selesai';
    `;
    connection.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching data:', error);
            return;
        }
      
        callback(results);
    });
   
}

const fetchData = async () => {
    // Simulasi tugas asinkron (misalnya mengambil data dari API)
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const data = { message: 'Data berhasil diambil!' };
            resolve(data); // Kembali dengan data
        }, 2000); // Simulasi waktu pemrosesan 2 detik
    });
};

    cron.schedule('*/15 * * * * *', async () => {
        connection.query('SELECT * FROM t_broadcast WHERE status = "0" LIMIT 1;', (error, results) => {
            if (error) {
                console.error('Error fetching data:', error);
                return;
            }
            console.log('send log');
            const sender = 999;
            var timeout = 200;
            if (results.length != 0) {
                
                const number = results[0].nomor; 
                const kd_list_broadcast = results[0].kd_list_broadcast;
                console.log('Sending message to', number, 'with message', results[0].pesan);
                const chatId = `${number}@s.whatsapp.net`;
                setTimeout(async() => {
                    try {
                        const sendMessage = await sock[sender].sendMessage(chatId, { text: results[0].pesan });
                        console.log(sendMessage)
                        connection.query("UPDATE `t_broadcast` SET `status` = '1' WHERE `t_broadcast`.`kd_list_broadcast` = '"+kd_list_broadcast+"'", (error, results) => {
                            if (error) {
                                console.error('Error fetching data:', error);
                                return;
                            }
                        }, timeout);
                        console.log('Message sent sukses to',results[0].kd_list_broadcast);
                        const result = await fetchData();
                        console.log('Respons dari cron:', result);
                    } catch (error) {
                        timeout = 1000;
                        console.log('Message sent errror to',number);
                        console.error('Terjadi kesalahan:', error);
                    }
                }, timeout);
                return results;
            }
        });
    });

app.get("/", (req, res) => {
    res.json('oke');
});

app.post("/send-message", async(req, res) => {
    const sender = req.body.sender;
    const nomor = req.body.nomor;
    const message = req.body.message;
    const number = `${nomor}@s.whatsapp.net`;
    var timeout = 200;
    // console.log(number, message)
    setTimeout(async() => {
        try {
            const sendMessage = await sock[sender].sendMessage(number, { text: message });
            timeout = 200;
            console.log(sendMessage)
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

    const id = '999';
    // const id = req.query.perangkat;

    var timeout = 200;
    setTimeout(async() => {
        try {
            const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${id}`);
            sock[id] = makeWASocket({
                connectTimeoutMs: 10000,
                defaultQueryTimeoutMs: 10000000,
                keepAliveIntervalMs: 10000000,
                printQRInTerminal: true,
                // logger,
                // logger: pino({ level: 'silent' }),
                browser: [
                    "manajement-klikdigital", "Safari", "1.0.0"
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
                            if (existsSync(`./sessions/${id}`)) {
                                // unlink(`./sessions/${id}`, (err) => {
                                //     if (err)
                                //         throw err;
                                    deleteFolderRecursive(`./sessions/${id}`);
                                    const savedSessions = getSessionsFile();
                                    const sessionIndex = savedSessions.findIndex((e) => e.id == id);
                                    savedSessions.splice(sessionIndex, 1);
                                    setSessionsFile(savedSessions);
                                // });
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
app.get('/logout/',  async(req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    try {
        const  id  = 999;
        deleteFolderRecursive(`./sessions/${id}`);
        const savedSessions = getSessionsFile();
        const sessionIndex = savedSessions.findIndex((e) => e.id == id);
        savedSessions.splice(sessionIndex, 1);
        setSessionsFile(savedSessions);
        res.status(200).json({ status: false, response: 'Success' });
    } catch (error) {
        res.status(500).json({ status: false, response: error });
    }
    
})
server.listen(port, function() { 
    console.log(`${local}:${port}`)
});

server.timeout = 99999999;