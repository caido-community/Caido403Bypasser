import { RequestSpecRaw } from "caido:utils";
import type { ResultDetails, ScanTarget } from "shared";

import type { BackendSDK } from "../types";
import { encodeRaw, toBinaryString } from "../utils/bytes";

import type { SentRequest } from "./scans";

export class HttpService {
  constructor(private readonly sdk: BackendSDK) {}

  async send(target: ScanTarget, raw: string): Promise<SentRequest> {
    const spec = new RequestSpecRaw("http://localhost");
    spec.setHost(target.host);
    spec.setTls(target.isTls);
    spec.setPort(target.port);
    spec.setRaw(encodeRaw(raw));

    const { request, response } = await this.sdk.requests.send(spec);
    return {
      requestId: request.getId(),
      statusCode: response.getCode(),
      length: response.getRaw().toBytes().length,
      roundtripTime: response.getRoundtripTime(),
    };
  }

  async loadDetails(requestId: string): Promise<ResultDetails | undefined> {
    const saved = await this.sdk.requests.get(requestId);
    if (saved === undefined) {
      return undefined;
    }
    return {
      request: saved.request.getRaw().toText(),
      response: saved.response?.getRaw().toText(),
    };
  }

  async loadTarget(requestId: string): Promise<ScanTarget | undefined> {
    const saved = await this.sdk.requests.get(requestId);
    if (saved === undefined) {
      return undefined;
    }
    const { request } = saved;
    return {
      host: request.getHost(),
      port: request.getPort(),
      isTls: request.getTls(),
      raw: toBinaryString(request.getRaw().toBytes()),
    };
  }
}
