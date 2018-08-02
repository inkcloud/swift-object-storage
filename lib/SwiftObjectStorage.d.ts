/// <reference types="node" />
import { Response, Request } from "request";
import Cache from "node-cache";
import { WriteStream, ReadStream } from "fs";
export interface TokenData {
    authToken: string | string[];
    objectPath: string;
}
export interface GetObjectAsStreamOptions {
    onResponse?: (resp: Response) => void;
}
export interface CreateObjectFromStreamOptions {
    onResponse?: (resp: Response) => void;
    expiresAfterSeconds?: number;
    headers?: {
        [key: string]: string;
    };
}
export interface SwiftObjectStorageOptions {
    objectStorageUrl: string;
    user: string;
    key: string;
    cacheExpireAfterSeconds?: number;
}
/**
 * Simple Swift Object Storage client
 */
export declare class SwiftObjectStorage {
    private options;
    tokenCache: Cache;
    constructor(options: SwiftObjectStorageOptions);
    /**
     * Handles token authentication. Keeps the token data  cached so that
     * a new token doesn't have to be generated on every request
     */
    getTokenData(): Promise<TokenData>;
    /**
     * Returns a Request readable stream
     * @param container
     * @param filename
     */
    getRawGetStream(container: string, filename: string): Promise<Request>;
    getObjectWriteToStream(writeStream: WriteStream, container: string, filename: string, options?: GetObjectAsStreamOptions): Promise<{}>;
    /**
     * Returns a Request writeable stream
     * @param container
     * @param filename
     * @param options
     */
    getRawCreateStream(container: any, filename: string, options?: CreateObjectFromStreamOptions): Promise<Request>;
    createObjectFromStream(sourceStream: ReadStream, container: string, filename: string, options?: CreateObjectFromStreamOptions): Promise<{}>;
}
