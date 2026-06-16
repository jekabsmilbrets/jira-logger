export interface RequestGateWaiter {
  cancelled: boolean;
  grantTurn: () => void;
}
