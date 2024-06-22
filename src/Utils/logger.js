"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pino_1 = require("pino");
exports.default = (0, pino_1.default)({ timestamp: function () { return ",\"time\":\"".concat(new Date().toJSON(), "\""); } });
