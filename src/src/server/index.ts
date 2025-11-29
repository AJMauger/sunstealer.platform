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
import { Event } from "./services/event";
import { Logger } from "./services/logger";
import { MongoDB } from "./services/mongodb";

export const _logger: Logger = new Logger("logs");
export const _configuration: Configuration = new Configuration("configuration.json");
export const _mongodb: MongoDB = new MongoDB();

let jwks: any = null;
let timeout = 30000;
const GetJWKS = async (): Promise<void> => {
  const httpsAgent: https.Agent = new https.Agent(_configuration.configuration.agent);
  await axios.get("https://ajmfco42-01.ajm.net:31010/jwks", { httpsAgent }).then((r: AxiosResponse) => {
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
    if (authorizationHeader) {
      const accessToken: any = authorizationHeader.split(" ")[1];
      // ajm: _logger.LogDebug(`Validate(): accessToken: ${accessToken}`);
      const publicKey: string = jwktopem(jwks.keys[1]);
      // ajm: _logger.LogInformation(`Validate(): identity: public key: ${publicKey}`);
      const token: jsonwebtoken.JwtPayload | string = jsonwebtoken.verify(accessToken || "", publicKey, { complete: true, algorithms: ["RS256"] });
      if (token) {
        // ajm: _logger.LogInformation(`Validate(): jsonwebtoken.verify(access token): ${JSON.stringify(token, null, 2)}`);
        _logger.LogInformation(`Validate(): valid token.`);
      } else {
        _logger.LogError(`Validate(): invalid access token`);
      }
      return true;
    } else {
      _logger.LogError(`Validate(): !authorizationHeader`);
    }
  } catch (e) {
    _logger.LogException(e);
  }
  return false;
}

(async () => {
  try {
    await _mongodb.Connect("mongodb:/user:password@ajmfco42-01.ajm.net:32017/mongodb/?authSource=admin", "platform");
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
    _logger.LogDebug(`DELETE /configuration: ${request.path}`);
    if (Validate(request.headers.authorization)) {
      await _mongodb.DeleteOne(request.body.collection, { _id: request.body.id });
      _logger.LogDebug(`DELETE /configuration: ${JSON.stringify(request.body)}`);
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
    _logger.LogDebug(`GET /configuration: ${request.path} collection: ${request.params.collection} id: ${request.params.id}`);
    if (Validate(request.headers.authorization)) {
      const result: any = await _mongodb.Select(request.params.collection, { _id: request.params.id });
      _logger.LogDebug(`GET /configuration: ${JSON.stringify(result)}`);
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
    _logger.LogDebug(`POST /configuration: ${request.path} body: ${JSON.stringify(request.body)}`);
    if (Validate(request.headers.authorization)) {
      const etag: string = Crypto.randomBytes(16).toString("hex");
      _logger.LogDebug(`POST /configuration: ${JSON.stringify(request.body.data)}`);
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
    _logger.LogDebug(`PUT /configuration: ${request.path}`);
    if (Validate(request.headers.authorization)) {
      const etag: string = Crypto.randomBytes(16).toString("hex");
      _logger.LogDebug(`PUT /configuration: ${JSON.stringify(request.body.data)}`);
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
app.delete("/log", async (request: express.Request, response: express.Response) => {
  try {
    _logger.LogDebug(`GET /log: ${request.path}`);
    await _mongodb.DeleteAll("log");
  } catch (e) {
    _logger.LogException(e);
    response.status(400);
    response.statusMessage="Invalid";
  }
});

app.get("/log/:start/:count/:date/:source/:severity", async (request: express.Request, response: express.Response) => {
  interface IQuery {
    "data.datetime"?: { $gte: string; $lt: string };
    "data.source"?: string;
    "data.severity"?: number;
  };

  try {
    _logger.LogDebug(`GET /log: start: ${request.params.start} count: ${request.params.count} date: ${request.params.date} source: ${request.params.source} severity: ${request.params.severity}`);
    if (Validate(request.headers.authorization) && request.params.start && request.params.count) {
      const start: Date = new Date(request.params.date);
      start.setUTCHours(0, 0, 0, 0); 
      const end: Date = new Date(start);
      end.setUTCDate(end.getUTCDate()+1);

      const query: IQuery = {
          "data.datetime": { 
              $gte: start.toISOString(),
              $lt: end.toISOString()
          }/*,
          "data.source": request.params.source === "all" ? undefined : request.params.source,
          "data.severity": request.params.severity === "-1" ? undefined : Number(request.params.severity)*/ 
      };
      
      if (request.params.source !== "all") {
        query["data.source"] = request.params.source;
      }
      if (request.params.severity !== "-1") {
        query["data.severity"] = Number(request.params.severity);
      }

      _logger.LogDebug(`GET /log: ${JSON.stringify(query, null, 2)}`);
      const result: any = await _mongodb.database?.collection("log").find(query).skip(Number(request.params.start)).limit(Number(request.params.count)).toArray();
      console.log(`GET /log: ${JSON.stringify(result)}`);
      response.status(200);
      response.statusMessage="OK";
      response.send( result );
    } else {
      console.error(`GET /log: ${JSON.stringify(request.body)} 401`);
      response.status(401);
      response.statusMessage="Unauthotized";
    }

  } catch (e) {
    _logger.LogException(e);
    response.status(400);
    response.statusMessage="Invalid";
  }
});

app.post("/log", async (request: express.Request, response: express.Response) => {
  try {
    _logger.LogDebug(`POST /log: ${request.path}`);
    if (Validate(request.headers.authorization)) {
      const event: Event = request.body.data as Event;
      console.log(`POST /log ${request.body ? JSON.stringify(event) : ""}`);
      await _mongodb.Insert("log", { _id: Configuration.GetUuid(), data: event });
      response.status(200);
      response.statusMessage="OK";
    } else {
      console.error(`POST /log: ${JSON.stringify(request.body)} 401`);
      response.status(401);
      response.statusMessage="Unauthotized";
    }
  } catch (e) {
    console.error(`POST /log: ${JSON.stringify(request.body)} 400`);
    _logger.LogException(e);
    response.status(400);
    response.statusMessage="Invalid";
  }
});

// ajm: -------------------------------------------------------------------------------------------
http.createServer(app).listen(_configuration.configuration.port, () => {
  console.info(`sunstealer: http://0.0.0.0:${_configuration.configuration.port}`);
});
