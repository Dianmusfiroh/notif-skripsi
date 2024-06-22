"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// import * as dateFormat from "dateformat";
var fs_1 = require("fs");
var express = require("express");
var http = require("http");
var qrcode = require("qrcode");
var socket_io_1 = require("socket.io");
var path = require("path");
var mysql = require("mysql");
var cron = require("node-cron");
var logger_1 = require("./src/Utils/logger");
var baileys_1 = require("@whiskeysockets/baileys");
var compile = require('html-to-text').compile;
var useStore = !process.argv.includes("--no-store");
var doReplies = !process.argv.includes("--no-reply");
var uuidv4 = require('uuid').v4;
var logger = logger_1.default.child({});
logger.level = 'trace';
var port = '3000';
var local = 'http://localhost';
var app = express();
var server = http.createServer(app);
// const io = new Server(server);
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_skripsi'
});
var io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        allowedHeaders: ["Access-Control-Allow-Origin: *"],
        credentials: true
    }
});
var sock = {};
var QRCODE = [];
var CONNECT = [];
var NUMBER = [];
var NAME = [];
var SConnection = '';
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
var sessions = [];
var SESSIONS_FILE = "./sessions/whatsapp-id.json";
var createSessionsFileIfNotExists = function () {
    if (!(0, fs_1.existsSync)(SESSIONS_FILE)) {
        try {
            (0, fs_1.writeFileSync)(SESSIONS_FILE, JSON.stringify([]));
            console.log("Sessions file created successfully");
        }
        catch (err) {
            console.log("Failed to create sessions file: ", err);
        }
    }
};
createSessionsFileIfNotExists();
var getSessionsFile = function () {
    try {
        return JSON.parse((0, fs_1.readFileSync)(SESSIONS_FILE).toString());
    }
    catch (error) {
        return [];
    }
};
var setSessionsFile = function (sessions) {
    (0, fs_1.writeFile)(SESSIONS_FILE, JSON.stringify(sessions), function (err) {
        if (err) { // console.log(err)
        }
    });
};
var deleteFolderRecursive = function (directoryPath) {
    if ((0, fs_1.existsSync)(directoryPath)) {
        (0, fs_1.readdirSync)(directoryPath).forEach(function (file, index) {
            var curPath = path.join(directoryPath, file);
            if ((0, fs_1.lstatSync)(curPath).isDirectory()) {
                // recurse
                deleteFolderRecursive(curPath);
            }
            else {
                // delete file
                (0, fs_1.unlinkSync)(curPath);
            }
        });
        (0, fs_1.rmdirSync)(directoryPath);
    }
};
var startSock = function (id) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, state_1, saveCreds, savedSessions, sessionIndex, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, baileys_1.useMultiFileAuthState)("./sessions/".concat(id))];
            case 1:
                _a = _b.sent(), state_1 = _a.state, saveCreds = _a.saveCreds;
                sock[id] = (0, baileys_1.default)({
                    connectTimeoutMs: 10000,
                    defaultQueryTimeoutMs: 10000000,
                    keepAliveIntervalMs: 10000000,
                    printQRInTerminal: false,
                    // logger: pino, /** P for hidden logger log */
                    browser: [
                        "kdt-skripsi", "Safari", "1.0.0"
                    ],
                    syncFullHistory: true,
                    auth: state_1,
                });
                sock[id].ev.on("connection.update", function (data) { return __awaiter(void 0, void 0, void 0, function () {
                    var connection_1, lastDisconnect, qr, savedSessions_1, sessionIndex_1, no;
                    var _a, _b;
                    return __generator(this, function (_c) {
                        try {
                            connection_1 = data.connection, lastDisconnect = data.lastDisconnect, qr = data.qr;
                            if (qr) {
                                qrcode.toDataURL(qr, function (err, url) {
                                    CONNECT[id] = '0';
                                    QRCODE[id] = url;
                                });
                            }
                            if (connection_1 === "close") {
                                if (((_b = (_a = lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode) !== baileys_1.DisconnectReason.loggedOut) {
                                    setTimeout(function () {
                                        try {
                                            startSock(id);
                                        }
                                        catch (error) { }
                                    }, 200);
                                }
                                else {
                                    if ((0, fs_1.existsSync)("./sessions/".concat(id))) {
                                        // unlink(`./sessions/${id}`, (err) => {
                                        // if (err)
                                        //     throw err;
                                        deleteFolderRecursive("./sessions/".concat(id));
                                        savedSessions_1 = getSessionsFile();
                                        sessionIndex_1 = savedSessions_1.findIndex(function (e) { return e.id == id; });
                                        savedSessions_1.splice(sessionIndex_1, 1);
                                        setSessionsFile(savedSessions_1);
                                        // });
                                    }
                                }
                            }
                            else if (connection_1 === "open") {
                                no = state_1.creds.me.id.split(':');
                                CONNECT[id] = '1';
                                QRCODE[id] = '';
                                NUMBER[id] = no[0];
                                NAME[id] = state_1.creds.me.name;
                            }
                        }
                        catch (error) { }
                        return [2 /*return*/];
                    });
                }); });
                sock[id].ev.on("messages.upsert", function (data) { return __awaiter(void 0, void 0, void 0, function () {
                    var _i, _a, msg, messageType;
                    return __generator(this, function (_b) {
                        if (data.type === "notify") {
                            for (_i = 0, _a = data.messages; _i < _a.length; _i++) {
                                msg = _a[_i];
                                if (!msg.message)
                                    return [2 /*return*/];
                                messageType = Object.keys(msg.message)[0];
                                if (!msg.key.fromMe && doReplies) { }
                                else { }
                            }
                        }
                        return [2 /*return*/];
                    });
                }); });
                sock[id].ev.on("creds.update", saveCreds);
                savedSessions = getSessionsFile();
                sessionIndex = savedSessions.findIndex(function (sess) { return sess.id == id; });
                if (sessionIndex == -1) {
                    savedSessions.push({ id: id });
                    setSessionsFile(savedSessions);
                }
                return [2 /*return*/, false];
            case 2:
                error_1 = _b.sent();
                console.log("error: startSock");
                console.log(error_1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
var init = function (socket) { return __awaiter(void 0, void 0, void 0, function () {
    var savedSessions;
    return __generator(this, function (_a) {
        savedSessions = getSessionsFile();
        // console.log('run init')
        savedSessions.forEach(function (e) {
            try { // console.log(`init :${e.id}`)
                startSock(e.id);
            }
            catch (error) { }
        });
        return [2 /*return*/];
    });
}); };
init();
function getTimeFromDatabase(callback) {
    connection.query('SELECT waktu FROM t_set_alarm WHERE id = 1', function (error, results) {
        if (error) {
            console.error('Error fetching schedule time:', error);
            return;
        }
        if (results.length > 0) {
            var scheduleTime = results[0].waktu;
            callback(scheduleTime);
        }
        else {
            console.log('No schedule time found.');
        }
    });
}
function scheduleCronJob(time) {
    var _a = time.split(':'), hour = _a[0], minute = _a[1];
    var cronExpression = "".concat(minute, " ").concat(hour, " * * 1-6"); // Senin hingga sabtu
    //   cron.schedule('45 06 * * 1-6', () => {
    cron.schedule(cronExpression, function () {
        console.log('Running cron job to fetch data and send messages');
        getDataFromDatabase(function (tasks) {
            tasks.forEach(function (task) {
                var logId = uuidv4(); // Generate a UUID
                var message = "Hello ".concat(task.name, ", kamu punya deathline tugas yang harus kamu selesaikan hari ini!");
                var query2 = "INSERT INTO t_broadcast (kd_list_broadcast, nomor,pesan, status) VALUES ('".concat(logId, "','").concat(task.no_hp, "','").concat(message, "', '0');");
                connection.query(query2, function (error, results) {
                    if (error) {
                        console.error('Error fetching data:', error);
                        return;
                    }
                    return results;
                });
            });
        });
    });
    console.log("Scheduled task to run at ".concat(cronExpression, " ").concat(time, " every weekday"));
}
getTimeFromDatabase(function (scheduleTime) {
    if (scheduleTime) {
        scheduleCronJob(scheduleTime);
    }
});
function getDataFromDatabase(callback) {
    var query = "\n        SELECT t.*, a.* \n        FROM t_tugas t, t_anggota a \n        WHERE t.id_anggota = a.id \n          AND t.target_akhir <= DATE(NOW()) \n          AND t.status_progres != 'selesai';\n    ";
    connection.query(query, function (error, results) {
        if (error) {
            console.error('Error fetching data:', error);
            return;
        }
        callback(results);
    });
}
var fetchData = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        // Simulasi tugas asinkron (misalnya mengambil data dari API)
        return [2 /*return*/, new Promise(function (resolve, reject) {
                setTimeout(function () {
                    var data = { message: 'Data berhasil diambil!' };
                    resolve(data); // Kembali dengan data
                }, 2000); // Simulasi waktu pemrosesan 2 detik
            })];
    });
}); };
cron.schedule('* * * * *', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        connection.query('SELECT * FROM t_broadcast WHERE status = "0" LIMIT 1;', function (error, results) {
            if (error) {
                console.error('Error fetching data:', error);
                return;
            }
            var sender = 999;
            var timeout = 200;
            if (results.length != 0) {
                var number_1 = results[0].nomor;
                var kd_list_broadcast_1 = results[0].kd_list_broadcast;
                console.log('Sending message to', number_1, 'with message', results[0].pesan);
                var chatId_1 = "".concat(number_1, "@s.whatsapp.net");
                setTimeout(function () { return __awaiter(void 0, void 0, void 0, function () {
                    var sendMessage, result, error_2;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                _a.trys.push([0, 3, , 4]);
                                return [4 /*yield*/, sock[sender].sendMessage(chatId_1, { text: results[0].pesan })];
                            case 1:
                                sendMessage = _a.sent();
                                console.log(sendMessage);
                                connection.query("UPDATE `t_broadcast` SET `status` = '1' WHERE `t_broadcast`.`kd_list_broadcast` = '" + kd_list_broadcast_1 + "'", function (error, results) {
                                    if (error) {
                                        console.error('Error fetching data:', error);
                                        return;
                                    }
                                }, timeout);
                                console.log('Message sent sukses to', results[0].kd_list_broadcast);
                                return [4 /*yield*/, fetchData()];
                            case 2:
                                result = _a.sent();
                                console.log('Respons dari cron:', result);
                                return [3 /*break*/, 4];
                            case 3:
                                error_2 = _a.sent();
                                timeout = 1000;
                                console.log('Message sent errror to', number_1);
                                console.error('Terjadi kesalahan:', error_2);
                                return [3 /*break*/, 4];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); }, timeout);
                return results;
            }
        });
        return [2 /*return*/];
    });
}); });
app.get("/", function (req, res) {
    res.json('oke');
});
app.post("/send-message", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sender, nomor, message, number, timeout;
    return __generator(this, function (_a) {
        sender = req.body.sender;
        nomor = req.body.nomor;
        message = req.body.message;
        number = "".concat(nomor, "@s.whatsapp.net");
        timeout = 200;
        // console.log(number, message)
        setTimeout(function () { return __awaiter(void 0, void 0, void 0, function () {
            var sendMessage, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, sock[sender].sendMessage(number, { text: message })];
                    case 1:
                        sendMessage = _a.sent();
                        timeout = 200;
                        console.log(sendMessage);
                        res.status(200).json({ status: true, response: sendMessage });
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _a.sent();
                        timeout = 1000;
                        res.status(500).json({ status: false, response: error_3 });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); }, timeout);
        return [2 /*return*/];
    });
}); });
app.get("/session", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, timeout;
    return __generator(this, function (_a) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        id = '999';
        timeout = 200;
        setTimeout(function () { return __awaiter(void 0, void 0, void 0, function () {
            var _a, state_2, saveCreds, error_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, (0, baileys_1.useMultiFileAuthState)("./sessions/".concat(id))];
                    case 1:
                        _a = _b.sent(), state_2 = _a.state, saveCreds = _a.saveCreds;
                        sock[id] = (0, baileys_1.default)({
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
                            auth: state_2
                        });
                        sock[id].ev.on("connection.update", function (data) { return __awaiter(void 0, void 0, void 0, function () {
                            var connection_2, lastDisconnect, qr, savedSessions, sessionIndex, no;
                            var _a, _b;
                            return __generator(this, function (_c) {
                                try {
                                    connection_2 = data.connection, lastDisconnect = data.lastDisconnect, qr = data.qr;
                                    if (qr) {
                                        qrcode.toDataURL(qr, function (err, url) {
                                            CONNECT[id] = '0';
                                            QRCODE[id] = url;
                                        });
                                    }
                                    if (connection_2 === "close") {
                                        if (((_b = (_a = lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode) !== baileys_1.DisconnectReason.loggedOut) {
                                            setTimeout(function () {
                                                try {
                                                    startSock(id);
                                                }
                                                catch (error) { }
                                            }, 200);
                                        }
                                        else {
                                            if ((0, fs_1.existsSync)("./sessions/".concat(id))) {
                                                // unlink(`./sessions/${id}`, (err) => {
                                                //     if (err)
                                                //         throw err;
                                                deleteFolderRecursive("./sessions/".concat(id));
                                                savedSessions = getSessionsFile();
                                                sessionIndex = savedSessions.findIndex(function (e) { return e.id == id; });
                                                savedSessions.splice(sessionIndex, 1);
                                                setSessionsFile(savedSessions);
                                                // });
                                            }
                                        }
                                    }
                                    else if (connection_2 === "open") {
                                        no = state_2.creds.me.id.split(':');
                                        CONNECT[id] = '1';
                                        QRCODE[id] = '';
                                        SConnection = CONNECT[id];
                                        NUMBER[id] = no[0];
                                        NAME[id] = state_2.creds.me.name;
                                    }
                                }
                                catch (error) { }
                                return [2 /*return*/];
                            });
                        }); });
                        timeout = 200;
                        if (CONNECT[id] === '1') {
                            res.status(200).json({ status: true, response: {
                                    status: 'connect',
                                    number: NUMBER[id],
                                    name: NAME[id]
                                } });
                        }
                        else {
                            res.status(200).json({ status: true, response: {
                                    status: 'disconnet',
                                    qrcode: QRCODE[id],
                                } });
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        error_4 = _b.sent();
                        timeout = 1000;
                        res.status(500).json({ status: false, response: error_4 });
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); }, timeout);
        return [2 /*return*/];
    });
}); });
app.get('/logout/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id_1, savedSessions, sessionIndex;
    return __generator(this, function (_a) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        try {
            id_1 = 999;
            deleteFolderRecursive("./sessions/".concat(id_1));
            savedSessions = getSessionsFile();
            sessionIndex = savedSessions.findIndex(function (e) { return e.id == id_1; });
            savedSessions.splice(sessionIndex, 1);
            setSessionsFile(savedSessions);
            res.status(200).json({ status: false, response: 'Success' });
        }
        catch (error) {
            res.status(500).json({ status: false, response: error });
        }
        return [2 /*return*/];
    });
}); });
server.listen(port, function () {
    console.log("".concat(local, ":").concat(port));
});
server.timeout = 99999999;
