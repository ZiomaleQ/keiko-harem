import { CommandClient, Extension } from "../../deps.ts";

export class RolePlayExtension extends Extension {
  subPrefix = "rp";

  constructor(client: CommandClient) {
    super(client);
  }
}
