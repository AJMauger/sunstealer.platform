import { Configuration } from "./configuration";

export enum eSEVERITY {
    eDEBUG = 0,
    eINFORMATION = 1,
    eWARNING = 2,
    eERROR = 3,
    eEXCEPTION = 4,
  }
  
  export class Event {
    public Dt: Date = new Date();
    public dt: string;
    public id: string =  Configuration.GetUuid();
    public t: string;
  
    public constructor(public severity: number, public message: string, public notification: string | undefined = undefined) {
      const D: string = String(this.Dt.getDate()).padStart(2, "0");
      const M: string = String(this.Dt.getMonth() + 1).padStart(2, "0");
      const h: string = String(this.Dt.getHours()).padStart(2, "0");
      const m: string = String(this.Dt.getMinutes()).padStart(2, "0");
      const s: string = String(this.Dt.getSeconds()).padStart(2, "0");
      this.t = `${h}:${m}:${s}`;
      this.dt = `${this.Dt.getFullYear()}-${M}-${D}T${this.t}`;
    }
  }