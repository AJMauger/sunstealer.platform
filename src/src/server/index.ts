import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import bodyParser from "body-parser";
import cors from "cors";
import Crypto from "crypto";
import express from "express";
import fs from "fs";
import http from "http";
import https from "https";
import path from "path";
import jsonwebtoken from "jsonwebtoken";
import jwktopem from "jwk-to-pem";

import { Configuration } from "./services/configuration";
import { Logger } from "./services/logger";
import { MongoDB } from "./services/mongodb";

export const _logger: Logger = new Logger("logs");
export const _configuration: Configuration = new Configuration("configuration.json");
export const _mongodb: MongoDB = new MongoDB();

let jwks: any = null;
let timeout = 30000;
const GetJWKS = async (): Promise<void> => {
  const httpsAgent: https.Agent = new https.Agent(_configuration.configuration.agent);
  await axios.get("https://ajmfco37-01.ajm.net:32001/jwks", { httpsAgent }).then((r: AxiosResponse) => {
    try {
      jwks = r.data;
      _logger.LogInformation(`identity: get jwks: ${r.status} ${r.statusText} data: ${JSON.stringify(r.data)}`);
      timeout = 12*60*60*1000;
    } catch (e) {
      _logger.LogException(e as any);
      timeout = 30000;
    }
  }).catch((e: any) => {
    _logger.LogAxiosError(e);
    timeout = 30000;
  });
  setTimeout( async () => { await GetJWKS(); }, timeout );
  return Promise.resolve();
}

// ajm: -------------------------------------------------------------------------------------------
const Validate = (authorizationHeader: string | undefined): boolean => {
  try {
    // ajm: _logger.LogDebug(`Validate(): authorizationHeader: "${authorizationHeader}"`);
    if (authorizationHeader) {
      const accessToken: any = authorizationHeader.split(" ")[1];
      // ajm: _logger.LogDebug(`Validate(): accessToken: ${accessToken}`);
      const publicKey: string = jwktopem(jwks.keys[1]);
      // ajm: _logger.LogInformation(`Validate(): identity: public key: ${publicKey}`);
      const token: jsonwebtoken.JwtPayload | string = jsonwebtoken.verify(accessToken || "", publicKey, { complete: true, algorithms: ["RS256"] });
      if (token) {
        _logger.LogInformation(`Validate(): jsonwebtoken.verify(access token): ${JSON.stringify(token, null, 2)}`);
      } else {
        _logger.LogError(`Invalid access token`);
      }
      return true;
    }
  } catch (e) {
    _logger.LogException(e);
  }
  return false;
}

(async () => {
  try {
    await _mongodb.Connect("mongodb://ajm:User%40Fdr37%230@ajmfco37-01.ajm.net:32017/mongodb/?authSource=admin", "configuration");
    await GetJWKS();
    setTimeout( async () => { await GetJWKS(); }, timeout );
  } catch (e) {
    _logger.LogException(e as any);
  }
})().catch((e) => {
  _logger.LogError(e);
});

// ajm: -------------------------------------------------------------------------------------------
const app: express.Application = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(__dirname));

// ajm: -------------------------------------------------------------------------------------------
app.get("/", (request: express.Request, response: express.Response) => {
  _logger.LogDebug(`app.get(/, ${request.path})`);
  response.status(200);
  response.statusMessage="OK";
  response.send("{ sunstealer-platform: v1 }");
});

// ajm: configuration -----------------------------------------------------------------------------

app.delete("/configuration", async (request: express.Request, response: express.Response) => {
  try {
    if (Validate(request.headers.authorization)) {
      _logger.LogDebug(`app.delete(/configuration, ${request.path})`);
      await _mongodb.Delete(request.body.collection, { _id: request.body.id });
      response.status(200);
      response.statusMessage="OK";
    } else {
      response.status(401);
      response.statusMessage="Unauthotized";
    }
  } catch (e) {
    _logger.LogException(e);
    response.status(400);
    response.statusMessage="Invalid";
  }
});

// ajm: /<collection>/<id>
app.get("/configuration/:collection/:id", async (request: express.Request, response: express.Response) => {
  try {
    if (Validate(request.headers.authorization)) {
      _logger.LogDebug(`app.get(/configuration, ${request.path} collection: ${request.params.collection} id: ${request.params.id})`);
      const result: any = await _mongodb.Select(request.params.collection, { _id: request.params.id });
      // ajm: _logger.LogDebug(`app.get(/configuration, ${JSON.stringify(result)})`);
      response.status(200);
      response.statusMessage="OK";
      response.send( result );
    } else {
      response.status(401);
      response.statusMessage="Unauthotized";
    }
  } catch (e) {
    _logger.LogException(e);
    response.status(400);
    response.statusMessage="Invalid";
}
});

app.post("/configuration", async (request: express.Request, response: express.Response) => {
  try {
    if (Validate(request.headers.authorization)) {
      _logger.LogDebug(`app.post(/configuration, ${request.path} body: ${JSON.stringify(request.body)})`);
      const etag: string = Crypto.randomBytes(16).toString("hex");
      await _mongodb.Insert(request.body.collection, { _id: request.body.id, data: request.body.data, etag });
      response.status(200);
      response.statusMessage="OK";
      response.send({etag});
    } else {
      response.status(401);
      response.statusMessage="Unauthotized";
    }
  } catch (e) {
    _logger.LogException(e);
    response.status(400);
    response.statusMessage="Invalid";
  }
});

app.put("/configuration", async (request: express.Request, response: express.Response) => {
  try {
    if (Validate(request.headers.authorization)) {
      _logger.LogDebug(`app.put(/configuration, ${request.path})`);
      const etag: string = Crypto.randomBytes(16).toString("hex");
      await _mongodb.Update(request.body.collection, { _id: request.body.id }, { data: request.body.data, etag });
      response.status(200);
      response.statusMessage="OK";
      response.send({etag});
    } else {
      response.status(401);
      response.statusMessage="Unauthotized";
    }
  } catch (e) {
    _logger.LogException(e);
    response.status(400);
    response.statusMessage="Invalid";
  }
});

// ajm: log ---------------------------------------------------------------------------------------
app.delete("/log", (request: express.Request, response: express.Response) => {
  try {
    // ajm: _logger.LogDebug(`app.delete(/log, ${request.path})`);
  } catch (e) {
    _logger.LogException(e);
    response.status(400);
    response.statusMessage="Invalid";
  }
});

app.get("/log", (request: express.Request, response: express.Response) => {
  try {
    // ajm: _logger.LogDebug(`app.get(/log, ${request.path})`);
  } catch (e) {
    _logger.LogException(e);
    response.status(400);
    response.statusMessage="Invalid";
  }
});

app.post("/log", (request: express.Request, response: express.Response) => {
  try {
    // ajm: _logger.LogDebug(`app.post(/log, ${request.path})`);
    if (Validate(request.headers.authorization)) {
      console.info(`/log body: ${JSON.stringify(request.body)}`);
      // ajm: _logger.LogDebug(`/log body: ${JSON.stringify(request.body)}`);
      response.status(200);
      response.statusMessage="OK";
    } else {
      response.status(401);
      response.statusMessage="Unauthotized";
    }
  } catch (e) {
    _logger.LogException(e);
    response.status(400);
    response.statusMessage="Invalid";
  }
});

// ajm: -------------------------------------------------------------------------------------------
http.createServer(app).listen(_configuration.configuration.port, () => {
  console.info(`sunstealer: http://0.0.0.0:${_configuration.configuration.port}`);
});