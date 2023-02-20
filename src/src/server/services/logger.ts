import { eSEVERITY, Event } from "./event";
import { _configuration, _logger } from "../index";

import * as Fs from "fs";
import * as Path from "path";

export class Logger {

  public severity = ["Db", "In", "Wn", "Er", "Ex"];
  public count: number = 0;
  public eventsInMemory: Event[] = new Array<Event>();
  public eventsFile: string[] = new Array<string>();
  public file: number = -1;
  public notifications: Array<Event> = new Array<Event>();
  public timeoutPlatform: NodeJS.Timeout | undefined = undefined;
  public timeoutFile: NodeJS.Timeout | undefined = undefined;

  // ajm: -----------------------------------------------------------------------------------------
  public constructor(public folder: string = "") {
    if (this.folder.length === 0) {
      if(Fs.existsSync("/data/.")) {
        this.folder = "/data";
        this.Open();
      } else {
        console.log("persistent sorage /data/. does not exist.");
      }
    } else {
      if (!Fs.existsSync(this.folder)) {
        Fs.mkdirSync(this.folder);
      }  
      this.Open();
    }

    /* ajm: this.LogDebug("Logger.ctor() - debug test");
    this.LogInformation("LogService.ctor() - information test");
    this.LogWarning("LogService.ctor() - warning test");
    this.LogError("LogService.ctor() - error test");
    this.LogException(new Error("LogService.ctor() - exception test"));*/
  }

  // ajm: -----------------------------------------------------------------------------------------
  public Close(exit: boolean = false): void {
    try {
      this.count = 0;
      if (exit) {
        this.LogInformation("Logger.Close() on exit");
      } else {
        this.LogInformation("Logger.Close()");
      }

      clearTimeout(this.timeoutFile);
      this.OnTimeoutFile(exit);

      Fs.closeSync(this.file);
      this.file = -1;

      const date: Date = new Date();
      const uri: string = `${this.folder}/sunstealer_${this.GetDateStringFile(date)}.log`;

      Fs.renameSync(`${this.folder}/sunstealer.log`, uri);
    } catch (e) {
      console.log(`EXCEPTION: Logger.Close() ${e}`);
    }
  }

  // ajm: -----------------------------------------------------------------------------------------
  public GetDateStringFile(date: Date): string {
    const D: string = String(date.getDate()).padStart(2, "0");
    const M: string = String(date.getMonth() + 1).padStart(2, "0");
    const h: string = String(date.getHours()).padStart(2, "0");
    const m: string = String(date.getMinutes()).padStart(2, "0");
    const s: string = String(date.getSeconds()).padStart(2, "0");

    return `${date.getFullYear()}-${M}-${D}T${h}-${m}-${s}`;
  }

  // ajm: -----------------------------------------------------------------------------------------
  public GetDateString(date: Date): string {
    const D: string = String(date.getDate()).padStart(2, "0");
    const M: string = String(date.getMonth() + 1).padStart(2, "0");
    const h: string = String(date.getHours()).padStart(2, "0");
    const m: string = String(date.getMinutes()).padStart(2, "0");
    const s: string = String(date.getSeconds()).padStart(2, "0");

    return `${date.getFullYear()}-${M}-${D}T${h}:${m}:${s}.0+00:00`;
  }

  // ajm: -----------------------------------------------------------------------------------------
  public GetResponse(response: any) {
    return `Configuration.() response ${response.status}; ${response.statusText}; ${JSON.stringify(response.data)}`;
  }

  // ajm: -----------------------------------------------------------------------------------------
  public async Housekeep(): Promise<void> {
    this.LogInformation("Logger.Housekeep()");

    return new Promise<void>(async (resolve, reject) => {
      Fs.readdir(this.folder, (error: NodeJS.ErrnoException | null, files: string[]) => {
        if (error) {
          this.LogInformation(`Fs.readdir: ${error}`);
          return resolve();
        } else {
          let i: number = 0;
          files.forEach((name: string) => {
            const uri: string = Path.join(this.folder, name);
            this.LogInformation(`Checking ${uri}`);
            const stats: Fs.Stats = Fs.statSync(uri);
            const age: number = Math.round(Math.abs(((new Date())).getTime()
              - stats.mtime.getTime()) / (24 * 60 * 60 * 1000));
            if (age > 3 && i > _configuration?.configuration.log_files || 10) {
              this.LogInformation(`Deleting ${uri}`);
              Fs.unlinkSync(uri);
            }
            i++;
          });
          this.LogInformation("Exit Logger.Housekeep() loop");
          this.LogInformation("Exit Logger.Housekeep()");
          return resolve();
        }
      });
    }).catch((e) => {
      this.LogError(`${e}`);
      this.LogInformation("Exit Logger.Housekeep()");
      return Promise.resolve();
    });
  }

  // ajm: -----------------------------------------------------------------------------------------
  public LogAxiosError(e: any): void {
    const event: string = `Axios: ${e.config?.method} ${e.config?.url}; ${JSON.stringify(e.response?.data)} ${e.message}`;
    this.Log(eSEVERITY.eEXCEPTION, event, e.message);
  }

  // ajm: -----------------------------------------------------------------------------------------
  public LogDebug(event: string, notification: string | undefined = undefined): void {
    this.Log(eSEVERITY.eDEBUG, event, notification);
  }

  // ajm: -----------------------------------------------------------------------------------------
  public LogInformation(event: string, notification: string | undefined = undefined): void {
    this.Log(eSEVERITY.eINFORMATION, event, notification);
  }

  // ajm: -----------------------------------------------------------------------------------------
  public LogWarning(event: string, notification: string | undefined = undefined): void {
    if(notification === null) {
      notification = "Warning";
    }
    this.Log(eSEVERITY.eWARNING, event, notification);
  }

  // ajm: -----------------------------------------------------------------------------------------
  public LogError(event: string, notification: string | undefined = undefined): void {
    if(notification === null) {
      notification = "Error";
    }
    this.Log(eSEVERITY.eERROR, event, notification);
  }

  // ajm: -----------------------------------------------------------------------------------------
  public LogException(e: any, notification: string | undefined = undefined): void {
    if(!notification) {
      notification = "Exception";
    }
    const event: string = `${e.message}; ${e.name}; ${e.stack}`;
    this.Log(eSEVERITY.eEXCEPTION, event, notification);
  }

  // ajm: -----------------------------------------------------------------------------------------
  public Log(severity: eSEVERITY, message: string, notification: string | undefined = undefined): void {
    const e: Event = new Event(severity, message, notification);

    if(notification !== null) {
      if(this.notifications.length > 100) {
        this.notifications.shift();
      }
      this.notifications.push(e);
      // OnNotification(severity, notification);
    }

    const s: string = `${e.dt} [${this.severity[e.severity]}] ${e.message}`;
    console.log(s);

    // ajm: file, critical section
    if (this.file !== -1) {
      this.eventsFile.push(s);
    }

    if (severity >= _configuration?.configuration.log_level || 0) {
      // ajm: in-memory
      if (this.eventsInMemory.length > _configuration?.configuration.log_memory_size || 300) {
        this.eventsInMemory.shift();
      }
      this.eventsInMemory.push(e);
    }
  }

  // ajm: -----------------------------------------------------------------------------------------
  public LogToFile(severity: eSEVERITY, message: string): void {
    if (this.file !== -1) {
      const datetime: Date = new Date();
      const D: string = String(datetime.getDate()).padStart(2, "0");
      const M: string = String(datetime.getMonth() + 1).padStart(2, "0");
      const h: string = String(datetime.getHours()).padStart(2, "0");
      const m: string = String(datetime.getMinutes()).padStart(2, "0");
      const s: string = String(datetime.getSeconds()).padStart(2, "0");
      const dateTime: string = `${datetime.getFullYear()}-${M}-${D}T${h}:${m}:${s}`;
      const log: string = `${dateTime} [${this.severity[severity]}] ${message}`;
      this.eventsFile.push(log);
    }
  }

  // ajm: -----------------------------------------------------------------------------------------
  public Open(): void {
    try {
      this.file = Fs.openSync(`${this.folder}/sunstealer.log`, "w");
      this.LogInformation("Logger.Open()");

      this.timeoutFile = setTimeout(this.OnTimeoutFile, _configuration?.configuration.log_file_interval_ms || 1000);
    } catch (e) {
      this.LogException(e);
    }
  }

  // ajm: -----------------------------------------------------------------------------------------
  public OnTimeoutFile(exit: boolean = false): void {
    // logger.LogDebug("Logger.OnTimeoutFile()");
    const count: number = _logger.eventsFile.length;
    try {
      for (let i: number = 0; i < _logger.eventsFile.length; i++) {
        const s: string | undefined = _logger.eventsFile.shift();
        Fs.writeSync(_logger.file, `\r\n${s}`);
        _logger.count++;
        if (!exit && _logger.count > (_configuration?.configuration.log_file_size || 10000)) {
          _logger.Close();
          _logger.Open();
        }
      }
    } catch (e) {
      _logger.LogException(e);
      _logger.Close();
      if (!exit && _logger.file !== -1) {
        _logger.Open();
      }
    }

    if (!exit) {  // ajm: reschedule
      _logger.timeoutFile = setTimeout(_logger.OnTimeoutFile,
        _configuration?.configuration.log_file_interval_ms);
    }
  }
}
