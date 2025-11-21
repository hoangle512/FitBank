"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sql = exports.db = void 0;
var postgres_1 = require("@vercel/postgres");
Object.defineProperty(exports, "sql", { enumerable: true, get: function () { return postgres_1.sql; } });
var POSTGRES_URL = process.env.POSTGRES_URL;
if (!POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set');
}
exports.db = (0, postgres_1.createPool)({
    connectionString: POSTGRES_URL,
});
