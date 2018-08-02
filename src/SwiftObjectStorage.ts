import request, { Response, Request } from 'request';
import Cache from 'node-cache';
import pump from 'pump';
import { WriteStream, ReadStream } from 'fs';

const SWIFT_TOKEN_KEY = 'SWIFT_TOKEN_KEY';
const DEFAULT_EXP_SECONDS = 60 * 20;

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
export class SwiftObjectStorage {
  tokenCache: Cache;
  constructor(private options: SwiftObjectStorageOptions) {
    this.tokenCache = new Cache();
  }

  /**
   * Handles token authentication. Keeps the token data  cached so that
   * a new token doesn't have to be generated on every request
   */
  async getTokenData(): Promise<TokenData> {
    const tokenData: TokenData = this.tokenCache.get<TokenData>(SWIFT_TOKEN_KEY);

    if (tokenData) {
      return Promise.resolve(tokenData);
    }

    return new Promise<TokenData>((resolve, reject) => {
      request.get(
        {
          url: this.options.objectStorageUrl,
          headers: {
            'X-Auth-Key': this.options.key,
            'X-Auth-User': this.options.user
          }
        },
        (err, resp) => {
          if (resp.statusCode !== 200) {
            return reject(
              Error(
                `Error generating token: ${resp.statusCode} - ${
                  resp.statusMessage
                }`
              )
            );
          }

          const data = JSON.parse(resp.body);
          const newTokenData: TokenData = {
            objectPath: data.storage.public,
            authToken: resp.headers['x-auth-token']
          };

          const expAfterSeconds =
            this.options.cacheExpireAfterSeconds || DEFAULT_EXP_SECONDS;
          this.tokenCache.set(
            SWIFT_TOKEN_KEY,
            newTokenData,
            this.options.cacheExpireAfterSeconds
          );
          return resolve(newTokenData);
        }
      );
    });
  }

  /**
   * Returns a Request readable stream
   * @param container
   * @param filename
   */
  async getRawGetStream(container: string, filename: string): Promise<Request> {
    const tokenData = await this.getTokenData();
    return Promise.resolve(
      request.get({
        url: `${tokenData.objectPath}/${container}/${filename}`,
        headers: { 'X-Auth-Token': tokenData.authToken }
      })
    );
  }

  async getObjectWriteToStream(
    writeStream: WriteStream,
    container: string,
    filename: string,
    options: GetObjectAsStreamOptions = {}
  ) {
    const sourceStream = await this.getRawGetStream(container, filename);
    return new Promise((resolve, reject) => {
      sourceStream.on('response', resp => {
        if (Math.floor(resp.statusCode / 100) !== 2) {
          reject(
            Error(
              `Error generating token: ${resp.statusCode} - ${
                resp.statusMessage
              }`
            )
          );
          return;
        }

        if (options.onResponse) {
          options.onResponse(resp);
        }
      });

      pump(sourceStream, writeStream, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }

  /**
   * Returns a Request writeable stream
   * @param container
   * @param filename
   * @param options
   */
  async getRawCreateStream(
    container,
    filename: string,
    options: CreateObjectFromStreamOptions = {}
  ): Promise<Request> {
    const tokenData = await this.getTokenData();
    return Promise.resolve(
      request.put({
        url: `${tokenData.objectPath}/${container}/${filename}`,
        timeout: 1000 * 60 * 10,
        headers: {
          ...options.headers,
          'X-Delete-After': options.expiresAfterSeconds,
          'X-Auth-Token': tokenData.authToken
        }
      })
    );
  }

  createObjectFromStream(
    sourceStream: ReadStream,
    container: string,
    filename: string,
    options: CreateObjectFromStreamOptions = {}
  ) {
    return new Promise(async (resolve, reject) => {
      const putStream = await this.getRawCreateStream(
        container,
        filename,
        options
      );
      putStream.on('response', resp => {
        if (Math.floor(resp.statusCode / 100) !== 2) {
          reject(
            Error(
              `Error generating token: ${resp.statusCode} - ${
                resp.statusMessage
              }`
            )
          );
          return;
        }

        if (options.onResponse) {
          options.onResponse(resp);
        }
      });

      pump(sourceStream, putStream, err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  }
}
