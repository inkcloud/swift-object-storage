"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const request_1 = __importDefault(require("request"));
const node_cache_1 = __importDefault(require("node-cache"));
const pump_1 = __importDefault(require("pump"));
const SWIFT_TOKEN_KEY = "SWIFT_TOKEN_KEY";
const DEFAULT_EXP_SECONDS = 60 * 20;
/**
 * Simple Swift Object Storage client
 */
class SwiftObjectStorage {
    constructor(options) {
        this.options = options;
        this.tokenCache = new node_cache_1.default();
    }
    /**
     * Handles token authentication. Keeps the token data  cached so that
     * a new token doesn't have to be generated on every request
     */
    getTokenData() {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenData = this.tokenCache.get(SWIFT_TOKEN_KEY);
            if (tokenData) {
                return Promise.resolve(tokenData);
            }
            return new Promise((resolve, reject) => {
                request_1.default.get({
                    url: this.options.objectStorageUrl,
                    headers: {
                        "X-Auth-Key": this.options.key,
                        "X-Auth-User": this.options.user
                    }
                }, (err, resp) => {
                    if (resp.statusCode !== 200) {
                        return reject(Error(`Error generating token: ${resp.statusCode} - ${resp.statusMessage}`));
                    }
                    const data = JSON.parse(resp.body);
                    const newTokenData = {
                        objectPath: data.storage.public,
                        authToken: resp.headers["x-auth-token"]
                    };
                    const expAfterSeconds = this.options.cacheExpireAfterSeconds || DEFAULT_EXP_SECONDS;
                    this.tokenCache.set(SWIFT_TOKEN_KEY, newTokenData, this.options.cacheExpireAfterSeconds);
                    return resolve(newTokenData);
                });
            });
        });
    }
    /**
     * Returns a Request readable stream
     * @param container
     * @param filename
     */
    getRawGetStream(container, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenData = yield this.getTokenData();
            return Promise.resolve(request_1.default.get({
                url: `${tokenData.objectPath}/${container}/${filename}`,
                headers: { "X-Auth-Token": tokenData.authToken }
            }));
        });
    }
    getObjectWriteToStream(writeStream, container, filename, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const sourceStream = yield this.getRawGetStream(container, filename);
            return new Promise((resolve, reject) => {
                sourceStream.on("response", resp => {
                    if (Math.floor(resp.statusCode / 100) !== 2) {
                        reject(Error(`Error generating token: ${resp.statusCode} - ${resp.statusMessage}`));
                        return;
                    }
                    if (options.onResponse) {
                        options.onResponse(resp);
                    }
                });
                pump_1.default(sourceStream, writeStream, err => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        });
    }
    /**
     * Returns a Request writeable stream
     * @param container
     * @param filename
     * @param options
     */
    getRawCreateStream(container, filename, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenData = yield this.getTokenData();
            return Promise.resolve(request_1.default.put({
                url: `${tokenData.objectPath}/${container}/${filename}`,
                timeout: 1000 * 60 * 10,
                headers: Object.assign({}, options.headers, { "X-Delete-After": options.expiresAfterSeconds, "X-Auth-Token": tokenData.authToken })
            }));
        });
    }
    createObjectFromStream(sourceStream, container, filename, options = {}) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const putStream = yield this.getRawCreateStream(container, filename, options);
            putStream.on("response", resp => {
                if (Math.floor(resp.statusCode / 100) !== 2) {
                    reject(Error(`Error generating token: ${resp.statusCode} - ${resp.statusMessage}`));
                    return;
                }
                if (options.onResponse) {
                    options.onResponse(resp);
                }
            });
            pump_1.default(sourceStream, putStream, err => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        }));
    }
}
exports.SwiftObjectStorage = SwiftObjectStorage;
//# sourceMappingURL=SwiftObjectStorage.js.map