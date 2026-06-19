import {
  SignalingErrorCode,
  SignalingErrorCodeValue,
  type SignalingErrorCodeKey,
} from "./common.constants";

export class SignalingError extends Error {
  readonly code: SignalingErrorCodeValue;
  constructor(key: SignalingErrorCodeKey) {
    super(key);
    this.code = SignalingErrorCode[key];
  }
}
