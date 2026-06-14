import { RequestGate } from './request-gate.utility';
import { waitForTurn } from './wait-for.utility';

describe('Core Utils wait-for.utility', () => {
  it('delegates to the provided RequestGate', () => {
    const output = {} as ReturnType<RequestGate['waitForTurn']>;
    const requestGate: Pick<RequestGate, 'waitForTurn'> = {
      waitForTurn: vi.fn().mockReturnValue(output),
    };
    const isLoadingSignal = vi.fn() as never;

    const result = waitForTurn(requestGate as RequestGate, isLoadingSignal);

    expect(requestGate.waitForTurn).toHaveBeenCalledWith(isLoadingSignal);
    expect(result).toBe(output);
  });
});
