import { logging } from "@cityofzion/neon-core";
import { Provider } from "./common";
const log = logging.default("api");

const maxPreference = 1;
const minPreference = 0;

export default class ApiBalancer {
  public leftProvider: Provider;
  public rightProvider: Provider;

  // tslint:disable-next-line:variable-name
  private _preference: number = 0;
  public get preference() {
    return this._preference;
  }
  public set preference(val) {
    const newVal = Math.max(0, Math.min(1, val));
    if (newVal !== this._preference) {
      log.info(`Preference set to ${newVal}`);
    }
    this._preference = newVal;
  }

  // tslint:disable-next-line:variable-name
  private _frozen: boolean = false;
  public get frozen() {
    return this._frozen;
  }
  public set frozen(val) {
    if (this._frozen !== val) {
      val
        ? log.info(`ApiBalancer frozen at preference of ${this._preference}`)
        : log.info("ApiBalancer unfrozen");
    }
    this._frozen = val;
  }

  constructor(
    leftProvider: Provider,
    rightProvider: Provider,
    preference: number = 0,
    frozen = false
  ) {
    this.leftProvider = leftProvider;
    this.rightProvider = rightProvider;
    this.preference = preference;
    this.frozen = frozen;
  }

  /**
   * Load balances a API call according to the API switch. Selects the appropriate provider and sends the call towards it.
   * @param func - The API call to load balance function
   */
  public async loadBalance<T>(func: (provider: Provider) => T): Promise<T> {
    const i = Math.random() > this._preference ? 0 : 1;
    const primary = i === 0 ? this.leftProvider : this.rightProvider;
    const primaryShift = i === 0;
    try {
      const result = await func(primary);
      i === 0 ? this.increaseLeftWeight() : this.increaseRightWeight();
      return result;
    } catch {
      const secondary = i === 0 ? this.rightProvider : this.leftProvider;
      i === 1 ? this.increaseLeftWeight() : this.increaseRightWeight();
      return await func(secondary);
    }
  }

  private increaseLeftWeight() {
    if (!this._frozen) {
      this.preference -= 0.2;
      log.info(
        `core API Switch increasing weight towards ${this.leftProvider.name}`
      );
    }
  }

  private increaseRightWeight() {
    if (!this._frozen) {
      this.preference += 0.2;
      log.info(
        `core API Switch increasing weight towards ${this.rightProvider.name}`
      );
    }
  }
}
