import Crypto from "crypto";
import * as Fs from "fs";
import * as Path from "path";
import { _logger } from "../index";

// ajm: -------------------------------------------------------------------------------------------
export class Configuration {
  public configuration: any = null;
  public uri: string = "";

  // ajm: ---------------------------------------------------------------------------------------
  public static GetUuid(): string {
    return Crypto.randomBytes(16).toString("hex");
  }
  
  constructor(public file: string) {
    try {
      // ajm: file
      this.uri = Path.join(__dirname, `./${file}`);
      console.info(`INFO: configuration uri: ${this.uri}`);
      if(!Fs.existsSync(this.uri)) {
        Fs.copyFileSync(Path.join(__dirname, "../dist/configuration/configuration.default.json"), this.uri);
      }

      const buffer: Buffer = Fs.readFileSync(this.uri);
      this.configuration = JSON.parse(buffer.toString());
      _logger.LogInformation(`configuration: ${JSON.stringify(this.configuration)}`);
    } catch(e) {
      if (e instanceof Error) {
        console.error(`EXCEPTION: ${e.name} : ${e.message}`);
      }
    }
  }

  // ajm: ---------------------------------------------------------------------------------------
  public Save(): void {
    try {
      _logger.LogDebug("Configuration.save() ...");
      const file: number = Fs.openSync(this.uri, "w");
      const i: number = Fs.writeSync(file, JSON.stringify(this.configuration));
      Fs.closeSync(file);
      _logger.LogDebug(`Configuration saved ${i} bytes wrtten.`);
    } catch (e) {
      _logger.LogException(e);
    }
  }
}
